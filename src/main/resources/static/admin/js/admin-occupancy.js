/**
 * Aerowing Airlines — Seat Inventory & Flight Occupancy Logic (Phase 7)
 * Multi-cabin capacity tracking, load factor calculation,
 * seat distribution auditing, and visual load meters.
 */

let allFlights = [];
let allAircraft = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (window.adminShell) {
        window.adminShell.init({
            pageTitle: 'Seat Inventory & Flight Occupancy',
            breadcrumbs: ['Aerowing Admin', 'Operations', 'Occupancy'],
            activeRoute: '/admin/occupancy.html'
        });
    }

    setupEventListeners();
    await loadOccupancyData();
});

function setupEventListeners() {
    document.getElementById('btn-refresh-occupancy')?.addEventListener('click', loadOccupancyData);
    document.getElementById('occupancy-search-input')?.addEventListener('input', applyFiltersAndSort);
    document.getElementById('occupancy-sort-filter')?.addEventListener('change', applyFiltersAndSort);
}

async function loadOccupancyData() {
    try {
        const [flights, aircraft] = await Promise.all([
            window.api.get('/api/flights'),
            window.api.get('/api/aircraft')
        ]);

        allFlights = Array.isArray(flights) ? flights : [];
        allAircraft = Array.isArray(aircraft) ? aircraft : [];

        calculateFleetOccupancyKpis(allFlights);
        applyFiltersAndSort();

    } catch (err) {
        console.error('Failed to load occupancy data:', err);
        if (window.toast) window.toast.error('Unable to fetch seat inventory data.');
    }
}

function calculateFleetOccupancyKpis(flights) {
    let totalCap = 0;
    let totalAvail = 0;

    flights.forEach(f => {
        const capacity = f.aircraft && f.aircraft.totalSeats ? f.aircraft.totalSeats :
            ((f.availableEconomySeats || 0) + (f.availableBusinessSeats || 0) + (f.availableFirstClassSeats || 0));
        const avail = (f.availableEconomySeats || 0) + (f.availableBusinessSeats || 0) + (f.availableFirstClassSeats || 0);

        totalCap += capacity;
        totalAvail += avail;
    });

    const totalOcc = Math.max(0, totalCap - totalAvail);
    const avgLoad = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;

    document.getElementById('kpi-total-seats').textContent = totalCap.toLocaleString();
    document.getElementById('kpi-occupied-seats').textContent = totalOcc.toLocaleString();
    document.getElementById('kpi-occupied-sub').textContent = `${totalOcc} seats filled across ${flights.length} flights`;
    document.getElementById('kpi-available-seats').textContent = totalAvail.toLocaleString();
    document.getElementById('kpi-average-load').textContent = `${avgLoad}%`;
}

function applyFiltersAndSort() {
    const searchVal = (document.getElementById('occupancy-search-input')?.value || '').toLowerCase().trim();
    const sortVal = document.getElementById('occupancy-sort-filter')?.value || 'DEFAULT';

    // 1. Filter
    let filtered = allFlights.filter(f => {
        const flightNum = `aw-${String(f.id).padStart(3, '0')}`.toLowerCase();
        const source = (f.source || '').toLowerCase();
        const dest = (f.destination || '').toLowerCase();
        const aircraft = (f.aircraft?.model || '').toLowerCase();

        return !searchVal ||
            flightNum.includes(searchVal) ||
            source.includes(searchVal) ||
            dest.includes(searchVal) ||
            aircraft.includes(searchVal);
    });

    // 2. Map metrics for sorting
    const computed = filtered.map(f => {
        const capacity = f.aircraft && f.aircraft.totalSeats ? f.aircraft.totalSeats :
            ((f.availableEconomySeats || 0) + (f.availableBusinessSeats || 0) + (f.availableFirstClassSeats || 0));
        const avail = (f.availableEconomySeats || 0) + (f.availableBusinessSeats || 0) + (f.availableFirstClassSeats || 0);
        const occupied = Math.max(0, capacity - avail);
        const loadPct = capacity > 0 ? (occupied / capacity) * 100 : 0;

        return { flight: f, capacity, avail, occupied, loadPct };
    });

    // 3. Sort
    if (sortVal === 'LOAD_DESC') {
        computed.sort((a, b) => b.loadPct - a.loadPct);
    } else if (sortVal === 'LOAD_ASC') {
        computed.sort((a, b) => a.loadPct - b.loadPct);
    } else if (sortVal === 'SEATS_AVAIL') {
        computed.sort((a, b) => b.avail - a.avail);
    } else {
        // DEFAULT: by departure time
        computed.sort((a, b) => new Date(a.flight.departureTime) - new Date(b.flight.departureTime));
    }

    renderOccupancyTable(computed);
}

function renderOccupancyTable(computedList) {
    const tbody = document.getElementById('occupancy-table-body');
    if (!tbody) return;

    if (computedList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    No flight seat inventory matches the specified filter criteria.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = computedList.map(item => {
        const f = item.flight;
        const flightCode = `AW-${String(f.id).padStart(3, '0')}`;
        const roundPct = Math.round(item.loadPct);

        const a = f.aircraft || {};
        const maxEco = a.economySeats || '--';
        const maxBiz = a.businessSeats || '--';
        const maxFirst = a.firstClassSeats || '--';

        let meterClass = 'occupancy-fill';
        if (roundPct >= 90) meterClass = 'occupancy-fill full';
        else if (roundPct >= 75) meterClass = 'occupancy-fill high';

        return `
            <tr>
                <td><strong>${flightCode}</strong></td>
                <td>
                    <span style="font-weight: 600;">${escapeHtml(f.source)}</span>
                    <span style="color: var(--text-muted); margin: 0 4px;">&rarr;</span>
                    <span style="font-weight: 600;">${escapeHtml(f.destination)}</span>
                </td>
                <td>
                    <div style="font-weight: 600;">${f.aircraft ? escapeHtml(f.aircraft.model) : 'Standard Airframe'}</div>
                    <small style="color: var(--text-secondary);">${item.capacity} total seats</small>
                </td>
                <td>
                    <span class="cabin-badge eco">${f.availableEconomySeats || 0} / ${maxEco}</span>
                </td>
                <td>
                    <span class="cabin-badge biz">${f.availableBusinessSeats || 0} / ${maxBiz}</span>
                </td>
                <td>
                    <span class="cabin-badge first">${f.availableFirstClassSeats || 0} / ${maxFirst}</span>
                </td>
                <td>
                    <strong>${item.occupied}</strong>
                    <span style="color: var(--text-muted);">/ ${item.capacity} Seats</span>
                    <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px;">
                        ${item.avail} seats remaining
                    </div>
                </td>
                <td style="min-width: 140px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 0.8rem; font-weight: 700;">
                        <span>${roundPct}%</span>
                        <span style="font-size: 0.72rem; font-weight: 500; color: var(--text-muted);">${f.status || 'SCHEDULED'}</span>
                    </div>
                    <div class="occupancy-meter">
                        <div class="${meterClass}" style="width: ${roundPct}%;"></div>
                    </div>
                </td>
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
