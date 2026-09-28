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
public class LayoverDTO {
    private String airport;
    private LocalDateTime arrivalTime;
    private LocalDateTime departureTime;
    private long durationMinutes;
    private String durationFormatted;
    private boolean isWarning; // e.g. < 75 minutes connection
}
