"""
Pratyantar Period Calculation Service
Handles period-based grid calculations with pratyantar sequences
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class PratyantarService:
    """Service for pratyantar period calculations and grid building"""
    
    def __init__(self, numerology_service):
        """
        Initialize with reference to numerology service for shared calculations.
        
        Args:
            numerology_service: Instance of NumerologyService for shared methods
        """
        self.numerology_service = numerology_service
    
    def count_digits(self, numbers: List[int]) -> Dict[int, int]:
        """
        Count occurrences of each digit 1-9 (helper for base).
        
        Args:
            numbers: List of numbers to count
        
        Returns:
            Dictionary mapping number (1-9) to count
        """
        counts = {}
        for num in numbers:
            if 1 <= num <= 9:
                counts[num] = counts.get(num, 0) + 1
        return counts
    
    def build_mahadasha_base_counts(self, natal_counts: Dict[int, int], maha: int, 
                                     personal_year: int, basic_numbers: List[int]) -> Dict[int, int]:
        """
        Build annual grid counts: natal +1 maha (ALWAYS) +1 pyear +1 per basic (if overlay-active).
        This is the ANNUAL grid that was working correctly before.
        
        Mahadasha is ALWAYS added to annual grid, regardless of overlay-active rule.
        Overlay-active rule applies only to Personal Year and Basic Numbers.
        
        Overlay-active numbers: 1,2,3,4,5,7,9 (can be added)
        Overlay-inactive numbers: 6,8 (should NOT be added, keep natal value)
        
        Args:
            natal_counts: Count dictionary from natal grid digits
            maha: Mahadasha number for the year (ALWAYS added)
            personal_year: Personal Year number
            basic_numbers: List of basic numbers [reduced_day, reduced_year]
        
        Returns:
            Annual grid counts dictionary (Natal + Mahadasha + Personal Year + Basic Numbers)
        """
        base = natal_counts.copy()
        overlay_active_numbers = {1, 2, 3, 4, 5, 7, 9}
        
        # Add Mahadasha ALWAYS (regardless of overlay-active rule)
        if 1 <= maha <= 9:
            base[maha] = base.get(maha, 0) + 1
        
        # Add Personal Year if overlay-active
        if 1 <= personal_year <= 9 and personal_year in overlay_active_numbers:
            base[personal_year] = base.get(personal_year, 0) + 1
        
        # Add Basic Numbers if overlay-active (skip 6 and 8)
        for b in basic_numbers:
            if 1 <= b <= 9 and b in overlay_active_numbers:
                base[b] = base.get(b, 0) + 1
        
        return base
    
    def build_period_grid(self, annual_grid_counts: Dict[int, int], pratyantar: int) -> Dict[int, str]:
        """
        Build period grid: annual grid counts +1 for Pratyantar (Antardasha) number.
        Personal Month is NOT added to grid counts (only used for interpretation/display).
        
        Rule: Start with annual grid, then add +1 for the Pratyantar (Antardasha) number for this period.
        The Pratyantar number comes from the period sequence (9,1,2,3,4,5,6,7,8,9...).
        
        Args:
            annual_grid_counts: Annual grid counts dictionary (Natal + Mahadasha + Personal Year + Basic Numbers)
            pratyantar: Pratyantar (Antardasha) number for this period - always adds +1
        
        Returns:
            Period grid dictionary with string values (e.g., {2: "222", 8: "88"})
        """
        counts = annual_grid_counts.copy()
        
        # Always add Pratyantar (+1), regardless of the number
        if pratyantar and 1 <= pratyantar <= 9:
            counts[pratyantar] = counts.get(pratyantar, 0) + 1  # Exactly +1 for Pratyantar
        
        # Debug logging
        logger.debug(f"Building period grid: pratyantar={pratyantar}, annual_grid_counts={annual_grid_counts}, final_counts={counts}")
        
        grid = {}
        for num in range(1, 10):
            cnt = counts.get(num, 0)
            grid[num] = str(num) * cnt if cnt > 0 else None
        return grid
    
    def generate_pratyantar_periods(self, year: int, day: int, month: int, 
                                    dob_year: int, dob_root: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Generate exact periods: start from year_antardasha, lengths multi*8, chain end+1.
        
        Args:
            year: Target year for period generation
            day: Birth day
            month: Birth month
            dob_year: Birth year (for antardasha calculation context)
            dob_root: Root number from DOB (for antardasha calculation)
        
        Returns:
            List of period dictionaries with multi, pratyantar, start, end, duration_days
        """
        try:
            year_birthday = datetime(year, month, day)
        except ValueError:
            # Handle Feb 29 case
            year_birthday = datetime(year, month, 28)
        
        year_antardasha = self.numerology_service.calculate_antardasha(
            year, day, month, year_birthday, dob_root=dob_root
        )
        
        # Debug logging
        logger.debug(f"Year {year} antardasha: {year_antardasha}")
        
        periods = []
        pratyantar_multi = year_antardasha  # Start from year's antardasha
        current_start = year_birthday
        
        # Calculate next birthday
        try:
            next_birthday = datetime(year + 1, month, day)
        except ValueError:
            next_birthday = datetime(year + 1, month, 28)
        
        period_idx = 0
        while current_start < next_birthday:
            period_idx += 1
            
            # Calculate duration: multi * 8
            full_period_duration = pratyantar_multi * 8
            
            # Check remaining days until next birthday
            remaining_days = (next_birthday - current_start).days
            
            # If remaining days are less than a full period duration, skip adding this partial period
            if remaining_days < full_period_duration:
                logger.debug(f"Skipping partial period P{period_idx}: only {remaining_days} days remaining, need {full_period_duration} days for full period")
                break
            
            # Calculate period end date
            current_end = current_start + timedelta(days=full_period_duration - 1)  # Inclusive end
            
            # Safety check: if period would exceed next birthday, cap it (shouldn't happen due to check above)
            if current_end >= next_birthday:
                current_end = next_birthday - timedelta(days=1)
                duration_days = (current_end - current_start).days + 1
                # If this period is still too short, don't add it
                if duration_days < full_period_duration:
                    logger.debug(f"Skipping partial period P{period_idx}: duration {duration_days} days < required {full_period_duration} days")
                    break
            else:
                duration_days = full_period_duration
            
            periods.append({
                'multi': pratyantar_multi,
                'pratyantar': pratyantar_multi,
                'start': current_start.strftime('%d/%m/%Y'),
                'end': current_end.strftime('%d/%m/%Y'),
                'start_date': current_start,
                'end_date': current_end,
                'duration_days': duration_days
            })
            
            # Debug logging
            logger.debug(f"P{period_idx} multi={pratyantar_multi} start={current_start.strftime('%d/%m/%Y')} end={current_end.strftime('%d/%m/%Y')} duration={duration_days}")
            
            # Next start = end +1
            current_start = current_end + timedelta(days=1)
            
            # Next multi: 9→1, 1→2,...,8→9
            pratyantar_multi = 1 if pratyantar_multi == 9 else pratyantar_multi + 1
        
        return periods
