"""Continue a catalog-only release from an immutable Actions receipt, never inventing a pass."""
import argparse
import datetime
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import time

ROOT=Path(__file__).resolve().parents[1]
ALLOWED={'tools/game/v8-e2e.mjs','tools/game/exploration-e2e.mjs','public/catalog/characters.json','public/catalog/future-characters.csv',
         'scripts/continue-release.py','tests/test_release_continuation.py',
         '.github/workflows/ci.yml','.github/workflows/pages.yml'}
REUSABLE={('npm','run','content:check'),('npm','run','typecheck'),('npm','test'),
          ('npm','run','test:e2e'),('npm','run','test:playtest'),
          ('npm','run','test:exploration'),('npm','run','test:refinement'),
          ('npm','run','test:polish'),('npm','run','test:content-integration'),
          ('npm','run','test:skills'),('npm','run','test:world')}

def catalog_only(paths):
    return bool(paths) and all(p in ALLOWED or p.startswith(('docs/handoffs/','docs/verification/')) for p in paths)

def browser_commands(paths):
    checks=[]
    if any(p.startswith('public/catalog/') or p=='tools/game/exploration-e2e.mjs' for p in paths):checks.append(['npm','run','test:exploration'])
    if 'tools/game/v8-e2e.mjs' in paths:checks.append(['npm','run','test:integration-v8'])
    return checks

def reusable_results(receipt,commands,paths):
    if not catalog_only(paths):raise ValueError('Continuation rejected: gameplay/build inputs changed; a new release gate is required')
    if receipt.get('mode')!='release' or receipt.get('dirty') is not False or not re.fullmatch('[0-9a-f]{40}',receipt.get('head','')):
        raise ValueError('Invalid source receipt identity')
    results=receipt.get('results',[])
    if len(results)>len(commands):raise ValueError('Source receipt has unexpected commands')
    for i,row in enumerate(results):
        if row.get('argv')!=commands[i] or type(row.get('exit_code')) is not int:
            raise ValueError('Source command list does not match the current release gate')
        if row['exit_code'] and i!=len(results)-1:raise ValueError('Source receipt continued after a failure')
    affected={tuple(argv) for argv in browser_commands(paths)}
    return {tuple(r['argv']):r for r in results if r['exit_code']==0 and tuple(r['argv']) in REUSABLE and tuple(r['argv']) not in affected}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source-run',required=True,type=int);parser.add_argument('--repo',required=True)
    args=parser.parse_args()
    run=json.loads(subprocess.check_output(['gh','run','view',str(args.source_run),'--repo',args.repo,'--json','headSha,headBranch,event,status,conclusion'],text=True))
    if run['headBranch']!='main' or run['event']!='push' or run['status']!='completed' or run['conclusion']!='failure':raise ValueError('Source must be a completed, failed main push release')
    subprocess.run(['git','merge-base','--is-ancestor',run['headSha'],'HEAD'],cwd=ROOT,check=True)
    folder=ROOT/'.artifacts/release-source';folder.mkdir(parents=True,exist_ok=True)
    subprocess.run(['gh','run','download',str(args.source_run),'--repo',args.repo,'--name','verification-'+run['headSha'],'--dir',str(folder)],check=True)
    source=folder/'checks-release.json';receipt=json.loads(source.read_text())
    if receipt.get('head')!=run['headSha']:raise ValueError('Artifact does not match Actions run SHA')
    spec=importlib.util.spec_from_file_location('project',ROOT/'scripts/project.py');project=importlib.util.module_from_spec(spec);spec.loader.exec_module(project)
    config=project.config(ROOT);project.initialized(config);commands=config['checks']['daily']+config['checks']['release']
    paths=subprocess.check_output(['git','diff','--name-only',run['headSha'],'HEAD'],cwd=ROOT,text=True).splitlines()
    reused=reusable_results(receipt,commands,paths)
    started=time.monotonic();results=[]
    try:
        for argv in commands:
            if tuple(argv) in reused:
                print('Reuse verified PASS from '+run['headSha']+': '+' '.join(argv),flush=True)
                results.append({'argv':argv,'exit_code':0,'reused_from':{'run':args.source_run,'head':run['headSha'],**({'prior':reused[tuple(argv)]['reused_from']} if reused[tuple(argv)].get('reused_from') else {})}})
            else:
                print('Check: '+' '.join(argv),flush=True)
                result=subprocess.run(argv,cwd=ROOT);results.append({'argv':argv,'exit_code':result.returncode})
                if result.returncode:raise subprocess.CalledProcessError(result.returncode,argv)
    finally:
        report={'mode':'release','head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
          'dirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True)),
          'time_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':round(time.monotonic()-started,2),
          'source_run':args.source_run,'source_head':run['headSha'],'changed_paths':paths,'results':results,
          'passed':len(results)==len(commands) and all(r['exit_code']==0 for r in results)}
        (ROOT/'.artifacts/checks-release.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':main()
