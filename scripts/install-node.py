"""Install the pinned official Node archive in this checkout, with checksum verification."""
import hashlib
import json
from pathlib import Path
import platform
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    versions = json.loads((ROOT / '.template/versions.json').read_text())
    node_version = versions['node']
    target = ROOT / '.cache/node'
    for binary in [target / 'bin/node', shutil.which('node')]:
        if not binary:
            continue
        try:
            if subprocess.check_output([str(binary), '--version'], stderr=subprocess.DEVNULL,
                                       text=True).strip() == 'v' + node_version:
                print('Node ' + node_version + ' ready')
                return
        except (OSError, subprocess.CalledProcessError):
            pass
    system = platform.system().lower()
    architecture = {'aarch64': 'arm64', 'arm64': 'arm64', 'x86_64': 'x64'}.get(platform.machine())
    key = f'{system}-{architecture}'
    if key not in versions['archives']:
        raise SystemExit('Unsupported platform; install the pinned Node version using official tools.')
    archive = versions['archives'][key]
    filename = f"node-v{node_version}-{key}.{archive['extension']}"
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=target.parent) as scratch:
        path = Path(scratch) / filename
        subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location',
                        '--proto', '=https', '--proto-redir', '=https',
                        f'https://nodejs.org/dist/v{node_version}/{filename}', '-o', str(path)], check=True)
        if hashlib.sha256(path.read_bytes()).hexdigest() != archive['sha256']:
            raise SystemExit('Node checksum mismatch; installation stopped.')
        unpacked = Path(scratch) / 'unpacked'
        unpacked.mkdir()
        subprocess.run(['tar', '-xf', str(path), '-C', str(unpacked), '--strip-components=1'], check=True)
        if target.exists():
            shutil.rmtree(target)  # Only this script's generated tool installation.
        unpacked.rename(target)
    print('Installed verified Node ' + node_version)


if __name__ == '__main__':
    main()

