/**
 * Controllers - Business Logic Hooks
 */

import { useState, useCallback } from 'react';
import { NumerologyApiService } from '@/models/api';
import type { NumerologyResult } from '@/models/types';

interface UseNumerologyReturn {
  result: NumerologyResult | null;
  loading: boolean;
  error: string | null;
  calculate: (birthdate: string, startYear?: number | null, endYear?: number | null) => Promise<void>;
  reset: () => void;
}

export function useNumerology(): UseNumerologyReturn {
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (
    birthdate: string,
    startYear?: number | null,
    endYear?: number | null
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await NumerologyApiService.calculate(birthdate, startYear, endYear);
      setResult(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    result,
    loading,
    error,
    calculate,
    reset,
  };
}
