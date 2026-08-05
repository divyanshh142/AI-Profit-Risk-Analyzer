package com.profitcopilot.backend.chat;

import com.profitcopilot.backend.tools.FastApiTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ChatController {

    private final ChatClient chatClient;
    private final RagService ragService;

    public ChatController(ChatClient.Builder builder, FastApiTools tools, RagService ragService) {
        this.ragService = ragService;
        this.chatClient = builder
                .defaultTools(tools)
                .defaultSystem("""
                    You are a Supply Chain Copilot for a small e-commerce business.
                    You have tools to check demand forecasts, return risk, vendor
                    delivery risk, and product profitability. You may also be given
                    relevant SKU reports as context below — use them if relevant,
                    and use the tools for anything not covered by the context.
                    Never guess numbers. Keep answers concise and business-friendly.
                    """)
                .build();
    }

    @GetMapping("/api/chat")
    public String chat(@RequestParam String message) {
        List<String> context = ragService.retrieveRelevantReports(message, 3);
        String contextBlock = context.isEmpty()
                ? ""
                : "\n\nRelevant SKU reports:\n" + String.join("\n", context);

        return chatClient.prompt()
                .user(message + contextBlock)
                .call()
                .content();
    }
}