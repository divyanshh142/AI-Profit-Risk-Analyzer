import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { SkuProfitRow } from '../../types';

type SortKey = keyof Pick<
  SkuProfitRow,
  'sku_id' | 'forecast_demand' | 'expected_returns' | 'expected_net_profit'
>;
type SortDir = 'asc' | 'desc';

interface SkuTableProps {
  rows: SkuProfitRow[];
  selectedSku: string | null;
  onSelect: (skuId: string) => void;
}

const columns: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'sku_id', label: 'SKU' },
  { key: 'forecast_demand', label: 'Forecast Demand', align: 'right' },
  { key: 'expected_returns', label: 'Expected Returns', align: 'right' },
  { key: 'expected_net_profit', label: 'Expected Profit', align: 'right' },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SkuTable({ rows, selectedSku, onSelect }: SkuTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('expected_net_profit');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const diff = (av as number) - (bv as number);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="section-card overflow-hidden p-0">
      <div className="border-b border-gray-200 px-5 py-4">
        <h3 className="text-base font-semibold text-gray-900">SKU Performance</h3>
        <p className="text-sm text-gray-500">Select a row to view its forecast chart</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`cursor-pointer select-none px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 hover:text-gray-700 ${
                    col.align === 'right' ? 'text-right' : ''
                  }`}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key &&
                      (sortDir === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.sku_id}
                onClick={() => onSelect(row.sku_id)}
                className={`cursor-pointer border-b border-gray-50 transition hover:bg-brand-50/40 ${
                  selectedSku === row.sku_id ? 'bg-brand-50' : ''
                }`}
              >
                <td className="px-5 py-3.5 font-medium text-gray-900">{row.sku_id}</td>
                <td className="px-5 py-3.5 text-right text-gray-700">
                  {row.forecast_demand.toFixed(1)}
                </td>
                <td className="px-5 py-3.5 text-right text-gray-700">
                  {row.expected_returns.toFixed(1)}
                </td>
                <td className="px-5 py-3.5 text-right font-medium text-gray-900">
                  {formatCurrency(row.expected_net_profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
