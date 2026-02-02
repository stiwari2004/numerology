# Install Backend Dependencies
# Run this script to install all required dependencies

Write-Host "Installing backend dependencies..." -ForegroundColor Green

# Check if we're in the backend directory
if (-not (Test-Path "requirements.txt")) {
    Write-Host "Error: requirements.txt not found. Please run this script from the backend directory." -ForegroundColor Red
    exit 1
}

# Activate venv if not already activated
if (-not $env:VIRTUAL_ENV) {
    if (Test-Path "venv\Scripts\Activate.ps1") {
        Write-Host "Activating virtual environment..." -ForegroundColor Yellow
        & .\venv\Scripts\Activate.ps1
    } else {
        Write-Host "Creating virtual environment..." -ForegroundColor Yellow
        python -m venv venv
        & .\venv\Scripts\Activate.ps1
    }
}

Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

Write-Host "Installing dependencies from requirements.txt..." -ForegroundColor Yellow
python -m pip install -r requirements.txt

Write-Host ""
Write-Host "Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Set up PostgreSQL database (see README_DATABASE_SETUP.md)" -ForegroundColor White
Write-Host "2. Create .env file with DATABASE_URL" -ForegroundColor White
Write-Host "3. Run: python main.py" -ForegroundColor White
Write-Host "   OR" -ForegroundColor White
Write-Host "   Run: .\start-backend.ps1" -ForegroundColor White
