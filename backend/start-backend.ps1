# Start Numerology Backend Server
Write-Host "Starting Numerology Backend Server..." -ForegroundColor Green

# Activate venv if not already activated
if (-not $env:VIRTUAL_ENV) {
    if (Test-Path "venv\Scripts\Activate.ps1") {
        Write-Host "Activating virtual environment..." -ForegroundColor Yellow
        & .\venv\Scripts\Activate.ps1
    } else {
        Write-Host "Virtual environment not found. Creating..." -ForegroundColor Yellow
        python -m venv venv
        & .\venv\Scripts\Activate.ps1
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        python -m pip install --upgrade pip
        python -m pip install -r requirements.txt
    }
}

Write-Host ""
Write-Host "Starting server on http://localhost:8003" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start uvicorn server
uvicorn main:app --reload --port 8003
