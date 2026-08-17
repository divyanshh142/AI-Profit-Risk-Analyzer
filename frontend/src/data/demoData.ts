import type { DashboardKpis, ForecastPoint, RiskyProduct, SkuProfitRow } from '../types';

export const DEMO_USER = {
  username: 'demo@company.com',
  companyName: 'Clean Co',
  tenantId: 3,
};

export const DEMO_SKUS: SkuProfitRow[] = [
  {
    sku_id: 'SKU_129',
    forecast_demand: 16.2,
    expected_returns: 0.8,
    expected_shipping_cost: 2106,
    expected_net_profit: 58428,
  },
  {
    sku_id: 'SKU_61',
    forecast_demand: 14.9,
    expected_returns: 1.2,
    expected_shipping_cost: 3620,
    expected_net_profit: 52100,
  },
  {
    sku_id: 'SKU_88',
    forecast_demand: 12.4,
    expected_returns: 0.5,
    expected_shipping_cost: 1890,
    expected_net_profit: 48750,
  },
  {
    sku_id: 'SKU_42',
    forecast_demand: 11.8,
    expected_returns: 2.1,
    expected_shipping_cost: 2450,
    expected_net_profit: 41200,
  },
  {
    sku_id: 'SKU_17',
    forecast_demand: 9.6,
    expected_returns: 0.3,
    expected_shipping_cost: 1560,
    expected_net_profit: 38900,
  },
  {
    sku_id: 'SKU_203',
    forecast_demand: 8.2,
    expected_returns: 1.8,
    expected_shipping_cost: 1980,
    expected_net_profit: 32100,
  },
];

export const DEMO_FORECAST: ForecastPoint[] = [
  { week: 'Week 1', demand: 10.2 },
  { week: 'Week 2', demand: 11.5 },
  { week: 'Week 3', demand: 12.1 },
  { week: 'Week 4', demand: 13.4 },
  { week: 'Week 5', demand: 14.0 },
  { week: 'Week 6', demand: 14.8 },
  { week: 'Next', demand: 16.2 },
];

export const DEMO_RISKY: RiskyProduct[] = [
  {
    sku_id: 'SKU_42',
    category: 'electronics',
    predicted_demand: 11.8,
    category_return_risk: 0.62,
  },
  {
    sku_id: 'SKU_203',
    category: 'apparel',
    predicted_demand: 8.2,
    category_return_risk: 0.58,
  },
  {
    sku_id: 'SKU_17',
    category: 'home',
    predicted_demand: 9.6,
    category_return_risk: 0.51,
  },
];

export const DEMO_KPIS: DashboardKpis = {
  avgDemand: 12.4,
  avgReturnRisk: 0.34,
  avgVendorRisk: 0.18,
  totalExpectedProfit: 271478,
};

export const DEMO_CHAT_REPLIES: Record<string, string> = {
  default:
    'Based on your latest forecasts, demand is strongest in your top-performing SKUs. Return risk is elevated in apparel categories — consider tightening quality checks with those vendors.',
  profit:
    'Your top profitable SKU this period is SKU_129 with an expected net profit of about $58,428. Focus inventory on high-margin, low-return items.',
  risk:
    'Return risk is highest in the electronics and apparel categories. Vendor late-delivery rates remain low overall at about 18%.',
};

export function getDemoChatReply(
  message: string,
  dataset?: { filename?: string; rows?: SkuProfitRow[] } | null,
): string {
  if (dataset && dataset.rows && dataset.rows.length > 0) {
    const rows = dataset.rows;
    const topSku = [...rows].sort((a, b) => b.expected_net_profit - a.expected_net_profit)[0];
    const totalProfit = rows.reduce((s, r) => s + r.expected_net_profit, 0);
    const avgDemand = (rows.reduce((s, r) => s + r.forecast_demand, 0) / rows.length).toFixed(1);
    const formattedTopProfit = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(topSku.expected_net_profit);
    const formattedTotalProfit = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(totalProfit);

    const lower = message.toLowerCase();
    if (lower.includes('profit') || lower.includes('top') || lower.includes('margin')) {
      return `For dataset "${dataset.filename}", your top profitable SKU is ${topSku.sku_id} with an expected net profit of ${formattedTopProfit}. Across all ${rows.length} SKUs, total expected net profit is ${formattedTotalProfit}.`;
    }
    if (lower.includes('demand') || lower.includes('sale') || lower.includes('forecast')) {
      return `Across dataset "${dataset.filename}", average forecasted weekly demand is ${avgDemand} units per SKU. ${topSku.sku_id} leads sales performance with a projected demand of ${topSku.forecast_demand} units/wk.`;
    }
    if (lower.includes('risk') || lower.includes('return')) {
      return `Analysis of dataset "${dataset.filename}" indicates expected returns average around ${topSku.expected_returns.toFixed(1)} units for top SKUs like ${topSku.sku_id}. Recommend monitoring quality with vendor partners.`;
    }
    return `Based on uploaded dataset "${dataset.filename}" (${rows.length} SKUs), your highest margin SKU is ${topSku.sku_id} (${formattedTopProfit} profit) with average weekly demand of ${avgDemand} units across your catalog.`;
  }

  const lower = message.toLowerCase();
  if (lower.includes('profit') || lower.includes('top')) return DEMO_CHAT_REPLIES.profit;
  if (lower.includes('risk') || lower.includes('return')) return DEMO_CHAT_REPLIES.risk;
  return DEMO_CHAT_REPLIES.default;
}
