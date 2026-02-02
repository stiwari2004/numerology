/**
 * Views - Number Card Component
 */

import { cn } from '@/utils/cn';

interface NumberCardProps {
  label: string;
  value: number;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  labelLetter?: string; // R for Root, D for Destiny
}

const colorConfigs = {
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    valueBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    valueText: 'text-white',
    shadow: 'shadow-blue-200',
  },
  green: {
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
    border: 'border-green-200',
    text: 'text-green-700',
    valueBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
    valueText: 'text-white',
    shadow: 'shadow-green-200',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-500',
    bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    valueBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
    valueText: 'text-white',
    shadow: 'shadow-purple-200',
  },
  orange: {
    gradient: 'from-orange-500 to-red-500',
    bg: 'bg-gradient-to-br from-orange-50 to-red-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    valueBg: 'bg-gradient-to-br from-orange-500 to-red-500',
    valueText: 'text-white',
    shadow: 'shadow-orange-200',
  },
};

export function NumberCard({ label, value, color = 'blue', labelLetter }: NumberCardProps) {
  const config = colorConfigs[color];
  
  return (
    <div className={cn(
      "p-5 rounded-lg border",
      config.bg,
      config.border
    )}>
      <div className={cn("text-xs font-medium uppercase tracking-wide mb-3", config.text)}>
        {label}
      </div>
      <div className={cn(
        "inline-flex items-center justify-center w-16 h-16 rounded-lg",
        config.valueBg,
        config.valueText,
        "text-3xl font-semibold"
      )}>
        {value}
      </div>
    </div>
  );
}
