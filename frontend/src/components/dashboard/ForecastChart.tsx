import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ForecastPoint } from '../../types';

interface ForecastChartProps {
  data: ForecastPoint[];
  skuId: string;
}

export default function ForecastChart({ data, skuId }: ForecastChartProps) {
  return (
    <div className="section-card">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Demand Forecast</h3>
        <p className="text-sm text-gray-500">Weekly units sold — {skuId}</p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                boxShadow: 'none',
                fontSize: 13,
              }}
              formatter={(value: number) => [`${value.toFixed(1)} units`, 'Demand']}
            />
            <Line
              type="monotone"
              dataKey="demand"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
