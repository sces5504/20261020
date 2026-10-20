#!/usr/bin/env bash
# Configure an already-created public repo. Uses the caller's gh authentication, never prints tokens.
set -euo pipefail
if [[ $# -ne 1 || ! "$1" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo 'Usage: bash scripts/github-bootstrap.sh OWNER/REPO' >&2; exit 1
fi
DEV_TEMPLATE_REPO="$1"
if [[ "$(gh api "repos/$DEV_TEMPLATE_REPO" --jq '.permissions.admin')" != "true" ]]; then
  echo 'Administrator permission required for repository settings.' >&2; exit 1
fi
if [[ "$(gh api "repos/$DEV_TEMPLATE_REPO" --jq '.private')" != "false" ]]; then
  echo 'This bootstrap targets public repos. Private hosting/billing needs a separate agreed configuration.' >&2; exit 1
fi
if [[ "$DEV_TEMPLATE_REPO" == 'sces5504/dev-environment-template' ]]; then
  gh api --method PATCH "repos/$DEV_TEMPLATE_REPO" -F is_template=true >/dev/null
fi
gh api --method PATCH "repos/$DEV_TEMPLATE_REPO" -F allow_auto_merge=true -F delete_branch_on_merge=true >/dev/null
gh api --method PUT "repos/$DEV_TEMPLATE_REPO/actions/permissions" -F enabled=true -f allowed_actions=selected >/dev/null
gh api --method PUT "repos/$DEV_TEMPLATE_REPO/actions/permissions/selected-actions" --input "$(dirname "$0")/../.template/actions-policy.json" >/dev/null
gh api --method PUT "repos/$DEV_TEMPLATE_REPO/actions/permissions/workflow" -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false >/dev/null
if gh api "repos/$DEV_TEMPLATE_REPO/pages" >/dev/null 2>&1; then
  gh api --method PUT "repos/$DEV_TEMPLATE_REPO/pages" -f build_type=workflow >/dev/null
else
  gh api --method POST "repos/$DEV_TEMPLATE_REPO/pages" -f build_type=workflow >/dev/null
fi
gh api --method PUT "repos/$DEV_TEMPLATE_REPO/environments/github-pages" --input "$(dirname "$0")/../.template/pages-environment.json" >/dev/null
DEV_TEMPLATE_BRANCH="$(gh api "repos/$DEV_TEMPLATE_REPO" --jq '.default_branch')"
if [[ "$DEV_TEMPLATE_BRANCH" != 'main' ]]; then
  echo 'This template expects default branch main. Align branch/workflows before applying protection.' >&2; exit 1
fi
gh api --method PUT "repos/$DEV_TEMPLATE_REPO/branches/main/protection" --input "$(dirname "$0")/../.template/branch-protection.json" >/dev/null
echo 'Repository settings:'
gh api "repos/$DEV_TEMPLATE_REPO" --jq '{full_name,private,is_template,has_pages,permissions}'
echo 'Workflow token defaults:'
gh api "repos/$DEV_TEMPLATE_REPO/actions/permissions/workflow"
echo 'Main branch protection:'
gh api "repos/$DEV_TEMPLATE_REPO/branches/main/protection" --jq '{required_status_checks,enforce_admins,required_pull_request_reviews,allow_force_pushes,allow_deletions}'
echo 'Pages configuration (deployment still needs a successful workflow run):'
gh api "repos/$DEV_TEMPLATE_REPO/pages" --jq '{html_url,status,build_type,https_enforced}'

