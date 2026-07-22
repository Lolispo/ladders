#!/usr/bin/env bash
# Deploy ladders to ladders.petterbuilds.com via the shared platform deployer
# (handles RUM injection, SSM contract, sync, and invalidation centrally).
#
# Manual/local counterpart to .github/workflows/deploy.yml — both run the CRA
# build (`npm run build` → build/) and deploy that dir, so what ships locally
# matches CI. homepage:"." in package.json keeps asset paths relative so they
# resolve at the subdomain root.
set -euo pipefail
cd "$(dirname "$0")/.."
export AWS_PROFILE="${AWS_PROFILE:-private}"
WP="${WEB_PLATFORM_DIR:-$HOME/HobbyProjects/web-platform}"
[ -x "$WP/scripts/deploy-app.sh" ] || { echo "✗ web-platform not found at $WP (set WEB_PLATFORM_DIR)" >&2; exit 1; }
npm run build
exec "$WP/scripts/deploy-app.sh" ladders "${1:-build}"
