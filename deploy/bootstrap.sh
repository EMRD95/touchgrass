#!/bin/bash
set -e
echo "=== Installing Node.js 22 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs

echo "=== Installing nginx ==="
sudo apt-get install -y nginx

echo "=== Installing cloudflared ==="
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update -qq
sudo apt-get install -y cloudflared

echo "=== Versions ==="
node --version
nginx -v 2>&1
cloudflared --version

echo "=== Done ==="
