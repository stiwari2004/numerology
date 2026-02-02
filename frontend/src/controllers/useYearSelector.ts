/**
 * Controllers - Year Selector Logic
 */

import { useState, useMemo } from 'react';
import type { NumerologyResult } from '@/models/types';

interface UseYearSelectorReturn {
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
  selectedYearGrid: (string | null)[][] | null;
  selectedYearInfo: {
    maha: number | null;
    antar: number | null;
  } | null;
}

export function useYearSelector(result: NumerologyResult | null): UseYearSelectorReturn {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const selectedYearInfo = useMemo(() => {
    if (!result || !selectedYear) return null;

    const yearEntry = result.year_table.find(entry => entry.year === selectedYear);
    if (!yearEntry) return null;

    return {
      maha: yearEntry.maha_number,
      antar: yearEntry.antar_number,
    };
  }, [result, selectedYear]);

  const selectedYearGrid = useMemo(() => {
    if (!result || !selectedYear || !selectedYearInfo) return null;

    // Build review year grid: natal + maha + antar
    const grid: (string | null)[][] = result.natal_grid.map(row => [...row]);
    
    // Add maha and antar to grid
    if (selectedYearInfo.maha) {
      const mahaPos = getLoShuPosition(selectedYearInfo.maha);
      const currentValue = grid[mahaPos.row][mahaPos.col];
      grid[mahaPos.row][mahaPos.col] = (currentValue || '') + String(selectedYearInfo.maha);
    }
    
    if (selectedYearInfo.antar) {
      const antarPos = getLoShuPosition(selectedYearInfo.antar);
      const currentValue = grid[antarPos.row][antarPos.col];
      grid[antarPos.row][antarPos.col] = (currentValue || '') + String(selectedYearInfo.antar);
    }

    return grid;
  }, [result, selectedYear, selectedYearInfo]);

  return {
    selectedYear,
    setSelectedYear,
    selectedYearGrid,
    selectedYearInfo,
  };
}

// Lo Shu Grid positions
const LO_SHU_POSITIONS: Record<number, { row: number; col: number }> = {
  1: { row: 0, col: 1 }, // Top middle
  2: { row: 2, col: 0 }, // Bottom left
  3: { row: 0, col: 0 }, // Top left
  4: { row: 2, col: 2 }, // Bottom right
  5: { row: 1, col: 2 }, // Middle right
  6: { row: 1, col: 0 }, // Middle left
  7: { row: 1, col: 1 }, // Middle center
  8: { row: 2, col: 1 }, // Bottom middle
  9: { row: 0, col: 2 }, // Top right
};

function getLoShuPosition(number: number): { row: number; col: number } {
  return LO_SHU_POSITIONS[number] || { row: 0, col: 0 };
}
