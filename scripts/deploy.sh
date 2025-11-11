#!/usr/bin/env bash

set -euo pipefail

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required}"

SSH_PORT="${DEPLOY_PORT:-${SSH_PORT:-22}}"
SSH_OPTIONS="-o StrictHostKeyChecking=no -p ${SSH_PORT}"

BUILD_DIR="${BUILD_DIR:-.}"
PM2_ENV="${PM2_ENV:-production}"

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

if [[ -n "${DEPLOY_KEY:-}" ]]; then
  KEY_PATH="$HOME/.ssh/id_backend_deploy"
  printf '%s\n' "$DEPLOY_KEY" >"$KEY_PATH"
  chmod 600 "$KEY_PATH"
  SSH_OPTIONS="$SSH_OPTIONS -i $KEY_PATH"
fi

ssh-keyscan -p "$SSH_PORT" -H "$DEPLOY_HOST" >>"$HOME/.ssh/known_hosts" 2>/dev/null

EXCLUDES=(
  ".git"
  "node_modules"
  "logs"
  "uploads"
  ".github"
  ".env*"
  "scripts/deploy.sh"
)

if [[ -n "${DEPLOY_EXCLUDES:-}" ]]; then
  IFS=',' read -ra USER_EXCLUDES <<<"$DEPLOY_EXCLUDES"
  EXCLUDES+=("${USER_EXCLUDES[@]}")
fi

RSYNC_ARGS=()
for pattern in "${EXCLUDES[@]}"; do
  RSYNC_ARGS+=(--exclude "$pattern")
done

echo "🔄 Syncing backend code to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"
rsync -az --delete "${RSYNC_ARGS[@]}" -e "ssh $SSH_OPTIONS" "$BUILD_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"

DEFAULT_REMOTE_CMD="
set -e
cd '$DEPLOY_PATH'
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi
pm2 reload ecosystem.config.js --env '$PM2_ENV'
"

REMOTE_CMD="${POST_DEPLOY_CMD:-$DEFAULT_REMOTE_CMD}"

echo "🚀 Running remote deploy command"
ssh $SSH_OPTIONS "$DEPLOY_USER@$DEPLOY_HOST" "$REMOTE_CMD"

echo "✅ Backend deployment finished"
