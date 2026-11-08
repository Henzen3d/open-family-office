#!/usr/bin/env bash
# OpenFamilyOffice — Automated Deployment Script for Hermes Agent / CI-CD
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/home/osmar/openfamilyoffice}"

echo "========================================================"
echo "🚀 Starting OpenFamilyOffice Deployment: $(date)"
echo "📂 Target Directory: ${DEPLOY_DIR}"
echo "========================================================"

if [ ! -d "${DEPLOY_DIR}" ]; then
  echo "❌ Error: Directory ${DEPLOY_DIR} not found. Please clone repo first."
  exit 1
fi

cd "${DEPLOY_DIR}"

# 1. Pull latest code from GitHub main
echo "📥 Fetching latest commits from GitHub origin/main..."
git fetch origin main
git reset --hard origin/main

# 2. Verify environment files
if [ ! -f .env ]; then
  echo "⚠️ Warning: .env not found. Creating default from template if available."
  touch .env
fi

# Ensure data and reports directories exist with correct permissions
mkdir -p data/macro_cache data/ledger data/governance data/receipts reports
chmod -R 775 data reports || true

# 3. Build and launch Docker containers
echo "🐳 Building and updating Docker containers..."
docker compose up -d --build --remove-orphans

# 4. Clean up dangling images to preserve server disk space
echo "🧹 Pruning dangling docker images..."
docker image prune -f

echo "========================================================"
echo "✅ OpenFamilyOffice Deployed Successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "⚙️ Backend API: http://localhost:8001 (internal: http://ofo-api:8000)"
echo "========================================================"
