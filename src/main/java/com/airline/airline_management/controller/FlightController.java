package com.airline.airline_management.controller;

import com.airline.airline_management.model.Aircraft;
import com.airline.airline_management.model.Flight;
import com.airline.airline_management.repository.AircraftRepository;
import com.airline.airline_management.repository.FlightRepository;
import com.airline.airline_management.service.FlightStatusSocketServer;
import com.airline.airline_management.service.NotificationService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/flights")
public class FlightController {

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private AircraftRepository aircraftRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private FlightStatusSocketServer socketServer;

    @Autowired
    private com.airline.airline_management.service.ConnectingFlightService connectingFlightService;

    @Autowired
    private com.airline.airline_management.repository.BookingRepository bookingRepository;

    @Autowired
    private com.airline.airline_management.repository.CrewAssignmentRepository crewAssignmentRepository;

    @GetMapping("/search")
    public com.airline.airline_management.dto.FlightSearchResultDTO searchFlights(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
        return connectingFlightService.searchJourneys(source, destination, date);
    }

    @PostMapping
    public org.springframework.http.ResponseEntity<?> createFlight(@RequestBody Flight flight) {
        if (flight.getSource() == null || flight.getSource().trim().isBlank() ||
            flight.getDestination() == null || flight.getDestination().trim().isBlank()) {
            return org.springframework.http.ResponseEntity.badRequest().body("Source and destination are required.");
        }
        if (flight.getSource().trim().equalsIgnoreCase(flight.getDestination().trim())) {
            return org.springframework.http.ResponseEntity.badRequest().body("Source and destination cannot be identical.");
        }
        if (flight.getDepartureTime() == null || flight.getArrivalTime() == null) {
            return org.springframework.http.ResponseEntity.badRequest().body("Departure and arrival times are required.");
        }
        if (!flight.getDepartureTime().isBefore(flight.getArrivalTime())) {
            return org.springframework.http.ResponseEntity.badRequest().body("Departure time must be before arrival time.");
        }
        if (flight.getBasePrice() <= 0) {
            return org.springframework.http.ResponseEntity.badRequest().body("Base price must be greater than zero.");
        }

        if (flight.getAircraft() != null && flight.getAircraft().getId() != null) {
            Aircraft aircraft = aircraftRepository.findById(flight.getAircraft().getId()).orElse(null);
            if (aircraft != null) {
                List<Flight> existingFlights = flightRepository.findAll().stream()
                        .filter(f -> f.getAircraft() != null && f.getAircraft().getId().equals(aircraft.getId()))
                        .toList();

                for (Flight other : existingFlights) {
                    boolean overlap = flight.getDepartureTime().isBefore(other.getArrivalTime())
                            && other.getDepartureTime().isBefore(flight.getArrivalTime());
                    if (overlap) {
                        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT).body(
                                "Conflict: Aircraft " + aircraft.getModel() + " is already scheduled for "
                                + other.getSource() + " → " + other.getDestination()
                                + " (" + other.getDepartureTime() + " to " + other.getArrivalTime() + ")."
                        );
                    }
                }

                flight.setAircraft(aircraft);
                flight.setAvailableEconomySeats(aircraft.getEconomySeats());
                flight.setAvailableBusinessSeats(aircraft.getBusinessSeats());
                flight.setAvailableFirstClassSeats(aircraft.getFirstClassSeats());
            }
        }

        if (flight.getStatus() == null || flight.getStatus().isBlank()) {
            flight.setStatus("SCHEDULED");
        }

        Flight saved = flightRepository.save(flight);
        return org.springframework.http.ResponseEntity.ok(saved);
    }

    @GetMapping
    public List<Flight> getAllFlights() {
        return flightRepository.findAll();
    }

    @GetMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> getFlightById(@PathVariable Long id) {
        Flight flight = flightRepository.findById(id).orElse(null);
        if (flight == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
        return org.springframework.http.ResponseEntity.ok(flight);
    }

    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> updateFlightStatus(
            @PathVariable Long id,
            @RequestBody Flight updatedFlight) {

        Flight flight = flightRepository.findById(id).orElse(null);
        if (flight == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        if (updatedFlight.getSource() != null && !updatedFlight.getSource().trim().isBlank()) {
            flight.setSource(updatedFlight.getSource().trim());
        }
        if (updatedFlight.getDestination() != null && !updatedFlight.getDestination().trim().isBlank()) {
            flight.setDestination(updatedFlight.getDestination().trim());
        }
        if (flight.getSource().equalsIgnoreCase(flight.getDestination())) {
            return org.springframework.http.ResponseEntity.badRequest().body("Source and destination cannot be identical.");
        }

        if (updatedFlight.getDepartureTime() != null && updatedFlight.getArrivalTime() != null) {
            if (!updatedFlight.getDepartureTime().isBefore(updatedFlight.getArrivalTime())) {
                return org.springframework.http.ResponseEntity.badRequest().body("Departure time must be before arrival time.");
            }
            flight.setDepartureTime(updatedFlight.getDepartureTime());
            flight.setArrivalTime(updatedFlight.getArrivalTime());
        }

        if (updatedFlight.getBasePrice() > 0) {
            flight.setBasePrice(updatedFlight.getBasePrice());
        }

        if (updatedFlight.getStatus() != null && !updatedFlight.getStatus().isBlank()) {
            flight.setStatus(updatedFlight.getStatus());
        }

        if (updatedFlight.getAircraft() != null && updatedFlight.getAircraft().getId() != null) {
            Aircraft aircraft = aircraftRepository.findById(updatedFlight.getAircraft().getId()).orElse(null);
            if (aircraft != null) {
                // Check conflict excluding this flight itself
                List<Flight> existing = flightRepository.findAll().stream()
                        .filter(f -> !f.getId().equals(id) && f.getAircraft() != null && f.getAircraft().getId().equals(aircraft.getId()))
                        .toList();
                for (Flight other : existing) {
                    boolean overlap = flight.getDepartureTime().isBefore(other.getArrivalTime())
                            && other.getDepartureTime().isBefore(flight.getArrivalTime());
                    if (overlap) {
                        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT).body(
                                "Conflict: Aircraft " + aircraft.getModel() + " is already scheduled for "
                                + other.getSource() + " → " + other.getDestination()
                                + " (" + other.getDepartureTime() + " to " + other.getArrivalTime() + ")."
                        );
                    }
                }
                flight.setAircraft(aircraft);
            }
        }

        Flight saved = flightRepository.save(flight);

        // Notify passengers when flight is delayed or cancelled
        if ("DELAYED".equals(saved.getStatus()) || "CANCELLED".equals(saved.getStatus())) {
            notificationService.notifyAffectedPassengers(saved.getId(), saved.getStatus());
            socketServer.broadcast("FLIGHT UPDATE: " + saved.getSource() + " → " + saved.getDestination()
                    + " is now " + saved.getStatus() + ".");
        }

        return org.springframework.http.ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> deleteFlight(@PathVariable Long id) {
        Flight flight = flightRepository.findById(id).orElse(null);
        if (flight == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        // Operational Dependency Check 1: Active bookings
        List<com.airline.airline_management.model.Booking> bookings = bookingRepository.findByFlight(flight);
        if (!bookings.isEmpty()) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT).body(
                    "Cannot delete flight: " + bookings.size() + " booking(s) are associated with this flight."
            );
        }

        // Operational Dependency Check 2: Crew assignments
        List<com.airline.airline_management.model.CrewAssignment> assignments = crewAssignmentRepository.findByFlight(flight);
        if (!assignments.isEmpty()) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT).body(
                    "Cannot delete flight: " + assignments.size() + " crew assignment(s) are currently attached to this flight."
            );
        }

        flightRepository.delete(flight);
        return org.springframework.http.ResponseEntity.ok("Flight deleted successfully");
    }
}