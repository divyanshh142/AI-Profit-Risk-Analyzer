import { api } from './client';
import type { ForecastPoint, RiskyProduct, SkuProfitRow } from '../types';
import { DEMO_FORECAST, DEMO_KPIS, DEMO_RISKY, DEMO_SKUS } from '../data/demoData';

export async function fetchProfitSummary(
  tenantId: number,
  limit = 20,
): Promise<{ rows: SkuProfitRow[]; offline: boolean }> {
  try {
    const { data } = await api.get<SkuProfitRow[]>('/api/profit-summary', {
      params: { tenantId, limit, order: 'top' },
    });
    return { rows: data, offline: false };
  } catch {
    return { rows: DEMO_SKUS.slice(0, limit), offline: true };
  }
}

export function generateScaledForecast(targetDemand: number): ForecastPoint[] {
  const baseMultipliers = [0.75, 0.82, 0.90, 0.85, 0.95, 0.88, 1.0];
  return baseMultipliers.map((m, idx) => ({
    week: idx === baseMultipliers.length - 1 ? 'Next' : `W-${baseMultipliers.length - 1 - idx}`,
    demand: Math.round(targetDemand * m * 10) / 10,
  }));
}

export async function fetchForecastSeries(
  skuId: string,
  tenantId: number,
  targetDemand?: number,
): Promise<{ points: ForecastPoint[]; offline: boolean }> {
  try {
    const { data } = await api.get<{ sku_id: string; week_start: string; predicted_demand: number }>(
      `/api/forecast/${encodeURIComponent(skuId)}`,
      { params: { tenantId } },
    );
    const finalDemand = data.predicted_demand || targetDemand || 16.2;
    const points = generateScaledForecast(finalDemand);
    return { points, offline: false };
  } catch {
    const points = targetDemand ? generateScaledForecast(targetDemand) : DEMO_FORECAST;
    return { points, offline: true };
  }
}

export async function fetchRiskyProducts(
  tenantIdForecast: number,
  tenantIdRisk: number,
  limit = 5,
): Promise<{ rows: RiskyProduct[]; offline: boolean }> {
  try {
    const { data } = await api.get<RiskyProduct[]>('/api/risky-products', {
      params: { tenantIdForecast, tenantIdRisk, limit },
    });
    return { rows: data, offline: false };
  } catch {
    return { rows: DEMO_RISKY.slice(0, limit), offline: true };
  }
}

export function computeKpis(rows: SkuProfitRow[], risky: RiskyProduct[]) {
  if (!rows.length) return DEMO_KPIS;

  const avgDemand = rows.reduce((s, r) => s + r.forecast_demand, 0) / rows.length;
  const totalExpectedProfit = rows.reduce((s, r) => s + r.expected_net_profit, 0);
  const avgReturnRisk =
    risky.length > 0
      ? risky.reduce((s, r) => s + (r.category_return_risk ?? 0), 0) / risky.length
      : DEMO_KPIS.avgReturnRisk;

  return {
    avgDemand: Math.round(avgDemand * 10) / 10,
    avgReturnRisk: Math.round(avgReturnRisk * 100) / 100,
    avgVendorRisk: DEMO_KPIS.avgVendorRisk,
    totalExpectedProfit: Math.round(totalExpectedProfit),
  };
}
