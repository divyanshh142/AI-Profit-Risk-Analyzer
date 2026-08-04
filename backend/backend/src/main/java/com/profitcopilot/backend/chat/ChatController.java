package com.profitcopilot.backend.chat;

import com.profitcopilot.backend.tools.FastApiTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {

    private final ChatClient chatClient;

    // RAG (vector store + QuestionAnswerAdvisor) temporarily removed —
    // Spring AI 2.0.0-M4's Google GenAI embedding auto-config has a bug
    // requiring project-id even in API-key mode. Tool-calling still works
    // fully without it. Revisit once M5+/GA fixes this, or swap in a
    // different embedding provider if time allows.
    public ChatController(ChatClient.Builder builder, FastApiTools tools) {
        this.chatClient = builder
                .defaultTools(tools)
                .defaultSystem("""
                    You are a Supply Chain Copilot for a small e-commerce business.
                    You have tools to check demand forecasts, return risk, vendor
                    delivery risk, and product profitability. Use the tools to get
                    real numbers before answering — never guess numbers. Keep answers
                    concise and business-friendly, not overly technical.
                    """)
                .build();
    }

    @GetMapping("/api/chat")
    public String chat(@RequestParam String message) {
        return chatClient.prompt()
                .user(message)
                .call()
                .content();
    }
}