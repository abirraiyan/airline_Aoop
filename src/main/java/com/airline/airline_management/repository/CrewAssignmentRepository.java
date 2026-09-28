package com.airline.airline_management.repository;

import com.airline.airline_management.model.Crew;
import com.airline.airline_management.model.CrewAssignment;
import com.airline.airline_management.model.Flight;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CrewAssignmentRepository extends JpaRepository<CrewAssignment, Long> {
    List<CrewAssignment> findByCrew(Crew crew);
    List<CrewAssignment> findByFlight(Flight flight);
}