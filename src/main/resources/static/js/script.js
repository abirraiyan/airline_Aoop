/**
 * Aerowing Airlines — Landing & Authentication Handlers
 * Integrates with centralized auth.js, api.js, and notification.js.
 */

// ============ AUTH FUNCTIONS ============

// Login function
async function loginUser() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const messageDiv = document.getElementById("message");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!email || !password) {
        if (messageDiv) {
            messageDiv.style.color = "var(--danger)";
            messageDiv.innerText = "Please enter both email and password.";
        }
        if (window.toast) window.toast.warning("Please enter both email and password.");
        return;
    }

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const resultText = await response.text();
        const looksLikeToken = resultText.split(".").length === 3 && resultText.startsWith("eyJ");

        if (looksLikeToken) {
            if (window.auth) {
                window.auth.setSession(resultText, email);
            } else {
                localStorage.setItem("token", resultText);
                localStorage.setItem("email", email);
            }

            if (messageDiv) {
                messageDiv.style.color = "var(--success)";
                messageDiv.innerText = "Authentication successful! Boarding now...";
            }
            if (window.toast) window.toast.success("Welcome aboard Aerowing Airlines!");

            const role = window.auth ? window.auth.getUserRole() : null;
            setTimeout(() => {
                window.location.href = role === "ADMIN" ? "dashboard.html" : "flights.html";
            }, 600);
        } else {
            if (messageDiv) {
                messageDiv.style.color = "var(--danger)";
                messageDiv.innerText = resultText || "Invalid credentials.";
            }
            if (window.toast) window.toast.error(resultText || "Invalid email or password.");
        }
    } catch (error) {
        if (messageDiv) {
            messageDiv.style.color = "var(--danger)";
            messageDiv.innerText = "Could not connect to server. Ensure Spring Boot is active.";
        }
        if (window.toast) window.toast.error("Could not reach backend server.");
        console.error(error);
    }
}

// Register function
async function registerUser() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const roleSelect = document.getElementById("role");
    const role = roleSelect ? roleSelect.value : "PASSENGER";
    const messageDiv = document.getElementById("message");

    if (!name || !email || !password) {
        if (messageDiv) {
            messageDiv.style.color = "var(--danger)";
            messageDiv.innerText = "Please fill in all required fields.";
        }
        if (window.toast) window.toast.warning("Please fill in all required fields.");
        return;
    }

    try {
        const response = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role })
        });

        if (response.ok) {
            if (messageDiv) {
                messageDiv.style.color = "var(--success)";
                messageDiv.innerText = "Account created successfully! Redirecting to login...";
            }
            if (window.toast) window.toast.success("Account created! You can now log in.");
            setTimeout(() => { window.location.href = "login.html"; }, 800);
        } else {
            if (messageDiv) {
                messageDiv.style.color = "var(--danger)";
                messageDiv.innerText = "Registration failed. An account with this email may already exist.";
            }
            if (window.toast) window.toast.error("Registration failed. Please try a different email.");
        }
    } catch (error) {
        if (messageDiv) {
            messageDiv.style.color = "var(--danger)";
            messageDiv.innerText = "Could not connect to server.";
        }
        if (window.toast) window.toast.error("Connection failed.");
        console.error(error);
    }
}

// Global search trigger from hero
function searchFlights() {
    const token = localStorage.getItem("token");
    if (token) {
        window.location.href = "flights.html";
    } else {
        window.location.href = "login.html";
    }
}