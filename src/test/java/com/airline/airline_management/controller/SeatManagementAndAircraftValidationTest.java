package com.airline.airline_management.controller;

import com.airline.airline_management.dto.BookingRequest;
import com.airline.airline_management.model.Aircraft;
import com.airline.airline_management.model.Booking;
import com.airline.airline_management.model.Flight;
import com.airline.airline_management.model.User;
import com.airline.airline_management.repository.AircraftRepository;
import com.airline.airline_management.repository.BookingRepository;
import com.airline.airline_management.repository.FlightRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class SeatManagementAndAircraftValidationTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private FlightRepository flightRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AircraftRepository aircraftRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private BookingController bookingController;

    @InjectMocks
    private AircraftController aircraftController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("Occupied Seats: Returns occupied seats for confirmed and pending bookings on matching flight")
    void testGetOccupiedSeats() {
        Flight f1 = new Flight();
        f1.setId(101L);

        Flight f2 = new Flight();
        f2.setId(102L);

        when(flightRepository.findById(101L)).thenReturn(Optional.of(f1));

        Booking b1 = new Booking();
        b1.setFlight(f1);
        b1.setStatus("CONFIRMED");
        b1.setSeatNumbers("12A, 12B");

        Booking b2 = new Booking();
        b2.setFlight(f1);
        b2.setStatus("PENDING");
        b2.setSeatNumbers("14C");

        Booking b3 = new Booking();
        b3.setFlight(f1);
        b3.setStatus("CANCELLED");
        b3.setSeatNumbers("15D");

        Booking b4 = new Booking();
        b4.setFlight(f2);
        b4.setStatus("CONFIRMED");
        b4.setSeatNumbers("16E");

        when(bookingRepository.findAll()).thenReturn(List.of(b1, b2, b3, b4));

        List<String> occupied = bookingController.getOccupiedSeats(101L);

        assertEquals(3, occupied.size());
        assertTrue(occupied.contains("12A"));
        assertTrue(occupied.contains("12B"));
        assertTrue(occupied.contains("14C"));
        assertFalse(occupied.contains("15D"), "Cancelled booking seats must not be marked occupied");
        assertFalse(occupied.contains("16E"), "Other flight seats must not be included");
    }

    @Test
    @DisplayName("Seat Conflict: Rejects booking creation if seat is already occupied")
    void testCreateBookingSeatConflict() {
        Flight f1 = new Flight();
        f1.setId(101L);
        f1.setAvailableEconomySeats(10);

        User user = new User();
        user.setEmail("traveler@example.com");

        when(authentication.getName()).thenReturn("traveler@example.com");
        when(userRepository.findByEmail("traveler@example.com")).thenReturn(user);
        when(flightRepository.findById(101L)).thenReturn(Optional.of(f1));

        Booking existing = new Booking();
        existing.setFlight(f1);
        existing.setStatus("CONFIRMED");
        existing.setSeatNumbers("12A");
        when(bookingRepository.findAll()).thenReturn(List.of(existing));

        BookingRequest req = new BookingRequest();
        req.setFlightId(101L);
        req.setSeatClass("ECONOMY");
        req.setNumberOfSeats(1);
        req.setSeatNumbers("12A");

        Object response = bookingController.createBooking(req, authentication);

        assertTrue(response instanceof String);
        assertEquals("Seat 12A is no longer available. Please select another seat.", response.toString());
    }

    @Test
    @DisplayName("Capacity Validation: Rejects aircraft update when sum of cabin seats exceeds total capacity")
    void testAircraftOvercapacityValidation() {
        Aircraft existing = new Aircraft();
        existing.setId(1L);
        existing.setModel("Boeing 737");
        existing.setTotalSeats(180);
        existing.setEconomySeats(150);
        existing.setBusinessSeats(24);
        existing.setFirstClassSeats(6);

        when(aircraftRepository.findById(1L)).thenReturn(Optional.of(existing));

        Aircraft invalidConfig = new Aircraft();
        invalidConfig.setModel("Boeing 737");
        invalidConfig.setTotalSeats(180);
        invalidConfig.setEconomySeats(170);
        invalidConfig.setBusinessSeats(20);
        invalidConfig.setFirstClassSeats(10); // 170 + 20 + 10 = 200 > 180

        ResponseEntity<?> response = aircraftController.updateAircraft(1L, invalidConfig);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Invalid capacity: Sum of cabin seats (200) exceeds total capacity (180)."));
        verify(aircraftRepository, never()).save(any());
    }

    @Test
    @DisplayName("Capacity Validation: Accepts valid aircraft update where cabin seats sum <= total capacity")
    void testAircraftValidCapacity() {
        Aircraft existing = new Aircraft();
        existing.setId(1L);
        existing.setModel("Airbus A320");
        existing.setTotalSeats(180);
        existing.setEconomySeats(150);
        existing.setBusinessSeats(24);
        existing.setFirstClassSeats(6);

        when(aircraftRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(aircraftRepository.save(any(Aircraft.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Aircraft validConfig = new Aircraft();
        validConfig.setModel("Airbus A320-200");
        validConfig.setTotalSeats(180);
        validConfig.setEconomySeats(144);
        validConfig.setBusinessSeats(24);
        validConfig.setFirstClassSeats(8); // 144 + 24 + 8 = 176 <= 180

        ResponseEntity<?> response = aircraftController.updateAircraft(1L, validConfig);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Aircraft saved = (Aircraft) response.getBody();
        assertNotNull(saved);
        assertEquals("Airbus A320-200", saved.getModel());
        assertEquals(144, saved.getEconomySeats());
        verify(aircraftRepository, times(1)).save(any(Aircraft.class));
    }
}
