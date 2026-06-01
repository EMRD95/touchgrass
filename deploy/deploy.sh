#!/bin/bash
# TouchGrass auto-deploy script
# Called by webhook listener after validating GitHub signature
set -e

REPO_DIR="/opt/touchgrass/repo"
LOG_FILE="/opt/touchgrass/deploy.log"

exec >> "$LOG_FILE" 2>&1
echo "=== Deploy $(date) ==="

cd "$REPO_DIR"

# Clean any local changes, pull latest
git fetch origin main
git reset --hard origin/main

# Install and build
npm ci
npm run build

# Verify
if [ -f dist/index.html ]; then
    echo "Deploy OK $(date)"
else
    echo "Deploy FAILED - no dist/index.html"
    exit 1
fi
