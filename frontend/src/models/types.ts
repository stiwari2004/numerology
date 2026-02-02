/**
 * Models - Type definitions for Numerology app
 */

export interface NumerologyRequest {
  birthdate: string; // DD/MM/YYYY format
  start_year?: number | null;
  end_year?: number | null;
}

export interface YearGrid {
  year: number;
  start_date: string;
  end_date: string;
  start_year: number;
  end_year: number;
  maha_number: number | null;
  antar_number: number;
  grid: (string | null)[][];
}

export interface NumerologyResult {
  birthdate: string;
  day: number;
  month: number;
  year: number;
  root_number: number;
  destiny_number: number;
  natal_grid: (string | null)[][];
  natal_grid_dict: Record<number, string>;
  year_grids: YearGrid[];
  start_year: number;
  end_year: number;
}

export interface MahadashaPeriod {
  dasha_number: number;
  start_date: string;
  end_date: string;
  duration_years: number;
}

export interface YearTableEntry {
  year: number;
  review_date: string;
  maha_number: number | null;
  antar_number: number;
}

export interface CurrentYearInfo {
  year: number;
  maha_number: number | null;
  antar_number: number;
  grid: (string | null)[][];
}

export interface GridCell {
  value: string | null;
  position: { row: number; col: number };
  number: number;
}

export interface MonthlyGrid {
  year: number;
  month: number;
  month_name: string;
  start_date: string;
  end_date: string;
  date_range?: string; // Format: "DD/MM/YYYY to DD/MM/YYYY"
  maha_number: number | null;
  antar_number: number;
  personal_year: number;
  personal_month: number;
  grid: (string | null)[][];
}

export interface MonthlyGridsResponse {
  birthdate: string;
  year: number;
  monthly_grids: MonthlyGrid[];
}

export interface MonthlyGridRequest {
  birthdate: string;
  year: number;
}
