package com.airline.airline_management.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;

    private String method;       // "CREDIT_CARD", "WALLET", "NET_BANKING"
    private double amount;
    private String status;       // "SUCCESS", "FAILED", "REFUNDED"
    private LocalDateTime transactionDate;
}