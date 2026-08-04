package com.profitcopilot.backend.tools;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * These become callable "tools" for the AI agent (Spring AI @Tool annotation).
 * Each one just proxies to an existing, already-working FastAPI endpoint —
 * FastAPI stays the model-serving layer, Spring Boot is the agent layer.
 */
@Service
public class FastApiTools {

    private final WebClient client;

    public FastApiTools(WebClient fastApiClient) {
        this.client = fastApiClient;
    }

    @Tool(description = "Get the predicted demand for next week for a given product SKU ID")
    public Map<String, Object> getDemandForecast(String skuId, int tenantId) {
        return client.get()
                .uri(uriBuilder -> uriBuilder.path("/forecast/{sku}")
                        .queryParam("tenant_id", tenantId).build(skuId))
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    @Tool(description = "Get the return risk score (0 to 1, higher = riskier) for a given product SKU ID")
    public Map<String, Object> getReturnRisk(String skuId, int tenantId) {
        return client.get()
                .uri(uriBuilder -> uriBuilder.path("/return-risk/{sku}")
                        .queryParam("tenant_id", tenantId).build(skuId))
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    @Tool(description = "Get the late-delivery risk score for a given vendor ID")
    public Map<String, Object> getVendorRisk(String vendorId, int tenantId) {
        return client.get()
                .uri(uriBuilder -> uriBuilder.path("/vendor-risk/{vendor}")
                        .queryParam("tenant_id", tenantId).build(vendorId))
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    @Tool(description = "Get the top or bottom N products ranked by expected net profit")
    public List<Map<String, Object>> getProfitSummary(int tenantId, int limit, String order) {
        return client.get()
                .uri(uriBuilder -> uriBuilder.path("/profit-summary")
                        .queryParam("tenant_id", tenantId)
                        .queryParam("limit", limit)
                        .queryParam("order", order)
                        .build())
                .retrieve()
                .bodyToMono(List.class)
                .block();
    }

    @Tool(description = "Get products that are both in demand and at higher return risk (risky products)")
    public List<Map<String, Object>> getRiskyProducts(int tenantIdForecast, int tenantIdRisk, int limit) {
        return client.get()
                .uri(uriBuilder -> uriBuilder.path("/risky-products")
                        .queryParam("tenant_id_forecast", tenantIdForecast)
                        .queryParam("tenant_id_risk", tenantIdRisk)
                        .queryParam("limit", limit)
                        .build())
                .retrieve()
                .bodyToMono(List.class)
                .block();
    }
}
