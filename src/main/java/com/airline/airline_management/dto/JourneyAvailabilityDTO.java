package com.airline.airline_management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JourneyAvailabilityDTO {
    private int economySeats;
    private int businessSeats;
    private int firstClassSeats;
    
    private boolean isAvailable;
    private boolean isEconomyAvailable;
    private boolean isBusinessAvailable;
    private boolean isFirstClassAvailable;
    private boolean isLimitedAvailability; // e.g. < 5 seats
}
