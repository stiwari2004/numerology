"""
Numerology API endpoints
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import Optional
from services.numerology_service import NumerologyService
from datetime import datetime
import logging

router = APIRouter()
service = NumerologyService()
logger = logging.getLogger(__name__)


class NumerologyRequest(BaseModel):
    """Request model for numerology calculations"""
    birthdate: str = Field(..., description="Birthdate in DD/MM/YYYY format")
    start_year: Optional[int] = Field(None, description="Start year for year range (defaults to birth year)")
    end_year: Optional[int] = Field(None, description="End year for year range (defaults to birth year + 100)")
    
    @validator('birthdate')
    def validate_birthdate(cls, v):
        try:
            parts = v.split('/')
            if len(parts) != 3:
                raise ValueError("Birthdate must be in DD/MM/YYYY format")
            day, month, year = map(int, parts)
            if not (1 <= day <= 31):
                raise ValueError("Day must be between 1 and 31")
            if not (1 <= month <= 12):
                raise ValueError("Month must be between 1 and 12")
            if not (1900 <= year <= 2100):
                raise ValueError("Year must be between 1900 and 2100")
            return v
        except ValueError as e:
            raise ValueError(f"Invalid birthdate format: {e}")
    
    @validator('start_year', 'end_year')
    def validate_year_range(cls, v):
        if v is not None:
            if not (1900 <= v <= 2200):
                raise ValueError("Year must be between 1900 and 2200")
        return v


class MonthlyGridRequest(BaseModel):
    """Request model for monthly grid calculations"""
    birthdate: str = Field(..., description="Birthdate in DD/MM/YYYY format")
    year: int = Field(..., description="Year for which to generate monthly grids")
    
    @validator('birthdate')
    def validate_birthdate(cls, v):
        try:
            parts = v.split('/')
            if len(parts) != 3:
                raise ValueError("Birthdate must be in DD/MM/YYYY format")
            day, month, year = map(int, parts)
            if not (1 <= day <= 31):
                raise ValueError("Day must be between 1 and 31")
            if not (1 <= month <= 12):
                raise ValueError("Month must be between 1 and 12")
            if not (1900 <= year <= 2100):
                raise ValueError("Year must be between 1900 and 2100")
            return v
        except ValueError as e:
            raise ValueError(f"Invalid birthdate format: {e}")
    
    @validator('year')
    def validate_year(cls, v):
        if not (1900 <= v <= 2200):
            raise ValueError("Year must be between 1900 and 2200")
        return v


@router.post("/calculate")
async def calculate_numerology(request: NumerologyRequest):
    """Calculate Root Number, Destiny Number, Natal Grid, Mahadasha, and Antardasha from birthdate"""
    try:
        result = service.calculate_numerology(
            request.birthdate,
            start_year=request.start_year,
            end_year=request.end_year
        )
        return result
    except ValueError as e:
        logger.warning(f"Validation error in numerology calculation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in numerology calculation: {error_msg}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {error_msg}")


@router.post("/monthly-grids")
async def get_monthly_grids(request: MonthlyGridRequest):
    """Generate monthly grids for a specific year"""
    try:
        # Parse birthdate
        parts = request.birthdate.split('/')
        day = int(parts[0])
        month = int(parts[1])
        year = int(parts[2])
        
        dob_date = datetime(year, month, day)
        
        # Calculate core numbers to get natal grid
        root = service.calculate_root_number(day)
        month_num = service.calculate_month_number(month)
        year_num = service.calculate_year_number(year)
        destiny = service.calculate_destiny_number(root, month_num, year_num)
        
        # Build Natal grid
        natal_digits = service.build_natal_grid_digits(day, month, year, destiny)
        natal_grid_dict = service.build_natal_grid(natal_digits)
        
        # Generate monthly grids
        monthly_grids = service.generate_monthly_grids(
            dob_date, root, month, day, request.year, natal_grid_dict
        )
        
        return {
            "birthdate": request.birthdate,
            "year": request.year,
            "monthly_grids": monthly_grids
        }
    except ValueError as e:
        logger.warning(f"Validation error in monthly grid calculation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in monthly grid calculation: {error_msg}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {error_msg}")
