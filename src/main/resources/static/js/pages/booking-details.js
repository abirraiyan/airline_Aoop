/**
 * Aerowing Airlines — Booking Details Controller
 * Loads full booking detail DTO, handles flight itinerary, seats, payments, cancellation, and payment retry.
 */

(function () {
    let currentBooking = null;
    let bookingId = null;

    document.addEventListener('DOMContentLoaded', async () => {
        if (!window.auth || !window.auth.requireAuth()) return;

        const params = new URLSearchParams(window.location.search);
        bookingId = params.get('id');

        if (!bookingId) {
            window.location.href = '/bookings.html';
            return;
        }

        await loadBookingDetails();
    });

    async function loadBookingDetails() {
        try {
            const dto = await window.api.get(`/api/bookings/${bookingId}`);
            if (!dto) {
                renderErrorState('Booking not found', 'No booking record matching this identifier was found.');
                return;
            }

            currentBooking = dto;
            renderDetails(dto);

        } catch (err) {
            console.error('Failed to load booking details:', err);
            if (err.status === 403 || (err.message && err.message.includes('permission'))) {
                renderErrorState('Access Restricted', 'You do not have permission to view this reservation.');
            } else if (err.status === 404) {
                renderErrorState('Booking Not Found', 'This reservation does not exist or has been deleted.');
            } else {
                renderErrorState('Error Loading Reservation', err.message || 'Could not connect to the booking server.');
            }
        }
    }

    function renderDetails(dto) {
        const refCode = dto.bookingReference || `AW-BK-${dto.id.toString().padStart(4, '0')}`;
        document.title = `${refCode} Details — Aerowing Airlines`;

        // Breadcrumb & Header
        const bc = document.getElementById('breadcrumbRef');
        if (bc) bc.textContent = refCode;

        const refEl = document.getElementById('detailRefCode');
        if (refEl) refEl.textContent = refCode;

        const statusEl = document.getElementById('detailStatusBadge');
        if (statusEl) {
            statusEl.className = getStatusBadgeClass(dto.status);
            statusEl.textContent = getStatusBadgeText(dto.status);
        }

        const dateEl = document.getElementById('detailBookingDate');
        if (dateEl) {
            dateEl.textContent = dto.bookingDate ? new Date(dto.bookingDate).toLocaleString('en-US', {
                dateStyle: 'medium', timeStyle: 'short'
            }) : '—';
        }

        // Header Actions (Cancel / Retry)
        renderHeaderActions(dto);

        // Flight Itinerary
        const flight = dto.flight || {};
        const flightNum = flight.flightNumber || `AW-${100 + (flight.id || 0)}`;

        const fnBadge = document.getElementById('flightNumberBadge');
        if (fnBadge) fnBadge.textContent = flightNum;

        const origEl = document.getElementById('detailOriginCity');
        const destEl = document.getElementById('detailDestCity');
        if (origEl) origEl.textContent = flight.source || 'DEP';
        if (destEl) destEl.textContent = flight.destination || 'ARR';

        const depTime = flight.departureTime ? new Date(flight.departureTime) : null;
        const arrTime = flight.arrivalTime ? new Date(flight.arrivalTime) : null;

        const depTimeEl = document.getElementById('detailDepTime');
        const arrTimeEl = document.getElementById('detailArrTime');
        if (depTimeEl) depTimeEl.textContent = depTime ? `${depTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} · Departure` : 'TBD';
        if (arrTimeEl) arrTimeEl.textContent = arrTime ? `${arrTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} · Arrival` : 'TBD';

        const flightDateEl = document.getElementById('detailFlightDate');
        if (flightDateEl) flightDateEl.textContent = depTime ? depTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';

        const aircraftEl = document.getElementById('detailAircraftModel');
        if (aircraftEl) aircraftEl.textContent = flight.aircraft?.model || 'Airbus A320';

        const cabinEl = document.getElementById('detailCabinClass');
        if (cabinEl) cabinEl.textContent = dto.seatClass || 'ECONOMY';

        const fStatusEl = document.getElementById('detailFlightStatus');
        if (fStatusEl) fStatusEl.textContent = flight.status || 'SCHEDULED';

        // Passenger & Seats (Phase 5 integration)
        renderPassengersAndSeats(dto);

        // Fare Breakdown & Payment
        renderFareSummary(dto);

        // Cancellation Policy & Action
        renderCancellationSection(dto);
    }

    function renderHeaderActions(dto) {
        const container = document.getElementById('headerActions');
        if (!container) return;

        let html = '';
        if (dto.canCancel) {
            html += `
                <button type="button" class="btn btn-outline" style="color: var(--danger); border-color: var(--danger);" onclick="openCancelModal()">
                    Cancel Booking
                </button>
            `;
        } else if (dto.canRetryPayment) {
            html += `
                <button type="button" class="btn btn-primary" onclick="openRetryModal()">
                    Complete Payment &rarr;
                </button>
            `;
        }

        container.innerHTML = html;
    }

    function renderPassengersAndSeats(dto) {
        const countPill = document.getElementById('passengerCountPill');
        const listEl = document.getElementById('passengerSeatList');
        if (!listEl) return;

        const count = dto.numberOfSeats || 1;
        if (countPill) countPill.textContent = `${count} Passenger${count > 1 ? 's' : ''}`;

        // Parse assigned seat numbers (e.g. "11A, 11B" or single "11A")
        const seatArray = dto.seatNumbers ? dto.seatNumbers.split(/[\s,]+/).filter(Boolean) : [];

        let itemsHtml = '';
        for (let i = 0; i < count; i++) {
            const passengerName = (i === 0 && dto.passengerName) ? dto.passengerName : `Passenger ${i + 1}`;
            const seat = seatArray[i] || 'Not assigned';
            const isAssigned = seat !== 'Not assigned';

            itemsHtml += `
                <div class="passenger-seat-item">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="width: 28px; height: 28px; border-radius: 50%; background: var(--surface-strong); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: var(--text-primary);">
                            ${i + 1}
                        </span>
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">${passengerName}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${i === 0 ? (dto.passengerEmail || 'Primary Contact') : 'Traveler'} &middot; ${dto.seatClass}</div>
                        </div>
                    </div>
                    <div>
                        ${isAssigned ? `
                            <span class="badge badge-warning" style="font-family: var(--font-mono); font-size: 0.85rem; padding: 4px 10px; background: rgba(200, 160, 89, 0.15); color: var(--gold-600); border: 1px solid var(--gold-400);">
                                💺 Seat ${seat}
                            </span>
                        ` : `
                            <span class="badge badge-muted" style="font-size: 0.8rem;">Seat at Check-in</span>
                        `}
                    </div>
                </div>
            `;
        }

        listEl.innerHTML = itemsHtml;
    }

    function renderFareSummary(dto) {
        const flight = dto.flight || {};
        const basePrice = flight.basePrice || 100;
        const count = dto.numberOfSeats || 1;

        let multiplier = 1.0;
        if (dto.seatClass === 'BUSINESS') multiplier = 2.2;
        if (dto.seatClass === 'FIRST_CLASS') multiplier = 3.5;

        const basePriceEl = document.getElementById('fareBasePrice');
        const multEl = document.getElementById('fareCabinMultiplier');
        const countEl = document.getElementById('fareTravelerCount');
        const totalEl = document.getElementById('fareTotalAmount');

        if (basePriceEl) basePriceEl.textContent = `$${basePrice.toFixed(2)}`;
        if (multEl) multEl.textContent = `${multiplier}x (${dto.seatClass})`;
        if (countEl) countEl.textContent = count.toString();
        if (totalEl) totalEl.textContent = `$${dto.totalPrice.toFixed(2)}`;

        // Payment status & method
        const methodEl = document.getElementById('paymentMethodDisplay');
        const pStatusEl = document.getElementById('paymentStatusPill');
        const txTimeEl = document.getElementById('paymentTxTime');

        const latestPayment = (dto.payments && dto.payments.length > 0) ? dto.payments[dto.payments.length - 1] : null;

        if (methodEl) methodEl.textContent = latestPayment?.method || 'CREDIT CARD';
        if (pStatusEl) {
            pStatusEl.className = dto.status === 'CONFIRMED' ? 'badge badge-success' : (dto.status === 'CANCELLED' ? 'badge badge-muted' : 'badge badge-danger');
            pStatusEl.textContent = dto.status === 'CONFIRMED' ? 'PAID IN FULL ✓' : (dto.status === 'CANCELLED' ? 'REFUNDED / CANCELLED' : 'PAYMENT AWAITING');
        }
        if (txTimeEl && latestPayment?.transactionDate) {
            txTimeEl.textContent = `Transaction: ${new Date(latestPayment.transactionDate).toLocaleString()}`;
        }
    }

    function renderCancellationSection(dto) {
        const hoursEl = document.getElementById('hoursToDepartureText');
        const refEstEl = document.getElementById('refundEstimateAmount');
        const actionContainer = document.getElementById('cancellationActionContainer');

        if (hoursEl) hoursEl.textContent = `${dto.hoursUntilDeparture} hours remaining`;
        if (refEstEl) {
            const percent = Math.round(dto.refundPercentage * 100);
            refEstEl.textContent = `$${dto.estimatedRefund.toFixed(2)} (${percent}% Refund)`;
        }

        if (actionContainer) {
            if (dto.canCancel) {
                actionContainer.innerHTML = `
                    <button type="button" class="btn btn-outline w-full" style="color: var(--danger); border-color: var(--danger);" onclick="openCancelModal()">
                        Proceed to Cancel Booking
                    </button>
                `;
            } else if (dto.status === 'CANCELLED') {
                actionContainer.innerHTML = `
                    <div style="font-weight: 600; color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 6px;">
                        This reservation is cancelled.
                    </div>
                `;
            } else {
                actionContainer.innerHTML = '';
            }
        }
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'CONFIRMED': return 'badge badge-success';
            case 'PENDING': return 'badge badge-warning';
            case 'PAYMENT_FAILED': return 'badge badge-danger';
            case 'CANCELLED': return 'badge badge-muted';
            default: return 'badge';
        }
    }

    function getStatusBadgeText(status) {
        switch (status) {
            case 'CONFIRMED': return 'CONFIRMED ✓';
            case 'PENDING': return 'PENDING ⏱';
            case 'PAYMENT_FAILED': return 'PAYMENT FAILED !';
            case 'CANCELLED': return 'CANCELLED ×';
            default: return status;
        }
    }

    function renderErrorState(title, message) {
        const container = document.querySelector('.passenger-portal-container');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state-portal" style="border-color: var(--danger); margin-top: 2rem;">
                <svg viewBox="0 0 24 24" style="stroke: var(--danger);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <h2 style="font-family: var(--font-display); color: var(--danger); margin: 0 0 0.5rem;">${title}</h2>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin: 0 0 1.5rem; max-width: 460px; margin-left: auto; margin-right: auto;">
                    ${message}
                </p>
                <a href="/bookings.html" class="btn btn-primary">&larr; Return to My Bookings</a>
            </div>
        `;
    }

    window.copyBookingRef = function () {
        if (!currentBooking) return;
        const ref = currentBooking.bookingReference || `AW-BK-${currentBooking.id.toString().padStart(4, '0')}`;
        navigator.clipboard.writeText(ref).then(() => {
            if (window.toast) window.toast.success(`Copied ${ref} to clipboard!`);
        });
    };

    // --- CANCELLATION MODAL ---
    window.openCancelModal = function () {
        if (!currentBooking) return;
        const modal = document.getElementById('cancelModalOverlay');
        const body = document.getElementById('cancelModalBody');
        if (!modal || !body) return;

        const ref = currentBooking.bookingReference || `AW-BK-${currentBooking.id.toString().padStart(4, '0')}`;
        const refundEstimate = currentBooking.estimatedRefund.toFixed(2);
        const percent = Math.round(currentBooking.refundPercentage * 100);

        body.innerHTML = `
            <div style="font-size: 0.9rem; margin-bottom: 1rem;">
                Confirm cancellation of reservation <strong style="font-family: var(--font-mono);">${ref}</strong>?
            </div>
            <div class="policy-callout-card">
                <div>Departure Countdown: <strong>${currentBooking.hoursUntilDeparture} hours</strong></div>
                <div>Refund Eligibility: <strong>${percent}%</strong></div>
                <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-top: 6px;">
                    Estimated Refund Amount: $${refundEstimate}
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    };

    window.closeCancelModal = function () {
        const modal = document.getElementById('cancelModalOverlay');
        if (modal) modal.style.display = 'none';
    };

    window.executeCancellation = async function () {
        const btn = document.getElementById('confirmCancelBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Processing Cancellation...';
        }

        try {
            const response = await window.api.delete(`/api/bookings/${bookingId}`);
            if (window.toast) {
                window.toast.success(response || 'Reservation cancelled.', 'Cancelled');
            } else {
                alert(response);
            }
            closeCancelModal();
            await loadBookingDetails();
        } catch (err) {
            console.error('Cancellation error:', err);
            if (window.toast) {
                window.toast.error(err.message || 'Cancellation failed.');
            } else {
                alert('Cancellation failed.');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Confirm Cancellation';
            }
        }
    };

    // --- RETRY MODAL ---
    window.openRetryModal = function () {
        if (!currentBooking) return;
        const modal = document.getElementById('retryPaymentModalOverlay');
        const summary = document.getElementById('retryModalSummary');
        if (!modal || !summary) return;

        const ref = currentBooking.bookingReference || `AW-BK-${currentBooking.id.toString().padStart(4, '0')}`;
        summary.innerHTML = `
            <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px;">
                <div>Booking Reference: <strong style="font-family: var(--font-mono);">${ref}</strong></div>
                <div>Amount Payable: <strong style="color: var(--text-primary); font-size: 1.1rem;">$${currentBooking.totalPrice.toFixed(2)}</strong></div>
            </div>
        `;
        modal.style.display = 'flex';
    };

    window.closeRetryModal = function () {
        const modal = document.getElementById('retryPaymentModalOverlay');
        if (modal) modal.style.display = 'none';
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
        const method = document.getElementById('retryMethodSelect')?.value || 'CREDIT CARD';
        let paymentRef = '4111222233334444';

        if (method === 'CREDIT CARD') {
            paymentRef = document.getElementById('retryCardNumber')?.value?.replace(/\s/g, '') || '4111222233334444';
        } else if (method === 'WALLET') {
            paymentRef = document.getElementById('retryWalletId')?.value?.trim() || 'wallet-user-aerowing';
        } else if (method === 'NET BANKING') {
            paymentRef = document.getElementById('retryBankRef')?.value?.trim() || 'BANK-REF-100234';
        }

        const btn = document.getElementById('submitRetryBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Submitting Payment...';
        }

        try {
            const payload = {
                paymentMethod: method,
                paymentRef: paymentRef,
                seatNumbers: currentBooking.seatNumbers
            };

            const response = await window.api.post(`/api/bookings/${bookingId}/retry-payment`, payload);

            if (typeof response === 'string' && response.includes('Payment failed')) {
                if (window.toast) window.toast.error(response, 'Payment Declined');
                else alert(response);
            } else if (typeof response === 'string') {
                if (window.toast) window.toast.warning(response, 'Notice');
                else alert(response);
            } else {
                if (window.toast) window.toast.success('Payment completed successfully!', 'Confirmed');
                else alert('Payment successful!');
                closeRetryModal();
                await loadBookingDetails();
            }
        } catch (err) {
            console.error('Payment retry error:', err);
            if (window.toast) window.toast.error(err.message || 'Payment processing failed.');
            else alert('Payment failed.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Pay & Confirm Booking';
            }
        }
    };
})();
