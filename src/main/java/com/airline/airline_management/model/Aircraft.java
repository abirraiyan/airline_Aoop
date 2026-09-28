
package com.airline.airline_management.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "aircraft")
@Data
public class Aircraft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String model;          // e.g. "Boeing 737"
    private int totalSeats;
    private int economySeats;
    private int businessSeats;
    private int firstClassSeats;
}