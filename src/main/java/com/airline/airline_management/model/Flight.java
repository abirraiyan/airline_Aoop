package com.airline.airline_management.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "flights")
@Data
public class Flight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String source;
    private String destination;

    private int availableEconomySeats;
    private int availableBusinessSeats;
    private int availableFirstClassSeats;

    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;

    private double basePrice;
    private String status; // "SCHEDULED", "DELAYED", "CANCELLED"

    @ManyToOne
    @JoinColumn(name = "aircraft_id")
    private Aircraft aircraft;
}