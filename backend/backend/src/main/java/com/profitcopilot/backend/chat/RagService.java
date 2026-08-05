package com.profitcopilot.backend.chat;

import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class RagService {

    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingModel embeddingModel;

    public RagService(JdbcTemplate jdbcTemplate, EmbeddingModel embeddingModel) {
        this.jdbcTemplate = jdbcTemplate;
        this.embeddingModel = embeddingModel;
    }

    /** Embeds the query ourselves and runs a plain, hand-written similarity query —
     * bypassing Spring AI's PgVectorStore.doSimilaritySearch, which generates malformed
     * SQL in this milestone build. Builds the vector as a literal string, cast to
     * ::vector in SQL, avoiding the PGvector helper class entirely (classpath issue). */
    public List<String> retrieveRelevantReports(String query, int topK) {
        try {
            float[] queryEmbedding = embeddingModel.embed(query);
            String vectorLiteral = toVectorLiteral(queryEmbedding);

            return jdbcTemplate.query(
                    "SELECT content FROM sku_report_embeddings_vs ORDER BY embedding <=> ?::vector LIMIT ?",
                    (rs, rowNum) -> rs.getString("content"),
                    vectorLiteral, topK
            );
        } catch (Exception e) {
            return List.of(); // if retrieval fails for any reason, chat still works without context
        }
    }

    private String toVectorLiteral(float[] embedding) {
        String values = IntStream.range(0, embedding.length)
                .mapToObj(i -> String.valueOf(embedding[i]))
                .collect(Collectors.joining(","));
        return "[" + values + "]";
    }
}