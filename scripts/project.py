"""Framework-independent, fail-closed checks and Pages staging. Commands are argv, never shell text."""
import argparse
import datetime
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
BLOCKED_ROOTS = {'.git', '.github', '.agents', '.template', '.cache', '.artifacts',
                 'docs', 'tools', 'scripts', 'node_modules'}
SECRET = re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|'
                    rb'AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')


def contains_secret(path):
    tail = b''
    with path.open('rb') as stream:
        while chunk := stream.read(262144):
            data = tail + chunk
            if SECRET.search(data):
                return True
            tail = data[-256:]
    return False


def commands(value, label):
    if not isinstance(value, list):
        raise ValueError(f'{label} must be a list of argv arrays')
    for command in value:
        if not isinstance(command, list) or not command or any(not isinstance(s, str) or not s for s in command):
            raise ValueError(f'{label} command must be a nonempty array of nonempty strings')
    return value


def config(root=ROOT):
    data = json.loads((root / '.template/project.json').read_text())
    if data.get('schema_version') != 1 or type(data.get('initialized')) is not bool:
        raise ValueError('Unsupported project config schema')
    for name in ['install', 'start', 'build']:
        commands(data.get(name), name)
    for mode in ['daily', 'release']:
        commands(data.get('checks', {}).get(mode), 'checks.' + mode)
    return data


def initialized(data):
    if not data['initialized']:
        raise ValueError('UNINITIALIZED: game checks/deployment unavailable; fill docs/spec.md and .template/project.json first')
    if not data.get('name') or not data['checks']['daily'] or not data['checks']['release']:
        raise ValueError('Initialized projects require name and meaningful daily AND release checks')


def run_checks(root, data, mode):
    initialized(data)
    started = time.monotonic()
    results = []
    try:
        for argv in data['checks']['daily'] + (data['checks']['release'] if mode == 'release' else []):
            print('Check: ' + ' '.join(argv), flush=True)
            result = subprocess.run(argv, cwd=root)
            results.append({'argv': argv, 'exit_code': result.returncode})
            if result.returncode:
                raise subprocess.CalledProcessError(result.returncode, argv)
    finally:
        output = root / '.artifacts'
        output.mkdir(exist_ok=True)
        try:
            head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True,
                                           stderr=subprocess.DEVNULL).strip()
            dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=root, text=True))
        except subprocess.CalledProcessError:
            head, dirty = 'uncommitted-repository', True
        report = {'mode': mode, 'time_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'head': head, 'dirty': dirty, 'elapsed_seconds': round(time.monotonic() - started, 2),
                  'results': results, 'passed': len(results) == len(data['checks']['daily'] + (data['checks']['release'] if mode == 'release' else []))
                  and all(x['exit_code'] == 0 for x in results)}
        (output / f'checks-{mode}.json').write_text(json.dumps(report, indent=2) + '\n')
        if report['elapsed_seconds'] > (180 if mode == 'daily' else 480):
            print('Time target exceeded; record the reason in the handoff. This is not a passing result by itself.')


def stage(root=ROOT, source_name=None):
    data = config(root)
    if source_name is None:
        initialized(data)
        source_name = data['site_dir']
    relative = Path(source_name)
    if relative.is_absolute() or '..' in relative.parts or not relative.parts or relative.parts[0] in BLOCKED_ROOTS:
        raise ValueError('site_dir must be an isolated website output directory inside the repo')
    source = root / relative
    if any((root / Path(*relative.parts[:i])).is_symlink() for i in range(1, len(relative.parts) + 1)):
        raise ValueError('Website output ancestors must not be symlinks')
    if source.is_symlink() or not source.is_dir() or source.resolve() == root.resolve():
        raise ValueError('Invalid site directory')
    if not source.resolve().is_relative_to(root.resolve()):
        raise ValueError('site_dir escapes repo')
    if not (source / 'index.html').is_file():
        raise ValueError('Website output needs index.html')
    for path in source.rglob('*'):
        rel = path.relative_to(source)
        if path.is_symlink() or any(part.startswith('.') or part in BLOCKED_ROOTS for part in rel.parts):
            raise ValueError('Unsafe site path: ' + str(rel))
        if path.is_file():
            if path.suffix.lower() in {'.md', '.pem', '.key', '.map'} or contains_secret(path):
                raise ValueError('Private/source material detected in site output: ' + str(rel))
    target = root / '.artifacts/site'
    if target.is_symlink() or target.parent.is_symlink():
        raise ValueError('Artifact path must not be a symlink')
    if target.exists():
        shutil.rmtree(target)
    target.parent.mkdir(exist_ok=True)
    shutil.copytree(source, target)
    print('Staged website files in .artifacts/site; publish only this directory')
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['status', 'check', 'build', 'stage', 'install', 'start', 'stage-probe'])
    parser.add_argument('mode', nargs='?', choices=['daily', 'release'], default='daily')
    args = parser.parse_args()
    data = config()
    if args.action == 'status':
        print('initialized' if data['initialized'] else 'uninitialized')
    elif args.action == 'check':
        run_checks(ROOT, data, args.mode)
    elif args.action == 'stage-probe':
        stage(ROOT, 'fixtures/pages-probe')
    elif args.action == 'stage':
        stage()
    else:
        initialized(data)
        for argv in data[args.action]:
            subprocess.run(argv, cwd=ROOT, check=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)

