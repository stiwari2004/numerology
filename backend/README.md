# Numerology Calculator - Backend

Standalone FastAPI backend for numerology calculations.

## Setup

1. **Create virtual environment:**
```powershell
cd C:\Users\Admin\Documents\Numerology\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. **Install dependencies:**
```powershell
pip install -r requirements.txt
```

3. **Run the server:**
```powershell
uvicorn main:app --reload --port 8003
```

Or:
```powershell
python main.py
```

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /docs` - Swagger UI documentation
- `POST /api/v1/numerology/calculate` - Calculate numerology values

## Example Request

```bash
POST http://localhost:8003/api/v1/numerology/calculate
Content-Type: application/json

{
  "birthdate": "30/06/1986"
}
```

## Project Structure

```
backend/
├── main.py                 # FastAPI app entry point
├── requirements.txt        # Python dependencies
├── services/
│   └── numerology_service.py  # Numerology calculation logic
└── api/
    └── endpoints/
        └── numerology.py      # API endpoints
```
