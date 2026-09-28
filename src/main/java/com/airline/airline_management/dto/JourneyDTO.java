package com.airline.airline_management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JourneyDTO {
    private String journeyId; // e.g. "DIR-4" or "CONN-5-7"
    private String journeyType; // "DIRECT" or "CONNECTING"
    private int stops; // 0 or 1
    
    private String origin;
    private String destination;
    
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    
    private long totalDurationMinutes;
    private String totalDurationFormatted;
    
    private long totalFlightTimeMinutes;
    private String totalFlightTimeFormatted;
    
    private long totalLayoverTimeMinutes;
    private String totalLayoverTimeFormatted;
    
    @Builder.Default
    private List<FlightSegmentDTO> segments = new ArrayList<>();
    
    @Builder.Default
    private List<LayoverDTO> layovers = new ArrayList<>();
    
    private JourneyPricingDTO pricing;
    private JourneyAvailabilityDTO availability;
    
    private String status; // "SCHEDULED", "DELAYED", "CANCELLED"
    private boolean isSelectable;
}
