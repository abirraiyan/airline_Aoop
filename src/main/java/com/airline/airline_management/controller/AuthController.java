package com.airline.airline_management.controller;

import com.airline.airline_management.dto.LoginRequest;
import com.airline.airline_management.model.User;
import com.airline.airline_management.repository.UserRepository;
import com.airline.airline_management.config.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    public String login(@RequestBody LoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.getEmail());

        if (user == null) {
            return "User not found";
        }

        boolean matches = passwordEncoder.matches(loginRequest.getPassword(), user.getPassword());

        if (matches) {
            return jwtUtil.generateToken(user.getEmail(),user.getRole());
        } else {
            return "Invalid password";
        }
    }
}
