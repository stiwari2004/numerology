/**
 * Views - Birthdate Input Component
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';

interface BirthdateInputProps {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  error: string | null;
}

export function BirthdateInput({
  value,
  onChange,
  loading,
  error,
}: BirthdateInputProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Format as DD/MM/YYYY
    if (input.length > 2) {
      input = input.slice(0, 2) + '/' + input.slice(2);
    }
    if (input.length > 5) {
      input = input.slice(0, 5) + '/' + input.slice(5, 9);
    }
    
    onChange(input);
    setLocalError(null);
  };

  const displayError = error || localError;

  return (
    <div className="space-y-2">
      <label htmlFor="birthdate" className="block text-sm font-semibold text-gray-800 mb-2">
        Date of Birth
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="birthdate"
          type="text"
          placeholder="DD/MM/YYYY"
          value={value}
          onChange={handleChange}
          maxLength={10}
          className={cn(
            "block w-full pl-10 pr-4 py-3 border rounded-lg shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
            "bg-white text-gray-900",
            "text-base font-medium",
            "transition-all duration-200",
            displayError 
              ? "border-red-400 focus:border-red-500 focus:ring-red-200" 
              : "border-gray-300"
          )}
          disabled={loading}
        />
      </div>
      {displayError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
