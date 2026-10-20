#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in python3 git curl tar; do
  command -v "$tool" >/dev/null || { echo "Missing setup prerequisite: $tool" >&2; exit 1; }
done
python3 -c 'import sys; assert sys.version_info >= (3,11), "Python 3.11+ required"'
python3 scripts/install-node.py
source scripts/env.sh
npm --prefix tools ci --ignore-scripts --no-audit --no-fund
python3 scripts/prepare-tools.py
# Browser binaries are matched to the locked Playwright package. Keep executor proxy/CA variables.
if [[ "${DEV_TEMPLATE_INSTALL_SYSTEM_DEPS:-0}" == "1" ]]; then
  tools/node_modules/.bin/playwright install --with-deps --only-shell chromium
else
  tools/node_modules/.bin/playwright install --only-shell chromium
fi
node tools/browser-smoke.mjs
python3 scripts/template-check.py
echo "Tools ready. New shell: source scripts/env.sh"
echo "Game initialization status: $(python3 scripts/project.py status)"

