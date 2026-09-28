package com.airline.airline_management.dto;

import com.airline.airline_management.model.Flight;
import com.airline.airline_management.model.Payment;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class BookingDetailDTO {
    private Long id;
    private String bookingReference;
    private String status;
    private LocalDateTime bookingDate;
    private String seatClass;
    private int numberOfSeats;
    private String seatNumbers;
    private double totalPrice;

    // Passenger / Contact details
    private Long userId;
    private String passengerName;
    private String passengerEmail;
    private String passengerPhone;
    private String loyaltyTier;
    private int totalMiles;

    // Flight details
    private Flight flight;

    // Payment transactions
    private List<Payment> payments;

    // Eligibility & cancellation rules
    private boolean canCancel;
    private boolean canRetryPayment;
    private long hoursUntilDeparture;
    private double refundPercentage;
    private double estimatedRefund;
    private String cancellationPolicy;
}
