/**
 * Aerowing Airlines — Booking & Reservation Management Logic (Phase 7)
 * Authoritative booking administration, seat allocation verification,
 * transaction inspection, and admin-authorized cancellation.
 */

let allBookings = [];
let currentDetailedBookingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (window.adminShell) {
        window.adminShell.init({
            pageTitle: 'Reservation & Booking Management',
            breadcrumbs: ['Aerowing Admin', 'Bookings', 'All Bookings'],
            activeRoute: '/admin/bookings.html'
        });
    }

    setupEventListeners();
    await loadBookings();
});

function setupEventListeners() {
    document.getElementById('btn-refresh-bookings')?.addEventListener('click', loadBookings);

    document.getElementById('booking-search-input')?.addEventListener('input', applyFilters);
    document.getElementById('booking-status-filter')?.addEventListener('change', applyFilters);
    document.getElementById('booking-class-filter')?.addEventListener('change', applyFilters);

    document.getElementById('btn-clear-booking-filters')?.addEventListener('click', () => {
        const search = document.getElementById('booking-search-input');
        const status = document.getElementById('booking-status-filter');
        const sClass = document.getElementById('booking-class-filter');
        if (search) search.value = '';
        if (status) status.value = 'ALL';
        if (sClass) sClass.value = 'ALL';
        applyFilters();
    });

    const modal = document.getElementById('modal-booking-details');
    document.getElementById('btn-close-booking-modal')?.addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('btn-dismiss-booking-modal')?.addEventListener('click', () => modal.style.display = 'none');

    document.getElementById('btn-admin-cancel-booking')?.addEventListener('click', handleAdminCancel);
}

async function loadBookings() {
    try {
        const data = await window.api.get('/api/bookings');
        allBookings = Array.isArray(data) ? data : [];
        applyFilters();
    } catch (err) {
        console.error('Failed to load bookings:', err);
        if (window.toast) window.toast.error('Unable to fetch bookings roster.');
    }
}

function applyFilters() {
    const searchVal = (document.getElementById('booking-search-input')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('booking-status-filter')?.value || 'ALL';
    const classVal = document.getElementById('booking-class-filter')?.value || 'ALL';

    const filtered = allBookings.filter(b => {
        const bStatus = (b.status || 'CONFIRMED').toUpperCase();
        const matchesStatus = statusVal === 'ALL' || bStatus === statusVal;

        const bClass = (b.seatClass || 'ECONOMY').toUpperCase();
        const matchesClass = classVal === 'ALL' || bClass === classVal;

        const ref = `aw-bk-${String(b.id).padStart(4, '0')}`.toLowerCase();
        const passenger = (b.user ? `${b.user.name || ''} ${b.user.email || ''}` : '').toLowerCase();
        const route = b.flight ? `${b.flight.source || ''} ${b.flight.destination || ''}`.toLowerCase() : '';
        const seats = (b.seatNumbers || '').toLowerCase();

        const matchesSearch = !searchVal ||
            ref.includes(searchVal) ||
            passenger.includes(searchVal) ||
            route.includes(searchVal) ||
            seats.includes(searchVal);

        return matchesStatus && matchesClass && matchesSearch;
    });

    renderBookingsTable(filtered);
}

function renderBookingsTable(bookings) {
    const tbody = document.getElementById('bookings-table-body');
    if (!tbody) return;

    if (bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    No reservations match the specified search and filter criteria.
                </td>
            </tr>
        `;
        return;
    }

    const sorted = [...bookings].sort((a, b) => (b.id || 0) - (a.id || 0));

    tbody.innerHTML = sorted.map(b => {
        const ref = `AW-BK-${String(b.id).padStart(4, '0')}`;
        const passengerName = b.user ? escapeHtml(b.user.name || b.user.email) : 'Passenger';
        const passengerEmail = b.user ? escapeHtml(b.user.email) : '';
        const route = b.flight ? `${escapeHtml(b.flight.source)} &rarr; ${escapeHtml(b.flight.destination)}` : 'Route';
        const depStr = b.flight && b.flight.departureTime ? new Date(b.flight.departureTime).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '--';

        const statusLower = (b.status || 'CONFIRMED').toLowerCase();

        const seatTags = b.seatNumbers ? b.seatNumbers.split(/[\s,]+/).filter(Boolean).map(s => `
            <span class="brand-badge" style="font-family: var(--font-mono); font-size: 0.7rem; margin-right: 2px;">${escapeHtml(s)}</span>
        `).join('') : '<span style="color: var(--text-muted); font-size: 0.75rem;">Standard</span>';

        return `
            <tr>
                <td><strong>${ref}</strong></td>
                <td>
                    <div style="font-weight: 600;">${passengerName}</div>
                    <small style="color: var(--text-secondary);">${passengerEmail}</small>
                </td>
                <td><small>${route}</small></td>
                <td><small>${depStr}</small></td>
                <td>${b.numberOfSeats || 1}</td>
                <td><span class="cabin-badge eco">${b.seatClass || 'ECONOMY'}</span></td>
                <td>${seatTags}</td>
                <td><strong>$${(b.totalPrice || 0).toFixed(2)}</strong></td>
                <td><span class="status-badge ${statusLower}">${b.status}</span></td>
                <td style="text-align: right;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="inspectBooking(${b.id})" style="font-size: 0.78rem; padding: 0.25rem 0.6rem;">
                        Inspect
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.inspectBooking = async function (id) {
    try {
        currentDetailedBookingId = id;
        const details = await window.api.get(`/api/bookings/${id}`);

        document.getElementById('modal-booking-ref-badge').textContent = details.bookingReference || `AW-BK-${id}`;
        document.getElementById('modal-booking-title').textContent = `Reservation Details`;

        const flight = details.flight;
        if (flight) {
            document.getElementById('detail-flight-route').innerHTML = `${escapeHtml(flight.source)} &rarr; ${escapeHtml(flight.destination)}`;
            document.getElementById('detail-dep-time').textContent = flight.departureTime ? new Date(flight.departureTime).toLocaleString() : '--';
            document.getElementById('detail-arr-time').textContent = flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleString() : '--';
            document.getElementById('detail-aircraft').textContent = flight.aircraft ? flight.aircraft.model : 'Standard Fleet';
        }

        const statusLower = (details.status || 'CONFIRMED').toLowerCase();
        const statusEl = document.getElementById('detail-booking-status');
        statusEl.className = `status-badge ${statusLower}`;
        statusEl.textContent = details.status;

        document.getElementById('detail-booking-date').textContent = details.bookingDate ? new Date(details.bookingDate).toLocaleString() : '--';

        document.getElementById('detail-passenger-name').textContent = details.passengerName || 'Passenger';
        document.getElementById('detail-passenger-email').textContent = details.passengerEmail || '--';
        document.getElementById('detail-passenger-phone').textContent = details.passengerPhone || 'Not provided';
        document.getElementById('detail-passenger-tier').textContent = details.loyaltyTier || 'SILVER';

        document.getElementById('detail-seat-class').textContent = details.seatClass || 'ECONOMY';
        document.getElementById('detail-seat-count').textContent = details.numberOfSeats || 1;

        const seatsContainer = document.getElementById('detail-seat-numbers');
        if (details.seatNumbers) {
            seatsContainer.innerHTML = details.seatNumbers.split(/[\s,]+/).filter(Boolean).map(s => `
                <span class="brand-badge" style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700;">${escapeHtml(s)}</span>
            `).join('');
        } else {
            seatsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem;">Auto-assigned at gate</span>';
        }

        // Payments
        const tbodyPayments = document.getElementById('tbody-booking-payments');
        if (!details.payments || details.payments.length === 0) {
            tbodyPayments.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1rem;">No payments found for this reservation.</td></tr>`;
        } else {
            tbodyPayments.innerHTML = details.payments.map(p => {
                const pStatusLower = (p.status || 'SUCCESS').toLowerCase();
                return `
                    <tr>
                        <td><strong>TX-${String(p.id).padStart(5, '0')}</strong></td>
                        <td><strong>$${(p.amount || 0).toFixed(2)}</strong></td>
                        <td><span class="brand-badge" style="font-size: 0.68rem;">${p.method || 'CARD'}</span></td>
                        <td><span class="status-badge ${pStatusLower}">${p.status}</span></td>
                        <td><small>${p.transactionDate ? new Date(p.transactionDate).toLocaleString() : '--'}</small></td>
                    </tr>
                `;
            }).join('');
        }

        // Cancellation action
        const cancelBtn = document.getElementById('btn-admin-cancel-booking');
        if (details.status === 'CONFIRMED') {
            cancelBtn.style.display = 'inline-block';
        } else {
            cancelBtn.style.display = 'none';
        }

        document.getElementById('modal-booking-details').style.display = 'flex';

    } catch (err) {
        console.error('Failed to load booking details:', err);
        if (window.toast) window.toast.error('Unable to retrieve reservation details.');
    }
};

async function handleAdminCancel() {
    if (!currentDetailedBookingId) return;

    try {
        const token = window.auth ? window.auth.getToken() : localStorage.getItem('token');
        const res = await fetch(`/api/bookings/${currentDetailedBookingId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const errText = await res.text();
            if (window.toast) window.toast.error(errText || 'Unable to cancel booking.');
            return;
        }

        const msg = await res.text();
        document.getElementById('modal-booking-details').style.display = 'none';
        if (window.toast) window.toast.success(msg || 'Booking cancelled successfully.');
        await loadBookings();

    } catch (err) {
        console.error('Error cancelling booking:', err);
        if (window.toast) window.toast.error('Network error during cancellation.');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}
