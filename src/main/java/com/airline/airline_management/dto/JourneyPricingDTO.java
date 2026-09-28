package com.airline.airline_management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JourneyPricingDTO {
    private double basePriceSubtotal;
    private double multiLegDiscount;
    
    private double economyFinalPrice;
    private double businessFinalPrice;
    private double firstClassFinalPrice;

    private String currency;
}
