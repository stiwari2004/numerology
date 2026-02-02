# Start Numerology Frontend
# Usage: .\start-frontend.ps1

Write-Host "Starting Numerology Frontend..." -ForegroundColor Green
Set-Location "$PSScriptRoot\frontend"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start dev server
Write-Host "Starting Vite dev server on http://localhost:3006" -ForegroundColor Green
npm run dev
