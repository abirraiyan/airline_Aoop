/**
 * Aerowing Airlines — Passenger Dashboard Controller
 * Orchestrates live statistics, hero upcoming trip, recent bookings, and lookup.
 */

(function () {
    let currentUser = null;
    let myBookings = [];

    document.addEventListener('DOMContentLoaded', async () => {
        if (!window.auth || !window.auth.requireAuth()) {
            return;
        }

        await loadDashboardData();

        if (window.auth.isAdmin()) {
            loadAdminTravellers();
        }
    });

    async function loadDashboardData() {
        try {
            // 1. Fetch current profile
            currentUser = await window.api.get('/api/users/me');
            if (!currentUser) {
                if (window.toast) window.toast.error('Failed to load user profile');
                return;
            }

            renderUserProfile(currentUser);

            // 2. Fetch user's bookings
            myBookings = await window.api.get('/api/bookings/my') || [];
            renderDashboardStats(myBookings, currentUser);
            renderUpcomingJourney(myBookings);
            renderRecentBookings(myBookings);

        } catch (err) {
            console.error('Dashboard load error:', err);
            if (window.toast) window.toast.error('Could not load dashboard data from server.');
        }
    }

    function renderUserProfile(user) {
        const welcomeEl = document.getElementById('welcomePassengerName');
        const tierBadge = document.getElementById('welcomeTierBadge');
        const tierText = document.getElementById('tierBadgeText');

        const displayName = user.name || user.email.split('@')[0];
        if (welcomeEl) {
            welcomeEl.textContent = `Welcome back, ${displayName}`;
        }

        const tier = user.loyaltyTier || 'SILVER';
        if (tierText) {
            tierText.textContent = `${tier} MEMBER`;
        }
    }

    function renderDashboardStats(bookings, user) {
        const now = new Date();
        let upcomingCount = 0;
        let completedCount = 0;

        bookings.forEach(b => {
            if (b.status === 'CONFIRMED' && b.flight && b.flight.departureTime) {
                const depTime = new Date(b.flight.departureTime);
                if (depTime > now) {
                    upcomingCount++;
                } else {
                    completedCount++;
                }
            }
        });

        const upEl = document.getElementById('statUpcomingCount');
        const compEl = document.getElementById('statCompletedCount');
        const milesEl = document.getElementById('statMilesCount');
        const tierEl = document.getElementById('statTierName');
        const milesSub = document.getElementById('statMilesSub');

        if (upEl) upEl.textContent = upcomingCount.toString();
        if (compEl) compEl.textContent = completedCount.toString();
        if (milesEl) milesEl.textContent = (user.totalMiles || 0).toLocaleString();
        if (tierEl) tierEl.textContent = user.loyaltyTier || 'SILVER';

        if (milesSub) {
            if (user.loyaltyTier === 'GOLD') {
                milesSub.textContent = 'Gold: 5% fare discount active';
            } else if (user.loyaltyTier === 'PLATINUM') {
                milesSub.textContent = 'Platinum: 10% discount active';
            } else {
                const toGold = Math.max(0, 5000 - (user.totalMiles || 0));
                milesSub.textContent = `${toGold.toLocaleString()} miles to Gold`;
            }
        }
    }

    function renderUpcomingJourney(bookings) {
        const container = document.getElementById('upcomingHeroContainer');
        if (!container) return;

        const now = new Date();
        // Find confirmed future bookings, sorted earliest first
        const upcomingConfirmed = bookings
            .filter(b => b.status === 'CONFIRMED' && b.flight && b.flight.departureTime && new Date(b.flight.departureTime) > now)
            .sort((a, b) => new Date(a.flight.departureTime) - new Date(b.flight.departureTime));

        if (upcomingConfirmed.length === 0) {
            container.innerHTML = `
                <div class="empty-state-portal">
                    <svg viewBox="0 0 24 24"><path d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-5.5L22 16z"/></svg>
                    <h3 style="font-family: var(--font-display); font-size: 1.15rem; color: var(--text-primary); margin: 0 0 0.5rem;">No Upcoming Trips</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1.25rem; max-width: 420px; margin-left: auto; margin-right: auto;">
                        You have no scheduled upcoming flights. Discover new destinations and book your next journey today.
                    </p>
                    <a href="/search.html" class="btn btn-primary">Search Flights</a>
                </div>
            `;
            return;
        }

        const trip = upcomingConfirmed[0];
        const flight = trip.flight || {};
        const refCode = `AW-BK-${trip.id.toString().padStart(4, '0')}`;
        const flightNum = flight.flightNumber || `AW-${100 + (flight.id || 0)}`;

        const depDate = flight.departureTime ? new Date(flight.departureTime) : null;
        const arrDate = flight.arrivalTime ? new Date(flight.arrivalTime) : null;

        const formattedDepDate = depDate ? depDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
        const formattedDepTime = depDate ? depDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
        const formattedArrTime = arrDate ? arrDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';

        container.innerHTML = `
            <div class="upcoming-hero-card">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                        <span class="card-ref-badge">${refCode}</span>
                        <span class="badge badge-success">CONFIRMED</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${flight.aircraft?.model || 'Modern Jetliner'}</span>
                    </div>

                    <div class="hero-flight-route">
                        <div class="route-endpoint">
                            <h2>${flight.source || 'DEP'}</h2>
                            <div class="endpoint-city">${formattedDepTime} · Departs</div>
                        </div>

                        <div class="route-arrow-connector">
                            <span class="route-flight-tag">${flightNum}</span>
                            <div class="route-line"></div>
                            <span style="font-size: 0.75rem; color: var(--aviation-600); font-weight: 600; margin-top: 4px;">Direct</span>
                        </div>

                        <div class="route-endpoint">
                            <h2>${flight.destination || 'ARR'}</h2>
                            <div class="endpoint-city">${formattedArrTime} · Arrives</div>
                        </div>
                    </div>

                    <div class="hero-details-row">
                        <div class="hero-detail-item">Date: <strong>${formattedDepDate}</strong></div>
                        <div class="hero-detail-item">Class: <strong>${trip.seatClass || 'ECONOMY'}</strong></div>
                        <div class="hero-detail-item">Passengers: <strong>${trip.numberOfSeats || 1} Traveler(s)</strong></div>
                        <div class="hero-detail-item">
                            Seat: <strong style="color: var(--gold-600);">${trip.seatNumbers ? trip.seatNumbers : 'Assigned at check-in'}</strong>
                        </div>
                    </div>
                </div>

                <div class="hero-actions-column">
                    <div style="text-align: right;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Total Paid</div>
                        <div style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">$${trip.totalPrice.toFixed(2)}</div>
                    </div>
                    <a href="/booking-details.html?id=${trip.id}" class="btn btn-primary" style="white-space: nowrap;">Manage Booking &rarr;</a>
                </div>
            </div>
        `;
    }

    function renderRecentBookings(bookings) {
        const container = document.getElementById('recentBookingsContainer');
        if (!container) return;

        if (bookings.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem;">
                    No bookings found. <a href="/search.html" style="color: var(--aviation-500); font-weight: 600;">Search for your first flight</a>.
                </div>
            `;
            return;
        }

        // Show up to 4 recent bookings
        const recent = [...bookings].reverse().slice(0, 4);

        container.innerHTML = recent.map(b => {
            const refCode = `AW-BK-${b.id.toString().padStart(4, '0')}`;
            const flight = b.flight || {};
            const depDate = flight.departureTime ? new Date(flight.departureTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
            const statusBadge = getStatusBadgeHtml(b.status);

            return `
                <div class="booking-card-item">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                            <span class="card-ref-badge">${refCode}</span>
                            ${statusBadge}
                        </div>
                        <div class="booking-card-route">
                            <h3>${flight.source || 'Origin'} &rarr; ${flight.destination || 'Destination'}</h3>
                        </div>
                        <div class="booking-card-meta">
                            <span>📅 ${depDate}</span>
                            <span>✈ ${flight.aircraft?.model || 'Aerowing Fleet'}</span>
                            <span>👤 ${b.numberOfSeats} Seat(s) (${b.seatClass})</span>
                            ${b.seatNumbers ? `<span class="card-seats-tag">💺 ${b.seatNumbers}</span>` : ''}
                        </div>
                    </div>

                    <div class="booking-card-price-col">
                        <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Amount</span>
                        <div class="card-total-price">$${b.totalPrice.toFixed(2)}</div>
                    </div>

                    <div class="booking-card-actions">
                        <a href="/booking-details.html?id=${b.id}" class="btn btn-sm btn-outline">View Details</a>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getStatusBadgeHtml(status) {
        switch (status) {
            case 'CONFIRMED':
                return '<span class="badge badge-success">CONFIRMED ✓</span>';
            case 'PENDING':
                return '<span class="badge badge-warning">PENDING ⏱</span>';
            case 'PAYMENT_FAILED':
                return '<span class="badge badge-danger">PAYMENT FAILED !</span>';
            case 'CANCELLED':
                return '<span class="badge badge-muted">CANCELLED ×</span>';
            default:
                return `<span class="badge">${status}</span>`;
        }
    }

    window.handleManageLookup = function (e) {
        e.preventDefault();
        const input = document.getElementById('lookupRefInput');
        if (!input || !input.value.trim()) return;

        const raw = input.value.trim().toUpperCase();
        let bookingId = null;

        if (raw.startsWith('AW-BK-')) {
            bookingId = parseInt(raw.substring(6), 10);
        } else {
            bookingId = parseInt(raw, 10);
        }

        if (isNaN(bookingId) || bookingId <= 0) {
            if (window.toast) {
                window.toast.error('Invalid booking reference format. Please enter AW-BK-XXXX or numeric ID.');
            } else {
                alert('Invalid booking reference');
            }
            return;
        }

        window.location.href = `/booking-details.html?id=${bookingId}`;
    };

    async function loadAdminTravellers() {
        const panel = document.getElementById('adminTravellersPanel');
        const tbody = document.getElementById('userTableBody');
        if (!panel || !tbody) return;

        panel.style.display = 'block';

        try {
            const users = await window.api.get('/api/users');
            if (Array.isArray(users)) {
                tbody.innerHTML = users.map(u => `
                    <tr>
                        <td><strong>#${u.id}</strong></td>
                        <td>${u.name || '—'}</td>
                        <td>${u.email}</td>
                        <td><span class="badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-muted'}">${u.role}</span></td>
                        <td><span class="badge ${u.loyaltyTier === 'PLATINUM' ? 'badge-warning' : (u.loyaltyTier === 'GOLD' ? 'badge-warning' : 'badge-muted')}">${u.loyaltyTier || 'SILVER'}</span></td>
                        <td><strong>${(u.totalMiles || 0).toLocaleString()}</strong> mi</td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            console.error('Failed to load admin travellers:', err);
        }
    }
})();
