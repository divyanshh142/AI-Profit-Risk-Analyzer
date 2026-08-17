export interface User {
  username: string;
  companyName: string;
  tenantId: number;
}

export interface AuthResponse {
  token: string;
  username: string;
  message: string;
}

export interface SkuProfitRow {
  sku_id: string;
  forecast_demand: number;
  expected_returns: number;
  expected_shipping_cost: number;
  expected_net_profit: number;
}

export interface ForecastPoint {
  week: string;
  demand: number;
}

export interface RiskyProduct {
  sku_id: string;
  category: string;
  predicted_demand: number;
  category_return_risk: number | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: 'ready' | 'uploading' | 'error';
}

export interface DashboardKpis {
  avgDemand: number;
  avgReturnRisk: number;
  avgVendorRisk: number;
  totalExpectedProfit: number;
}
