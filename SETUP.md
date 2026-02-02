# Setup Guide

## First Time Setup

### Backend Setup

1. **Navigate to backend folder:**
   ```powershell
   cd C:\Users\Admin\Documents\Numerology\backend
   ```

2. **Create virtual environment:**
   ```powershell
   python -m venv venv
   ```

3. **Activate virtual environment:**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

4. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

5. **Start backend:**
   ```powershell
   uvicorn main:app --reload --port 8000
   ```

   Or use the script:
   ```powershell
   cd C:\Users\Admin\Documents\Numerology
   .\start-backend.ps1
   ```

### Frontend Setup

1. **Navigate to frontend folder:**
   ```powershell
   cd C:\Users\Admin\Documents\Numerology\frontend
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Start frontend:**
   ```powershell
   npm run dev
   ```

   Or use the script:
   ```powershell
   cd C:\Users\Admin\Documents\Numerology
   .\start-frontend.ps1
   ```

## Quick Start (After Setup)

**Start both at once:**
```powershell
cd C:\Users\Admin\Documents\Numerology
.\start-all.ps1
```

This opens two PowerShell windows - one for backend, one for frontend.

## Verify It's Working

1. **Backend**: Open http://localhost:8000/docs - You should see Swagger UI
2. **Frontend**: Open http://localhost:3006 - You should see the Numerology Calculator
3. **Test**: Enter a birthdate like `30/06/1986` and click Calculate

## Troubleshooting

### Backend Issues

- **"uvicorn not found"**: Make sure virtual environment is activated
- **"Module not found"**: Make sure you're running from the backend directory
- **Port 8000 in use**: Change port in `main.py` or kill the process using port 8000

### Frontend Issues

- **"npm not found"**: Install Node.js from nodejs.org
- **Port 3006 in use**: Vite will automatically try another port
- **Tailwind CSS error**: Make sure you ran `npm install` and have Tailwind v3.4.17

## Project Structure

```
Numerology/
├── backend/
│   ├── main.py                    # FastAPI app
│   ├── requirements.txt           # Python deps
│   ├── services/
│   │   └── numerology_service.py  # Calculation logic
│   └── api/
│       └── endpoints/
│           └── numerology.py      # API endpoint
│
├── frontend/
│   ├── package.json               # Node deps
│   ├── vite.config.ts            # Vite config
│   └── src/
│       ├── models/               # Data layer
│       ├── controllers/          # Business logic
│       └── views/                # UI components
│
├── start-backend.ps1             # Backend startup script
├── start-frontend.ps1            # Frontend startup script
└── start-all.ps1                 # Start both scripts
```
