"""Execute only the reviewed, checksum-pinned pnpm native-linking installer."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
review = json.loads((ROOT / '.template/reviewed-tool-scripts.json').read_text())
package = ROOT / 'tools/node_modules/pnpm'
if json.loads((package / 'package.json').read_text())['version'] != review['pnpm_version']:
    raise SystemExit('pnpm version changed: review the new installer before running it')
for name, expected in review['files'].items():
    if hashlib.sha256((package / name).read_bytes()).hexdigest() != expected:
        raise SystemExit('Reviewed pnpm installer checksum mismatch: ' + name)
environment = os.environ.copy()
environment.pop('npm_lifecycle_event', None)
subprocess.run(['node', str(package / 'install.js')], env=environment, check=True)
actual = subprocess.check_output([str(ROOT / 'tools/node_modules/.bin/pnpm'), '--version'], text=True).strip()
if actual != review['pnpm_version']:
    raise SystemExit('pnpm executable version mismatch')
print('Reviewed native tool installation ready: pnpm ' + actual)

