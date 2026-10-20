"""Capture non-secret git metadata without reading file contents."""
import argparse
import datetime
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['capture'])
    parser.add_argument('task_id')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', args.task_id):
        raise SystemExit('Use a lowercase task ID with digits and hyphens, maximum 64 characters')
    def git(*argv):
        return subprocess.check_output(['git', *argv], cwd=ROOT, text=True).strip()
    output = ROOT / 'docs/handoffs' / f'{args.task_id}.snapshot.json'
    snapshot = {'task_id': args.task_id, 'time_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'branch': git('branch', '--show-current'), 'head': git('rev-parse', 'HEAD'),
                'changed_paths': git('status', '--porcelain'),
                'note': 'Metadata only; AI must separately record intent, decisions, tests and next steps. Not committed automatically.'}
    output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
    print(str(output.relative_to(ROOT)))


if __name__ == '__main__':
    main()

