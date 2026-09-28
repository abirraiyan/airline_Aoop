package com.airline.airline_management.repository;

import com.airline.airline_management.model.Crew;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrewRepository extends JpaRepository<Crew, Long> {
}