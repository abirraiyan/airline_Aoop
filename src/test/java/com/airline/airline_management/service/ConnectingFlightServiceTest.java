package com.airline.airline_management.service;

import com.airline.airline_management.dto.FlightSearchResultDTO;
import com.airline.airline_management.dto.JourneyDTO;
import com.airline.airline_management.model.Aircraft;
import com.airline.airline_management.model.Flight;
import com.airline.airline_management.repository.FlightRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class ConnectingFlightServiceTest {

    private ConnectingFlightService service;
    private FlightRepository flightRepository;
    private Aircraft b737;

    @BeforeEach
    void setUp() {
        flightRepository = Mockito.mock(FlightRepository.class);
        service = new ConnectingFlightService(flightRepository);

        b737 = new Aircraft();
        b737.setId(1L);
        b737.setModel("Boeing 737");
        b737.setEconomySeats(150);
        b737.setBusinessSeats(24);
        b737.setFirstClassSeats(6);
    }

    private Flight createFlight(Long id, String source, String dest, LocalDateTime dep, LocalDateTime arr, double price, String status, int eco, int biz, int first) {
        Flight f = new Flight();
        f.setId(id);
        f.setSource(source);
        f.setDestination(dest);
        f.setDepartureTime(dep);
        f.setArrivalTime(arr);
        f.setBasePrice(price);
        f.setStatus(status);
        f.setAvailableEconomySeats(eco);
        f.setAvailableBusinessSeats(biz);
        f.setAvailableFirstClassSeats(first);
        f.setAircraft(b737);
        return f;
    }

    @Test
    @DisplayName("CASE 1: Direct flight exists -> Direct result displayed")
    void testCase1_DirectFlightExists() {
        Flight f1 = createFlight(1L, "Dhaka", "Dubai",
                LocalDateTime.of(2026, 9, 20, 10, 0),
                LocalDateTime.of(2026, 9, 20, 14, 0),
                400.0, "SCHEDULED", 50, 10, 2);

        FlightSearchResultDTO result = service.searchJourneys(List.of(f1), "Dhaka", "Dubai", LocalDate.of(2026, 9, 20));

        assertEquals(1, result.getDirectJourneys().size());
        assertEquals(0, result.getConnectingJourneys().size());
        JourneyDTO j = result.getDirectJourneys().get(0);
        assertEquals("DIRECT", j.getJourneyType());
        assertEquals("DIR-1", j.getJourneyId());
        assertEquals(0, j.getStops());
        assertEquals(240, j.getTotalDurationMinutes()); // 4 hours
        assertEquals("4h", j.getTotalDurationFormatted());
        assertTrue(j.isSelectable());
    }

    @Test
    @DisplayName("CASE 2: No direct flight but valid connection exists -> Connecting journey displayed")
    void testCase2_ValidConnectingJourney() {
        // Dhaka -> Doha (arrive 14:00), Doha -> London (depart 16:30, 2h 30m layover)
        Flight f1 = createFlight(1L, "Dhaka", "Doha",
                LocalDateTime.of(2026, 9, 20, 9, 0),
                LocalDateTime.of(2026, 9, 20, 14, 0),
                350.0, "SCHEDULED", 40, 8, 2);

        Flight f2 = createFlight(2L, "Doha", "London",
                LocalDateTime.of(2026, 9, 20, 16, 30),
                LocalDateTime.of(2026, 9, 20, 23, 0),
                450.0, "SCHEDULED", 30, 6, 1);

        FlightSearchResultDTO result = service.searchJourneys(List.of(f1, f2), "Dhaka", "London", LocalDate.of(2026, 9, 20));

        assertEquals(0, result.getDirectJourneys().size());
        assertEquals(1, result.getConnectingJourneys().size());

        JourneyDTO conn = result.getConnectingJourneys().get(0);
        assertEquals("CONNECTING", conn.getJourneyType());
        assertEquals(1, conn.getStops());
        assertEquals("Doha", conn.getLayovers().get(0).getAirport());
        assertEquals(150, conn.getLayovers().get(0).getDurationMinutes()); // 2h 30m
        assertEquals("2h 30m", conn.getLayovers().get(0).getDurationFormatted());
        assertEquals(840, conn.getTotalDurationMinutes()); // 14 hours total (09:00 to 23:00)
        assertTrue(conn.isSelectable());
        // Verify pricing subtotal: 350 + 450 = 800; 5% multi-leg discount = 40; discounted base = 760
        assertEquals(800.0, conn.getPricing().getBasePriceSubtotal());
        assertEquals(40.0, conn.getPricing().getMultiLegDiscount());
        assertEquals(760.0, conn.getPricing().getEconomyFinalPrice());
    }

    @Test
    @DisplayName("CASE 3: Connection less than 1 hour -> Rejected")
    void testCase3_ConnectionLessThanOneHour_Rejected() {
        // Dhaka -> Doha (arrive 14:00), Doha -> London (depart 14:45, layover 45 mins < 60 mins)
        Flight f1 = createFlight(1L, "Dhaka", "Doha",
                LocalDateTime.of(2026, 9, 20, 9, 0),
                LocalDateTime.of(2026, 9, 20, 14, 0),
                350.0, "SCHEDULED", 40, 8, 2);

        Flight f2 = createFlight(2L, "Doha", "London",
                LocalDateTime.of(2026, 9, 20, 14, 45),
                LocalDateTime.of(2026, 9, 20, 21, 0),
                450.0, "SCHEDULED", 30, 6, 1);

        FlightSearchResultDTO result = service.searchJourneys(List.of(f1, f2), "Dhaka", "London", LocalDate.of(2026, 9, 20));

        assertEquals(0, result.getConnectingJourneys().size(), "Connection with 45m layover must be rejected");
    }

    @Test
    @DisplayName("CASE 4: Connection more than 24 hours -> Rejected")
    void testCase4_ConnectionMoreThan24Hours_Rejected() {
        // Dhaka -> Doha (arrive Sep 20 14:00), Doha -> London (depart Sep 21 16:00, layover 26 hours > 24 hours)
        Flight f1 = createFlight(1L, "Dhaka", "Doha",
                LocalDateTime.of(2026, 9, 20, 9, 0),
                LocalDateTime.of(2026, 9, 20, 14, 0),
                350.0, "SCHEDULED", 40, 8, 2);

        Flight f2 = createFlight(2L, "Doha", "London",
                LocalDateTime.of(2026, 9, 21, 16, 0),
                LocalDateTime.of(2026, 9, 21, 23, 0),
                450.0, "SCHEDULED", 30, 6, 1);

        FlightSearchResultDTO result = service.searchJourneys(List.of(f1, f2), "Dhaka", "London", LocalDate.of(2026, 9, 20));

        assertEquals(0, result.getConnectingJourneys().size(), "Connection exceeding 24h layover must be rejected");
    }

    @Test
    @DisplayName("CASE 5: Arrival after connecting departure -> Rejected")
    void testCase5_ArrivalAfterConnectingDeparture_Rejected() {
        // Dhaka -> Doha (arrive 15:00), Doha -> London (departed 13:00)
        Flight f1 = createFlight(1L, "Dhaka", "Doha",
                LocalDateTime.of(2026, 9, 20, 9, 0),
                LocalDateTime.of(2026, 9, 20, 15, 0),
                350.0, "SCHEDULED", 40, 8, 2);

        Flight f2 = createFlight(2L, "Doha", "London",
                LocalDateTime.of(2026, 9, 20, 13, 0),
                LocalDateTime.of(2026, 9, 20, 20, 0),
                450.0, "SCHEDULED", 30, 6, 1);

        FlightSearchResultDTO result = service.searchJourneys(List.of(f1, f2), "Dhaka", "London", LocalDate.of(2026, 9, 20));

        assertEquals(0, result.getConnectingJourneys().size(), "Impossible negative connection must be rejected");
    }

    @Test
    @DisplayName("CASE 6: Connecting journey crosses midnight -> Correct dates and duration")
    void testCase6_CrossesMidnight_CorrectCalculation() {
        // Flight 1: Sep 20 22:00 -> Sep 21 02:00 (4h)
        // Layover in Doha: Sep 21 02:00 -> Sep 21 04:30 (2h 30m)
        // Flight 2: Sep 21 04:30 -> Sep 21 11:30 (7h)
        Flight f1 = createFlight(1L, "Dhaka", "Doha",
                LocalDateTime.of(2026, 9, 20, 22, 0),
                LocalDateTime.of(2026, 9, 21, 2, 0),
                300.0, "SCHEDULED", 40, 8, 2);

        Flight f2 = createFlight(2L, "Doha", "London",
                LocalDateTime.of(2026, 9, 21, 4, 30),
                LocalDateTime.of(2026, 9, 21, 11, 30),
                400.0, "SCHEDULED", 30, 6, 1);

        FlightSearchResultDTO result = service.searchJourneys(List.of(f1, f2), "Dhaka", "London", LocalDate.of(2026, 9, 20));

        assertEquals(1, result.getConnectingJourneys().size());
        JourneyDTO conn = result.getConnectingJourneys().get(0);
        assertEquals(LocalDateTime.of(2026, 9, 20, 22, 0), conn.getDepartureTime());
        assertEquals(LocalDateTime.of(2026, 9, 21, 11, 30), conn.getArrivalTime());
        assertEquals(810, conn.getTotalDurationMinutes()); // 13h 30m from 22:00 to 11:30 next day
        assertEquals("13h 30m", conn.getTotalDurationFormatted());
    }

    @Test
    @DisplayName("CASE 7: Second segment has no available seats -> Journey unavailable")
    void testCase7_SecondSegmentNoSeats_JourneyUnavailable() {
        Flight f1 = createFlight(1L, "Dhaka", "Doha",
                LocalDateTime.of(2026, 9, 20, 9, 0),
                LocalDateTime.of(2026, 9, 20, 14, 0),
                350.0, "SCHEDULED", 20, 5, 1);

        // Segment 2 is completely sold out across all classes (0 seats)
        Flight f2 = createFlight(2L, "Doha", "London",
                LocalDateTime.of(2026, 9, 20, 16, 0),
                LocalDateTime.of(2026, 9, 20, 22, 0),
                450.0, "SCHEDULED", 0, 0, 0);

        FlightSearchResultDTO result = service.searchJourneys(List.of(f1, f2), "Dhaka", "London", LocalDate.of(2026, 9, 20));

        assertEquals(1, result.getConnectingJourneys().size());
        JourneyDTO conn = result.getConnectingJourneys().get(0);
        assertFalse(conn.isSelectable(), "Journey with 0 available seats must be marked not selectable");
        assertFalse(conn.getAvailability().isAvailable());
        assertEquals(0, conn.getAvailability().getEconomySeats());
    }

    @Test
    @DisplayName("CASE 8: First segment cancelled -> Complete journey unavailable")
    void testCase8_FirstSegmentCancelled_JourneyUnavailable() {
        Flight f1 = createFlight(1L, "Dhaka", "Doha",
                LocalDateTime.of(2026, 9, 20, 9, 0),
                LocalDateTime.of(2026, 9, 20, 14, 0),
                350.0, "CANCELLED", 20, 5, 1);

        Flight f2 = createFlight(2L, "Doha", "London",
                LocalDateTime.of(2026, 9, 20, 16, 0),
                LocalDateTime.of(2026, 9, 20, 22, 0),
                450.0, "SCHEDULED", 20, 5, 1);

        FlightSearchResultDTO result = service.searchJourneys(List.of(f1, f2), "Dhaka", "London", LocalDate.of(2026, 9, 20));

        assertEquals(1, result.getConnectingJourneys().size());
        JourneyDTO conn = result.getConnectingJourneys().get(0);
        assertEquals("CANCELLED", conn.getStatus(), "If any segment is cancelled, journey must be CANCELLED");
        assertFalse(conn.isSelectable(), "Cancelled journey cannot be selectable");
    }

    @Test
    @DisplayName("CASE 9: Two valid connection possibilities -> Both displayed")
    void testCase9_TwoValidConnections_BothReturned() {
        // Leg 1 to Dubai
        Flight f1A = createFlight(1L, "Dhaka", "Dubai",
                LocalDateTime.of(2026, 9, 20, 8, 0),
                LocalDateTime.of(2026, 9, 20, 12, 0),
                300.0, "SCHEDULED", 30, 5, 1);

        // Leg 2 from Dubai to London
        Flight f2A = createFlight(2L, "Dubai", "London",
                LocalDateTime.of(2026, 9, 20, 14, 0),
                LocalDateTime.of(2026, 9, 20, 21, 0),
                400.0, "SCHEDULED", 30, 5, 1);

        // Leg 1 to Doha
        Flight f1B = createFlight(3L, "Dhaka", "Doha",
                LocalDateTime.of(2026, 9, 20, 9, 0),
                LocalDateTime.of(2026, 9, 20, 13, 0),
                280.0, "SCHEDULED", 30, 5, 1);

        // Leg 2 from Doha to London
        Flight f2B = createFlight(4L, "Doha", "London",
                LocalDateTime.of(2026, 9, 20, 15, 30),
                LocalDateTime.of(2026, 9, 20, 22, 30),
                420.0, "SCHEDULED", 30, 5, 1);

        FlightSearchResultDTO result = service.searchJourneys(List.of(f1A, f2A, f1B, f2B), "Dhaka", "London", LocalDate.of(2026, 9, 20));

        assertEquals(2, result.getConnectingJourneys().size(), "Both valid connecting journeys must be found");
        assertEquals(2, result.getTotalConnecting());
    }

    @Test
    @DisplayName("CASE 10: Direct and connecting journeys both exist -> Both displayed and clearly distinguished")
    void testCase10_DirectAndConnectingBothExist_BothCategorized() {
        // Direct flight Dhaka -> London
        Flight direct = createFlight(1L, "Dhaka", "London",
                LocalDateTime.of(2026, 9, 20, 10, 0),
                LocalDateTime.of(2026, 9, 20, 20, 0),
                800.0, "SCHEDULED", 50, 10, 2);

        // Connecting via Singapore
        Flight f1 = createFlight(2L, "Dhaka", "Singapore",
                LocalDateTime.of(2026, 9, 20, 9, 0),
                LocalDateTime.of(2026, 9, 20, 15, 0),
                350.0, "SCHEDULED", 30, 5, 1);

        Flight f2 = createFlight(3L, "Singapore", "London",
                LocalDateTime.of(2026, 9, 20, 18, 0),
                LocalDateTime.of(2026, 9, 21, 2, 0),
                500.0, "SCHEDULED", 30, 5, 1);

        FlightSearchResultDTO result = service.searchJourneys(List.of(direct, f1, f2), "Dhaka", "London", LocalDate.of(2026, 9, 20));

        assertEquals(1, result.getDirectJourneys().size());
        assertEquals("DIRECT", result.getDirectJourneys().get(0).getJourneyType());
        assertEquals(0, result.getDirectJourneys().get(0).getStops());

        assertEquals(1, result.getConnectingJourneys().size());
        assertEquals("CONNECTING", result.getConnectingJourneys().get(0).getJourneyType());
        assertEquals(1, result.getConnectingJourneys().get(0).getStops());

        assertEquals(2, result.getTotalResults());
    }
}
