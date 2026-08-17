import { api } from './client';
import { getDemoChatReply } from '../data/demoData';
import { getStoredDataset } from './upload';

export async function sendChatMessage(
  message: string,
  companyName?: string,
  datasetFilename?: string,
): Promise<{ reply: string; offline: boolean }> {
  const customDataset = getStoredDataset();

  let datasetContext = '';
  if (customDataset && customDataset.rows.length > 0) {
    const topSku = [...customDataset.rows].sort((a, b) => b.expected_net_profit - a.expected_net_profit)[0];
    const totalProfit = customDataset.rows.reduce((s, r) => s + r.expected_net_profit, 0);
    datasetContext = `[Dataset Context: File ${customDataset.filename}, SKUs: ${customDataset.rows.length}, Top SKU: ${topSku.sku_id} ($${topSku.expected_net_profit} profit), Total Expected Profit: $${totalProfit}] `;
  } else if (datasetFilename) {
    datasetContext = `[Dataset: ${datasetFilename}] `;
  }

  try {
    const companyContext = companyName ? `[Company: ${companyName}] ` : '';
    const fullMessage = companyContext + datasetContext + message;
    const { data } = await api.get<string>('/api/chat', {
      params: { message: fullMessage },
      transformResponse: [(data) => data],
      responseType: 'text',
    });
    return { reply: String(data), offline: false };
  } catch {
    return { reply: getDemoChatReply(message, customDataset), offline: true };
  }
}
