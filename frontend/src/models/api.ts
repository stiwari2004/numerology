/**
 * Models - API Service Layer
 */

import axios from 'axios';
import type { NumerologyRequest, NumerologyResult, MonthlyGridsResponse, MonthlyGridRequest } from './types';

// Use relative URL to leverage Vite proxy, or absolute URL if VITE_API_BASE_URL is set
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class NumerologyApiService {
  /**
   * Calculate numerology values from birthdate
   */
  static async calculate(
    birthdate: string,
    startYear?: number | null,
    endYear?: number | null
  ): Promise<NumerologyResult> {
    try {
      const response = await apiClient.post<NumerologyResult>(
        '/api/v1/numerology/calculate',
        {
          birthdate,
          start_year: startYear,
          end_year: endYear,
        } as NumerologyRequest
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.detail || 
          error.message || 
          'Failed to calculate numerology'
        );
      }
      throw error;
    }
  }

  /**
   * Get monthly grids for a specific year
   */
  static async getMonthlyGrids(
    birthdate: string,
    year: number
  ): Promise<MonthlyGridsResponse> {
    try {
      const response = await apiClient.post<MonthlyGridsResponse>(
        '/api/v1/numerology/monthly-grids',
        {
          birthdate,
          year,
        } as MonthlyGridRequest
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.detail || 
          error.message || 
          'Failed to fetch monthly grids'
        );
      }
      throw error;
    }
  }
}
