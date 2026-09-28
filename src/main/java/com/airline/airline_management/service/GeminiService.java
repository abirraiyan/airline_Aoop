package com.airline.airline_management.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String model;

    private final RestTemplate restTemplate = createRestTemplate();

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();

        factory.setConnectTimeout(10000); // 10 seconds
        factory.setReadTimeout(30000);    // 30 seconds

        return new RestTemplate(factory);
    }

    public String askGemini(String prompt) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                return callGemini(prompt);
            } catch (Exception e) {
                System.out.println("[Gemini] Attempt " + attempt + " failed: " + e.getMessage());
                if (attempt == 2) {
                    return "The AI assistant is temporarily busy. Please try again in a moment.";
                }
                try { Thread.sleep(1500); } catch (InterruptedException ignored) {}
            }
        }
        return "The AI assistant is temporarily busy. Please try again in a moment.";
    }

    private String callGemini(String prompt) {

        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "gemini-1.5-flash";
        String url =
                "https://generativelanguage.googleapis.com/v1beta/models/"
                        + selectedModel
                        + ":generateContent?key="
                        + apiKey;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                )
        );

        try {
            Map response =
                    restTemplate.postForObject(url, requestBody, Map.class);

            List candidates = (List) response.get("candidates");
            Map firstCandidate = (Map) candidates.get(0);
            Map content = (Map) firstCandidate.get("content");
            List parts = (List) content.get("parts");
            Map firstPart = (Map) parts.get(0);

            return (String) firstPart.get("text");

        } catch (Exception e) {
            e.printStackTrace();
            return "Sorry, I couldn't process that right now.";
        }
    }
}