'use client';

import { ComparisonData } from '@/app/lib/types/comparison';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

interface ComparisonTableProps {
  data: ComparisonData;
}

export function ComparisonTable({ data }: ComparisonTableProps) {
  const { items, metrics } = data;

  if (!items.length) {
    return (
      <Card className="p-6 text-center min-h-[240px] flex flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold text-white">No items selected for comparison</p>
        <p className="max-w-xl text-sm text-zinc-400">
          Pick confessions from the feed and use the comparison link to compare engagement side by side.
        </p>
      </Card>
    );
  }

  if (!metrics.length) {
    return (
      <Card className="p-6 text-center min-h-[240px] flex flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold text-white">Nothing to compare</p>
        <p className="max-w-xl text-sm text-zinc-400">
          The selected confessions do not have comparable metrics available.
        </p>
      </Card>
    );
  }

  const getBestValue = (metric: string, values: (number | string)[]) => {
    if (metric === 'createdAt') {
      return Math.min(...values.map(v => new Date(v as string).getTime()));
    }
    return Math.max(...values.map(v => Number(v)));
  };

  const bestValues = metrics.reduce((acc, metric) => {
    const values = items.map(item => item.metrics[metric]);
    acc[metric] = getBestValue(metric, values);
    return acc;
  }, {} as Record<string, number>);

  const isBest = (metric: string, value: number | string) => {
    if (metric === 'createdAt') {
      return new Date(value as string).getTime() === bestValues[metric];
    }
    return Number(value) === bestValues[metric];
  };

  return (
    <Card className="overflow-x-auto min-h-[280px]">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="p-4 text-left font-semibold">Confession</th>
            {metrics.map(metric => (
              <th key={metric} className="p-4 text-left font-semibold capitalize">
                {metric.replace(/([A-Z])/g, ' $1').trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-900 transition-colors">
              <td className="p-4 align-top">
                <div className="max-w-xs truncate" title={item.data.content}>
                  {item.name}
                </div>
              </td>
              {metrics.map(metric => {
                const value = item.metrics[metric];
                const best = isBest(metric, value);
                return (
                  <td key={metric} className="p-4 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={best ? 'font-bold text-emerald-300' : 'text-zinc-200'}>
                        {value}
                      </span>
                      {best && <Badge variant="secondary">Best</Badge>}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
