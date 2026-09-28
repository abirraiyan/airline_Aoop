/**
 * Aerowing Airlines — My Bookings & Manage Bookings Controller
 * Manages tabs, client-side filtering, booking cards, cancellation, and payment retry.
 */

(function () {
    let allBookings = [];
    let activeTab = 'ALL';
    let searchQuery = '';
    let pendingCancellationBooking = null;
    let pendingRetryBooking = null;

    document.addEventListener('DOMContentLoaded', async () => {
        if (!window.auth || !window.auth.requireAuth()) return;
        await loadBookings();
    });

    async function loadBookings() {
        const listEl = document.getElementById('bookingList');
        if (listEl) {
            listEl.innerHTML = `
                <div class="skeleton skeleton-card" style="height: 120px; margin-bottom: 1rem;"></div>
                <div class="skeleton skeleton-card" style="height: 120px; margin-bottom: 1rem;"></div>
            `;
        }

        try {
            const endpoint = window.auth.isAdmin() ? '/api/bookings' : '/api/bookings/my';
            const data = await window.api.get(endpoint);
            allBookings = Array.isArray(data) ? data : [];
            updateTabCounts();
            renderFilteredBookings();
        } catch (err) {
            console.error('Failed to load bookings:', err);
            if (listEl) {
                listEl.innerHTML = `
                    <div class="empty-state-portal" style="border-color: var(--danger);">
                        <h3 style="color: var(--danger);">Unable to Load Bookings</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem;">Could not connect to the booking service. Please try again.</p>
                        <button class="btn btn-outline" onclick="loadBookings()">Retry Connection</button>
                    </div>
                `;
            }
        }
    }

    function updateTabCounts() {
        const now = new Date();
        const counts = {
            ALL: allBookings.length,
            UPCOMING: 0,
            COMPLETED: 0,
            CANCELLED: 0,
            PAYMENT_FAILED: 0
        };

        allBookings.forEach(b => {
            const depTime = b.flight && b.flight.departureTime ? new Date(b.flight.departureTime) : null;
            if (b.status === 'CONFIRMED') {
                if (depTime && depTime > now) {
                    counts.UPCOMING++;
                } else {
                    counts.COMPLETED++;
                }
            } else if (b.status === 'CANCELLED') {
                counts.CANCELLED++;
            } else if (b.status === 'PAYMENT_FAILED' || b.status === 'PENDING') {
                counts.PAYMENT_FAILED++;
            }
        });

        Object.keys(counts).forEach(key => {
            const el = document.getElementById(`count-${key}`);
            if (el) el.textContent = counts[key].toString();
        });
    }

    function renderFilteredBookings() {
        const listEl = document.getElementById('bookingList');
        if (!listEl) return;

        const now = new Date();
        const filtered = allBookings.filter(b => {
            // Tab condition
            let matchesTab = false;
            const depTime = b.flight && b.flight.departureTime ? new Date(b.flight.departureTime) : null;

            switch (activeTab) {
                case 'ALL':
                    matchesTab = true;
                    break;
                case 'UPCOMING':
                    matchesTab = (b.status === 'CONFIRMED' && depTime && depTime > now);
                    break;
                case 'COMPLETED':
                    matchesTab = (b.status === 'CONFIRMED' && depTime && depTime <= now);
                    break;
                case 'CANCELLED':
                    matchesTab = (b.status === 'CANCELLED');
                    break;
                case 'PAYMENT_FAILED':
                    matchesTab = (b.status === 'PAYMENT_FAILED' || b.status === 'PENDING');
                    break;
            }

            if (!matchesTab) return false;

            // Search query condition
            if (!searchQuery) return true;

            const q = searchQuery.toLowerCase();
            const refCode = `aw-bk-${b.id.toString().padStart(4, '0')}`;
            const flight = b.flight || {};
            const source = (flight.source || '').toLowerCase();
            const dest = (flight.destination || '').toLowerCase();
            const flightNum = (flight.flightNumber || `aw-${100 + (flight.id || 0)}`).toLowerCase();

            return refCode.includes(q) ||
                source.includes(q) ||
                dest.includes(q) ||
                flightNum.includes(q) ||
                (b.id.toString() === q);
        });

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state-portal">
                    <svg viewBox="0 0 24 24"><path d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-5.5L22 16z"/></svg>
                    <h3 style="font-family: var(--font-display); font-size: 1.15rem; color: var(--text-primary); margin: 0 0 0.5rem;">No Bookings Found</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1.25rem;">
                        ${searchQuery ? 'No trips match your search query. Try clearing your search.' : `You have no bookings under the "${activeTab.replace('_', ' ')}" category.`}
                    </p>
                    <a href="/search.html" class="btn btn-primary">Book a Flight</a>
                </div>
            `;
            return;
        }

        // Sort descending by ID / booking date
        const sorted = [...filtered].sort((a, b) => b.id - a.id);

        listEl.innerHTML = sorted.map(b => renderBookingCard(b)).join('');
    }

    function renderBookingCard(b) {
        const refCode = `AW-BK-${b.id.toString().padStart(4, '0')}`;
        const flight = b.flight || {};
        const flightNum = flight.flightNumber || `AW-${100 + (flight.id || 0)}`;

        const depDate = flight.departureTime ? new Date(flight.departureTime) : null;
        const formattedDepDate = depDate ? depDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';
        const formattedDepTime = depDate ? depDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';

        const statusBadge = getStatusBadgeHtml(b.status);
        const seatsDisplay = b.seatNumbers ? `💺 Seats: ${b.seatNumbers}` : '💺 Seat not assigned';

        // Action buttons depending on state
        let actionButtonsHtml = `
            <a href="/booking-details.html?id=${b.id}" class="btn btn-sm btn-outline">View Details &rarr;</a>
        `;

        if (b.status === 'CONFIRMED') {
            actionButtonsHtml += `
                <button type="button" class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="openCancelModal(${b.id})">Cancel Booking</button>
            `;
        } else if (b.status === 'PAYMENT_FAILED' || b.status === 'PENDING') {
            actionButtonsHtml += `
                <button type="button" class="btn btn-sm btn-primary" onclick="openRetryModal(${b.id})">Retry Payment</button>
            `;
        }

        return `
            <div class="booking-card-item">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span class="card-ref-badge">${refCode}</span>
                        ${statusBadge}
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${flight.aircraft?.model || 'Jetliner'}</span>
                    </div>

                    <div class="booking-card-route">
                        <h3>${flight.source || 'Origin'} &rarr; ${flight.destination || 'Destination'}</h3>
                    </div>

                    <div class="booking-card-meta">
                        <span>📅 ${formattedDepDate} at ${formattedDepTime}</span>
                        <span>✈ ${flightNum}</span>
                        <span>👤 ${b.numberOfSeats} Passenger(s) (${b.seatClass})</span>
                        <span class="card-seats-tag">${seatsDisplay}</span>
                    </div>
                </div>

                <div class="booking-card-price-col">
                    <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Total Fare</span>
                    <div class="card-total-price">$${b.totalPrice.toFixed(2)}</div>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${b.status === 'CONFIRMED' ? 'Paid in Full' : (b.status === 'CANCELLED' ? 'Cancelled' : 'Payment Awaiting')}</span>
                </div>

                <div class="booking-card-actions">
                    ${actionButtonsHtml}
                </div>
            </div>
        `;
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

    window.switchTab = function (tabKey) {
        activeTab = tabKey;
        const tabs = document.querySelectorAll('.filter-tab-item');
        tabs.forEach(t => {
            if (t.getAttribute('data-tab') === tabKey) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
        renderFilteredBookings();
    };

    window.handleSearchFilter = function () {
        const input = document.getElementById('bookingSearchInput');
        searchQuery = input ? input.value.trim() : '';
        renderFilteredBookings();
    };

    // --- CANCELLATION MODAL WORKFLOW ---
    window.openCancelModal = function (bookingId) {
        const booking = allBookings.find(b => b.id === bookingId);
        if (!booking) return;

        pendingCancellationBooking = booking;
        const modal = document.getElementById('cancelModalOverlay');
        const body = document.getElementById('cancelModalBody');
        if (!modal || !body) return;

        const refCode = `AW-BK-${booking.id.toString().padStart(4, '0')}`;
        const flight = booking.flight || {};

        let hoursUntilDep = 0;
        if (flight.departureTime) {
            hoursUntilDep = Math.max(0, Math.floor((new Date(flight.departureTime) - new Date()) / (1000 * 60 * 60)));
        }

        let refundPercent = 0;
        if (hoursUntilDep >= 168) {
            refundPercent = 100;
        } else if (hoursUntilDep >= 48) {
            refundPercent = 50;
        } else {
            refundPercent = 0;
        }

        const refundEstimate = (booking.totalPrice * (refundPercent / 100)).toFixed(2);

        body.innerHTML = `
            <div style="margin-bottom: 1rem; font-size: 0.9rem;">
                Are you sure you want to cancel booking <strong style="font-family: var(--font-mono);">${refCode}</strong>?
            </div>

            <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 1rem; font-size: 0.85rem;">
                <div><strong>Route:</strong> ${flight.source} &rarr; ${flight.destination}</div>
                <div><strong>Departure:</strong> ${flight.departureTime ? new Date(flight.departureTime).toLocaleString() : 'TBD'}</div>
                <div><strong>Total Paid:</strong> $${booking.totalPrice.toFixed(2)}</div>
            </div>

            <div class="policy-callout-card">
                <div style="font-weight: 700; margin-bottom: 4px; color: var(--gold-600);">Aerowing Refund Policy Calculation</div>
                <div>Time until departure: <strong>${hoursUntilDep} hours</strong></div>
                <div>Refund Rate: <strong>${refundPercent}%</strong></div>
                <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-top: 6px;">
                    Estimated Refund: $${refundEstimate}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                    (7+ days: 100% | 48h to 7 days: 50% | under 48h: Non-refundable)
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    };

    window.closeCancelModal = function () {
        const modal = document.getElementById('cancelModalOverlay');
        if (modal) modal.style.display = 'none';
        pendingCancellationBooking = null;
    };

    window.executeCancellation = async function () {
        if (!pendingCancellationBooking) return;

        const btn = document.getElementById('confirmCancelBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Cancelling...';
        }

        try {
            const result = await window.api.delete(`/api/bookings/${pendingCancellationBooking.id}`);
            if (window.toast) {
                window.toast.success(result || 'Booking cancelled successfully.', 'Cancellation Confirmed');
            } else {
                alert(result || 'Booking cancelled.');
            }
            closeCancelModal();
            await loadBookings();
        } catch (err) {
            console.error('Cancellation error:', err);
            if (window.toast) {
                window.toast.error(err.message || 'Could not cancel booking.', 'Error');
            } else {
                alert('Could not cancel booking.');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Confirm Cancellation';
            }
        }
    };

    // --- RETRY PAYMENT MODAL WORKFLOW ---
    window.openRetryModal = function (bookingId) {
        const booking = allBookings.find(b => b.id === bookingId);
        if (!booking) return;

        pendingRetryBooking = booking;
        const modal = document.getElementById('retryPaymentModalOverlay');
        const summary = document.getElementById('retryModalSummary');
        if (!modal || !summary) return;

        const refCode = `AW-BK-${booking.id.toString().padStart(4, '0')}`;
        const flight = booking.flight || {};

        summary.innerHTML = `
            <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px;">
                <div>Booking Reference: <strong style="font-family: var(--font-mono);">${refCode}</strong></div>
                <div>Flight: <strong>${flight.source} &rarr; ${flight.destination}</strong></div>
                <div>Total Amount Due: <strong style="color: var(--text-primary); font-size: 1.1rem;">$${booking.totalPrice.toFixed(2)}</strong></div>
            </div>
        `;

        modal.style.display = 'flex';
    };

    window.closeRetryModal = function () {
        const modal = document.getElementById('retryPaymentModalOverlay');
        if (modal) modal.style.display = 'none';
        pendingRetryBooking = null;
    };

    window.toggleRetryMethodFields = function () {
        const method = document.getElementById('retryMethodSelect')?.value;
        const cardFields = document.getElementById('retryCardFields');
        const walletFields = document.getElementById('retryWalletFields');
        const bankFields = document.getElementById('retryBankFields');

        if (cardFields) cardFields.style.display = method === 'CREDIT CARD' ? 'block' : 'none';
        if (walletFields) walletFields.style.display = method === 'WALLET' ? 'block' : 'none';
        if (bankFields) bankFields.style.display = method === 'NET BANKING' ? 'block' : 'none';
    };

    window.executePaymentRetry = async function () {
        if (!pendingRetryBooking) return;

        const method = document.getElementById('retryMethodSelect')?.value || 'CREDIT CARD';
        let paymentRef = '4111222233334444';

        if (method === 'CREDIT CARD') {
            paymentRef = document.getElementById('retryCardNumber')?.value?.replace(/\s/g, '') || '4111222233334444';
        } else if (method === 'WALLET') {
            paymentRef = document.getElementById('retryWalletId')?.value?.trim() || 'wallet-aerowing-user';
        } else if (method === 'NET BANKING') {
            paymentRef = document.getElementById('retryBankRef')?.value?.trim() || 'BANK-REF-100234';
        }

        const btn = document.getElementById('submitRetryBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Processing Payment...';
        }

        try {
            const payload = {
                paymentMethod: method,
                paymentRef: paymentRef,
                seatNumbers: pendingRetryBooking.seatNumbers
            };

            const response = await window.api.post(`/api/bookings/${pendingRetryBooking.id}/retry-payment`, payload);

            if (typeof response === 'string' && response.includes('Payment failed')) {
                if (window.toast) {
                    window.toast.error(response, 'Payment Declined');
                } else {
                    alert(response);
                }
            } else if (typeof response === 'string') {
                if (window.toast) {
                    window.toast.warning(response, 'Retry Notice');
                } else {
                    alert(response);
                }
            } else {
                if (window.toast) {
                    window.toast.success('Payment completed successfully! Booking confirmed.', 'Payment Confirmed');
                } else {
                    alert('Payment successful!');
                }
                closeRetryModal();
                await loadBookings();
            }
        } catch (err) {
            console.error('Payment retry failed:', err);
            if (window.toast) {
                window.toast.error(err.message || 'Payment processing failed.', 'Error');
            } else {
                alert('Payment processing failed.');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Pay & Confirm Booking';
            }
        }
    };
})();