//package com.profitcopilot.backend.chat;
//
//import org.springframework.ai.document.Document;
//import org.springframework.ai.vectorstore.VectorStore;
//import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.RequestParam;
//import org.springframework.web.bind.annotation.RestController;
//import org.springframework.web.reactive.function.client.WebClient;
//
//import java.util.List;
//import java.util.Map;
//
///**
// * One-time (or periodic) job: pulls profit-summary rows from FastAPI, turns
// * each into a short natural-language report, and embeds it into the vector
// * store so the chat agent can retrieve relevant context via RAG. This is a
// * simplified stand-in for the "nightly embedding pipeline" in the full plan —
// * runs on demand instead of on a schedule, which is fine for a demo.
// */
//@RestController
//public class RagIngestionController {
//
//    private final WebClient fastApiClient;
//    private final VectorStore vectorStore;
//
//    public RagIngestionController(WebClient fastApiClient, VectorStore vectorStore) {
//        this.fastApiClient = fastApiClient;
//        this.vectorStore = vectorStore;
//    }
//
//    @PostMapping("/api/rag/ingest")
//    public String ingest(@RequestParam(defaultValue = "1") int tenantId) {
//        List<Map<String, Object>> rows = fastApiClient.get()
//                .uri(uriBuilder -> uriBuilder.path("/profit-summary")
//                        .queryParam("tenant_id", tenantId)
//                        .queryParam("limit", 100)
//                        .queryParam("order", "top")
//                        .build())
//                .retrieve()
//                .bodyToMono(List.class)
//                .block();
//
//        List<Document> documents = rows.stream().map(row -> {
//            String text = String.format(
//                "Product %s has a forecasted demand of %.2f units next week. " +
//                "Expected returns: %.2f units. Expected shipping cost: %.2f. " +
//                "Expected net profit: %.2f.",
//                row.get("sku_id"), toDouble(row.get("forecast_demand")),
//                toDouble(row.get("expected_returns")), toDouble(row.get("expected_shipping_cost")),
//                toDouble(row.get("expected_net_profit"))
//            );
//            return new Document(text, Map.of("sku_id", String.valueOf(row.get("sku_id"))));
//        }).toList();
//
//        vectorStore.add(documents);
//        return "Ingested " + documents.size() + " SKU reports into the vector store.";
//    }
//
//    private double toDouble(Object o) {
//        return o == null ? 0.0 : ((Number) o).doubleValue();
//    }
//}
