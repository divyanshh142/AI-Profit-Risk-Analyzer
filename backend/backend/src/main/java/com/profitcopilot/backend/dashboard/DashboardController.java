package com.profitcopilot.backend.dashboard;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * Plain REST proxy to FastAPI for the dashboard (charts/tables) — no LLM
 * involved here, this is just the "read data" path. The /api/chat endpoint
 * (ChatController) is the separate natural-language path.
 */
@RestController
@RequestMapping("/api")
public class DashboardController {

    private final WebClient client;

    public DashboardController(WebClient fastApiClient) {
        this.client = fastApiClient;
    }

    @GetMapping("/profit-summary")
    public List<Map> profitSummary(@RequestParam(defaultValue = "1") int tenantId,
                                    @RequestParam(defaultValue = "10") int limit,
                                    @RequestParam(defaultValue = "top") String order) {
        return client.get()
                .uri(uri -> uri.path("/profit-summary")
                        .queryParam("tenant_id", tenantId)
                        .queryParam("limit", limit)
                        .queryParam("order", order)
                        .build())
                .retrieve().bodyToMono(List.class).block();
    }

    @GetMapping("/forecast/{skuId}")
    public Map forecast(@PathVariable String skuId, @RequestParam(defaultValue = "1") int tenantId) {
        return client.get()
                .uri(uri -> uri.path("/forecast/{sku}").queryParam("tenant_id", tenantId).build(skuId))
                .retrieve().bodyToMono(Map.class).block();
    }

    @GetMapping("/vendor-risk/{vendorId}")
    public Map vendorRisk(@PathVariable String vendorId, @RequestParam(defaultValue = "1") int tenantId) {
        return client.get()
                .uri(uri -> uri.path("/vendor-risk/{v}").queryParam("tenant_id", tenantId).build(vendorId))
                .retrieve().bodyToMono(Map.class).block();
    }

    @GetMapping("/risky-products")
    public List<Map> riskyProducts(@RequestParam(defaultValue = "1") int tenantIdForecast,
                                    @RequestParam(defaultValue = "2") int tenantIdRisk,
                                    @RequestParam(defaultValue = "10") int limit) {
        return client.get()
                .uri(uri -> uri.path("/risky-products")
                        .queryParam("tenant_id_forecast", tenantIdForecast)
                        .queryParam("tenant_id_risk", tenantIdRisk)
                        .queryParam("limit", limit)
                        .build())
                .retrieve().bodyToMono(List.class).block();
    }
}
