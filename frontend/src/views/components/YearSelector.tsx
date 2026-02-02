/**
 * Views - Year Selector Component
 */

import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { YearTableEntry } from '@/models/types';

interface YearSelectorProps {
  years: YearTableEntry[];
  selectedYear: number | null;
  onSelectYear: (year: number | null) => void;
}

export function YearSelector({ years, selectedYear, onSelectYear }: YearSelectorProps) {
  const uniqueYears = Array.from(new Set(years.map(y => y.year))).sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Year for Review Grid
      </label>
      <div className="relative">
        <select
          value={selectedYear || ''}
          onChange={(e) => onSelectYear(e.target.value ? parseInt(e.target.value) : null)}
          className={cn(
            "appearance-none block w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg",
            "bg-white text-gray-900 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          )}
        >
          <option value="">-- Select Year --</option>
          {uniqueYears.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
