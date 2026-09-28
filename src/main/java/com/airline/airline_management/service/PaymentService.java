package com.airline.airline_management.service;

import org.springframework.stereotype.Service;
import java.util.Random;

@Service
public class PaymentService {

    private final Random random = new Random();

    /**
     * Simulates a payment gateway call. In a real system this would call
     * Stripe/PayPal/etc. For demo purposes: normally ~90% succeed, but
     * using card number "0000" always fails, so failure/retry can be
     * demonstrated reliably rather than relying on random luck.
     */
    public boolean simulatePayment(String method, String cardOrRef) {
        if ("0000".equals(cardOrRef)) {
            return false; // guaranteed failure, useful for demoing retry
        }
        return random.nextInt(100) < 90; // 90% success rate
    }
}