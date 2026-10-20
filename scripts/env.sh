# Source this file in each new shell; paths are scoped to this checkout.
if [ -n "${BASH_VERSION:-}" ]; then
  DEV_TEMPLATE_ENV_SOURCE="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  DEV_TEMPLATE_ENV_SOURCE="${(%):-%x}"
else
  echo 'Use bash or zsh to source scripts/env.sh' >&2
  return 1
fi
DEV_TEMPLATE_ROOT="$(cd "$(dirname "$DEV_TEMPLATE_ENV_SOURCE")/.." && pwd)"
export PATH="$DEV_TEMPLATE_ROOT/.cache/node/bin:$DEV_TEMPLATE_ROOT/tools/node_modules/.bin:$PATH"
export PLAYWRIGHT_BROWSERS_PATH="$DEV_TEMPLATE_ROOT/.cache/ms-playwright"
export NPM_CONFIG_CACHE="$DEV_TEMPLATE_ROOT/.cache/npm"

