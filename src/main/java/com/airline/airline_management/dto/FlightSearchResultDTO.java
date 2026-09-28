package com.airline.airline_management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlightSearchResultDTO {
    private String source;
    private String destination;
    private LocalDate searchDate;
    
    @Builder.Default
    private List<JourneyDTO> directJourneys = new ArrayList<>();
    
    @Builder.Default
    private List<JourneyDTO> connectingJourneys = new ArrayList<>();
    
    private int totalDirect;
    private int totalConnecting;
    private int totalResults;
}
