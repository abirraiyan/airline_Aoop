package com.airline.airline_management.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "crew")
@Data
public class Crew {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String role; // "PILOT", "CO_PILOT", "CABIN_CREW"
}