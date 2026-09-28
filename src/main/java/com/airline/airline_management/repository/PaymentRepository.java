package com.airline.airline_management.repository;

import com.airline.airline_management.model.Booking;
import com.airline.airline_management.model.Payment;
import com.airline.airline_management.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByBooking_User(User user);
    List<Payment> findByBooking(Booking booking);
}