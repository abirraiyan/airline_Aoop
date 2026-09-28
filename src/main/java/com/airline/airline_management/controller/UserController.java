package com.airline.airline_management.controller;

import com.airline.airline_management.model.User;
import com.airline.airline_management.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    // Save a new user
    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user, Authentication authentication) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        if (userRepository.findByEmail(user.getEmail()) != null) {
            return ResponseEntity.badRequest().body("Email already in use");
        }
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Password is required");
        }

        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin) {
            user.setRole("PASSENGER");
        } else if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("PASSENGER");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User saved = userRepository.save(user);
        return ResponseEntity.ok(saved);
    }


    // Get all users
    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }



    @GetMapping("/me")
    public User getMyProfile(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email);
    }

    @PutMapping("/me")
    public org.springframework.http.ResponseEntity<?> updateMyProfile(@RequestBody User updatedUser, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email);
        if (user == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        if (updatedUser.getName() != null && !updatedUser.getName().trim().isBlank()) {
            user.setName(updatedUser.getName().trim());
        }
        if (updatedUser.getPhone() != null) {
            user.setPhone(updatedUser.getPhone().trim());
        }

        User saved = userRepository.save(user);
        return org.springframework.http.ResponseEntity.ok(saved);
    }
}
