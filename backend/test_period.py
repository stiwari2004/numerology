"""
Test script to calculate grid for specific period: 05/09/2024 to 22/10/2024
"""
from datetime import datetime
from services.numerology_service import NumerologyService
from services.pratyantar_service import PratyantarService

# Initialize services
service = NumerologyService()
pratyantar_service = PratyantarService(service)

# DOB: 26/02/1982
dob_date = datetime(1982, 2, 26)
day = 26
month = 2
year = 1982
target_year = 2024

# Calculate core numbers
root = service.calculate_root_number(day)
month_num = service.calculate_month_number(month)
year_num = service.calculate_year_number(year)
destiny = service.calculate_destiny_number(root, month_num, year_num)

print(f"DOB: {day}/{month}/{year}")
print(f"Root: {root}, Destiny: {destiny}")
print(f"\n=== Testing Year {target_year} ===\n")

# Generate mahadasha timeline
timeline = service.generate_mahadasha_timeline(dob_date, root, years_ahead=120)

# Get Mahadasha for 2024
year_birthday = datetime(target_year, month, day)
maha = service.get_mahadasha_for_date(timeline, year_birthday)
print(f"Mahadasha for {target_year}: {maha}")

# Calculate Personal Year
personal_year = service.calculate_personal_year(month, day, target_year)
print(f"Personal Year: {personal_year}")

# Calculate Basic Numbers (using target_year)
basic_numbers = service.calculate_basic_numbers(day, target_year)
print(f"Basic Numbers: {basic_numbers}")

# Build Natal grid (DOB-based)
natal_digits = service.build_natal_grid_digits(day, month, year, destiny)
natal_counts = pratyantar_service.count_digits(natal_digits)
print(f"Natal digits: {natal_digits}")
print(f"Natal counts: {natal_counts}")

# Build base counts
base_counts = pratyantar_service.build_mahadasha_base_counts(
    natal_counts, maha or 0, personal_year, basic_numbers
)
print(f"\nBase counts: {base_counts}")

# Generate periods
periods = pratyantar_service.generate_pratyantar_periods(
    target_year, day, month, year, dob_root=root
)

# Find the period containing 05/09/2024
test_date = datetime(2024, 9, 5)
print(f"\n=== Looking for period containing {test_date.strftime('%d/%m/%Y')} ===\n")

for idx, period in enumerate(periods, 1):
    start = period['start_date']
    end = period['end_date']
    pratyantar = period['pratyantar']
    
    print(f"P{idx}: pratyantar={pratyantar}, {start.strftime('%d/%m/%Y')} to {end.strftime('%d/%m/%Y')}")
    
    if start <= test_date <= end:
        print(f"\n*** FOUND: Period {idx} contains the test date ***")
        print(f"Pratyantar: {pratyantar}")
        
        # Build grid for this period
        period_grid = pratyantar_service.build_period_grid(base_counts, pratyantar)
        print(f"\nPeriod grid dict: {period_grid}")
        
        # Convert to array
        grid_array = service.get_natal_grid_array(period_grid)
        print(f"\nGrid Array:")
        print(f"Top row:    {grid_array[0]}")
        print(f"Middle row: {grid_array[1]}")
        print(f"Bottom row: {grid_array[2]}")
        break
