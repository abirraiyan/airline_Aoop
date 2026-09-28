package com.airline.airline_management.controller;

import com.airline.airline_management.dto.LoginRequest;
import com.airline.airline_management.model.User;
import com.airline.airline_management.repository.UserRepository;
import com.airline.airline_management.config.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        if (loginRequest == null || loginRequest.getEmail() == null || loginRequest.getPassword() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email and password are required");
        }

        User user = userRepository.findByEmail(loginRequest.getEmail().trim());

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password");
        }

        boolean matches = passwordEncoder.matches(loginRequest.getPassword(), user.getPassword());

        if (matches) {
            return ResponseEntity.ok(jwtUtil.generateToken(user.getEmail(), user.getRole()));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password");
        }
    }
}
