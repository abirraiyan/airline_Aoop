package com.airline.airline_management.controller;

import com.airline.airline_management.dto.ChatRequest;
import com.airline.airline_management.model.*;
import com.airline.airline_management.repository.*;
import com.airline.airline_management.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    @Autowired private GeminiService geminiService;
    @Autowired private FlightRepository flightRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BookingRepository bookingRepository;

    @PostMapping("/chat")
    public String chat(@RequestBody ChatRequest chatRequest, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email);

        List<Flight> flights = flightRepository.findAll();
        String flightSummary = flights.stream()
                .map(f -> String.format(
                        "- [Flight ID %d] %s to %s | Departs %s | Base price $%.2f | Status: %s | Aircraft: %s | Seats left: Economy %d, Business %d, First %d",
                        f.getId(), f.getSource(), f.getDestination(), f.getDepartureTime(),
                        f.getBasePrice(), f.getStatus(),
                        f.getAircraft() != null ? f.getAircraft().getModel() : "N/A",
                        f.getAvailableEconomySeats(), f.getAvailableBusinessSeats(), f.getAvailableFirstClassSeats()
                ))
                .collect(Collectors.joining("\n"));

        // Build a passenger profile from real booking history and loyalty data
        List<Booking> pastBookings = bookingRepository.findByUser(user);
        String bookingHistory = pastBookings.isEmpty()
                ? "No past bookings yet — this passenger is new."
                : pastBookings.stream()
                .map(b -> String.format(
                        "- %s to %s | %s class | Status: %s | Paid $%.2f",
                        b.getFlight().getSource(), b.getFlight().getDestination(),
                        b.getSeatClass(), b.getStatus(), b.getTotalPrice()
                ))
                .collect(Collectors.joining("\n"));

        String loyaltyTier = user.getLoyaltyTier() != null ? user.getLoyaltyTier() : "SILVER";
        int miles = user.getTotalMiles();

        String prompt = """
                You are a helpful, personalized airline travel assistant for Aerowing Airlines.

                PASSENGER PROFILE:
                - Loyalty tier: %s (%d miles)
                - Past bookings:
                %s

                AVAILABLE FLIGHTS:
                %s

                A passenger asks: "%s"

                Instructions:
                - Recommend the best matching flight(s) from the AVAILABLE FLIGHTS list ONLY — never invent flights.
                - Personalize your answer using the passenger's booking history where relevant (e.g. if they've flown a route or class before, or if this is their first booking).
                - Mention their loyalty tier if it affects pricing (GOLD gets 5%% off, PLATINUM gets 10%% off bookings).
                - Briefly explain WHY you're recommending each flight.
                - If the exact request isn't available, suggest the closest alternative.
                - Keep your answer concise, warm, and conversational — 3-5 sentences unless more detail is truly needed.
                """.formatted(loyaltyTier, miles, bookingHistory, flightSummary, chatRequest.getMessage());

        return geminiService.askGemini(prompt);
    }
}