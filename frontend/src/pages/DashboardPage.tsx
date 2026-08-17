import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, FileSpreadsheet, Package, ShieldAlert, TrendingUp, Upload } from 'lucide-react';
import { computeKpis, fetchForecastSeries, fetchProfitSummary, fetchRiskyProducts } from '../api/dashboard';
import { useAuth } from '../context/AuthContext';
import ForecastChart from '../components/dashboard/ForecastChart';
import KpiCard from '../components/dashboard/KpiCard';
import SkuTable from '../components/dashboard/SkuTable';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { DashboardKpis, ForecastPoint, SkuProfitRow } from '../types';
import { DEMO_FORECAST, DEMO_KPIS, DEMO_SKUS } from '../data/demoData';

import { clearStoredDataset, getStoredDataset } from '../api/upload';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardPage() {
  const { user, offline } = useAuth();
  const navigate = useNavigate();
  const tenantId = user?.tenantId ?? 3;
  const customDataset = getStoredDataset();
  const isDemoAccount = !user?.username || user?.username === 'demo@company.com';

  const [rows, setRows] = useState<SkuProfitRow[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis>(DEMO_KPIS);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>(DEMO_FORECAST);
  const [loading, setLoading] = useState(true);
  const [dataOffline, setDataOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [profit, risky] = await Promise.all([
        fetchProfitSummary(tenantId, 20),
        fetchRiskyProducts(tenantId, tenantId, 5),
      ]);
      if (cancelled) return;

      const skuRows = customDataset?.rows?.length
        ? customDataset.rows
        : isDemoAccount
        ? (profit.rows.length ? profit.rows : DEMO_SKUS)
        : [];
      setRows(skuRows);
      setKpis(computeKpis(skuRows, risky.rows));
      setDataOffline(profit.offline || risky.offline);
      setSelectedSku(skuRows[0]?.sku_id ?? null);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, isDemoAccount]);

  useEffect(() => {
    if (!selectedSku) return;
    let cancelled = false;

    const selectedRow = rows.find((r) => r.sku_id === selectedSku);

    fetchForecastSeries(selectedSku, tenantId, selectedRow?.forecast_demand).then(({ points, offline: isOffline }) => {
      if (!cancelled) {
        setForecast(points);
        if (isOffline) setDataOffline(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSku, tenantId, rows]);

  function handleResetDataset() {
    clearStoredDataset();
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner label="Loading dashboard..." />
      </div>
    );
  }

  const hasData = rows.length > 0;

  if (!hasData) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Performance overview for <strong className="font-semibold text-gray-800">{user?.companyName}</strong>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <FileSpreadsheet className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">No Dataset Uploaded Yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            You haven't uploaded any sales data or product catalogs yet. Upload a CSV file to view demand forecasts, return risk, and net profit insights.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              className="btn-primary gap-2"
              onClick={() => navigate('/upload')}
            >
              <Upload className="h-4 w-4" />
              Upload CSV Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>Performance overview for <strong className="font-semibold text-gray-800">{user?.companyName}</strong></span>
            {customDataset?.filename && (
              <span className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Dataset: {customDataset.filename}
                <button
                  type="button"
                  onClick={handleResetDataset}
                  className="ml-1 font-semibold text-blue-900 underline hover:text-blue-950"
                  title="Reset to default demo data"
                >
                  Clear
                </button>
              </span>
            )}
          </div>
        </div>
        {(offline || dataOffline) && (
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            Showing demo data — connect backend for live analytics
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Avg. Demand"
          value={`${kpis.avgDemand} units/wk`}
          subtitle="Across top SKUs"
          icon={TrendingUp}
        />
        <KpiCard
          title="Return Risk"
          value={`${(kpis.avgReturnRisk * 100).toFixed(0)}%`}
          subtitle="Category average"
          icon={ShieldAlert}
        />
        <KpiCard
          title="Vendor Risk"
          value={`${(kpis.avgVendorRisk * 100).toFixed(0)}%`}
          subtitle="Late delivery rate"
          icon={Package}
        />
        <KpiCard
          title="Expected Profit"
          value={formatCurrency(kpis.totalExpectedProfit)}
          subtitle="Top SKUs combined"
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          {selectedSku && <ForecastChart data={forecast} skuId={selectedSku} />}
        </div>
        <div className="lg:col-span-3">
          <SkuTable rows={rows} selectedSku={selectedSku} onSelect={setSelectedSku} />
        </div>
      </div>
    </div>
  );
}
