package com.airline.airline_management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlightSegmentDTO {
    private Long flightId;
    private String flightNumber;
    private String source;
    private String destination;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private long durationMinutes;
    private String durationFormatted;
    private String aircraftModel;
    private String status;
    private int availableEconomySeats;
    private int availableBusinessSeats;
    private int availableFirstClassSeats;
    private double basePrice;
}
