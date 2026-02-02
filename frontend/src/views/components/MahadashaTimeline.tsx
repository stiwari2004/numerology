/**
 * Views - Mahadasha Timeline Component
 */

import { format } from 'date-fns';
import type { MahadashaPeriod } from '@/models/types';

interface MahadashaTimelineProps {
  timeline: MahadashaPeriod[];
  maxItems?: number;
}

export function MahadashaTimeline({ timeline, maxItems = 20 }: MahadashaTimelineProps) {
  const displayTimeline = timeline.slice(0, maxItems);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Mahadasha Timeline</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Dasha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayTimeline.map((period, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-lg font-bold text-primary-600">
                    {period.dasha_number}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {format(new Date(period.start_date), 'dd MMM yyyy')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {format(new Date(period.end_date), 'dd MMM yyyy')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {period.duration_years} {period.duration_years === 1 ? 'year' : 'years'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {timeline.length > maxItems && (
        <p className="text-sm text-gray-500 text-center">
          Showing first {maxItems} of {timeline.length} periods
        </p>
      )}
    </div>
  );
}
