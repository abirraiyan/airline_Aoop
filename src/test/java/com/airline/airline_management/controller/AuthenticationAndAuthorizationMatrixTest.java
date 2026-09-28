package com.airline.airline_management.controller;

import com.airline.airline_management.config.JwtUtil;
import com.airline.airline_management.model.User;
import com.airline.airline_management.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
public class AuthenticationAndAuthorizationMatrixTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private FilterChainProxy springSecurityFilterChain;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    private MockMvc mockMvc;
    private String passengerToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilter(springSecurityFilterChain)
                .build();

        userRepository.deleteAll();

        User passenger = new User();
        passenger.setEmail("passenger@test.com");
        passenger.setPassword(passwordEncoder.encode("passengerPass123"));
        passenger.setName("Test Passenger");
        passenger.setRole("PASSENGER");
        userRepository.save(passenger);

        User admin = new User();
        admin.setEmail("admin@test.com");
        admin.setPassword(passwordEncoder.encode("adminPass123"));
        admin.setName("Test Admin");
        admin.setRole("ADMIN");
        userRepository.save(admin);

        passengerToken = jwtUtil.generateToken("passenger@test.com", "PASSENGER");
        adminToken = jwtUtil.generateToken("admin@test.com", "ADMIN");
    }

    @Test
    @DisplayName("Login: Valid credentials return token and 200")
    void testLoginSuccess() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"passenger@test.com\",\"password\":\"passengerPass123\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Login: Wrong password returns 401")
    void testLoginWrongPassword() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"passenger@test.com\",\"password\":\"WRONG_PASSWORD\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Missing Authorization header on protected endpoint returns 401")
    void testMissingAuthorizationHeader() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Invalid JWT token on protected endpoint returns 401")
    void testInvalidToken() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer INVALID_TOKEN_CONTENT_HERE"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Passenger accessing own profile /api/users/me returns 200")
    void testPassengerOwnProfile() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + passengerToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Passenger accessing own bookings /api/bookings/my returns 200")
    void testPassengerOwnBookings() throws Exception {
        mockMvc.perform(get("/api/bookings/my")
                        .header("Authorization", "Bearer " + passengerToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Passenger accessing admin endpoint /api/users returns 403 Forbidden")
    void testPassengerAccessingAdminUsers() throws Exception {
        mockMvc.perform(get("/api/users")
                        .header("Authorization", "Bearer " + passengerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Passenger accessing admin endpoint /api/crew returns 403 Forbidden")
    void testPassengerAccessingAdminCrew() throws Exception {
        mockMvc.perform(get("/api/crew")
                        .header("Authorization", "Bearer " + passengerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin accessing admin endpoint /api/users returns 200 OK")
    void testAdminAccessingAdminUsers() throws Exception {
        mockMvc.perform(get("/api/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Admin accessing admin endpoint /api/bookings returns 200 OK")
    void testAdminAccessingAdminBookings() throws Exception {
        mockMvc.perform(get("/api/bookings")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Public registration forces ROLE_PASSENGER even if user specifies ADMIN")
    void testPublicRegistrationForcesPassengerRole() throws Exception {
        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"hacker@test.com\",\"password\":\"hack123\",\"name\":\"Hacker\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk());

        User registered = userRepository.findByEmail("hacker@test.com");
        assertEquals("PASSENGER", registered.getRole());
    }
}
