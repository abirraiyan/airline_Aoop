package com.airline.airline_management.controller;

import com.airline.airline_management.dto.BookingDetailDTO;
import com.airline.airline_management.dto.BookingRequest;
import com.airline.airline_management.model.Booking;
import com.airline.airline_management.model.Flight;
import com.airline.airline_management.model.Payment;
import com.airline.airline_management.model.User;
import com.airline.airline_management.repository.BookingRepository;
import com.airline.airline_management.repository.FlightRepository;
import com.airline.airline_management.repository.PaymentRepository;
import com.airline.airline_management.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class PassengerSecurityAndAuthorizationTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private FlightRepository flightRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private BookingController bookingController;

    @InjectMocks
    private UserController userController;

    private User passengerA;
    private User passengerB;
    private Booking bookingB;
    private Flight flight1;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        passengerA = new User();
        passengerA.setId(1L);
        passengerA.setEmail("passengerA@aerowing.com");
        passengerA.setName("Passenger Alpha");
        passengerA.setRole("ROLE_PASSENGER");
        passengerA.setLoyaltyTier("SILVER");
        passengerA.setTotalMiles(1200);

        passengerB = new User();
        passengerB.setId(2L);
        passengerB.setEmail("passengerB@aerowing.com");
        passengerB.setName("Passenger Beta");
        passengerB.setRole("ROLE_PASSENGER");
        passengerB.setLoyaltyTier("GOLD");
        passengerB.setTotalMiles(8000);

        flight1 = new Flight();
        flight1.setId(10L);
        flight1.setSource("Dhaka");
        flight1.setDestination("Dubai");
        flight1.setDepartureTime(LocalDateTime.now().plusDays(5));
        flight1.setArrivalTime(LocalDateTime.now().plusDays(5).plusHours(4));
        flight1.setBasePrice(450.0);

        bookingB = new Booking();
        bookingB.setId(42L);
        bookingB.setUser(passengerB);
        bookingB.setFlight(flight1);
        bookingB.setStatus("CONFIRMED");
        bookingB.setSeatClass("ECONOMY");
        bookingB.setNumberOfSeats(1);
        bookingB.setSeatNumbers("14A");
        bookingB.setTotalPrice(450.0);
        bookingB.setBookingDate(LocalDateTime.now().minusDays(1));
    }

    @Test
    @DisplayName("SECURITY: Passenger A is blocked (403 Forbidden) from accessing Passenger B's booking")
    void testPassengerCannotAccessOtherPassengerBooking() {
        when(bookingRepository.findById(42L)).thenReturn(Optional.of(bookingB));
        when(authentication.getName()).thenReturn("passengerA@aerowing.com");
        doReturn(Collections.emptyList()).when(authentication).getAuthorities();

        ResponseEntity<?> response = bookingController.getBookingById(42L, authentication);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("You do not have permission to access this booking."));
    }

    @Test
    @DisplayName("SECURITY: Passenger B can access their own booking (200 OK) with complete DTO")
    void testPassengerCanAccessOwnBooking() {
        when(bookingRepository.findById(42L)).thenReturn(Optional.of(bookingB));
        when(authentication.getName()).thenReturn("passengerB@aerowing.com");
        doReturn(Collections.emptyList()).when(authentication).getAuthorities();
        when(paymentRepository.findByBooking(bookingB)).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = bookingController.getBookingById(42L, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof BookingDetailDTO);
        BookingDetailDTO dto = (BookingDetailDTO) response.getBody();
        assertEquals(42L, dto.getId());
        assertEquals("AW-BK-0042", dto.getBookingReference());
        assertEquals("14A", dto.getSeatNumbers());
        assertEquals("Passenger Beta", dto.getPassengerName());
        assertTrue(dto.isCanCancel());
    }

    @Test
    @DisplayName("SECURITY: Admin can access any passenger's booking (200 OK)")
    void testAdminCanAccessAnyBooking() {
        when(bookingRepository.findById(42L)).thenReturn(Optional.of(bookingB));
        when(authentication.getName()).thenReturn("admin@example.com");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))).when(authentication).getAuthorities();
        when(paymentRepository.findByBooking(bookingB)).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = bookingController.getBookingById(42L, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        BookingDetailDTO dto = (BookingDetailDTO) response.getBody();
        assertEquals(42L, dto.getId());
    }

    @Test
    @DisplayName("SECURITY: Passenger A cannot cancel Passenger B's booking (403 Forbidden)")
    void testPassengerCannotCancelOtherPassengerBooking() {
        when(bookingRepository.findById(42L)).thenReturn(Optional.of(bookingB));
        when(authentication.getName()).thenReturn("passengerA@aerowing.com");
        doReturn(Collections.emptyList()).when(authentication).getAuthorities();

        ResponseEntity<?> response = bookingController.cancelBooking(42L, authentication);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("You do not have permission to cancel this booking."));
        verify(flightRepository, never()).save(any());
    }

    @Test
    @DisplayName("SECURITY: Passenger A cannot retry payment for Passenger B's booking")
    void testPassengerCannotRetryOtherPassengerBooking() {
        Booking failedBooking = new Booking();
        failedBooking.setId(99L);
        failedBooking.setUser(passengerB);
        failedBooking.setFlight(flight1);
        failedBooking.setStatus("PAYMENT_FAILED");

        when(bookingRepository.findById(99L)).thenReturn(Optional.of(failedBooking));
        when(authentication.getName()).thenReturn("passengerA@aerowing.com");

        BookingRequest req = new BookingRequest();
        req.setPaymentMethod("CREDIT CARD");
        req.setPaymentRef("4111222233334444");

        Object result = bookingController.retryPayment(99L, req, authentication);

        assertEquals("You can only retry your own bookings", result);
    }

    @Test
    @DisplayName("SECURITY: Profile update PUT /api/users/me updates name & phone without altering role or miles")
    void testProfileUpdateSecurity() {
        when(authentication.getName()).thenReturn("passengerA@aerowing.com");
        when(userRepository.findByEmail("passengerA@aerowing.com")).thenReturn(passengerA);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User input = new User();
        input.setName("Raiyan Updated");
        input.setPhone("+1 555-0199");
        input.setRole("ROLE_ADMIN");     // Malicious payload attempting privilege escalation
        input.setTotalMiles(999999);     // Malicious payload attempting miles inflation
        input.setLoyaltyTier("PLATINUM");

        ResponseEntity<?> response = userController.updateMyProfile(input, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        User saved = (User) response.getBody();
        assertEquals("Raiyan Updated", saved.getName());
        assertEquals("+1 555-0199", saved.getPhone());
        // Verify role and miles remain untampered
        assertEquals("ROLE_PASSENGER", saved.getRole(), "Role must not be altered by user profile update");
        assertEquals(1200, saved.getTotalMiles(), "Total miles must not be altered by user profile update");
        assertEquals("SILVER", saved.getLoyaltyTier(), "Loyalty tier must not be altered by user profile update");
    }
}
