"""
Numerology Calculator - FastAPI Backend
"""
from dotenv import load_dotenv
import os
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import numerology, auth, users, tenant, super_admin
from middleware.tenant_middleware import TenantMiddleware
from database.connection import init_db
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Numerology Calculator API",
    description="API for calculating numerology values including Root Number, Destiny Number, Natal Grid, Mahadasha, and Antardasha",
    version="1.0.0"
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database on application startup"""
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

# Tenant middleware (must be before CORS)
app.add_middleware(TenantMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(numerology.router, prefix="/api/v1/numerology", tags=["numerology"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(tenant.router, prefix="/api/v1/tenant", tags=["tenant"])
app.include_router(super_admin.router, prefix="/api/v1/super-admin", tags=["super-admin"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Numerology Calculator API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8003"))
    uvicorn.run(app, host="0.0.0.0", port=port)
