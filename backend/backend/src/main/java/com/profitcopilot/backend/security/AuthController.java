package com.profitcopilot.backend.security;

import com.profitcopilot.backend.security.dto.AuthRequest;
import com.profitcopilot.backend.security.dto.AuthResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtils jwtUtils;

    public AuthController(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank() ||
            request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(new AuthResponse(null, null, "Username and password are required."));
        }

        // Generate JWT token for the authenticated user
        String token = jwtUtils.generateToken(request.getUsername());
        return ResponseEntity.ok(new AuthResponse(token, request.getUsername(), "Authentication successful."));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank() ||
            request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(new AuthResponse(null, null, "Username and password are required."));
        }

        String token = jwtUtils.generateToken(request.getUsername());
        return ResponseEntity.ok(new AuthResponse(token, request.getUsername(), "User registered successfully."));
    }
}
