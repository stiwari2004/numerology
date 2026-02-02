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
    <div className="min-h-screen bg-white py-12 px-4">

      <div className="max-w-5xl mx-auto space-y-10 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-3 tracking-tight">
            Numerology Calculator
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto font-medium">
            Discover your Root Number, Destiny Number, and explore your life's journey through the mystical Natal Grid
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
          {/* Birthdate Input */}
          <BirthdateInput
            value={birthdate}
            onChange={setBirthdate}
            loading={loading}
            error={error}
          />
          
          {/* Year Range Selector - Show if birthdate is entered */}
          {birthdate && birthYear !== null && (
            <div className="animate-fade-in pt-4 border-t border-slate-200">
              <YearRangeSelector
                startYear={startYear}
                endYear={endYear}
                onStartYearChange={setStartYear}
                onEndYearChange={setEndYear}
                birthYear={birthYear}
              />
              
              {/* Calculate Button - Below Year Range */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <button
                  onClick={handleCalculate}
                  disabled={loading || !canCalculate}
                  className={cn(
                    "w-full flex items-center justify-center px-8 py-3 rounded-lg font-semibold text-base",
                    "bg-slate-700 text-white",
                    "hover:bg-slate-800",
                    "focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors duration-200"
                  )}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculating...
                    </span>
                  ) : (
                    'Calculate Numerology'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-8 animate-fade-in">
            {/* Core Numbers - Only Root and Destiny */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-slate-800 mb-1">
                  Core Numbers
                </h2>
                <p className="text-sm text-slate-600">Your fundamental numerology values</p>
              </div>
              <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
                <NumberCard label="Root Number" value={result.root_number} color="blue" />
                <NumberCard label="Destiny Number" value={result.destiny_number} color="orange" />
              </div>
            </div>

            {/* Natal Grid */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-slate-800 mb-1">
                  Natal Grid
                </h2>
                <p className="text-sm text-slate-600">Your birth chart visualization</p>
              </div>
              <NatalGrid 
                grid={result.natal_grid}
                rootNumber={result.root_number}
                destinyNumber={result.destiny_number}
                isPeriodGrid={false}
              />
            </div>


            {/* Year Grids - Click to open overlay */}
            {result.year_grids && result.year_grids.length > 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    Year Grids
                  </h2>
                  <p className="text-slate-600 font-medium">
                    {result.start_year} - {result.end_year} ({result.year_grids.length} years)
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Click any year to view all period grids</p>
                </div>
                <div className="space-y-4">
                  {result.year_grids.map((yearGrid) => (
                    <div
                      key={yearGrid.year}
                      onClick={() => handleYearGridClick(yearGrid)}
                      className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:border-slate-400 hover:shadow-md transition-all"
                    >
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">
                              {yearGrid.start_year} - {yearGrid.end_year}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded border border-red-200">
                                <span className="font-medium text-red-700 text-xs">Maha:</span>
                                <span className="text-red-900 font-semibold text-sm">
                                  {yearGrid.maha_number || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-900 rounded border border-blue-900">
                                <span className="font-medium text-white text-xs">Antar:</span>
                                <span className="text-white font-semibold text-sm">
                                  {yearGrid.antar_number}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 text-slate-400 text-sm font-medium">
                            Click to view periods →
                          </div>
                        </div>
                        {/* Annual grid preview */}
                        <NatalGrid 
                          grid={yearGrid.grid} 
                          title="Annual Grid"
                          rootNumber={result.root_number}
                          destinyNumber={result.destiny_number}
                          mahadasha={yearGrid.maha_number}
                          antardasha={yearGrid.antar_number}
                          isPeriodGrid={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reset Button */}
            <div className="text-center pt-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors duration-200"
              >
                Calculate Another
              </button>
            </div>
          </div>
        )}

        {/* Full Year Overlay Modal - Shows Natal, Annual, and ALL Period Grids */}
        {overlayYear && result && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 my-8 relative">
              {/* Modal Header - Sticky */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-xl flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Year Analysis: {overlayYear.yearGrid.start_year} - {overlayYear.yearGrid.end_year}
                  </h2>
                  <p className="text-sm text-slate-600">
                    Natal Grid → Annual Grid → All Period Grids
                  </p>
                </div>
                <button
                  onClick={closeOverlay}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-8">
                {/* Summary badges */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="font-medium text-amber-700 text-sm">Root:</span>
                    <span className="text-amber-900 font-bold text-lg">{result.root_number}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                    <span className="font-medium text-green-700 text-sm">Destiny:</span>
                    <span className="text-green-900 font-bold text-lg">{result.destiny_number}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
                    <span className="font-medium text-red-700 text-sm">MD:</span>
                    <span className="text-red-900 font-bold text-lg">{overlayYear.yearGrid.maha_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-lg border border-blue-300">
                    <span className="font-medium text-blue-700 text-sm">AD:</span>
                    <span className="text-blue-900 font-bold text-lg">{overlayYear.yearGrid.antar_number}</span>
                  </div>
                </div>

                {/* Natal and Annual grids side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Natal Grid */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h3 className="text-center text-lg font-semibold text-slate-800 mb-3">Natal Grid</h3>
                    <NatalGrid 
                      grid={result.natal_grid}
                      title=""
                      rootNumber={result.root_number}
                      destinyNumber={result.destiny_number}
                      isPeriodGrid={false}
                    />
                  </div>

                  {/* Annual Grid */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h3 className="text-center text-lg font-semibold text-slate-800 mb-1">Annual Grid</h3>
                    <p className="text-center text-xs text-slate-500 mb-3">
                      {overlayYear.yearGrid.start_year} - {overlayYear.yearGrid.end_year}
                    </p>
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
                  <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">
                    All Period Grids for {overlayYear.yearGrid.year}
                  </h3>
                  
                  {loadingOverlay ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 text-slate-500 animate-spin" />
                      <span className="ml-3 text-slate-600">Loading period grids...</span>
                    </div>
                  ) : overlayYear.periods.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {overlayYear.periods.map((period) => (
                        <div
                          key={`${period.year}-${period.month}`}
                          className="bg-purple-50 rounded-lg p-4 border border-purple-200"
                        >
                          <h4 className="text-center text-sm font-semibold text-slate-800 mb-1">
                            {formatDateDDMMMYYYY(period.date_range || '')}
                          </h4>
                          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs mb-3">
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                              MD:{period.maha_number || '?'}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                              AD:{overlayYear.yearGrid.antar_number}
                            </span>
                            <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded font-medium">
                              PD:{period.antar_number}
                            </span>
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

              {/* Modal Footer */}
              <div className="sticky bottom-0 border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-xl">
                <button
                  onClick={closeOverlay}
                  className="w-full py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
