/**
 * Views - Main Numerology Page
 */

import { useNumerology } from '@/controllers/useNumerology';
import { BirthdateInput } from '@/views/components/BirthdateInput';
import { NumberCard } from '@/views/components/NumberCard';
import { NatalGrid } from '@/views/components/NatalGrid';
import { YearRangeSelector } from '@/views/components/YearRangeSelector';
import { NumerologyApiService } from '@/models/api';
import type { MonthlyGrid, YearGrid } from '@/models/types';
import { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { Loader2, X } from 'lucide-react';

// Helper to format date as dd-mmm-yyyy (e.g., 01-Jan-2024)
// Handles dd/mm/yyyy format from backend
function formatDateDDMMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  
  // If it's a range like "15/01/2024 to 14/02/2024", format both parts
  if (dateStr.includes(' to ')) {
    const [start, end] = dateStr.split(' to ');
    return `${formatSingleDate(start)} to ${formatSingleDate(end)}`;
  }
  
  return formatSingleDate(dateStr);
}

function formatSingleDate(dateStr: string): string {
  if (!dateStr) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  try {
    // Handle dd/mm/yyyy format from backend
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const monthIdx = parseInt(parts[1], 10) - 1;
        const year = parts[2];
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day}-${months[monthIdx]}-${year}`;
        }
      }
    }
    
    // Fallback: try ISO format
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
    
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function NumerologyPage() {
  const [birthdate, setBirthdate] = useState('');
  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);
  const [monthlyGridsCache, setMonthlyGridsCache] = useState<Record<number, MonthlyGrid[]>>({});
  // Overlay state: which year is open in overlay
  const [overlayYear, setOverlayYear] = useState<{ yearGrid: YearGrid; periods: MonthlyGrid[] } | null>(null);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const { result, loading, error, calculate, reset } = useNumerology();

  const birthYear = useMemo(() => {
    if (!birthdate) return null;
    const parts = birthdate.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      return parseInt(parts[2]);
    }
    return null;
  }, [birthdate]);

  // Validate if calculate button should be enabled
  const canCalculate = useMemo(() => {
    if (!birthdate) return false;
    const parts = birthdate.split('/');
    if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
      return false;
    }
    // Check if birthdate is valid
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
      return false;
    }
    // Check if year range is provided and valid
    if (startYear === null || endYear === null) {
      return false;
    }
    // Check if start year is after birth year
    if (birthYear !== null && startYear < birthYear) {
      return false;
    }
    // Check if end year is after start year
    if (endYear <= startYear) {
      return false;
    }
    return true;
  }, [birthdate, startYear, endYear, birthYear]);

  const handleCalculate = async () => {
    if (!canCalculate) return;
    await calculate(birthdate, startYear, endYear);
  };

  const handleReset = () => {
    reset();
    setBirthdate('');
    setStartYear(null);
    setEndYear(null);
    setMonthlyGridsCache({});
    setOverlayYear(null);
    setLoadingOverlay(false);
  };

  // Click year grid → open overlay with all periods
  const handleYearGridClick = async (yearGrid: YearGrid) => {
    if (!birthdate || !result) return;

    // If periods already cached, open overlay immediately
    if (monthlyGridsCache[yearGrid.year]) {
      setOverlayYear({ yearGrid, periods: monthlyGridsCache[yearGrid.year] });
      return;
    }

    // Fetch periods and open overlay
    setLoadingOverlay(true);
    setOverlayYear({ yearGrid, periods: [] }); // Show overlay with loading state
    
    try {
      const response = await NumerologyApiService.getMonthlyGrids(birthdate, yearGrid.year);
      const periods = response.monthly_grids;
      setMonthlyGridsCache(prev => ({ ...prev, [yearGrid.year]: periods }));
      setOverlayYear({ yearGrid, periods });
    } catch (err) {
      console.error('Failed to load period grids:', err);
      setOverlayYear(null);
    } finally {
      setLoadingOverlay(false);
    }
  };

  const closeOverlay = () => {
    setOverlayYear(null);
  };

  return (
    <div className="min-h-screen bg-white py-4 px-3">
      <div className="max-w-6xl mx-auto space-y-4 relative z-10">
        {/* Compact Input Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Birthdate Input - Inline */}
            <div className="flex-1 min-w-[200px]">
              <BirthdateInput
                value={birthdate}
                onChange={setBirthdate}
                loading={loading}
                error={error}
              />
            </div>
            
            {/* Year Range - Inline */}
            {birthdate && birthYear !== null && (
              <>
                <div className="flex-1 min-w-[280px]">
                  <YearRangeSelector
                    startYear={startYear}
                    endYear={endYear}
                    onStartYearChange={setStartYear}
                    onEndYearChange={setEndYear}
                    birthYear={birthYear}
                  />
                </div>
                
                {/* Calculate Button - Inline */}
                <button
                  onClick={handleCalculate}
                  disabled={loading || !canCalculate}
                  className={cn(
                    "px-6 py-2 rounded-lg font-semibold text-sm",
                    "bg-slate-700 text-white",
                    "hover:bg-slate-800",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors"
                  )}
                >
                  {loading ? 'Calculating...' : 'Calculate'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Results Section - Compact */}
        {result && (
          <div className="space-y-4 animate-fade-in">
            {/* Core Numbers + Natal Grid side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Core Numbers - Compact */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 text-center">Core Numbers</h3>
                <div className="flex gap-3 justify-center">
                  <NumberCard label="Root" value={result.root_number} color="blue" />
                  <NumberCard label="Destiny" value={result.destiny_number} color="orange" />
                </div>
              </div>

              {/* Natal Grid - Compact */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 text-center">Natal Grid</h3>
                <NatalGrid 
                  grid={result.natal_grid}
                  rootNumber={result.root_number}
                  destinyNumber={result.destiny_number}
                  isPeriodGrid={false}
                />
              </div>
            </div>


            {/* Year Grids - Compact grid layout */}
            {result.year_grids && result.year_grids.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Year Grids ({result.start_year} - {result.end_year})
                  </h3>
                  <button
                    onClick={handleReset}
                    className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                  >
                    Reset
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {result.year_grids.map((yearGrid) => (
                    <button
                      key={yearGrid.year}
                      onClick={() => handleYearGridClick(yearGrid)}
                      className="bg-slate-50 rounded border border-slate-200 p-2 hover:border-slate-400 hover:bg-white transition-all text-left"
                    >
                      <div className="text-xs font-semibold text-slate-700 mb-1">
                        {yearGrid.start_year}-{yearGrid.end_year}
                      </div>
                      <div className="flex gap-1 text-[10px] mb-2">
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                          M:{yearGrid.maha_number || '?'}
                        </span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          A:{yearGrid.antar_number}
                        </span>
                      </div>
                      <div className="transform scale-75 origin-top-left -mb-6">
                        <NatalGrid 
                          grid={yearGrid.grid} 
                          title=""
                          rootNumber={result.root_number}
                          destinyNumber={result.destiny_number}
                          mahadasha={yearGrid.maha_number}
                          antardasha={yearGrid.antar_number}
                          isPeriodGrid={false}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full Year Overlay Modal - Compact */}
        {overlayYear && result && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-2">
            <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full mx-2 relative">
              {/* Modal Header - Compact */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-2 rounded-t-lg flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-900">
                    {overlayYear.yearGrid.start_year} - {overlayYear.yearGrid.end_year}
                  </span>
                  {/* Summary badges inline */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">R:{result.root_number}</span>
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">D:{result.destiny_number}</span>
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">M:{overlayYear.yearGrid.maha_number || '?'}</span>
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">A:{overlayYear.yearGrid.antar_number}</span>
                  </div>
                </div>
                <button
                  onClick={closeOverlay}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Modal Content - Compact */}
              <div className="p-3 space-y-3">
                {/* Natal and Annual grids side by side */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {/* Natal Grid */}
                  <div className="bg-slate-50 rounded p-2 border border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-700 mb-1 text-center">Natal</h4>
                    <NatalGrid 
                      grid={result.natal_grid}
                      title=""
                      rootNumber={result.root_number}
                      destinyNumber={result.destiny_number}
                      isPeriodGrid={false}
                    />
                  </div>

                  {/* Annual Grid */}
                  <div className="bg-slate-50 rounded p-2 border border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-700 mb-1 text-center">Annual</h4>
                    <NatalGrid 
                      grid={overlayYear.yearGrid.grid}
                      title=""
                      rootNumber={result.root_number}
                      destinyNumber={result.destiny_number}
                      mahadasha={overlayYear.yearGrid.maha_number}
                      antardasha={overlayYear.yearGrid.antar_number}
                      isPeriodGrid={false}
                    />
                  </div>
                </div>

                {/* All Period Grids */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Period Grids</h4>
                  
                  {loadingOverlay ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                      <span className="ml-2 text-sm text-slate-600">Loading...</span>
                    </div>
                  ) : overlayYear.periods.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {overlayYear.periods.map((period) => (
                        <div
                          key={`${period.year}-${period.month}`}
                          className="bg-purple-50 rounded p-2 border border-purple-200"
                        >
                          <div className="text-[10px] font-semibold text-slate-700 mb-1 text-center leading-tight">
                            {formatDateDDMMMYYYY(period.date_range || '')}
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-0.5 text-[9px] mb-1">
                            <span className="px-1 py-0.5 bg-red-100 text-red-700 rounded">M:{period.maha_number || '?'}</span>
                            <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded">A:{overlayYear.yearGrid.antar_number}</span>
                            <span className="px-1 py-0.5 bg-purple-200 text-purple-800 rounded">P:{period.antar_number}</span>
                          </div>
                          <NatalGrid 
                            grid={period.grid}
                            title=""
                            rootNumber={result.root_number}
                            destinyNumber={result.destiny_number}
                            mahadasha={period.maha_number}
                            antardasha={overlayYear.yearGrid.antar_number}
                            pratyantar={period.antar_number}
                            isPeriodGrid={true}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No period grids available
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
