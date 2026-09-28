package com.airline.airline_management.controller;

import com.airline.airline_management.model.Payment;
import com.airline.airline_management.model.User;
import com.airline.airline_management.repository.PaymentRepository;
import com.airline.airline_management.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired private PaymentRepository paymentRepository;
    @Autowired private UserRepository userRepository;

    @GetMapping("/my")
    public List<Payment> getMyPayments(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName());
        return paymentRepository.findByBooking_User(user);
    }

    @GetMapping
    public List<Payment> getAllPayments() {
        return paymentRepository.findAll(); // admin-only, restricted in SecurityConfig
    }
}