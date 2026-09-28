package com.airline.airline_management.controller;

import com.airline.airline_management.dto.CrewAssignmentRequest;
import com.airline.airline_management.model.*;
import com.airline.airline_management.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class AdminOperationsAndSecurityTest {

    @Mock private FlightRepository flightRepository;
    @Mock private AircraftRepository aircraftRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private CrewRepository crewRepository;
    @Mock private CrewAssignmentRepository crewAssignmentRepository;

    @InjectMocks private FlightController flightController;
    @InjectMocks private AircraftController aircraftController;
    @InjectMocks private CrewController crewController;
    @InjectMocks private CrewAssignmentController crewAssignmentController;

    private Aircraft aircraftA320;
    private Flight scheduledFlight;
    private Crew pilotJohn;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        aircraftA320 = new Aircraft();
        aircraftA320.setId(10L);
        aircraftA320.setModel("Airbus A320");
        aircraftA320.setTotalSeats(180);
        aircraftA320.setEconomySeats(150);
        aircraftA320.setBusinessSeats(20);
        aircraftA320.setFirstClassSeats(10);

        scheduledFlight = new Flight();
        scheduledFlight.setId(101L);
        scheduledFlight.setSource("Dhaka");
        scheduledFlight.setDestination("Dubai");
        scheduledFlight.setDepartureTime(LocalDateTime.now().plusDays(2));
        scheduledFlight.setArrivalTime(LocalDateTime.now().plusDays(2).plusHours(5));
        scheduledFlight.setBasePrice(450.0);
        scheduledFlight.setStatus("SCHEDULED");
        scheduledFlight.setAircraft(aircraftA320);

        pilotJohn = new Crew();
        pilotJohn.setId(201L);
        pilotJohn.setName("Capt. John Smith");
        pilotJohn.setRole("PILOT");
    }

    @Test
    @DisplayName("Flight Creation - Rejects identical source and destination")
    void testCreateFlight_IdenticalSourceAndDestination() {
        Flight f = new Flight();
        f.setSource("Dhaka");
        f.setDestination("Dhaka");
        f.setDepartureTime(LocalDateTime.now().plusDays(1));
        f.setArrivalTime(LocalDateTime.now().plusDays(1).plusHours(2));
        f.setBasePrice(200.0);

        ResponseEntity<?> response = flightController.createFlight(f);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("identical"));
    }

    @Test
    @DisplayName("Flight Creation - Rejects arrival before departure")
    void testCreateFlight_InvalidTimeWindow() {
        Flight f = new Flight();
        f.setSource("Dhaka");
        f.setDestination("Chittagong");
        f.setDepartureTime(LocalDateTime.now().plusDays(2));
        f.setArrivalTime(LocalDateTime.now().plusDays(1)); // Before departure
        f.setBasePrice(120.0);

        ResponseEntity<?> response = flightController.createFlight(f);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("before arrival"));
    }

    @Test
    @DisplayName("Flight Creation - Rejects aircraft scheduling overlap conflict")
    void testCreateFlight_AircraftOverlapConflict() {
        Flight existing = new Flight();
        existing.setId(99L);
        existing.setSource("Dhaka");
        existing.setDestination("Singapore");
        existing.setAircraft(aircraftA320);
        existing.setDepartureTime(LocalDateTime.of(2026, 10, 10, 10, 0));
        existing.setArrivalTime(LocalDateTime.of(2026, 10, 10, 15, 0));

        when(aircraftRepository.findById(10L)).thenReturn(Optional.of(aircraftA320));
        when(flightRepository.findAll()).thenReturn(List.of(existing));

        // Overlapping candidate flight
        Flight candidate = new Flight();
        candidate.setSource("Dubai");
        candidate.setDestination("London");
        candidate.setAircraft(aircraftA320);
        candidate.setDepartureTime(LocalDateTime.of(2026, 10, 10, 12, 0)); // During existing flight
        candidate.setArrivalTime(LocalDateTime.of(2026, 10, 10, 18, 0));
        candidate.setBasePrice(700.0);

        ResponseEntity<?> response = flightController.createFlight(candidate);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Conflict: Aircraft Airbus A320 is already scheduled"));
    }

    @Test
    @DisplayName("Flight Deletion - Blocked when active bookings exist")
    void testDeleteFlight_BlockedByBookings() {
        when(flightRepository.findById(101L)).thenReturn(Optional.of(scheduledFlight));
        Booking booking = new Booking();
        booking.setId(501L);
        booking.setFlight(scheduledFlight);
        when(bookingRepository.findByFlight(scheduledFlight)).thenReturn(List.of(booking));

        ResponseEntity<?> response = flightController.deleteFlight(101L);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("booking(s) are associated"));
        verify(flightRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Flight Deletion - Blocked when crew assignments exist")
    void testDeleteFlight_BlockedByCrewAssignments() {
        when(flightRepository.findById(101L)).thenReturn(Optional.of(scheduledFlight));
        when(bookingRepository.findByFlight(scheduledFlight)).thenReturn(Collections.emptyList());

        CrewAssignment assignment = new CrewAssignment();
        assignment.setId(301L);
        assignment.setFlight(scheduledFlight);
        assignment.setCrew(pilotJohn);
        when(crewAssignmentRepository.findByFlight(scheduledFlight)).thenReturn(List.of(assignment));

        ResponseEntity<?> response = flightController.deleteFlight(101L);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("crew assignment(s) are currently attached"));
        verify(flightRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Aircraft Deletion - Blocked when aircraft is assigned to scheduled flight")
    void testDeleteAircraft_BlockedByScheduledFlight() {
        when(aircraftRepository.findById(10L)).thenReturn(Optional.of(aircraftA320));
        when(flightRepository.findAll()).thenReturn(List.of(scheduledFlight));

        ResponseEntity<?> response = aircraftController.deleteAircraft(10L);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Associated with scheduled flight"));
        verify(aircraftRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Crew Management - Update crew member details")
    void testUpdateCrew_Success() {
        when(crewRepository.findById(201L)).thenReturn(Optional.of(pilotJohn));
        when(crewRepository.save(any(Crew.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Crew update = new Crew();
        update.setName("Capt. Jonathan Smith");
        update.setRole("PILOT");

        ResponseEntity<?> response = crewController.updateCrew(201L, update);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        Crew updated = (Crew) response.getBody();
        assertEquals("Capt. Jonathan Smith", updated.getName());
    }

    @Test
    @DisplayName("Crew Assignment - Detects and prevents overlapping flight assignment")
    void testAssignCrew_OverlapConflict() {
        Flight flight1 = new Flight();
        flight1.setId(1L);
        flight1.setSource("Dhaka");
        flight1.setDestination("Dubai");
        flight1.setDepartureTime(LocalDateTime.of(2026, 11, 1, 8, 0));
        flight1.setArrivalTime(LocalDateTime.of(2026, 11, 1, 14, 0));

        Flight flight2 = new Flight();
        flight2.setId(2L);
        flight2.setSource("Dhaka");
        flight2.setDestination("Bangkok");
        flight2.setDepartureTime(LocalDateTime.of(2026, 11, 1, 10, 0)); // Overlaps flight1
        flight2.setArrivalTime(LocalDateTime.of(2026, 11, 1, 13, 0));

        CrewAssignment existing = new CrewAssignment();
        existing.setId(401L);
        existing.setCrew(pilotJohn);
        existing.setFlight(flight1);

        when(crewRepository.findById(201L)).thenReturn(Optional.of(pilotJohn));
        when(flightRepository.findById(2L)).thenReturn(Optional.of(flight2));
        when(crewAssignmentRepository.findByCrew(pilotJohn)).thenReturn(List.of(existing));

        CrewAssignmentRequest req = new CrewAssignmentRequest();
        req.setCrewId(201L);
        req.setFlightId(2L);

        ResponseEntity<?> response = crewAssignmentController.assignCrew(req);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Conflict: Capt. John Smith is already assigned to"));
        verify(crewAssignmentRepository, never()).save(any());
    }
}
