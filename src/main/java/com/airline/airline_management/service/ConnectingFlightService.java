package com.airline.airline_management.service;

import com.airline.airline_management.dto.*;
import com.airline.airline_management.model.Flight;
import com.airline.airline_management.repository.FlightRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class ConnectingFlightService {

    private final FlightRepository flightRepository;

    @Autowired
    public ConnectingFlightService(FlightRepository flightRepository) {
        this.flightRepository = flightRepository;
    }

    /**
     * Main entry point for searching direct and connecting journeys.
     */
    public FlightSearchResultDTO searchJourneys(String source, String destination, LocalDate date) {
        List<Flight> allFlights = flightRepository.findAll();
        return searchJourneys(allFlights, source, destination, date);
    }

    /**
     * Pure calculation logic accepting a flight list (supports in-memory unit testing).
     */
    public FlightSearchResultDTO searchJourneys(List<Flight> allFlights, String source, String destination, LocalDate date) {
        List<JourneyDTO> direct = findDirectJourneys(allFlights, source, destination, date);
        List<JourneyDTO> connecting = findConnectingJourneys(allFlights, source, destination, date);

        int totalDirect = direct.size();
        int totalConnecting = connecting.size();

        return FlightSearchResultDTO.builder()
                .source(source)
                .destination(destination)
                .searchDate(date)
                .directJourneys(direct)
                .connectingJourneys(connecting)
                .totalDirect(totalDirect)
                .totalConnecting(totalConnecting)
                .totalResults(totalDirect + totalConnecting)
                .build();
    }

    /**
     * Find direct 1-leg journeys.
     */
    public List<JourneyDTO> findDirectJourneys(List<Flight> flights, String source, String destination, LocalDate date) {
        List<JourneyDTO> results = new ArrayList<>();

        for (Flight f : flights) {
            if (source != null && !source.isBlank() && !matchesAirportOrCity(f.getSource(), source)) {
                continue;
            }
            if (destination != null && !destination.isBlank() && !matchesAirportOrCity(f.getDestination(), destination)) {
                continue;
            }
            if (date != null && f.getDepartureTime() != null) {
                if (!f.getDepartureTime().toLocalDate().equals(date)) {
                    continue;
                }
            }

            results.add(buildDirectJourney(f));
        }

        return results;
    }

    /**
     * Find valid 2-leg connecting journeys.
     * F1: A -> X, F2: X -> B
     */
    public List<JourneyDTO> findConnectingJourneys(List<Flight> flights, String source, String destination, LocalDate date) {
        if (source == null || source.isBlank() || destination == null || destination.isBlank()) {
            return Collections.emptyList();
        }

        if (source.trim().equalsIgnoreCase(destination.trim())) {
            return Collections.emptyList();
        }

        List<JourneyDTO> connecting = new ArrayList<>();

        // Group flights originating from 'source'
        List<Flight> leg1Candidates = flights.stream()
                .filter(f -> matchesAirportOrCity(f.getSource(), source))
                .filter(f -> !matchesAirportOrCity(f.getDestination(), destination)) // X != B (not direct)
                .filter(f -> date == null || (f.getDepartureTime() != null && f.getDepartureTime().toLocalDate().equals(date)))
                .toList();

        for (Flight f1 : leg1Candidates) {
            String transitHub = f1.getDestination();
            if (transitHub == null || matchesAirportOrCity(transitHub, source) || matchesAirportOrCity(transitHub, destination)) {
                continue;
            }

            for (Flight f2 : flights) {
                // Leg 2 must depart from transitHub and arrive at destination
                if (!matchesAirportOrCity(f2.getSource(), transitHub)) continue;
                if (!matchesAirportOrCity(f2.getDestination(), destination)) continue;

                // Validate connection timing and rules
                if (validateConnection(f1, f2)) {
                    connecting.add(buildConnectingJourney(f1, f2));
                }
            }
        }

        return connecting;
    }

    /**
     * Validates connection timing:
     * 1. F1 arrival is before F2 departure.
     * 2. Layover duration >= 60 minutes (1 hour).
     * 3. Layover duration <= 1440 minutes (24 hours).
     */
    public boolean validateConnection(Flight f1, Flight f2) {
        if (f1 == null || f2 == null) return false;
        if (f1.getArrivalTime() == null || f2.getDepartureTime() == null) return false;

        // Arrival must be strictly before departure
        if (!f1.getArrivalTime().isBefore(f2.getDepartureTime())) {
            return false;
        }

        Duration layover = Duration.between(f1.getArrivalTime(), f2.getDepartureTime());
        long minutes = layover.toMinutes();

        return minutes >= 60 && minutes <= 1440;
    }

    public long calculateLayoverMinutes(LocalDateTime arrival1, LocalDateTime departure2) {
        if (arrival1 == null || departure2 == null) return 0;
        return Duration.between(arrival1, departure2).toMinutes();
    }

    public long calculateTotalJourneyDurationMinutes(LocalDateTime firstDeparture, LocalDateTime finalArrival) {
        if (firstDeparture == null || finalArrival == null) return 0;
        return Duration.between(firstDeparture, finalArrival).toMinutes();
    }

    public JourneyDTO buildDirectJourney(Flight flight) {
        FlightSegmentDTO segment = mapToSegmentDTO(flight);

        long durationMinutes = segment.getDurationMinutes();
        String durationFormatted = formatDuration(durationMinutes);

        double base = flight.getBasePrice();
        JourneyPricingDTO pricing = JourneyPricingDTO.builder()
                .basePriceSubtotal(base)
                .multiLegDiscount(0.0)
                .economyFinalPrice(Math.round(base * 1.0))
                .businessFinalPrice(Math.round(base * 2.2))
                .firstClassFinalPrice(Math.round(base * 3.5))
                .currency("USD")
                .build();

        boolean ecoAvail = flight.getAvailableEconomySeats() > 0;
        boolean bizAvail = flight.getAvailableBusinessSeats() > 0;
        boolean firstAvail = flight.getAvailableFirstClassSeats() > 0;
        boolean isAvailable = ecoAvail || bizAvail || firstAvail;
        boolean isCancelled = "CANCELLED".equalsIgnoreCase(flight.getStatus());

        JourneyAvailabilityDTO availability = JourneyAvailabilityDTO.builder()
                .economySeats(flight.getAvailableEconomySeats())
                .businessSeats(flight.getAvailableBusinessSeats())
                .firstClassSeats(flight.getAvailableFirstClassSeats())
                .isAvailable(isAvailable && !isCancelled)
                .isEconomyAvailable(ecoAvail && !isCancelled)
                .isBusinessAvailable(bizAvail && !isCancelled)
                .isFirstClassAvailable(firstAvail && !isCancelled)
                .isLimitedAvailability(flight.getAvailableEconomySeats() <= 5)
                .build();

        return JourneyDTO.builder()
                .journeyId("DIR-" + flight.getId())
                .journeyType("DIRECT")
                .stops(0)
                .origin(flight.getSource())
                .destination(flight.getDestination())
                .departureTime(flight.getDepartureTime())
                .arrivalTime(flight.getArrivalTime())
                .totalDurationMinutes(durationMinutes)
                .totalDurationFormatted(durationFormatted)
                .totalFlightTimeMinutes(durationMinutes)
                .totalFlightTimeFormatted(durationFormatted)
                .totalLayoverTimeMinutes(0)
                .totalLayoverTimeFormatted("0m")
                .segments(List.of(segment))
                .layovers(Collections.emptyList())
                .pricing(pricing)
                .availability(availability)
                .status(flight.getStatus() != null ? flight.getStatus() : "SCHEDULED")
                .isSelectable(!isCancelled && isAvailable)
                .build();
    }

    public JourneyDTO buildConnectingJourney(Flight f1, Flight f2) {
        FlightSegmentDTO seg1 = mapToSegmentDTO(f1);
        FlightSegmentDTO seg2 = mapToSegmentDTO(f2);

        long layoverMinutes = calculateLayoverMinutes(f1.getArrivalTime(), f2.getDepartureTime());
        String layoverFormatted = formatDuration(layoverMinutes);
        boolean isWarning = layoverMinutes < 75; // tight connection notice

        LayoverDTO layover = LayoverDTO.builder()
                .airport(f1.getDestination())
                .arrivalTime(f1.getArrivalTime())
                .departureTime(f2.getDepartureTime())
                .durationMinutes(layoverMinutes)
                .durationFormatted(layoverFormatted)
                .isWarning(isWarning)
                .build();

        long totalJourneyMinutes = calculateTotalJourneyDurationMinutes(f1.getDepartureTime(), f2.getArrivalTime());
        String totalJourneyFormatted = formatDuration(totalJourneyMinutes);

        long totalFlightMinutes = seg1.getDurationMinutes() + seg2.getDurationMinutes();
        String totalFlightFormatted = formatDuration(totalFlightMinutes);

        // Pricing calculation: Independent segment pricing + 5% multi-leg incentive discount
        double subtotal = f1.getBasePrice() + f2.getBasePrice();
        double multiLegDiscount = Math.round(subtotal * 0.05); // 5% multi-leg discount
        double discountedBase = subtotal - multiLegDiscount;

        JourneyPricingDTO pricing = JourneyPricingDTO.builder()
                .basePriceSubtotal(subtotal)
                .multiLegDiscount(multiLegDiscount)
                .economyFinalPrice(Math.round(discountedBase * 1.0))
                .businessFinalPrice(Math.round(discountedBase * 2.2))
                .firstClassFinalPrice(Math.round(discountedBase * 3.5))
                .currency("USD")
                .build();

        // Availability calculation: min seats per class across segments
        int ecoSeats = Math.min(f1.getAvailableEconomySeats(), f2.getAvailableEconomySeats());
        int bizSeats = Math.min(f1.getAvailableBusinessSeats(), f2.getAvailableBusinessSeats());
        int firstSeats = Math.min(f1.getAvailableFirstClassSeats(), f2.getAvailableFirstClassSeats());

        boolean isEcoAvailable = ecoSeats > 0;
        boolean isBizAvailable = bizSeats > 0;
        boolean isFirstAvailable = firstSeats > 0;
        boolean isAvailable = isEcoAvailable || isBizAvailable || isFirstAvailable;

        // Journey status evaluation
        String status = "SCHEDULED";
        boolean isCancelled = "CANCELLED".equalsIgnoreCase(f1.getStatus()) || "CANCELLED".equalsIgnoreCase(f2.getStatus());
        boolean isDelayed = "DELAYED".equalsIgnoreCase(f1.getStatus()) || "DELAYED".equalsIgnoreCase(f2.getStatus());

        if (isCancelled) {
            status = "CANCELLED";
        } else if (isDelayed) {
            status = "DELAYED";
        }

        boolean isSelectable = !isCancelled && isAvailable;

        JourneyAvailabilityDTO availability = JourneyAvailabilityDTO.builder()
                .economySeats(ecoSeats)
                .businessSeats(bizSeats)
                .firstClassSeats(firstSeats)
                .isAvailable(isAvailable && !isCancelled)
                .isEconomyAvailable(isEcoAvailable && !isCancelled)
                .isBusinessAvailable(isBizAvailable && !isCancelled)
                .isFirstClassAvailable(isFirstAvailable && !isCancelled)
                .isLimitedAvailability(ecoSeats > 0 && ecoSeats <= 5)
                .build();

        return JourneyDTO.builder()
                .journeyId("CONN-" + f1.getId() + "-" + f2.getId())
                .journeyType("CONNECTING")
                .stops(1)
                .origin(f1.getSource())
                .destination(f2.getDestination())
                .departureTime(f1.getDepartureTime())
                .arrivalTime(f2.getArrivalTime())
                .totalDurationMinutes(totalJourneyMinutes)
                .totalDurationFormatted(totalJourneyFormatted)
                .totalFlightTimeMinutes(totalFlightMinutes)
                .totalFlightTimeFormatted(totalFlightFormatted)
                .totalLayoverTimeMinutes(layoverMinutes)
                .totalLayoverTimeFormatted(layoverFormatted)
                .segments(List.of(seg1, seg2))
                .layovers(List.of(layover))
                .pricing(pricing)
                .availability(availability)
                .status(status)
                .isSelectable(isSelectable)
                .build();
    }

    private FlightSegmentDTO mapToSegmentDTO(Flight f) {
        long duration = 0;
        if (f.getDepartureTime() != null && f.getArrivalTime() != null) {
            duration = Duration.between(f.getDepartureTime(), f.getArrivalTime()).toMinutes();
        }

        String aircraftModel = (f.getAircraft() != null && f.getAircraft().getModel() != null)
                ? f.getAircraft().getModel()
                : "Boeing 737";

        return FlightSegmentDTO.builder()
                .flightId(f.getId())
                .flightNumber("AW-" + (100 + (f.getId() != null ? f.getId() : 0)))
                .source(f.getSource())
                .destination(f.getDestination())
                .departureTime(f.getDepartureTime())
                .arrivalTime(f.getArrivalTime())
                .durationMinutes(duration)
                .durationFormatted(formatDuration(duration))
                .aircraftModel(aircraftModel)
                .status(f.getStatus() != null ? f.getStatus() : "SCHEDULED")
                .availableEconomySeats(f.getAvailableEconomySeats())
                .availableBusinessSeats(f.getAvailableBusinessSeats())
                .availableFirstClassSeats(f.getAvailableFirstClassSeats())
                .basePrice(f.getBasePrice())
                .build();
    }

    public static String formatDuration(long totalMinutes) {
        if (totalMinutes <= 0) return "0m";
        long hours = totalMinutes / 60;
        long minutes = totalMinutes % 60;
        if (hours > 0 && minutes > 0) {
            return hours + "h " + minutes + "m";
        } else if (hours > 0) {
            return hours + "h";
        } else {
            return minutes + "m";
        }
    }

    private boolean matchesAirportOrCity(String candidate, String query) {
        if (candidate == null || query == null) return false;
        String c = candidate.trim().toLowerCase();
        String q = query.trim().toLowerCase();
        return c.contains(q) || q.contains(c);
    }
}
