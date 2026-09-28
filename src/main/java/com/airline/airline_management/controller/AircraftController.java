package com.airline.airline_management.controller;

import com.airline.airline_management.model.Aircraft;
import com.airline.airline_management.repository.AircraftRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/aircraft")
public class AircraftController {

    @Autowired
    private AircraftRepository aircraftRepository;

    @Autowired
    private com.airline.airline_management.repository.FlightRepository flightRepository;

    @PostMapping
    public org.springframework.http.ResponseEntity<?> createAircraft(@RequestBody Aircraft aircraft) {
        int sum = aircraft.getEconomySeats() + aircraft.getBusinessSeats() + aircraft.getFirstClassSeats();
        if (sum > aircraft.getTotalSeats()) {
            return org.springframework.http.ResponseEntity.badRequest().body(
                "Invalid capacity: Sum of cabin seats (" + sum + ") exceeds total capacity (" + aircraft.getTotalSeats() + ")."
            );
        }
        return org.springframework.http.ResponseEntity.ok(aircraftRepository.save(aircraft));
    }

    @GetMapping
    public List<Aircraft> getAllAircraft() {
        return aircraftRepository.findAll();
    }

    @GetMapping("/{id}")
    public Aircraft getAircraftById(@PathVariable Long id) {
        return aircraftRepository.findById(id).orElse(null);
    }

    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> updateAircraft(@PathVariable Long id, @RequestBody Aircraft updatedAircraft) {
        Aircraft aircraft = aircraftRepository.findById(id).orElse(null);
        if (aircraft == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        int sum = updatedAircraft.getEconomySeats() + updatedAircraft.getBusinessSeats() + updatedAircraft.getFirstClassSeats();
        if (sum > updatedAircraft.getTotalSeats()) {
            return org.springframework.http.ResponseEntity.badRequest().body(
                "Invalid capacity: Sum of cabin seats (" + sum + ") exceeds total capacity (" + updatedAircraft.getTotalSeats() + ")."
            );
        }

        aircraft.setModel(updatedAircraft.getModel());
        aircraft.setTotalSeats(updatedAircraft.getTotalSeats());
        aircraft.setEconomySeats(updatedAircraft.getEconomySeats());
        aircraft.setBusinessSeats(updatedAircraft.getBusinessSeats());
        aircraft.setFirstClassSeats(updatedAircraft.getFirstClassSeats());

        return org.springframework.http.ResponseEntity.ok(aircraftRepository.save(aircraft));
    }

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> deleteAircraft(@PathVariable Long id) {
        Aircraft aircraft = aircraftRepository.findById(id).orElse(null);
        if (aircraft == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        com.airline.airline_management.model.Flight flightUsingAircraft = flightRepository.findAll().stream()
                .filter(f -> f.getAircraft() != null && f.getAircraft().getId().equals(id))
                .findFirst().orElse(null);

        if (flightUsingAircraft != null) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT).body(
                    "Cannot delete aircraft: Associated with scheduled flight " + flightUsingAircraft.getId()
                    + " (" + flightUsingAircraft.getSource() + " → " + flightUsingAircraft.getDestination() + ")."
            );
        }

        aircraftRepository.delete(aircraft);
        return org.springframework.http.ResponseEntity.ok("Aircraft deleted successfully");
    }
}