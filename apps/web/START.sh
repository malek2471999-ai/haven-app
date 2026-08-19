#!/bin/bash
# HAVEN - Startup Script
# Your Safe Place to Connect

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       HAVEN - Your Safe Place            ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# Navigate to project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/apps/web"

# Check Node.js
echo "[1/3] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "    [ERROR] Node.js is not installed!"
    echo "    Download from: https://nodejs.org"
    exit 1
fi
echo "    Node.js: $(node --version)"

# Install dependencies
echo "[2/3] Installing dependencies..."
if [ ! -d "node_modules" ]; then
    echo "    First run - installing packages..."
    npm install --legacy-peer-deps
else
    echo "    Dependencies already installed."
fi

# Start dev server
echo "[3/3] Starting HAVEN..."
echo ""
echo "  ────────────────────────────────────────"
echo "   Open browser: http://localhost:3000"
echo "  ────────────────────────────────────────"
echo ""

npm run dev
