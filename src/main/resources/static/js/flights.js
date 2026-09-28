// Requires auth.js loaded first (provides `token`, `decodeRole`, `formatDate`)

const role = decodeRole(token);

if (role === "ADMIN") {
    document.getElementById("addToggleBtn").style.display = "inline-block";
    loadAircraftOptions();
}

function toggleAddForm() {
    const panel = document.getElementById("addFlightPanel");
    panel.style.display = panel.style.display === "block" ? "none" : "block";
}

async function loadAircraftOptions() {
    try {
        const response = await fetch("/api/aircraft", {
            headers: { "Authorization": "Bearer " + token }
        });
        if (!response.ok) return;
        const aircraftList = await response.json();
        const select = document.getElementById("aircraftId");
        select.innerHTML = aircraftList.map(a =>
            `<option value="${a.id}">${a.model} (ID ${a.id})</option>`
        ).join("");
    } catch (e) {
        console.error("Error loading aircraft:", e);
    }
}

async function loadFlights() {
    const statusDiv = document.getElementById("status");
    const listDiv = document.getElementById("flightList");

    try {
        const response = await fetch("/api/flights", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (response.status === 401 || response.status === 403) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Session expired. Redirecting to login...";
            localStorage.removeItem("token");
            localStorage.removeItem("email");
            setTimeout(() => window.location.href = "login.html", 1500);
            return;
        }

        if (!response.ok) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Failed to load flights (status " + response.status + ").";
            return;
        }

        const flights = await response.json();

        if (flights.length === 0) {
            statusDiv.innerText = "No flights available yet.";
            return;
        }

        statusDiv.innerText = "";
        window._flightsCache = flights; // so the booking modal can read seat counts without a second fetch
        listDiv.innerHTML = flights.map(f => {
            const totalLeft = (f.availableEconomySeats || 0) + (f.availableBusinessSeats || 0) + (f.availableFirstClassSeats || 0);
            const soldOut = totalLeft <= 0;
            return `
            <div class="flight-row">
                <div>
                    <div class="route">${f.source} <span class="arrow">&#9992;</span> ${f.destination}</div>
                    <div class="flight-meta">${formatDate(f.departureTime)} &rarr; ${formatDate(f.arrivalTime)} &middot; ${f.aircraft ? f.aircraft.model : "Aircraft TBD"}</div>
                    <div class="seats-left">${soldOut ? "Sold out" : totalLeft + " seats left across all classes"}</div>
                </div>
                <div class="price">$${f.basePrice}</div>
                <div><span class="status-badge status-${f.status}">${f.status}</span></div>
                <div><button class="book-btn" ${soldOut ? "disabled" : ""} onclick="openBookingModal(${f.id})">${soldOut ? "Sold Out" : "Book"}</button></div>
            </div>
        `;
        }).join("");
    } catch (error) {
        statusDiv.style.color = "#dc2626";
        statusDiv.innerText = "Could not connect to server. Is the backend running?";
        console.error(error);
    }
}

async function createFlight() {
    const messageDiv = document.getElementById("formMessage");
    const source = document.getElementById("source").value.trim();
    const destination = document.getElementById("destination").value.trim();
    const departureTime = document.getElementById("departureTime").value;
    const arrivalTime = document.getElementById("arrivalTime").value;
    const basePrice = document.getElementById("basePrice").value;
    const aircraftId = document.getElementById("aircraftId").value;

    if (!source || !destination || !departureTime || !arrivalTime || !basePrice || !aircraftId) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Please fill in all fields.";
        return;
    }

    try {
        const response = await fetch("/api/flights", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                source,
                destination,
                departureTime,
                arrivalTime,
                basePrice: parseFloat(basePrice),
                status: "SCHEDULED",
                aircraft: { id: parseInt(aircraftId) }
            })
        });

        if (response.ok) {
            messageDiv.style.color = "#16a34a";
            messageDiv.innerText = "Flight added successfully!";
            loadFlights();
            setTimeout(() => { toggleAddForm(); messageDiv.innerText = ""; }, 1000);
        } else if (response.status === 403) {
            messageDiv.style.color = "#dc2626";
            messageDiv.innerText = "Only admins can add flights.";
        } else {
            messageDiv.style.color = "#dc2626";
            messageDiv.innerText = "Failed to add flight (status " + response.status + ").";
        }
    } catch (error) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Could not connect to server.";
        console.error(error);
    }
}

// ---------- Booking modal ----------

let currentBookingFlightId = null;

function openBookingModal(flightId) {
    currentBookingFlightId = flightId;
    const flight = (window._flightsCache || []).find(f => f.id === flightId);
    if (!flight) return;

    document.getElementById("modalRoute").innerText = `${flight.source} → ${flight.destination}`;
    document.getElementById("modalMeta").innerText =
        `${formatDate(flight.departureTime)} · $${flight.basePrice} base fare`;
    document.getElementById("modalSeatCount").value = 1;
    document.getElementById("modalSeatClass").value = "ECONOMY";
    document.getElementById("bookingMessage").innerText = "";
    updateModalSeatsLeft(); // this also calls updateModalPriceEstimate()

    document.getElementById("bookingModal").classList.add("open");
}

const CLASS_MULTIPLIERS = { ECONOMY: 1.0, BUSINESS: 2.2, FIRST_CLASS: 3.5 };

function updateModalSeatsLeft() {
    const flight = (window._flightsCache || []).find(f => f.id === currentBookingFlightId);
    if (!flight) return;
    const seatClass = document.getElementById("modalSeatClass").value;
    let left = 0;
    if (seatClass === "ECONOMY") left = flight.availableEconomySeats || 0;
    if (seatClass === "BUSINESS") left = flight.availableBusinessSeats || 0;
    if (seatClass === "FIRST_CLASS") left = flight.availableFirstClassSeats || 0;
    document.getElementById("modalSeatsLeft").innerText = left + " seats left in this class";
    updateModalPriceEstimate();
}

function updateModalPriceEstimate() {
    const flight = (window._flightsCache || []).find(f => f.id === currentBookingFlightId);
    if (!flight) return;
    const seatClass = document.getElementById("modalSeatClass").value;
    const numberOfSeats = parseInt(document.getElementById("modalSeatCount").value) || 1;
    const pricePerSeat = flight.basePrice * CLASS_MULTIPLIERS[seatClass];
    const total = pricePerSeat * numberOfSeats;
    document.getElementById("modalPriceEstimate").innerText =
        `$${pricePerSeat.toFixed(2)} per seat · $${total.toFixed(2)} total`;
}

function closeBookingModal() {
    document.getElementById("bookingModal").classList.remove("open");
}

async function confirmBooking() {
    const messageDiv = document.getElementById("bookingMessage");
    const seatClass = document.getElementById("modalSeatClass").value;
    const numberOfSeats = parseInt(document.getElementById("modalSeatCount").value);
    const paymentMethod = document.getElementById("modalPaymentMethod").value;
    const paymentRef = document.getElementById("modalPaymentRef").value.trim();

    if (!numberOfSeats || numberOfSeats < 1) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Enter a valid number of seats.";
        return;
    }
    if (!paymentRef) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Enter a payment reference (any value works — this is simulated).";
        return;
    }

    try {
        const response = await fetch("/api/bookings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                flightId: currentBookingFlightId,
                seatClass,
                numberOfSeats,
                paymentMethod,
                paymentRef
            })
        });

        const resultText = await response.text();

        // A successful booking comes back as JSON (starts with "{"); a
        // payment failure or validation error comes back as a plain string.
        const isJson = resultText.trim().startsWith("{");

        if (response.ok && isJson) {
            messageDiv.style.color = "#16a34a";
            messageDiv.innerText = "Payment successful! Booking confirmed.";
            loadFlights();
            setTimeout(closeBookingModal, 1200);
        } else {
            messageDiv.style.color = "#dc2626";
            messageDiv.innerText = resultText || "Booking failed.";
        }
    } catch (error) {
        messageDiv.style.color = "#dc2626";
        messageDiv.innerText = "Could not connect to server.";
        console.error(error);
    }
}

loadFlights();