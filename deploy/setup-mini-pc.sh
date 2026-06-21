#!/usr/bin/env bash
set -euo pipefail

echo "[Berkay Hub] Mini PC/VDS kurulum scripti"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker bulunamadı. Ubuntu/Debian için Docker kurulumu başlatılıyor..."
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "Docker Compose ile servisler ayağa kaldırılıyor..."
cd "$(dirname "$0")"
docker compose up -d --build

echo "Tamamlandı. Frontend: http://localhost:5500 | Backend: http://localhost:8080/api"
