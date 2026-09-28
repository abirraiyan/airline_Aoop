package com.airline.airline_management.controller;

import com.airline.airline_management.model.Crew;
import com.airline.airline_management.repository.CrewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/crew")
public class CrewController {

    @Autowired private CrewRepository crewRepository;
    @Autowired private com.airline.airline_management.repository.CrewAssignmentRepository crewAssignmentRepository;

    @PostMapping
    public Crew createCrew(@RequestBody Crew crew) {
        return crewRepository.save(crew);
    }

    @GetMapping
    public List<Crew> getAllCrew() {
        return crewRepository.findAll();
    }

    @GetMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> getCrewById(@PathVariable Long id) {
        Crew crew = crewRepository.findById(id).orElse(null);
        if (crew == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
        return org.springframework.http.ResponseEntity.ok(crew);
    }

    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> updateCrew(@PathVariable Long id, @RequestBody Crew updatedCrew) {
        Crew crew = crewRepository.findById(id).orElse(null);
        if (crew == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        if (updatedCrew.getName() != null && !updatedCrew.getName().trim().isBlank()) {
            crew.setName(updatedCrew.getName().trim());
        }
        if (updatedCrew.getRole() != null && !updatedCrew.getRole().trim().isBlank()) {
            crew.setRole(updatedCrew.getRole().trim().toUpperCase());
        }

        Crew saved = crewRepository.save(crew);
        return org.springframework.http.ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> deleteCrew(@PathVariable Long id) {
        Crew crew = crewRepository.findById(id).orElse(null);
        if (crew == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        List<com.airline.airline_management.model.CrewAssignment> assignments = crewAssignmentRepository.findByCrew(crew);
        if (!assignments.isEmpty()) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT).body(
                    "Cannot delete crew member: Currently assigned to " + assignments.size() + " active flight(s)."
            );
        }

        crewRepository.delete(crew);
        return org.springframework.http.ResponseEntity.ok("Crew member removed");
    }
}