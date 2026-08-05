package com.profitcopilot.backend.tools;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;

@Service
public class FastApiTools {

    private final WebClient client;

    public FastApiTools(WebClient fastApiClient) {
        this.client = fastApiClient;
    }

    @Tool(description = "Get the predicted demand for next week for a given product SKU ID. Tenant 1 = Olist real data, Tenant 2 = synthetic data.")
    public Map<String, Object> getDemandForecast(String skuId, int tenantId) {
        try {
            return client.get()
                    .uri(uriBuilder -> uriBuilder.path("/forecast/{sku}")
                            .queryParam("tenant_id", tenantId).build(skuId))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            return Map.of("error", "No forecast found for sku_id=" + skuId + " in tenant " + tenantId);
        }
    }

    @Tool(description = "Get the return risk score (0 to 1, higher = riskier) for a given product SKU ID. IMPORTANT: return-risk scores only exist for tenant 2 (synthetic data) SKUs, not tenant 1 (Olist) SKUs.")
    public Map<String, Object> getReturnRisk(String skuId, int tenantId) {
        try {
            return client.get()
                    .uri(uriBuilder -> uriBuilder.path("/return-risk/{sku}")
                            .queryParam("tenant_id", tenantId).build(skuId))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            return Map.of("error", "No return-risk score found for sku_id=" + skuId + " in tenant " + tenantId
                    + ". Return-risk data only exists for tenant 2 (synthetic).");
        }
    }

    @Tool(description = "Get the late-delivery risk score for a given vendor ID. Tenant 1 = Olist real data.")
    public Map<String, Object> getVendorRisk(String vendorId, int tenantId) {
        try {
            return client.get()
                    .uri(uriBuilder -> uriBuilder.path("/vendor-risk/{vendor}")
                            .queryParam("tenant_id", tenantId).build(vendorId))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            return Map.of("error", "No vendor risk score found for vendor_id=" + vendorId + " in tenant " + tenantId);
        }
    }

    @Tool(description = "Get the top or bottom N products ranked by expected net profit. Tenant 1 = Olist real data.")
    public List<Map<String, Object>> getProfitSummary(int tenantId, int limit, String order) {
        try {
            return client.get()
                    .uri(uriBuilder -> uriBuilder.path("/profit-summary")
                            .queryParam("tenant_id", tenantId)
                            .queryParam("limit", limit)
                            .queryParam("order", order)
                            .build())
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();
        } catch (WebClientResponseException e) {
            return List.of(Map.of("error", "Could not fetch profit summary for tenant " + tenantId));
        }
    }

    @Tool(description = "Get products that are in demand (from tenant 1 / Olist forecast) alongside category-level return risk (from tenant 2 / synthetic model). Use this for 'which products are risky' style questions.")
    public List<Map<String, Object>> getRiskyProducts(int tenantIdForecast, int tenantIdRisk, int limit) {
        try {
            return client.get()
                    .uri(uriBuilder -> uriBuilder.path("/risky-products")
                            .queryParam("tenant_id_forecast", tenantIdForecast)
                            .queryParam("tenant_id_risk", tenantIdRisk)
                            .queryParam("limit", limit)
                            .build())
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();
        } catch (WebClientResponseException e) {
            return List.of(Map.of("error", "Could not fetch risky products"));
        }
    }
}