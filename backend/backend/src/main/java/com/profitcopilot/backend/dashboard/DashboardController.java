package com.profitcopilot.backend.dashboard;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;

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
    public List<Map<String, Object>> profitSummary(@RequestParam(defaultValue = "1") int tenantId,
                                                   @RequestParam(defaultValue = "10") int limit,
                                                   @RequestParam(defaultValue = "top") String order) {
        try {
            return client.get()
                    .uri(uri -> uri.path("/profit-summary")
                            .queryParam("tenant_id", tenantId)
                            .queryParam("limit", limit)
                            .queryParam("order", order)
                            .build())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();
        } catch (WebClientResponseException e) {
            throw new ResponseStatusException(e.getStatusCode(), e.getResponseBodyAsString());
        }
    }

    @GetMapping("/forecast/{skuId}")
    public Map<String, Object> forecast(@PathVariable String skuId, @RequestParam(defaultValue = "1") int tenantId) {
        try {
            return client.get()
                    .uri(uri -> uri.path("/forecast/{sku}").queryParam("tenant_id", tenantId).build(skuId))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (WebClientResponseException e) {
            throw new ResponseStatusException(e.getStatusCode(), e.getResponseBodyAsString());
        }
    }

    @GetMapping("/vendor-risk/{vendorId}")
    public Map<String, Object> vendorRisk(@PathVariable String vendorId, @RequestParam(defaultValue = "1") int tenantId) {
        try {
            return client.get()
                    .uri(uri -> uri.path("/vendor-risk/{v}").queryParam("tenant_id", tenantId).build(vendorId))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (WebClientResponseException e) {
            throw new ResponseStatusException(e.getStatusCode(), e.getResponseBodyAsString());
        }
    }

    @GetMapping("/risky-products")
    public List<Map<String, Object>> riskyProducts(@RequestParam(defaultValue = "1") int tenantIdForecast,
                                                   @RequestParam(defaultValue = "2") int tenantIdRisk,
                                                   @RequestParam(defaultValue = "10") int limit) {
        try {
            return client.get()
                    .uri(uri -> uri.path("/risky-products")
                            .queryParam("tenant_id_forecast", tenantIdForecast)
                            .queryParam("tenant_id_risk", tenantIdRisk)
                            .queryParam("limit", limit)
                            .build())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();
        } catch (WebClientResponseException e) {
            throw new ResponseStatusException(e.getStatusCode(), e.getResponseBodyAsString());
        }
    }
}