# Start Numerology Backend Server
# Usage: .\start-backend.ps1

Write-Host "Starting Numerology Backend..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"

# Check if venv exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Install dependencies if needed
if (-not (Test-Path "venv\Lib\site-packages\uvicorn")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    python -m pip install --upgrade pip
    python -m pip install fastapi uvicorn[standard] pydantic
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error installing dependencies. Trying with requirements.txt..." -ForegroundColor Yellow
        python -m pip install -r requirements.txt
    }
}

# Start server
Write-Host "Starting FastAPI server on http://localhost:8003" -ForegroundColor Green
Write-Host "API docs available at http://localhost:8003/docs" -ForegroundColor Cyan
uvicorn main:app --reload --port 8003
