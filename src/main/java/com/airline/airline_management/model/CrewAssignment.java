package com.airline.airline_management.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "crew_assignments")
@Data
public class CrewAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "crew_id")
    private Crew crew;

    @ManyToOne
    @JoinColumn(name = "flight_id")
    private Flight flight;
}