package com.airline.airline_management.controller;

import com.airline.airline_management.dto.BookingDetailDTO;
import com.airline.airline_management.dto.BookingRequest;
import com.airline.airline_management.model.*;
import com.airline.airline_management.repository.*;
import com.airline.airline_management.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired private BookingRepository bookingRepository;
    @Autowired private FlightRepository flightRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private PaymentService paymentService;

    @GetMapping("/flight/{flightId}/occupied-seats")
    public List<String> getOccupiedSeats(@PathVariable Long flightId) {
        Flight flight = flightRepository.findById(flightId).orElse(null);
        if (flight == null) return java.util.Collections.emptyList();
        List<Booking> bookings = bookingRepository.findAll();
        List<String> occupied = new java.util.ArrayList<>();
        for (Booking b : bookings) {
            if (b.getFlight() != null && b.getFlight().getId().equals(flightId)) {
                if ("CONFIRMED".equals(b.getStatus()) || "PENDING".equals(b.getStatus())) {
                    if (b.getSeatNumbers() != null && !b.getSeatNumbers().isBlank()) {
                        String[] seats = b.getSeatNumbers().split("[,\\s]+");
                        for (String s : seats) {
                            if (!s.isBlank()) {
                                occupied.add(s.trim().toUpperCase());
                            }
                        }
                    }
                }
            }
        }
        return occupied;
    }

    @PostMapping
    public synchronized Object createBooking(@RequestBody BookingRequest request, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email);

        Flight flight = flightRepository.findById(request.getFlightId()).orElse(null);
        if (flight == null) return "Flight not found";

        int seatsLeft;
        switch (request.getSeatClass()) {
            case "ECONOMY" -> seatsLeft = flight.getAvailableEconomySeats();
            case "BUSINESS" -> seatsLeft = flight.getAvailableBusinessSeats();
            case "FIRST_CLASS" -> seatsLeft = flight.getAvailableFirstClassSeats();
            default -> { return "Invalid seat class"; }
        }

        if (seatsLeft < request.getNumberOfSeats()) {
            return "Not enough seats available in " + request.getSeatClass();
        }

        // Validate physical seat numbers if provided
        if (request.getSeatNumbers() != null && !request.getSeatNumbers().isBlank()) {
            List<String> currentOccupied = getOccupiedSeats(request.getFlightId());
            String[] requested = request.getSeatNumbers().split("[,\\s]+");
            for (String s : requested) {
                String seat = s.trim().toUpperCase();
                if (!seat.isBlank() && currentOccupied.contains(seat)) {
                    return "Seat " + seat + " is no longer available. Please select another seat.";
                }
            }
        }

        double multiplier;
        switch (request.getSeatClass()) {
            case "ECONOMY" -> multiplier = 1.0;
            case "BUSINESS" -> multiplier = 2.2;
            case "FIRST_CLASS" -> multiplier = 3.5;
            default -> { return "Invalid seat class"; }
        }

        String currentTier = user.getLoyaltyTier() != null ? user.getLoyaltyTier() : "SILVER";
        double tierDiscount = switch (currentTier) {
            case "GOLD" -> 0.05;
            case "PLATINUM" -> 0.10;
            default -> 0.0;
        };

        double rawPrice = flight.getBasePrice() * multiplier * request.getNumberOfSeats();
        double finalPrice = rawPrice * (1 - tierDiscount);

        // Step 1: create the booking as PENDING — seats are NOT deducted yet
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setFlight(flight);
        booking.setSeatClass(request.getSeatClass());
        booking.setNumberOfSeats(request.getNumberOfSeats());
        if (request.getSeatNumbers() != null && !request.getSeatNumbers().isBlank()) {
            booking.setSeatNumbers(request.getSeatNumbers().trim());
        }
        booking.setTotalPrice(finalPrice);
        booking.setStatus("PENDING");
        booking.setBookingDate(LocalDateTime.now());
        booking = bookingRepository.save(booking);

        // Step 2: attempt payment
        return attemptPayment(booking, request.getPaymentMethod(), request.getPaymentRef());
    }

    @PostMapping("/{id}/retry-payment")
    public synchronized Object retryPayment(@PathVariable Long id, @RequestBody BookingRequest request, Authentication authentication) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) return "Booking not found";

        String email = authentication.getName();
        if (!booking.getUser().getEmail().equals(email)) {
            return "You can only retry your own bookings";
        }
        if (!"PENDING".equals(booking.getStatus()) && !"PAYMENT_FAILED".equals(booking.getStatus())) {
            return "This booking is not awaiting payment";
        }

        // Re-check seat availability at retry time, since it wasn't reserved earlier
        Flight flight = booking.getFlight();
        int seatsLeft = switch (booking.getSeatClass()) {
            case "ECONOMY" -> flight.getAvailableEconomySeats();
            case "BUSINESS" -> flight.getAvailableBusinessSeats();
            case "FIRST_CLASS" -> flight.getAvailableFirstClassSeats();
            default -> 0;
        };
        if (seatsLeft < booking.getNumberOfSeats()) {
            return "Seats are no longer available for this booking";
        }

        // Validate physical seat numbers if provided
        String requestedSeats = request.getSeatNumbers() != null ? request.getSeatNumbers() : booking.getSeatNumbers();
        if (requestedSeats != null && !requestedSeats.isBlank()) {
            List<String> currentOccupied = getOccupiedSeats(flight.getId());
            String[] requested = requestedSeats.split("[,\\s]+");
            for (String s : requested) {
                String seat = s.trim().toUpperCase();
                if (!seat.isBlank() && currentOccupied.contains(seat)) {
                    // Allowed if previously assigned to this exact booking
                    boolean belongsToThisBooking = booking.getSeatNumbers() != null && booking.getSeatNumbers().contains(seat);
                    if (!belongsToThisBooking) {
                        return "Seat " + seat + " is no longer available. Please select another seat.";
                    }
                }
            }
            booking.setSeatNumbers(requestedSeats.trim());
        }

        return attemptPayment(booking, request.getPaymentMethod(), request.getPaymentRef());
    }

    private Object attemptPayment(Booking booking, String method, String paymentRef) {
        boolean success = paymentService.simulatePayment(method, paymentRef);

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setMethod(method);
        payment.setAmount(booking.getTotalPrice());
        payment.setStatus(success ? "SUCCESS" : "FAILED");
        payment.setTransactionDate(LocalDateTime.now());
        paymentRepository.save(payment);

        if (!success) {
            booking.setStatus("PAYMENT_FAILED");
            bookingRepository.save(booking);
            return "Payment failed. You can retry payment for booking #" + booking.getId();
        }

        // Payment succeeded — now actually deduct seats and confirm
        Flight flight = booking.getFlight();
        switch (booking.getSeatClass()) {
            case "ECONOMY" -> flight.setAvailableEconomySeats(flight.getAvailableEconomySeats() - booking.getNumberOfSeats());
            case "BUSINESS" -> flight.setAvailableBusinessSeats(flight.getAvailableBusinessSeats() - booking.getNumberOfSeats());
            case "FIRST_CLASS" -> flight.setAvailableFirstClassSeats(flight.getAvailableFirstClassSeats() - booking.getNumberOfSeats());
        }
        flightRepository.save(flight);

        booking.setStatus("CONFIRMED");
        Booking savedBooking = bookingRepository.save(booking);

        User user = booking.getUser();
        user.setTotalMiles(user.getTotalMiles() + (int) Math.round(booking.getTotalPrice()));
        if (user.getTotalMiles() >= 15000) {
            user.setLoyaltyTier("PLATINUM");
        } else if (user.getTotalMiles() >= 5000) {
            user.setLoyaltyTier("GOLD");
        } else {
            user.setLoyaltyTier("SILVER");
        }
        userRepository.save(user);

        return savedBooking;
    }

    @GetMapping("/my")
    public List<Booking> getMyBookings(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email);
        return bookingRepository.findByUser(user);
    }

    @GetMapping
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll(); // admin-only, restricted in SecurityConfig
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBookingById(@PathVariable Long id, Authentication authentication) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Booking not found");
        }

        String email = authentication.getName();
        boolean isOwner = booking.getUser() != null && booking.getUser().getEmail().equals(email);
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isOwner && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have permission to access this booking.");
        }

        BookingDetailDTO dto = mapToDetailDTO(booking);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/lookup")
    public ResponseEntity<?> lookupBooking(@RequestParam String reference, Authentication authentication) {
        if (reference == null || reference.trim().isBlank()) {
            return ResponseEntity.badRequest().body("Reference cannot be empty");
        }
        String cleanRef = reference.trim().toUpperCase();
        Long bookingId = null;
        if (cleanRef.startsWith("AW-BK-")) {
            try {
                bookingId = Long.parseLong(cleanRef.substring(6));
            } catch (NumberFormatException ignored) {}
        } else {
            try {
                bookingId = Long.parseLong(cleanRef);
            } catch (NumberFormatException ignored) {}
        }

        if (bookingId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid booking reference format. Expected AW-BK-XXXX or numeric ID.");
        }

        return getBookingById(bookingId, authentication);
    }

    private BookingDetailDTO mapToDetailDTO(Booking booking) {
        BookingDetailDTO dto = new BookingDetailDTO();
        dto.setId(booking.getId());
        dto.setBookingReference(String.format("AW-BK-%04d", booking.getId()));
        dto.setStatus(booking.getStatus());
        dto.setBookingDate(booking.getBookingDate());
        dto.setSeatClass(booking.getSeatClass());
        dto.setNumberOfSeats(booking.getNumberOfSeats());
        dto.setSeatNumbers(booking.getSeatNumbers());
        dto.setTotalPrice(booking.getTotalPrice());

        if (booking.getUser() != null) {
            dto.setUserId(booking.getUser().getId());
            dto.setPassengerName(booking.getUser().getName());
            dto.setPassengerEmail(booking.getUser().getEmail());
            dto.setPassengerPhone(booking.getUser().getPhone());
            dto.setLoyaltyTier(booking.getUser().getLoyaltyTier());
            dto.setTotalMiles(booking.getUser().getTotalMiles());
        }

        dto.setFlight(booking.getFlight());

        List<Payment> payments = paymentRepository.findByBooking(booking);
        dto.setPayments(payments);

        boolean isConfirmed = "CONFIRMED".equals(booking.getStatus());
        boolean isPendingOrFailed = "PENDING".equals(booking.getStatus()) || "PAYMENT_FAILED".equals(booking.getStatus());

        dto.setCanCancel(isConfirmed);
        dto.setCanRetryPayment(isPendingOrFailed);

        if (booking.getFlight() != null && booking.getFlight().getDepartureTime() != null) {
            long hours = java.time.Duration.between(LocalDateTime.now(), booking.getFlight().getDepartureTime()).toHours();
            dto.setHoursUntilDeparture(hours);

            double refundPercent;
            if (hours >= 168) {
                refundPercent = 1.0;
            } else if (hours >= 48) {
                refundPercent = 0.5;
            } else {
                refundPercent = 0.0;
            }
            dto.setRefundPercentage(refundPercent);
            dto.setEstimatedRefund(booking.getTotalPrice() * refundPercent);
            dto.setCancellationPolicy(
                "Standard Policy: 100% refund for cancellations > 7 days prior to departure; 50% refund between 48h and 7 days; Non-refundable within 48h."
            );
        }

        return dto;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id, Authentication authentication) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Booking not found");

        String email = authentication.getName();
        boolean isOwner = booking.getUser() != null && booking.getUser().getEmail().equals(email);
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isOwner && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have permission to cancel this booking.");
        }
        if (!"CONFIRMED".equals(booking.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Only confirmed bookings can be cancelled.");
        }

        // Release seats back to the flight
        Flight flight = booking.getFlight();
        if (flight != null) {
            switch (booking.getSeatClass()) {
                case "ECONOMY" -> flight.setAvailableEconomySeats(flight.getAvailableEconomySeats() + booking.getNumberOfSeats());
                case "BUSINESS" -> flight.setAvailableBusinessSeats(flight.getAvailableBusinessSeats() + booking.getNumberOfSeats());
                case "FIRST_CLASS" -> flight.setAvailableFirstClassSeats(flight.getAvailableFirstClassSeats() + booking.getNumberOfSeats());
            }
            flightRepository.save(flight);
        }

        // Refund policy based on how close to departure the cancellation happens
        long hoursUntilDeparture = flight != null && flight.getDepartureTime() != null ?
                java.time.Duration.between(LocalDateTime.now(), flight.getDepartureTime()).toHours() : 0;
        double refundPercent;
        if (hoursUntilDeparture >= 168) {        // 7+ days
            refundPercent = 1.0;
        } else if (hoursUntilDeparture >= 48) {  // 2-7 days
            refundPercent = 0.5;
        } else {
            refundPercent = 0.0;
        }
        double refundAmount = booking.getTotalPrice() * refundPercent;

        Payment refund = new Payment();
        refund.setBooking(booking);
        refund.setMethod("REFUND");
        refund.setAmount(refundAmount);
        refund.setStatus("SUCCESS");
        refund.setTransactionDate(LocalDateTime.now());
        paymentRepository.save(refund);

        booking.setStatus("CANCELLED");
        bookingRepository.save(booking);

        return ResponseEntity.ok(String.format("Booking cancelled. Refund: $%.2f (%.0f%% based on cancellation policy)",
                refundAmount, refundPercent * 100));
    }
}