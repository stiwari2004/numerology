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
    
    // Check which numbers match this position (handle both null and undefined)
    const matchesAntardasha = antardasha != null && antardasha === positionNumber;
    const matchesPratyantar = pratyantar != null && pratyantar === positionNumber; // PD
    const matchesMahadasha = mahadasha != null && mahadasha === positionNumber;
    const matchesDestiny = destinyNumber != null && destinyNumber === positionNumber;
    const matchesRoot = rootNumber != null && rootNumber === positionNumber;
    
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
    
    // Calculate exact positions for special digits (from the end)
    // Period grids: Natal → MD → AD → PD (so PD last, AD second-to-last, MD third-to-last)
    // Annual grids: Natal → MD → AD (so AD last, MD second-to-last)
    // Calculate where each special digit should be (index from start)
    let pdIndex = -1, adIndex = -1, mdIndex = -1;
    if (isPeriodGrid) {
      // Period grid order from end: PD (last), AD (second-to-last), MD (third-to-last)
      if (matchesPratyantar) pdIndex = totalDigits - 1;
      if (matchesAntardasha) adIndex = totalDigits - 1 - (matchesPratyantar ? 1 : 0);
      if (matchesMahadasha) mdIndex = totalDigits - 1 - (matchesPratyantar ? 1 : 0) - (matchesAntardasha ? 1 : 0);
    } else {
      // Annual grid order from end: AD (last), MD (second-to-last)
      if (matchesAntardasha) adIndex = totalDigits - 1;
      if (matchesMahadasha) mdIndex = totalDigits - 1 - (matchesAntardasha ? 1 : 0);
    }
    
    for (let i = 0; i < totalDigits; i++) {
      const digit = digits[i];
      let colorClass = "text-slate-800"; // Default
      
      // Check if this index is a special digit position
      if (i === pdIndex && isPeriodGrid) {
        colorClass = "text-purple-700 font-bold"; // Purple for PD
      } else if (i === adIndex) {
        colorClass = "text-blue-600 font-bold"; // Blue for AD
      } else if (i === mdIndex) {
        colorClass = "text-red-600 font-bold"; // Red for MD
      } else {
        // This is a natal digit - check Root or Destiny
        // Position matches means this cell is for that number, so all digits here have that value
        if (matchesDestiny) {
          colorClass = "text-green-600 font-bold"; // Green for Destiny
        } else if (matchesRoot) {
          colorClass = "text-orange-500 font-bold"; // Orange for Root (more visible)
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
  const hasHighlights = rootNumber != null || destinyNumber != null || mahadasha != null || antardasha != null || pratyantar != null;

  return (
    <div className="space-y-1">
      {title && <h3 className="text-sm font-semibold text-slate-700 text-center">{title}</h3>}
      
      {/* Compact Legend */}
      {hasHighlights && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] mb-1">
          {rootNumber != null && (
            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded border border-orange-300">R:{rootNumber}</span>
          )}
          {destinyNumber != null && (
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-300">D:{destinyNumber}</span>
          )}
          {mahadasha != null && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded border border-red-300">M:{mahadasha}</span>
          )}
          {antardasha != null && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-300">A:{antardasha}</span>
          )}
          {pratyantar != null && isPeriod && (
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded border border-purple-300">P:{pratyantar}</span>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-1 max-w-[180px] mx-auto p-2 bg-slate-100 rounded border border-slate-200">
        {grid.map((row, rowIdx) => (
          row.map((cell, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={cn(
                "aspect-square border rounded",
                "flex items-center justify-center",
                "text-sm font-semibold",
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
