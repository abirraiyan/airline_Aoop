package com.airline.airline_management.repository;

import com.airline.airline_management.model.Booking;
import com.airline.airline_management.model.Flight;
import com.airline.airline_management.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUser(User user);
    List<Booking> findByFlight(Flight flight);
}