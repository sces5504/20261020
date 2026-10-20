"""Validate tool configuration and exercise deployment safety behavior."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = importlib.util.spec_from_file_location('project', ROOT / 'scripts/project.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    data = module.config()
    versions = json.loads((ROOT / '.template/versions.json').read_text())
    if (ROOT / '.node-version').read_text().strip() != versions['node']:
        raise SystemExit('Node version settings disagree')
    for name in ['AGENTS.md', 'docs/guide.md', 'docs/testing.md', 'docs/security.md',
                 '.agents/skills/grilling/SKILL.md', 'tools/package-lock.json']:
        if not (ROOT / name).is_file():
            raise SystemExit('Missing template component: ' + name)
    lock = json.loads((ROOT / 'tools/package-lock.json').read_text())
    package = json.loads((ROOT / 'tools/package.json').read_text())
    if lock['packages']['']['dependencies'] != package['dependencies']:
        raise SystemExit('Tool lockfile differs from declared versions')
    subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'], cwd=ROOT, check=True)
    print('Template contracts: PASS. Game status: ' + ('initialized' if data['initialized'] else 'uninitialized'))


if __name__ == '__main__':
    main()

