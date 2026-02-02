/**
 * Views - Natal Grid Component
 */

import { cn } from '@/utils/cn';

// Lo Shu Grid Position Mapping
// Top row: 3 | 1 | 9
// Middle:  6 | 7 | 5
// Bottom: 2 | 8 | 4
const LO_SHU_POSITIONS: number[][] = [
  [3, 1, 9],
  [6, 7, 5],
  [2, 8, 4],
];

interface NatalGridProps {
  grid: (string | null)[][];
  title?: string;
  rootNumber?: number | null;
  destinyNumber?: number | null;
  mahadasha?: number | null;
  antardasha?: number | null;
  pratyantar?: number | null; // PD (Pratyantar Dasha) for period grids
  isPeriodGrid?: boolean; // True for period grids, false for annual grids
}

export function NatalGrid({ 
  grid, 
  title = 'Natal Grid',
  rootNumber,
  destinyNumber,
  mahadasha,
  antardasha,
  pratyantar,
  isPeriodGrid = false
}: NatalGridProps) {
  // Ensure isPeriodGrid is always a boolean
  const isPeriod = Boolean(isPeriodGrid);
  
  // Helper function to get the number at a grid position
  const getPositionNumber = (rowIdx: number, colIdx: number): number => {
    return LO_SHU_POSITIONS[rowIdx][colIdx];
  };

  // Helper function to render cell content with highlighted digits
  // Order of addition: Natal (Root/Destiny) -> Mahadasha -> Antardasha/Pratyantar
  // So: earlier digits = Natal, last digit = Antardasha/PD (if matches), second-to-last = Mahadasha (if matches)
  const renderCellContent = (cell: string | null, rowIdx: number, colIdx: number): React.ReactElement => {
    if (!cell) {
      return <span className="text-slate-400">-</span>;
    }

    const positionNumber = getPositionNumber(rowIdx, colIdx);
    const digits = cell.split('');
    const totalDigits = digits.length;
    
    // Check which numbers match this position
    const matchesAntardasha = antardasha !== null && antardasha === positionNumber;
    const matchesPratyantar = pratyantar !== null && pratyantar === positionNumber; // PD
    const matchesMahadasha = mahadasha !== null && mahadasha === positionNumber;
    const matchesDestiny = destinyNumber !== null && destinyNumber === positionNumber;
    const matchesRoot = rootNumber !== null && rootNumber === positionNumber;
    
    // If no matches, return default
    if (!matchesAntardasha && !matchesPratyantar && !matchesMahadasha && !matchesDestiny && !matchesRoot) {
      return <span className="text-slate-800">{cell}</span>;
    }
    
    // Determine digit assignment based on addition order:
    // For Annual Grids: Natal (Root/Destiny) -> Mahadasha -> Antardasha
    // For Period Grids: Natal (Root/Destiny) -> Mahadasha -> Pratyantar (PD)
    // - Last digit = Pratyantar (PD) if period grid, or Antardasha if annual grid
    // - Second-to-last digit = Mahadasha (if matches)
    // - Earlier digits = Natal (Root/Destiny, prefer Destiny over Root)
    
    const coloredDigits: React.ReactElement[] = [];
    const showLabels = isPeriodGrid; // Only show R/D labels in period grids
    
    // Determine if we should show R or D label for this cell (only in period grids)
    // Show label if the position matches Root or Destiny, regardless of which digit we're on
    let cellLabel = "";
    if (showLabels) {
      if (rootNumber !== null && positionNumber === rootNumber) {
        cellLabel = "R";
      } else if (destinyNumber !== null && positionNumber === destinyNumber) {
        cellLabel = "D";
      }
    }
    
    for (let i = 0; i < totalDigits; i++) {
      const digit = digits[i];
      const isLast = i === totalDigits - 1;
      const isSecondToLast = i === totalDigits - 2;
      const isThirdToLast = i === totalDigits - 3;
      
      let colorClass = "text-slate-800"; // Default
      
      // Last digit: Pratyantar (PD) for period grids - Purple, or Antardasha for annual grids - Dark blue
      if (isLast) {
        if (isPeriodGrid && matchesPratyantar) {
          colorClass = "text-purple-700 font-bold"; // Purple for PD
        } else if (!isPeriodGrid && matchesAntardasha) {
          colorClass = "text-blue-900 font-bold"; // Dark blue for Antardasha
        }
      }
      // Period grid: second-to-last digit = Antardasha (AD) - Blue
      else if (isPeriodGrid && isSecondToLast && matchesAntardasha && totalDigits >= 2) {
        colorClass = "text-blue-600 font-bold"; // Blue for AD in period grid
      }
      // Annual grid: second-to-last digit = Mahadasha (MD) - Red. Period grid: third-to-last = Mahadasha
      else if (!isPeriodGrid && isSecondToLast && matchesMahadasha && totalDigits >= 2) {
        colorClass = "text-red-600 font-bold"; // Red for Mahadasha (annual)
      }
      else if (isPeriodGrid && isThirdToLast && matchesMahadasha && totalDigits >= 3) {
        colorClass = "text-red-600 font-bold"; // Red for Mahadasha in period grid
      }
      // If Mahadasha matches position (standalone or in earlier position) - Red
      else if (matchesMahadasha && positionNumber === mahadasha) {
        colorClass = "text-red-600 font-bold"; // Red for Mahadasha
      }
      // Earlier digits: Natal (Root or Destiny)
      // Prefer Destiny over Root if both match
      else {
        const digitNum = parseInt(digit);
        if (matchesDestiny && digitNum === destinyNumber) {
          colorClass = "text-green-600 font-bold"; // Green for Destiny
        } else if (matchesRoot && digitNum === rootNumber) {
          colorClass = "text-amber-600 font-bold"; // Amber for Root
        }
      }
      
      coloredDigits.push(
        <span key={i} className={colorClass}>
          {digit}
        </span>
      );
    }
    
    // Add R/D label after the digits if this is a period grid and matches Root/Destiny
    return (
      <>
        {coloredDigits}
        {cellLabel && (
          <span className="text-[10px] font-bold ml-1 opacity-75 text-slate-600">{cellLabel}</span>
        )}
      </>
    );
  };

  // Check if any highlights are provided
  const hasHighlights = rootNumber !== null || destinyNumber !== null || mahadasha !== null || antardasha !== null || pratyantar !== null;

  return (
    <div className="space-y-4">
      {title && <h2 className="text-xl font-semibold text-slate-900">{title}</h2>}
      
      {/* Legend */}
      {hasHighlights && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs mb-3">
          {rootNumber !== null && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-amber-100 border border-amber-400"></div>
              <span className="text-slate-700">Root: {rootNumber}</span>
            </div>
          )}
          {destinyNumber !== null && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-400"></div>
              <span className="text-slate-700">Destiny: {destinyNumber}</span>
            </div>
          )}
          {mahadasha !== null && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-400"></div>
              <span className="text-slate-700">Maha: {mahadasha}</span>
            </div>
          )}
          {antardasha !== null && !isPeriod && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-blue-900 border border-blue-900"></div>
              <span className="text-slate-700">Antar: {antardasha}</span>
            </div>
          )}
          {antardasha !== null && isPeriod && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-blue-200 border border-blue-400"></div>
              <span className="text-slate-700">AD: {antardasha}</span>
            </div>
          )}
          {pratyantar !== null && isPeriod && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-purple-100 border border-purple-400"></div>
              <span className="text-slate-700">PD: {pratyantar}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto p-3 bg-slate-100 rounded-lg border border-slate-200">
        {grid.map((row, rowIdx) => (
          row.map((cell, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={cn(
                "aspect-square border rounded",
                "flex items-center justify-center",
                "text-lg font-semibold",
                "bg-white border-slate-200"
              )}
            >
              {renderCellContent(cell, rowIdx, colIdx)}
            </div>
          ))
        ))}
      </div>
    </div>
  );
}
