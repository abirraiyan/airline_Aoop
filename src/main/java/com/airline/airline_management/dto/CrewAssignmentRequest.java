package com.airline.airline_management.dto;

import lombok.Data;

@Data
public class CrewAssignmentRequest {
    private Long crewId;
    private Long flightId;
}