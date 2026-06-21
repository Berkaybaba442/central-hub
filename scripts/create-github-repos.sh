#!/usr/bin/env bash
set -euo pipefail

FRONTEND_REPO="central-hub-frontend"
BACKEND_REPO="berkay-hub-backend"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI bulunamadı. Önce gh kur ve 'gh auth login' yap."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

create_repo() {
  local dir="$1"
  local repo="$2"
  cd "$ROOT_DIR/$dir"
  git init
  git add .
  git commit -m "Initial Berkay Hub $dir"
  gh repo create "$repo" --private --source=. --remote=origin --push
}

create_repo "central-hub-frontend" "$FRONTEND_REPO"
create_repo "berkay-hub-backend" "$BACKEND_REPO"

echo "Repo oluşturma işlemi tamamlandı."
