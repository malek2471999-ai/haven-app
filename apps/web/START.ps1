# HAVEN - Startup Script
# Your Safe Place to Connect

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║                                          ║" -ForegroundColor Green
Write-Host "  ║       ███╗   ██╗███████╗ █████╗         ║" -ForegroundColor Green
Write-Host "  ║       ████╗  ██║██╔════╝██╔══██╗        ║" -ForegroundColor Green
Write-Host "  ║       ██╔██╗ ██║█████╗  ███████║        ║" -ForegroundColor Green
Write-Host "  ║       ██║╚██╗██║██╔══╝  ██╔══██║        ║" -ForegroundColor Green
Write-Host "  ║       ██║ ╚████║███████╗██║  ██║        ║" -ForegroundColor Green
Write-Host "  ║       ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝        ║" -ForegroundColor Green
Write-Host "  ║                                          ║" -ForegroundColor Green
Write-Host "  ║     Your Safe Place to Connect           ║" -ForegroundColor Green
Write-Host "  ║                                          ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Navigate to project directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptDir\apps\web"

# Check Node.js
Write-Host "[1/3] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "    Node.js: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "    [ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "    Download from: https://nodejs.org" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}

# Install dependencies
Write-Host "[2/3] Installing dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "    First run - installing packages..." -ForegroundColor Cyan
    npm install --legacy-peer-deps
} else {
    Write-Host "    Dependencies already installed." -ForegroundColor Cyan
}

# Start dev server
Write-Host "[3/3] Starting HAVEN..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  ────────────────────────────────────────" -ForegroundColor Green
Write-Host "   Open browser: http://localhost:3000" -ForegroundColor Green
Write-Host "  ────────────────────────────────────────" -ForegroundColor Green
Write-Host ""

npm run dev

Read-Host "Press Enter to exit"
