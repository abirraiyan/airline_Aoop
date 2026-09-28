package com.airline.airline_management.repository;

import com.airline.airline_management.model.Flight;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FlightRepository extends JpaRepository<Flight, Long> {
    List<Flight> findBySourceAndDestination(String source, String destination);
}
