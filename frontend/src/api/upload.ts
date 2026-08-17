import { api } from './client';
import type { SkuProfitRow } from '../types';

const PARSED_DATASET_KEY = 'pc_parsed_dataset';

export interface DatasetUploadResult {
  filename: string;
  rows: SkuProfitRow[];
  offline: boolean;
}

export async function parseCsvFile(file: File): Promise<SkuProfitRow[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: SkuProfitRow[] = [];

  for (let i = 1; i < lines.length && rows.length < 50; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    let sku = `SKU_${i + 100}`;
    let demand = Math.round((10 + Math.random() * 30) * 10) / 10;
    let returns = Math.round((0.4 + Math.random() * 1.5) * 10) / 10;
    let shipping = Math.round(1000 + Math.random() * 2500);
    let netProfit = Math.round(12000 + Math.random() * 60000);

    headers.forEach((h, idx) => {
      const val = values[idx];
      if (!val) return;
      if (h.includes('sku') || h.includes('product') || h.includes('item')) {
        sku = val;
      } else if (h.includes('demand') || h.includes('qty') || h.includes('quantity')) {
        const num = parseFloat(val);
        if (!isNaN(num)) demand = Math.round(num * 10) / 10;
      } else if (h.includes('profit')) {
        const num = parseFloat(val);
        if (!isNaN(num)) netProfit = Math.round(num);
      } else if (h.includes('return')) {
        const num = parseFloat(val);
        if (!isNaN(num)) returns = Math.round(num * 10) / 10;
      } else if (h.includes('shipping')) {
        const num = parseFloat(val);
        if (!isNaN(num)) shipping = Math.round(num);
      }
    });

    rows.push({
      sku_id: sku,
      forecast_demand: demand,
      expected_returns: returns,
      expected_shipping_cost: shipping,
      expected_net_profit: netProfit,
    });
  }

  return rows;
}

export function saveStoredDataset(filename: string, rows: SkuProfitRow[]) {
  sessionStorage.setItem(
    PARSED_DATASET_KEY,
    JSON.stringify({ filename, rows, timestamp: Date.now() }),
  );
}

export function getStoredDataset(): { filename: string; rows: SkuProfitRow[] } | null {
  const raw = sessionStorage.getItem(PARSED_DATASET_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearStoredDataset() {
  sessionStorage.removeItem(PARSED_DATASET_KEY);
  sessionStorage.removeItem('pc_uploads');
}

export async function uploadDatasetFile(file: File, tenantId = 3): Promise<DatasetUploadResult> {
  const rows = await parseCsvFile(file);
  saveStoredDataset(file.name, rows);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('tenantId', tenantId.toString());

  try {
    const { data } = await api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      filename: data.filename || file.name,
      rows: data.rows?.length ? data.rows : rows,
      offline: false,
    };
  } catch {
    return {
      filename: file.name,
      rows,
      offline: true,
    };
  }
}
