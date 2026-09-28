/**
 * Aerowing Airlines — Operations Control Center Logic (Phase 7)
 * Authoritative data synchronization, real KPI aggregation,
 * status distribution, load factor calculation, and operational dispatch feed.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Admin App Shell
    if (window.adminShell) {
        window.adminShell.init({
            pageTitle: 'Operations Control Center',
            breadcrumbs: ['Aerowing Admin', 'Operations Dashboard'],
            activeRoute: '/admin/index.html'
        });
    }

    // 2. Bind Refresh Button
    const refreshBtn = document.getElementById('btn-refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardData);
    }

    // 3. Load Data
    await loadDashboardData();
});

async function loadDashboardData() {
    try {
        // Fetch real data from authoritative endpoints
        const [flights, aircraft, bookings, payments, users, crew] = await Promise.all([
            window.api.get('/api/flights').catch(() => []),
            window.api.get('/api/aircraft').catch(() => []),
            window.api.get('/api/bookings').catch(() => []),
            window.api.get('/api/payments').catch(() => []),
            window.api.get('/api/users').catch(() => []),
            window.api.get('/api/crew').catch(() => [])
        ]);

        renderKpiCards({ flights, aircraft, bookings, payments, users, crew });
        renderFlightStatusDistribution(flights);
        renderFleetOccupancyOverview(flights, aircraft);
        renderRevenueOverview(payments);
        renderOperationsFlightsTable(flights);
        renderRecentBookings(bookings);
        renderRecentPayments(payments);

    } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (window.toast) {
            window.toast.error('Could not sync operations telemetry from backend.');
        }
    }
}

function renderKpiCards({ flights, aircraft, bookings, payments, users, crew }) {
    // 1. Flights
    const totalFlights = flights.length;
    const scheduledFlights = flights.filter(f => f.status === 'SCHEDULED').length;
    document.getElementById('kpi-total-flights').textContent = totalFlights;
    document.getElementById('kpi-flights-sub').textContent = `${scheduledFlights} on dispatch schedule`;

    // 2. Bookings
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length;
    document.getElementById('kpi-active-bookings').textContent = confirmedBookings;
    document.getElementById('kpi-bookings-sub').textContent = `${bookings.length} total reservations`;

    // 3. Users / Passengers
    const passengers = users.filter(u => !u.role || u.role.toUpperCase() !== 'ADMIN' && u.role.toUpperCase() !== 'ROLE_ADMIN');
    document.getElementById('kpi-total-passengers').textContent = passengers.length || users.length;
    document.getElementById('kpi-passengers-sub').textContent = `${users.length} registered accounts`;

    // 4. Confirmed Revenue from verified SUCCESS payments
    let grossSuccess = 0;
    let totalRefunds = 0;
    payments.forEach(p => {
        if (p.status === 'SUCCESS' && p.method !== 'REFUND') {
            grossSuccess += Number(p.amount) || 0;
        } else if (p.method === 'REFUND' || p.status === 'REFUNDED') {
            totalRefunds += Number(p.amount) || 0;
        }
    });
    const netRevenue = Math.max(0, grossSuccess - totalRefunds);
    document.getElementById('kpi-confirmed-revenue').textContent = `$${netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('kpi-revenue-sub').textContent = `$${grossSuccess.toFixed(0)} gross / $${totalRefunds.toFixed(0)} refunds`;

    // 5. Aircraft
    document.getElementById('kpi-active-aircraft').textContent = aircraft.length;
    const fleetSeats = aircraft.reduce((acc, a) => acc + (a.totalSeats || 0), 0);
    document.getElementById('kpi-aircraft-sub').textContent = `${fleetSeats} seats in fleet`;

    // 6. Crew
    document.getElementById('kpi-total-crew').textContent = crew.length;
    const pilots = crew.filter(c => c.role === 'PILOT' || c.role === 'CO_PILOT').length;
    document.getElementById('kpi-crew-sub').textContent = `${pilots} pilots on active roster`;
}

function renderFlightStatusDistribution(flights) {
    const total = flights.length;
    const scheduled = flights.filter(f => f.status === 'SCHEDULED').length;
    const delayed = flights.filter(f => f.status === 'DELAYED').length;
    const cancelled = flights.filter(f => f.status === 'CANCELLED').length;

    document.getElementById('badge-status-total').textContent = `${total} Flights`;
    document.getElementById('stat-scheduled-count').textContent = `${scheduled} (${total > 0 ? Math.round(scheduled / total * 100) : 0}%)`;
    document.getElementById('stat-delayed-count').textContent = `${delayed} (${total > 0 ? Math.round(delayed / total * 100) : 0}%)`;
    document.getElementById('stat-cancelled-count').textContent = `${cancelled} (${total > 0 ? Math.round(cancelled / total * 100) : 0}%)`;

    const scheduledPct = total > 0 ? (scheduled / total * 100) : 0;
    const delayedPct = total > 0 ? (delayed / total * 100) : 0;
    const cancelledPct = total > 0 ? (cancelled / total * 100) : 0;

    document.getElementById('bar-scheduled').style.width = `${scheduledPct}%`;
    document.getElementById('bar-delayed').style.width = `${delayedPct}%`;
    document.getElementById('bar-cancelled').style.width = `${cancelledPct}%`;
}

function renderFleetOccupancyOverview(flights, aircraft) {
    let totalFleetCapacity = 0;
    let totalAvailable = 0;
    let totalEcoAvail = 0;
    let totalBizAvail = 0;
    let totalFirstAvail = 0;

    flights.forEach(f => {
        const capacity = f.aircraft && f.aircraft.totalSeats ? f.aircraft.totalSeats :
            ((f.availableEconomySeats || 0) + (f.availableBusinessSeats || 0) + (f.availableFirstClassSeats || 0));
        const avail = (f.availableEconomySeats || 0) + (f.availableBusinessSeats || 0) + (f.availableFirstClassSeats || 0);

        totalFleetCapacity += capacity;
        totalAvailable += avail;
        totalEcoAvail += (f.availableEconomySeats || 0);
        totalBizAvail += (f.availableBusinessSeats || 0);
        totalFirstAvail += (f.availableFirstClassSeats || 0);
    });

    const totalOccupied = Math.max(0, totalFleetCapacity - totalAvailable);
    const occupancyRate = totalFleetCapacity > 0 ? Math.round((totalOccupied / totalFleetCapacity) * 100) : 0;

    document.getElementById('badge-avg-occupancy').textContent = `${occupancyRate}% Load`;
    document.getElementById('text-occupancy-summary').textContent = `${totalOccupied} / ${totalFleetCapacity} Seats Occupied`;
    
    const fillEl = document.getElementById('bar-fleet-occupancy');
    fillEl.style.width = `${occupancyRate}%`;
    if (occupancyRate >= 90) {
        fillEl.className = 'occupancy-fill full';
    } else if (occupancyRate >= 75) {
        fillEl.className = 'occupancy-fill high';
    } else {
        fillEl.className = 'occupancy-fill';
    }

    document.getElementById('stat-eco-avail').textContent = totalEcoAvail;
    document.getElementById('stat-biz-avail').textContent = totalBizAvail;
    document.getElementById('stat-first-avail').textContent = totalFirstAvail;
}

function renderRevenueOverview(payments) {
    let grossSuccess = 0;
    let totalRefunds = 0;

    payments.forEach(p => {
        if (p.status === 'SUCCESS' && p.method !== 'REFUND') {
            grossSuccess += Number(p.amount) || 0;
        } else if (p.method === 'REFUND' || p.status === 'REFUNDED') {
            totalRefunds += Number(p.amount) || 0;
        }
    });

    const netRevenue = Math.max(0, grossSuccess - totalRefunds);

    document.getElementById('stat-gross-revenue').textContent = `$${grossSuccess.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('stat-refunded-revenue').textContent = `-$${totalRefunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('stat-net-revenue').textContent = `$${netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function renderOperationsFlightsTable(flights) {
    const tbody = document.getElementById('tbody-operations-flights');
    if (!tbody) return;

    if (!flights || flights.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No operational flights found in system.
                </td>
            </tr>
        `;
        return;
    }

    // Sort by departure time ascending
    const sorted = [...flights].sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

    tbody.innerHTML = sorted.slice(0, 10).map(f => {
        const capacity = f.aircraft && f.aircraft.totalSeats ? f.aircraft.totalSeats :
            ((f.availableEconomySeats || 0) + (f.availableBusinessSeats || 0) + (f.availableFirstClassSeats || 0));
        const avail = (f.availableEconomySeats || 0) + (f.availableBusinessSeats || 0) + (f.availableFirstClassSeats || 0);
        const occupied = Math.max(0, capacity - avail);
        const occPct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;

        const depDate = f.departureTime ? new Date(f.departureTime).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '--';

        const arrDate = f.arrivalTime ? new Date(f.arrivalTime).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '--';

        const statusLower = (f.status || 'SCHEDULED').toLowerCase();

        return `
            <tr>
                <td>
                    <span style="font-weight: 700; font-family: var(--font-heading, monospace);">
                        AW-${String(f.id).padStart(3, '0')}
                    </span>
                </td>
                <td>
                    <strong>${escapeHtml(f.source)}</strong>
                    <span style="color: var(--text-muted); margin: 0 4px;">&rarr;</span>
                    <strong>${escapeHtml(f.destination)}</strong>
                </td>
                <td><small>${depDate}</small></td>
                <td><small>${arrDate}</small></td>
                <td>
                    <span class="brand-badge" style="font-size: 0.72rem;">
                        ${f.aircraft ? escapeHtml(f.aircraft.model) : 'Standard Fleet'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusLower}">${f.status || 'SCHEDULED'}</span>
                </td>
                <td>
                    <div style="font-size: 0.78rem; font-weight: 600;">${occPct}% (${occupied}/${capacity})</div>
                    <div class="occupancy-meter" style="width: 80px;">
                        <div class="occupancy-fill ${occPct >= 85 ? 'high' : ''}" style="width: ${occPct}%;"></div>
                    </div>
                </td>
                <td style="text-align: right;">
                    <a href="/admin/flights.html" class="btn btn-outline" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
                        Manage
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

function renderRecentBookings(bookings) {
    const tbody = document.getElementById('tbody-recent-bookings');
    if (!tbody) return;

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No bookings recorded.</td></tr>`;
        return;
    }

    const sorted = [...bookings].sort((a, b) => (b.id || 0) - (a.id || 0));

    tbody.innerHTML = sorted.slice(0, 6).map(b => {
        const ref = `AW-BK-${String(b.id).padStart(4, '0')}`;
        const passengerName = b.user ? escapeHtml(b.user.name || b.user.email) : 'Passenger';
        const route = b.flight ? `${escapeHtml(b.flight.source)} &rarr; ${escapeHtml(b.flight.destination)}` : 'Route';
        const statusLower = (b.status || 'CONFIRMED').toLowerCase();

        return `
            <tr>
                <td><strong>${ref}</strong></td>
                <td><small>${passengerName}</small></td>
                <td><small>${route}</small></td>
                <td>${b.numberOfSeats || 1}</td>
                <td><strong>$${(b.totalPrice || 0).toFixed(2)}</strong></td>
                <td><span class="status-badge ${statusLower}">${b.status}</span></td>
            </tr>
        `;
    }).join('');
}

function renderRecentPayments(payments) {
    const tbody = document.getElementById('tbody-recent-payments');
    if (!tbody) return;

    if (!payments || payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No payment records.</td></tr>`;
        return;
    }

    const sorted = [...payments].sort((a, b) => (b.id || 0) - (a.id || 0));

    tbody.innerHTML = sorted.slice(0, 6).map(p => {
        const txId = `TX-${String(p.id).padStart(5, '0')}`;
        const bookingRef = p.booking ? `AW-BK-${String(p.booking.id).padStart(4, '0')}` : '--';
        const statusLower = (p.status || 'SUCCESS').toLowerCase();
        const dateStr = p.transactionDate ? new Date(p.transactionDate).toLocaleDateString() : '--';

        return `
            <tr>
                <td><strong>${txId}</strong></td>
                <td><small>${bookingRef}</small></td>
                <td><strong>$${(p.amount || 0).toFixed(2)}</strong></td>
                <td><span class="brand-badge" style="font-size: 0.68rem;">${p.method || 'CARD'}</span></td>
                <td><span class="status-badge ${statusLower}">${p.status}</span></td>
                <td><small>${dateStr}</small></td>
            </tr>
        `;
    }).join('');
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
