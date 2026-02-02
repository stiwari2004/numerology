/**
 * Views - Year Range Selector Component
 */

import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';

interface YearRangeSelectorProps {
  startYear: number | null;
  endYear: number | null;
  onStartYearChange: (year: number | null) => void;
  onEndYearChange: (year: number | null) => void;
  birthYear: number;
}

export function YearRangeSelector({
  startYear,
  endYear,
  onStartYearChange,
  onEndYearChange,
  birthYear,
}: YearRangeSelectorProps) {
  const [startYearInput, setStartYearInput] = useState<string>(startYear?.toString() || '');
  const [endYearInput, setEndYearInput] = useState<string>(endYear?.toString() || '');
  const [startYearError, setStartYearError] = useState<string | null>(null);
  const [endYearError, setEndYearError] = useState<string | null>(null);

  // Sync with props when they change externally (only when prop changes, not input)
  useEffect(() => {
    if (startYear === null) {
      setStartYearInput('');
    } else {
      setStartYearInput(startYear.toString());
    }
  }, [startYear]);

  useEffect(() => {
    if (endYear === null) {
      setEndYearInput('');
    } else {
      setEndYearInput(endYear.toString());
    }
  }, [endYear]);

  const handleStartYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    setStartYearInput(value);
    
    if (value === '') {
      onStartYearChange(null);
    } else {
      const year = parseInt(value);
      if (!isNaN(year)) {
        // Allow typing, but only set valid year if it's complete (4 digits) and valid
        if (value.length === 4) {
          if (year >= birthYear && year <= 2200) {
            onStartYearChange(year);
          } else {
            // Keep the input but don't update the state
          }
        } else {
          // Allow partial input for typing
          onStartYearChange(null);
        }
      }
    }
  };

  const handleStartYearBlur = () => {
    const year = parseInt(startYearInput);
    if (startYearInput === '') {
      setStartYearError(null);
      return;
    }
    if (!isNaN(year) && year >= birthYear && year <= 2200) {
      onStartYearChange(year);
      setStartYearInput(year.toString());
      setStartYearError(null);
    } else {
      if (year < birthYear) {
        setStartYearError(`Start year must be ${birthYear} or later`);
      } else if (year > 2200) {
        setStartYearError('Start year must be 2200 or earlier');
      } else {
        setStartYearError('Invalid year');
      }
      // Reset to valid value or clear
      if (startYear) {
        setStartYearInput(startYear.toString());
      } else {
        setStartYearInput('');
        onStartYearChange(null);
      }
    }
  };

  const handleEndYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    setEndYearInput(value);
    
    if (value === '') {
      onEndYearChange(null);
    } else {
      const year = parseInt(value);
      if (!isNaN(year)) {
        const minYear = startYear || birthYear;
        // Allow typing, but only set valid year if it's complete (4 digits) and valid
        if (value.length === 4) {
          if (year >= minYear && year <= 2200) {
            onEndYearChange(year);
          } else {
            // Keep the input but don't update the state
          }
        } else {
          // Allow partial input for typing
          onEndYearChange(null);
        }
      }
    }
  };

  const handleEndYearBlur = () => {
    const year = parseInt(endYearInput);
    const minYear = startYear || birthYear;
    if (endYearInput === '') {
      setEndYearError(null);
      return;
    }
    if (!isNaN(year) && year >= minYear && year <= 2200) {
      onEndYearChange(year);
      setEndYearInput(year.toString());
      setEndYearError(null);
    } else {
      if (year < minYear) {
        setEndYearError(`End year must be ${minYear} or later`);
      } else if (year > 2200) {
        setEndYearError('End year must be 2200 or earlier');
      } else {
        setEndYearError('Invalid year');
      }
      // Reset to valid value or clear
      if (endYear) {
        setEndYearInput(endYear.toString());
      } else {
        setEndYearInput('');
        onEndYearChange(null);
      }
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-lg font-bold text-slate-800 mb-5">
          Year Range Selection
        </label>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Start Year <span className="text-slate-500 font-normal text-xs">(min: {birthYear})</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder={`${birthYear}`}
              value={startYearInput}
              onChange={(e) => {
                handleStartYearChange(e);
                setStartYearError(null);
              }}
              onBlur={handleStartYearBlur}
              maxLength={4}
              className={cn(
                "block w-full px-4 py-3 border rounded-lg shadow-sm",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
                "bg-white text-slate-900",
                "text-base font-medium",
                "transition-all duration-200",
                startYearError ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300"
              )}
            />
            {startYearError && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">{startYearError}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              End Year <span className="text-slate-500 font-normal text-xs">(min: {startYear || birthYear})</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder={`${birthYear + 100}`}
              value={endYearInput}
              onChange={(e) => {
                handleEndYearChange(e);
                setEndYearError(null);
              }}
              onBlur={handleEndYearBlur}
              maxLength={4}
              className={cn(
                "block w-full px-4 py-3 border rounded-lg shadow-sm",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
                "bg-white text-slate-900",
                "text-base font-medium",
                "transition-all duration-200",
                endYearError ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300"
              )}
            />
            {endYearError && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">{endYearError}</p>
            )}
          </div>
        </div>
        <div className="mt-5 p-4 bg-blue-50/80 rounded-lg border border-blue-200/50">
          <p className="text-sm text-slate-700 flex items-start gap-2.5">
            <svg className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-slate-700 leading-relaxed">Start year must be {birthYear} or later. End year must be after start year. Default: {birthYear} to {birthYear + 100}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
