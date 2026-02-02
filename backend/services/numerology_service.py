"""
Numerology service for calculating Root Number, Destiny Number, Natal Lo Shu Grid, 
Mahadasha timeline, Antardasha, and Review Year Grid
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class NumerologyService:
    """Service for numerology calculations"""
    
    # Fixed Lo Shu Grid layout (positions correspond to numbers)
    # Top row: 3 | 1 | 9
    # Middle: 6 | 7 | 5
    # Bottom: 2 | 8 | 4
    LO_SHU_POSITIONS = {
        1: (0, 1),  # Top middle
        2: (2, 0),  # Bottom left
        3: (0, 0),  # Top left
        4: (2, 2),  # Bottom right
        5: (1, 2),  # Middle right
        6: (1, 0),  # Middle left
        7: (1, 1),  # Middle center
        8: (2, 1),  # Bottom middle
        9: (0, 2),  # Top right
    }
    
    # Weekday to Planet number mapping
    WEEKDAY_PLANET_MAP = {
        0: 1,  # Sunday
        1: 2,  # Monday
        2: 9,  # Tuesday
        3: 5,  # Wednesday
        4: 3,  # Thursday
        5: 6,  # Friday
        6: 8,  # Saturday
    }
    
    def __init__(self):
        # Pratyantar service will be initialized lazily to avoid circular imports
        self._pratyantar_service = None
    
    @property
    def pratyantar_service(self):
        """Lazy initialization of pratyantar service"""
        if self._pratyantar_service is None:
            from services.pratyantar_service import PratyantarService
            self._pratyantar_service = PratyantarService(self)
        return self._pratyantar_service
    
    def digit_sum(self, number: int) -> int:
        """
        Sum digits of a number.
        Example: digit_sum(1986) = 1+9+8+6 = 24
        """
        return sum(int(digit) for digit in str(number))
    
    def reduce_to_single(self, number: int) -> int:
        """
        Repeat digit sum until you get 1..9.
        Example: reduce_to_single(24) = 2+4 = 6
        Example: reduce_to_single(30) = 3+0 = 3
        """
        while number >= 10:
            number = self.digit_sum(number)
        return number
    
    def calculate_root_number(self, day: int) -> int:
        """
        Calculate root number from day (DD).
        Root = reduced day
        """
        return self.reduce_to_single(day)
    
    def calculate_month_number(self, month: int) -> int:
        """
        Calculate month number from month (MM).
        Reduce month to single digit.
        """
        return self.reduce_to_single(month)
    
    def calculate_year_number(self, year: int) -> int:
        """
        Calculate year number from year (YYYY).
        Reduce year to single digit.
        """
        return self.reduce_to_single(year)
    
    def calculate_destiny_number(self, root: int, month: int, year: int) -> int:
        """
        Calculate destiny number.
        Reduce each component, then add and reduce.
        """
        rd = root  # Already reduced
        rm = month  # Already reduced
        ry = year   # Already reduced
        total = rd + rm + ry
        return self.reduce_to_single(total)
    
    def calculate_basic_numbers(self, day: int, year: int) -> List[int]:
        """
        Calculate Basic Numbers for period-based grids.
        Basic Numbers = [reduced_day, reduced_year_digits]
        Example: day=26 → 2+6=8, year=1982 → last two digits 82 → 8+2=10 → 1+0=1
        But based on example showing 8,4 pattern, it might be: [8, 4] where 4 comes from reduction
        """
        # Reduced day
        basic_day = self.reduce_to_single(day)
        
        # Year last two digits reduced
        yy = year % 100
        basic_year = self.reduce_to_single(yy)
        
        return [basic_day, basic_year]
    
    def extract_day_digits(self, day: int, include_root: bool = True) -> List[int]:
        """
        Extract digits from day for Natal grid.
        Include tens digit if non-zero, ones digit if non-zero.
        Optionally include reduced day (root) as a separate digit.
        """
        digits = []
        
        # Extract tens and ones digits
        tens = day // 10
        ones = day % 10
        
        if tens > 0:
            digits.append(tens)
        if ones > 0:
            digits.append(ones)
        
        # Include reduced day (root) if requested
        if include_root:
            root = self.reduce_to_single(day)
            digits.append(root)
        
        return digits
    
    def extract_month_digits(self, month: int) -> List[int]:
        """
        Extract digits from month for Natal grid.
        Include tens digit if non-zero, ones digit if non-zero.
        """
        digits = []
        tens = month // 10
        ones = month % 10
        
        if tens > 0:
            digits.append(tens)
        if ones > 0:
            digits.append(ones)
        
        return digits
    
    def extract_year_digits(self, year: int) -> List[int]:
        """
        Extract digits from year (last two digits) for Natal grid.
        Take yy = year % 100, include tens and ones digits if non-zero.
        """
        digits = []
        yy = year % 100
        tens = yy // 10
        ones = yy % 10
        
        if tens > 0:
            digits.append(tens)
        if ones > 0:
            digits.append(ones)
        
        return digits
    
    def build_natal_grid_digits(self, day: int, month: int, year: int, destiny: int) -> List[int]:
        """
        Build the digit multiset for Natal grid.
        Includes: day digits, month digits, year digits, destiny, and psychic extra.
        """
        digits = []
        
        # Calculate root once
        root = self.reduce_to_single(day)
        
        # Psychic extra rule: add root again if day is not single digit and doesn't end with 0
        include_psychic = not (day < 10 or day % 10 == 0)
        
        # Day digits: include root only if psychic extra is NOT being applied
        # (to avoid double counting)
        digits.extend(self.extract_day_digits(day, include_root=not include_psychic))
        
        # Month digits
        digits.extend(self.extract_month_digits(month))
        
        # Year digits (last two digits)
        digits.extend(self.extract_year_digits(year))
        
        # Destiny digit
        digits.append(destiny)
        
        # Add root via psychic extra rule if applicable
        if include_psychic:
            digits.append(root)
        
        return digits
    
    def build_natal_grid(self, digits: List[int]) -> Dict[int, str]:
        """
        Convert digits into grid cell values.
        For each number 1..9, count occurrences and create string representation.
        Example: 6 occurs 3 times → "666", 3 occurs 1 time → "3"
        """
        grid = {}
        
        # Count occurrences for each number 1-9
        for num in range(1, 10):
            count = digits.count(num)
            if count > 0:
                grid[num] = str(num) * count  # "6" * 3 = "666"
            else:
                grid[num] = None
        
        return grid
    
    def get_natal_grid_array(self, grid: Dict[int, str]) -> List[List[Optional[str]]]:
        """
        Convert grid dictionary to 3x3 array format matching Lo Shu positions.
        Returns: [[top_row], [middle_row], [bottom_row]]
        """
        result = [[None, None, None], [None, None, None], [None, None, None]]
        
        for num, value in grid.items():
            if value is not None:
                row, col = self.LO_SHU_POSITIONS[num]
                result[row][col] = value
        
        return result
    
    def generate_mahadasha_timeline(self, dob_date: datetime, root: int, years_ahead: int = 100) -> List[Dict[str, Any]]:
        """
        Generate Mahadasha timeline starting from root.
        Each dasha has a number 1-9, duration equals the number.
        Sequence wraps after 9.
        """
        timeline = []
        current_date = dob_date
        current_dasha = root
        
        end_date = datetime(dob_date.year + years_ahead, dob_date.month, dob_date.day)
        
        while current_date < end_date:
            # Calculate end date: start + dasha years - 1 day
            dasha_years = current_dasha
            end_dasha_date = datetime(
                current_date.year + dasha_years,
                current_date.month,
                current_date.day
            ) - timedelta(days=1)
            
            # Don't exceed end_date
            if end_dasha_date > end_date:
                end_dasha_date = end_date
            
            timeline.append({
                "dasha_number": current_dasha,
                "start_date": current_date.isoformat(),
                "end_date": end_dasha_date.isoformat(),
                "duration_years": dasha_years
            })
            
            # Move to next dasha
            current_date = end_dasha_date + timedelta(days=1)
            current_dasha = (current_dasha % 9) + 1  # Wrap after 9
        
        return timeline
    
    def get_mahadasha_for_date(self, timeline: List[Dict[str, Any]], query_date: datetime) -> Optional[int]:
        """
        Find current Mahadasha for a given date.
        Returns the dasha number active on that date.
        """
        # Normalize query_date to date only (remove time component)
        query_date_only = query_date.date()
        
        for period in timeline:
            start_str = period["start_date"]
            end_str = period["end_date"]
            
            # Parse dates (handle both datetime and date strings)
            if 'T' in start_str:
                start = datetime.fromisoformat(start_str).date()
            else:
                start = datetime.fromisoformat(start_str + 'T00:00:00').date()
            
            if 'T' in end_str:
                end = datetime.fromisoformat(end_str).date()
            else:
                end = datetime.fromisoformat(end_str + 'T00:00:00').date()
            
            if start <= query_date_only <= end:
                logger.debug(f"Found Mahadasha {period['dasha_number']} for date {query_date_only} (period: {start} to {end})")
                return period["dasha_number"]
        
        logger.warning(f"No Mahadasha found for date {query_date_only}. Timeline covers {len(timeline)} periods.")
        if timeline:
            logger.debug(f"First period: {timeline[0]['start_date']} to {timeline[0]['end_date']}")
            logger.debug(f"Last period: {timeline[-1]['start_date']} to {timeline[-1]['end_date']}")
        return None
    
    def weekday_to_planet(self, date: datetime) -> int:
        """
        Map weekday to planet number.
        Sunday=1, Monday=2, Tuesday=9, Wednesday=5, Thursday=3, Friday=6, Saturday=8
        
        Python weekday(): 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
        Convert to: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
        """
        weekday = date.weekday()  # 0=Monday, 6=Sunday in Python
        # Convert to Sunday=0 format
        if weekday == 6:  # Sunday
            weekday = 0
        else:  # Monday-Saturday: 0→1, 1→2, ..., 5→6
            weekday = weekday + 1
        
        return self.WEEKDAY_PLANET_MAP[weekday]
    
    def calculate_antardasha(self, year: int, day: int, month: int, review_date: datetime, dob_root: Optional[int] = None) -> int:
        """
        Calculate Antardasha for a given year.
        Formula: weekday_planet + yy + root (from DOB) + month
        Example for 2024: weekday_planet(2) + yy(24) + root(8 from DOB) + month(2) = 36 → 9
        """
        yy = year % 100
        weekday_planet = self.weekday_to_planet(review_date)
        
        # Use root from DOB if provided, otherwise calculate from day
        if dob_root is None:
            root = self.reduce_to_single(day)
        else:
            root = dob_root
        
        # Month number (not reduced)
        month_num = month
        
        total = weekday_planet + yy + root + month_num
        return self.reduce_to_single(total)
    
    def generate_year_table(self, dob_date: datetime, root: int, month: int, day: int, 
                          start_year: Optional[int] = None, end_year: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Generate year table with Mahadasha and Antardasha for each year.
        Default: from birth year to birth year + 100.
        """
        if start_year is None:
            start_year = dob_date.year
        if end_year is None:
            end_year = dob_date.year + 100
        
        # Generate mahadasha timeline - need to cover from DOB to end_year
        # Calculate years ahead from DOB to end_year (not from start_year)
        # Add extra buffer to ensure we cover the end_year
        years_ahead = max(end_year - dob_date.year + 10, 120)  # Ensure at least 120 years or enough to cover end_year
        timeline = self.generate_mahadasha_timeline(dob_date, root, years_ahead=years_ahead)
        
        # Debug logging
        logger.debug(f"Generated Mahadasha timeline: {len(timeline)} periods from {dob_date.year} to {dob_date.year + years_ahead}")
        if timeline:
            logger.debug(f"First period: Dasha {timeline[0]['dasha_number']} from {timeline[0]['start_date']} to {timeline[0]['end_date']}")
            logger.debug(f"Last period: Dasha {timeline[-1]['dasha_number']} from {timeline[-1]['start_date']} to {timeline[-1]['end_date']}")
        
        year_table = []
        for year in range(start_year, end_year + 1):
            # Create review date (birthday in that year)
            try:
                review_date = datetime(year, month, day)
            except ValueError:
                # Handle Feb 29 case
                review_date = datetime(year, month, 28)
            
            maha = self.get_mahadasha_for_date(timeline, review_date)
            antar = self.calculate_antardasha(year, day, month, review_date, dob_root=root)
            
            year_table.append({
                "year": year,
                "review_date": review_date.isoformat(),
                "maha_number": maha,
                "antar_number": antar
            })
        
        return year_table
    
    def build_review_year_grid(self, natal_grid: Dict[int, str], maha: int, antar: int) -> Dict[int, str]:
        """
        Build Review Year Grid overlay (Natal + Maha + Antar).
        For each number n: yearCell[n] = natalCell[n] + (maha==n ? n : "") + (antar==n ? n : "")
        """
        review_grid = {}
        
        for num in range(1, 10):
            natal_value = natal_grid.get(num) or ""
            maha_value = str(num) if maha == num else ""
            antar_value = str(num) if antar == num else ""
            
            combined = natal_value + maha_value + antar_value
            review_grid[num] = combined if combined else None
        
        return review_grid
    
    def calculate_personal_year(self, birth_month: int, birth_day: int, target_year: int) -> int:
        """
        Calculate Personal Year Number.
        Formula: reduceToSingle(birthMonth + birthDay + reducedYear)
        """
        reduced_year = self.reduce_to_single(target_year)
        total = birth_month + birth_day + reduced_year
        return self.reduce_to_single(total)
    
    def calculate_personal_month(self, personal_year: int, calendar_month: int) -> int:
        """
        Calculate Personal Month Number.
        Formula: reduceToSingle(PersonalYear + calendarMonthNumber)
        """
        total = personal_year + calendar_month
        return self.reduce_to_single(total)
    
    def build_mahadasha_base_grid(self, natal_grid: Dict[int, str], maha: int, personal_year: int, 
                                  basic_numbers: List[int]) -> Dict[int, str]:
        """
        Build the fixed base grid for a Mahadasha-Antardasha cycle.
        This base grid is computed ONCE per year and reused for all periods.
        
        Base Grid = Natal + Mahadasha + Personal Year + Basic Numbers
        
        Args:
            natal_grid: The natal grid dictionary
            maha: Mahadasha number
            personal_year: Personal Year number
            basic_numbers: List of basic numbers [reduced_day, reduced_year]
        
        Returns:
            Base grid dictionary (fixed for the year)
        """
        # Start with natal grid (copy)
        base_grid = {}
        for num in range(1, 10):
            natal_value = natal_grid.get(num)
            base_grid[num] = natal_value if natal_value else ""
        
        # Add Mahadasha number
        if maha and 1 <= maha <= 9:
            current_value = base_grid.get(maha) or ""
            base_grid[maha] = current_value + str(maha)
        
        # Add Personal Year number
        if personal_year and 1 <= personal_year <= 9:
            current_value = base_grid.get(personal_year) or ""
            base_grid[personal_year] = current_value + str(personal_year)
        
        # Add Basic Numbers
        for basic_num in basic_numbers:
            if basic_num and 1 <= basic_num <= 9:
                current_value = base_grid.get(basic_num) or ""
                base_grid[basic_num] = current_value + str(basic_num)
        
        return base_grid
    
    
    def generate_monthly_grids(self, dob_date: datetime, root: int, month: int, day: int, 
                               target_year: int, natal_grid_dict: Dict[int, str]) -> List[Dict[str, Any]]:
        """
        Generate monthly grids for a given year based on birthdate anniversary.
        Uses PratyantarService for period calculations and grid building.
        
        IMPORTANT: 
        - Natal grid stays DOB-based (uses dob_date.year)
        - Base grid review layer uses target_year (for Personal Year, Basic Numbers year component)
        - Mahadasha timeline must cover full range (120 years) to work for any review year
        """
        # Generate mahadasha timeline for full range (120 years) to work for any review year
        timeline = self.generate_mahadasha_timeline(dob_date, root, years_ahead=120)
        
        # Get Mahadasha for the year (using the birthday of target year)
        try:
            year_birthday = datetime(target_year, month, day)
        except ValueError:
            year_birthday = datetime(target_year, month, 28)
        
        maha = self.get_mahadasha_for_date(timeline, year_birthday)
        
        # Calculate Antardasha for the target year
        try:
            year_birthday_for_antar = datetime(target_year, month, day)
        except ValueError:
            year_birthday_for_antar = datetime(target_year, month, 28)
        
        antar = self.calculate_antardasha(target_year, day, month, year_birthday_for_antar, dob_root=root)
        
        # Build annual grid: Natal + Mahadasha + Antardasha (same as in calculate_numerology)
        # Start with natal grid dict (convert to counts for period grid building)
        annual_grid_dict = {}
        for num in range(1, 10):
            natal_value = natal_grid_dict.get(num)
            annual_grid_dict[num] = natal_value if natal_value else ""
        
        # Add Mahadasha (always added)
        if maha is not None and 1 <= maha <= 9:
            current_value = annual_grid_dict.get(maha) or ""
            annual_grid_dict[maha] = current_value + str(maha)
        
        # Add Antardasha (always added)
        if antar is not None and 1 <= antar <= 9:
            current_value = annual_grid_dict.get(antar) or ""
            annual_grid_dict[antar] = current_value + str(antar)
        
        # Convert annual grid dict to counts format for period grid building
        annual_grid_counts = {}
        for num in range(1, 10):
            value = annual_grid_dict.get(num) or ""
            if value:
                annual_grid_counts[num] = len(value)  # Count of digits
            else:
                annual_grid_counts[num] = 0
        
        # Debug logging
        logger.debug(f"Annual grid dict for year {target_year}: {annual_grid_dict}")
        logger.debug(f"Annual grid counts for year {target_year} (Natal + Mahadasha {maha} + Antardasha {antar}): {annual_grid_counts}")
        
        # Generate pratyantar periods using the service (pass dob_root for antardasha calculation)
        periods = self.pratyantar_service.generate_pratyantar_periods(
            target_year, day, month, dob_date.year, dob_root=root
        )
        
        # Build grids for each period
        # Each period grid = base_counts + exactly +1 for Pratyantar (Antardasha) number
        monthly_grids = []
        for period_index, period in enumerate(periods, start=1):
            pratyantar = period['pratyantar']
            period_start_date = period['start_date']
            
            # Get Mahadasha for THIS PERIOD (from timeline, using period start date) - for display only
            period_maha = self.get_mahadasha_for_date(timeline, period_start_date)
            
            # Calculate Personal Year and Personal Month for this period (for display/interpretation only, NOT added to grid)
            personal_year = self.calculate_personal_year(month, day, target_year)
            calendar_month = period_start_date.month
            personal_month = self.calculate_personal_month(personal_year, calendar_month)
            
            # Build period grid: annual_grid_counts + exactly +1 for Pratyantar (Antardasha) number
            period_grid_dict = self.pratyantar_service.build_period_grid(
                annual_grid_counts, pratyantar
            )
            period_grid_array = self.get_natal_grid_array(period_grid_dict)
            
            monthly_grids.append({
                "year": target_year,
                "month": period_index,
                "month_name": period_start_date.strftime("%B"),
                "start_date": period_start_date.isoformat(),
                "end_date": period['end_date'].isoformat(),
                "date_range": f"{period['start']} to {period['end']}",
                "maha_number": period_maha,  # Mahadasha for this specific period (display only)
                "antar_number": pratyantar,  # Pratyantar (Antardasha) - this is what's added to grid
                "personal_year": personal_year,
                "personal_month": personal_month,
                "grid": period_grid_array
            })
        
        return monthly_grids
    
    def calculate_numerology(self, birthdate: str, start_year: Optional[int] = None, end_year: Optional[int] = None) -> Dict[str, Any]:
        """
        Main calculation function - calculates all numerology values.
        
        Args:
            birthdate: Birthdate in DD/MM/YYYY format (e.g., "30/06/1986")
            start_year: Start year for year range (defaults to birth year)
            end_year: End year for year range (defaults to birth year + 100)
        
        Returns:
            Complete numerology calculation result
        """
        try:
            # Parse and validate birthdate
            parts = birthdate.split('/')
            if len(parts) != 3:
                raise ValueError("Birthdate must be in DD/MM/YYYY format")
            
            day = int(parts[0])
            month = int(parts[1])
            year = int(parts[2])
            
            # Validate date
            dob_date = datetime(year, month, day)
            
            # Calculate core numbers
            root = self.calculate_root_number(day)
            month_num = self.calculate_month_number(month)
            year_num = self.calculate_year_number(year)
            destiny = self.calculate_destiny_number(root, month_num, year_num)
            
            # Build Natal grid
            natal_digits = self.build_natal_grid_digits(day, month, year, destiny)
            natal_grid_dict = self.build_natal_grid(natal_digits)
            natal_grid_array = self.get_natal_grid_array(natal_grid_dict)
            
            # Generate Mahadasha timeline (needed for year calculations)
            # Ensure it covers enough years to reach end_year
            years_ahead = max((end_year or (year + 100)) - year + 10, 120)
            mahadasha_timeline = self.generate_mahadasha_timeline(dob_date, root, years_ahead=years_ahead)
            
            # Generate year table with custom range (will use the same timeline logic)
            year_table = self.generate_year_table(dob_date, root, month, day, start_year, end_year)
            
            # Generate grids for all years in the range
            # Each grid represents a year period from birthdate anniversary to next anniversary
            year_grids = []
            for year_entry in year_table:
                year_num = year_entry["year"]
                maha = year_entry["maha_number"]
                antar = year_entry["antar_number"]
                
                # Calculate date range for this year period
                # Start: birthday in year_num
                # End: day before birthday in year_num + 1
                try:
                    period_start = datetime(year_num, month, day)
                except ValueError:
                    # Handle Feb 29 case
                    period_start = datetime(year_num, month, 28)
                
                try:
                    period_end = datetime(year_num + 1, month, day) - timedelta(days=1)
                except ValueError:
                    # Handle Feb 29 case
                    period_end = datetime(year_num + 1, month, 28) - timedelta(days=1)
                
                # Build annual grid: Natal + Mahadasha + Antardasha only
                # Personal Year and Basic Numbers are NOT added to annual grid (only for period grids)
                
                # Start with natal grid (copy)
                annual_grid_dict = {}
                for num in range(1, 10):
                    natal_value = natal_grid_dict.get(num)
                    annual_grid_dict[num] = natal_value if natal_value else ""
                
                # Debug logging
                logger.debug(f"Year {year_num}: Natal grid dict = {natal_grid_dict}")
                logger.debug(f"Year {year_num}: Mahadasha from year_table = {maha}, Antardasha = {antar}")
                
                # If maha is None from year_table, try to get it directly from timeline
                if maha is None:
                    logger.warning(f"Year {year_num}: Mahadasha is None from year_table, trying timeline lookup...")
                    try:
                        review_date = datetime(year_num, month, day)
                    except ValueError:
                        review_date = datetime(year_num, month, 28)
                    maha = self.get_mahadasha_for_date(mahadasha_timeline, review_date)
                    logger.debug(f"Year {year_num}: Mahadasha from timeline lookup = {maha}")
                
                # Add Mahadasha (always added)
                if maha is not None and 1 <= maha <= 9:
                    current_value = annual_grid_dict.get(maha) or ""
                    annual_grid_dict[maha] = current_value + str(maha)
                    logger.debug(f"Year {year_num}: Added Mahadasha {maha}, position {maha} now = '{annual_grid_dict[maha]}'")
                else:
                    logger.error(f"Year {year_num}: Cannot add Mahadasha - value is None or invalid: {maha}")
                
                # Add Antardasha (always added)
                if antar is not None and 1 <= antar <= 9:
                    current_value = annual_grid_dict.get(antar) or ""
                    annual_grid_dict[antar] = current_value + str(antar)
                    logger.debug(f"Year {year_num}: Added Antardasha {antar}, position {antar} now = '{annual_grid_dict[antar]}'")
                else:
                    logger.warning(f"Year {year_num}: Cannot add Antardasha - value is None or invalid: {antar}")
                
                # Convert to final format (None for empty cells)
                for num in range(1, 10):
                    value = annual_grid_dict.get(num) or ""
                    annual_grid_dict[num] = value if value else None
                
                logger.debug(f"Year {year_num}: Final annual grid dict = {annual_grid_dict}")
                
                year_grid_array = self.get_natal_grid_array(annual_grid_dict)
                
                year_grids.append({
                    "year": year_num,
                    "start_date": period_start.isoformat(),
                    "end_date": period_end.isoformat(),
                    "start_year": period_start.year,
                    "end_year": period_end.year,
                    "maha_number": maha,
                    "antar_number": antar,
                    "grid": year_grid_array
                })
            
            return {
                "birthdate": birthdate,
                "day": day,
                "month": month,
                "year": year,
                "root_number": root,
                "destiny_number": destiny,
                "natal_grid": natal_grid_array,
                "natal_grid_dict": {k: v for k, v in natal_grid_dict.items() if v is not None},
                "year_grids": year_grids,
                "start_year": start_year or year,
                "end_year": end_year or (year + 100)
            }
        except Exception as e:
            logger.error(f"Error calculating numerology: {e}", exc_info=True)
            raise
