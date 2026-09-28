package com.airline.airline_management.service;

import com.airline.airline_management.model.Booking;
import com.airline.airline_management.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class NotificationService {

    // A pool of 5 worker threads that handle notifications concurrently
    private final ExecutorService executor = Executors.newFixedThreadPool(5);

    @Autowired
    private BookingRepository bookingRepository;

    public void notifyAffectedPassengers(Long flightId, String newStatus) {
        List<Booking> affected = bookingRepository.findAll().stream()
                .filter(b -> b.getFlight().getId().equals(flightId) && b.getStatus().equals("CONFIRMED"))
                .toList();

        for (Booking booking : affected) {
            executor.submit(() -> sendNotification(booking, newStatus));
        }
    }

    private void sendNotification(Booking booking, String newStatus) {
        try {
            Thread.sleep(1000); // simulates the delay of actually sending an email/SMS
            System.out.println("[" + Thread.currentThread().getName() + "] Notifying "
                    + booking.getUser().getEmail() + ": your flight "
                    + booking.getFlight().getSource() + " → " + booking.getFlight().getDestination()
                    + " is now " + newStatus + ".");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}