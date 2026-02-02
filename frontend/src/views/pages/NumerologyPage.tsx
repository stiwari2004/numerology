/**
 * Views - Main Numerology Page
 */

import { useNumerology } from '@/controllers/useNumerology';
import { BirthdateInput } from '@/views/components/BirthdateInput';
import { NumberCard } from '@/views/components/NumberCard';
import { NatalGrid } from '@/views/components/NatalGrid';
import { YearRangeSelector } from '@/views/components/YearRangeSelector';
import { NumerologyApiService } from '@/models/api';
import type { MonthlyGrid } from '@/models/types';
import { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export function NumerologyPage() {
  const [birthdate, setBirthdate] = useState('');
  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [monthlyGrids, setMonthlyGrids] = useState<Record<number, MonthlyGrid[]>>({});
  const [loadingMonthlyGrids, setLoadingMonthlyGrids] = useState<number | null>(null);
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
    setExpandedYear(null);
    setMonthlyGrids({});
    setLoadingMonthlyGrids(null);
  };

  const handleYearGridClick = async (year: number) => {
    if (!birthdate || !result) return;

    // If already expanded, collapse it
    if (expandedYear === year) {
      setExpandedYear(null);
      return;
    }

    // If monthly grids already loaded, just expand
    if (monthlyGrids[year]) {
      setExpandedYear(year);
      return;
    }

    // Fetch monthly grids
    setLoadingMonthlyGrids(year);
    setExpandedYear(year);
    
    try {
      const response = await NumerologyApiService.getMonthlyGrids(birthdate, year);
      setMonthlyGrids(prev => ({
        ...prev,
        [year]: response.monthly_grids
      }));
    } catch (err) {
      console.error('Failed to load monthly grids:', err);
      setExpandedYear(null);
    } finally {
      setLoadingMonthlyGrids(null);
    }
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


            {/* Year Grids */}
            {result.year_grids && result.year_grids.length > 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    Year Grids
                  </h2>
                  <p className="text-slate-600 font-medium">
                    {result.start_year} - {result.end_year} ({result.year_grids.length} years)
                  </p>
                </div>
                <div className="space-y-4">
                  {result.year_grids.map((yearGrid) => {
                    const isExpanded = expandedYear === yearGrid.year;
                    const isLoading = loadingMonthlyGrids === yearGrid.year;
                    const months = monthlyGrids[yearGrid.year] || [];

                    return (
                      <div
                        key={yearGrid.year}
                        className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
                      >
                        {/* Year Grid Header - Clickable */}
                        <div
                          onClick={() => handleYearGridClick(yearGrid.year)}
                          className={cn(
                            "p-5 cursor-pointer transition-colors duration-150",
                            "bg-white hover:bg-white",
                            isExpanded && "border-b border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between">
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
                            <div className="ml-4">
                              {isLoading ? (
                                <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                              ) : isExpanded ? (
                                <ChevronUp className="h-6 w-6 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-6 w-6 text-slate-400" />
                              )}
                            </div>
                          </div>
                          {/* Always show annual grid */}
                          <div className="mt-4">
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

                        {/* Monthly Grids - Expanded View */}
                        {isExpanded && (
                          <div className="p-6 pt-0 border-t border-slate-200 bg-white">
                            {isLoading ? (
                              <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
                                <span className="ml-2 text-sm text-slate-600">Loading monthly grids...</span>
                              </div>
                            ) : months.length > 0 ? (
                              <div className="space-y-4">
                                <div className="text-center mb-4">
                                  <h4 className="text-lg font-semibold text-slate-800 mb-1">
                                    Monthly Grids for {yearGrid.year}
                                  </h4>
                                  <p className="text-xs text-slate-600">
                                    Period breakdowns for this year
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {months.map((monthGrid) => (
                                    <div
                                      key={`${monthGrid.year}-${monthGrid.month}`}
                                      className="bg-white rounded border border-slate-200 p-3 hover:border-slate-300 transition-colors"
                                    >
                                      <div className="mb-2 pb-2 border-b border-slate-200">
                                        <h5 className="text-sm font-semibold text-slate-800 mb-1.5">
                                          {monthGrid.date_range || `${monthGrid.month_name} ${monthGrid.year}`}
                                        </h5>
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                          <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 rounded border border-red-200">
                                            <span className="font-medium text-red-700">MD:</span>
                                            <span className="text-red-900 font-semibold">{monthGrid.maha_number || 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-900 rounded border border-blue-900">
                                            <span className="font-medium text-blue-200">AD:</span>
                                            <span className="text-blue-100 font-semibold">{yearGrid.antar_number}</span>
                                          </div>
                                          <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 rounded border border-purple-200">
                                            <span className="font-medium text-purple-700">PD:</span>
                                            <span className="text-purple-900 font-semibold">{monthGrid.antar_number}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <NatalGrid 
                                        grid={monthGrid.grid} 
                                        title=""
                                        rootNumber={result.root_number}
                                        destinyNumber={result.destiny_number}
                                        mahadasha={monthGrid.maha_number}
                                        pratyantar={monthGrid.antar_number}
                                        isPeriodGrid={true}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-slate-500">
                                No monthly grids available
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
      </div>
    </div>
  );
}
