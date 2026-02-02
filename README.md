# Numerology Calculator

A modern web application for calculating numerology values including Root Number, Destiny Number, Natal Lo Shu Grid, Mahadasha, and Antardasha.

## Project Structure

```
Numerology/
├── backend/          # FastAPI backend
│   ├── main.py       # FastAPI app entry point
│   ├── services/     # Business logic
│   └── api/          # API endpoints
└── frontend/         # React + Vite frontend
    └── src/          # Source code (MVC structure)
```

## Quick Start

### Option 1: Start Both (Easiest)

```powershell
.\start-all.ps1
```

This will start both backend and frontend in separate windows.

### Option 2: Start Separately

**Backend:**
```powershell
.\start-backend.ps1
```

**Frontend (in another terminal):**
```powershell
.\start-frontend.ps1
```

### Option 3: Manual Start

**Backend:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8003
```

**Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

## URLs

- **Frontend**: http://localhost:3006
- **Backend API**: http://localhost:8003
- **API Documentation**: http://localhost:8003/docs

## Tech Stack

### Backend
- FastAPI
- Python 3.8+
- Uvicorn

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS

## Architecture

The project follows MVC (Model-View-Controller) pattern:

- **Models**: Data types and API services (`src/models/`)
- **Controllers**: Business logic hooks (`src/controllers/`)
- **Views**: UI components (`src/views/`)
