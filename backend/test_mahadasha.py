from datetime import datetime, timedelta

dob = datetime(1982, 2, 26)
root = 8
current_date = dob
current_dasha = root

print("Mahadasha Timeline for DOB 26/02/1982 (Root=8):")
print("=" * 60)

periods = []
for i in range(15):
    dasha_years = current_dasha
    end_dasha_date = datetime(
        current_date.year + dasha_years,
        current_date.month,
        current_date.day
    ) - timedelta(days=1)
    
    periods.append({
        'dasha': current_dasha,
        'start': current_date,
        'end': end_dasha_date
    })
    
    print(f"Dasha {current_dasha}: {current_date.strftime('%d/%m/%Y')} to {end_dasha_date.strftime('%d/%m/%Y')} ({dasha_years} years)")
    
    # Move to next period
    current_date = end_dasha_date + timedelta(days=1)
    current_dasha = (current_dasha % 9) + 1
    
    if current_date.year > 2030:
        break

print("\n" + "=" * 60)
print("Checking which Mahadasha applies to 2025:")
print("=" * 60)

query_date = datetime(2025, 2, 26)
for p in periods:
    if p['start'] <= query_date <= p['end']:
        print(f"✓ 26/02/2025 falls in Dasha {p['dasha']} period")
        print(f"  Period: {p['start'].strftime('%d/%m/%Y')} to {p['end'].strftime('%d/%m/%Y')}")
        break
else:
    print("✗ No Mahadasha found for 2025")

print("\nChecking which Mahadasha applies to 2026:")
query_date = datetime(2026, 2, 26)
for p in periods:
    if p['start'] <= query_date <= p['end']:
        print(f"✓ 26/02/2026 falls in Dasha {p['dasha']} period")
        print(f"  Period: {p['start'].strftime('%d/%m/%Y')} to {p['end'].strftime('%d/%m/%Y')}")
        break
else:
    print("✗ No Mahadasha found for 2026")
