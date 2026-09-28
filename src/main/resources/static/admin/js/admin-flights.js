/**
 * Aerowing Airlines — Flight Operations & Management Logic (Phase 7)
 * Authoritative CRUD operations, schedule conflict detection surface,
 * dependency checking on deletion, and multi-filter table.
 */

let allFlights = [];
let allAircraft = [];
let pendingDeleteFlightId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Admin App Shell
    if (window.adminShell) {
        window.adminShell.init({
            pageTitle: 'Flight Operations & Scheduling',
            breadcrumbs: ['Aerowing Admin', 'Operations', 'Flights'],
            activeRoute: '/admin/flights.html'
        });
    }

    // 2. Setup Event Listeners
    setupEventListeners();

    // 3. Initial Load
    await loadFlightsAndAircraft();
});

function setupEventListeners() {
    // Refresh
    const refreshBtn = document.getElementById('btn-refresh-flights');
    if (refreshBtn) refreshBtn.addEventListener('click', loadFlightsAndAircraft);

    // Search & Filter
    const searchInput = document.getElementById('flight-search-input');
    if (searchInput) searchInput.addEventListener('input', applyFilters);

    const statusFilter = document.getElementById('flight-status-filter');
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);

    const clearBtn = document.getElementById('btn-clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = 'ALL';
            applyFilters();
        });
    }

    // Create Modal
    const openCreateBtn = document.getElementById('btn-open-create-flight');
    const createModal = document.getElementById('modal-create-flight');
    const closeCreateBtn = document.getElementById('btn-close-create-modal');
    const cancelCreateBtn = document.getElementById('btn-cancel-create');
    const formCreate = document.getElementById('form-create-flight');

    if (openCreateBtn && createModal) {
        openCreateBtn.addEventListener('click', () => {
            document.getElementById('form-conflict-alert').style.display = 'none';
            formCreate.reset();
            populateAircraftDropdown('create-aircraft');
            createModal.style.display = 'flex';
        });
    }

    if (closeCreateBtn) closeCreateBtn.addEventListener('click', () => createModal.style.display = 'none');
    if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', () => createModal.style.display = 'none');

    if (formCreate) {
        formCreate.addEventListener('submit', handleCreateFlight);
    }

    // Edit Modal
    const editModal = document.getElementById('modal-edit-flight');
    const closeEditBtn = document.getElementById('btn-close-edit-modal');
    const cancelEditBtn = document.getElementById('btn-cancel-edit');
    const formEdit = document.getElementById('form-edit-flight');

    if (closeEditBtn) closeEditBtn.addEventListener('click', () => editModal.style.display = 'none');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => editModal.style.display = 'none');

    if (formEdit) {
        formEdit.addEventListener('submit', handleEditFlight);
    }

    // Delete Modal
    const deleteModal = document.getElementById('modal-delete-flight');
    const closeDeleteBtn = document.getElementById('btn-close-delete-modal');
    const cancelDeleteBtn = document.getElementById('btn-cancel-delete');
    const confirmDeleteBtn = document.getElementById('btn-confirm-delete');

    if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', () => deleteModal.style.display = 'none');
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => deleteModal.style.display = 'none');

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    }
}

async function loadFlightsAndAircraft() {
    try {
        const [flights, aircraft] = await Promise.all([
            window.api.get('/api/flights'),
            window.api.get('/api/aircraft')
        ]);

        allFlights = flights || [];
        allAircraft = aircraft || [];

        populateAircraftDropdown('create-aircraft');
        populateAircraftDropdown('edit-aircraft');

        applyFilters();

    } catch (err) {
        console.error('Failed to load flights:', err);
        if (window.toast) window.toast.error('Unable to fetch flights from server.');
    }
}

function populateAircraftDropdown(elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;

    const isEdit = elementId === 'edit-aircraft';
    select.innerHTML = isEdit ? `<option value="">Keep current aircraft</option>` : `<option value="">Select fleet aircraft...</option>`;

    allAircraft.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.model} (${a.totalSeats} seats: ${a.economySeats}E / ${a.businessSeats}B / ${a.firstClassSeats}F)`;
        select.appendChild(opt);
    });
}

function applyFilters() {
    const searchVal = (document.getElementById('flight-search-input')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('flight-status-filter')?.value || 'ALL';

    const filtered = allFlights.filter(f => {
        const matchesStatus = statusVal === 'ALL' || (f.status || 'SCHEDULED').toUpperCase() === statusVal;

        const flightNum = `aw-${String(f.id).padStart(3, '0')}`.toLowerCase();
        const source = (f.source || '').toLowerCase();
        const dest = (f.destination || '').toLowerCase();
        const aircraft = (f.aircraft?.model || '').toLowerCase();

        const matchesSearch = !searchVal ||
            flightNum.includes(searchVal) ||
            source.includes(searchVal) ||
            dest.includes(searchVal) ||
            aircraft.includes(searchVal);

        return matchesStatus && matchesSearch;
    });

    renderFlightsTable(filtered);
}

function renderFlightsTable(flights) {
    const tbody = document.getElementById('flights-table-body');
    if (!tbody) return;

    if (flights.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    No flight records match the specified search and filter criteria.
                </td>
            </tr>
        `;
        return;
    }

    // Sort by departure time ascending
    const sorted = [...flights].sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

    tbody.innerHTML = sorted.map(f => {
        const flightCode = `AW-${String(f.id).padStart(3, '0')}`;
        const depStr = f.departureTime ? new Date(f.departureTime).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '--';
        const arrStr = f.arrivalTime ? new Date(f.arrivalTime).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '--';

        const statusLower = (f.status || 'SCHEDULED').toLowerCase();

        return `
            <tr>
                <td><strong>${flightCode}</strong></td>
                <td>
                    <span style="font-weight: 600;">${escapeHtml(f.source)}</span>
                    <span style="color: var(--text-muted); margin: 0 4px;">&rarr;</span>
                    <span style="font-weight: 600;">${escapeHtml(f.destination)}</span>
                </td>
                <td><small>${depStr}</small></td>
                <td><small>${arrStr}</small></td>
                <td>
                    <span class="brand-badge" style="font-size: 0.72rem;">
                        ${f.aircraft ? escapeHtml(f.aircraft.model) : 'Standard Fleet'}
                    </span>
                </td>
                <td><strong>$${(f.basePrice || 0).toFixed(2)}</strong></td>
                <td>
                    <span class="cabin-badge eco">${f.availableEconomySeats || 0}E</span>
                    <span class="cabin-badge biz">${f.availableBusinessSeats || 0}B</span>
                    <span class="cabin-badge first">${f.availableFirstClassSeats || 0}F</span>
                </td>
                <td>
                    <span class="status-badge ${statusLower}">${f.status || 'SCHEDULED'}</span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="openEditFlight(${f.id})" style="font-size: 0.78rem; padding: 0.25rem 0.6rem; margin-right: 4px;">
                        Edit
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="openDeleteFlight(${f.id})" style="font-size: 0.78rem; padding: 0.25rem 0.6rem; color: #ef4444; border-color: rgba(239,68,68,0.3);">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleCreateFlight(e) {
    e.preventDefault();

    const source = document.getElementById('create-source').value.trim();
    const destination = document.getElementById('create-destination').value.trim();
    const departure = document.getElementById('create-departure').value;
    const arrival = document.getElementById('create-arrival').value;
    const basePrice = parseFloat(document.getElementById('create-base-price').value);
    const aircraftId = document.getElementById('create-aircraft').value;
    const status = document.getElementById('create-status').value;

    const conflictAlert = document.getElementById('form-conflict-alert');
    const conflictMessage = document.getElementById('form-conflict-message');
    conflictAlert.style.display = 'none';

    // Validation
    if (source.toLowerCase() === destination.toLowerCase()) {
        conflictAlert.style.display = 'flex';
        conflictMessage.textContent = 'Origin and destination cannot be the same city.';
        return;
    }

    if (new Date(departure) >= new Date(arrival)) {
        conflictAlert.style.display = 'flex';
        conflictMessage.textContent = 'Departure time must be strictly before arrival time.';
        return;
    }

    const payload = {
        source,
        destination,
        departureTime: departure,
        arrivalTime: arrival,
        basePrice,
        status,
        aircraft: aircraftId ? { id: parseInt(aircraftId) } : null
    };

    try {
        const token = window.auth ? window.auth.getToken() : localStorage.getItem('token');
        const res = await fetch('/api/flights', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.status === 409 || res.status === 400) {
            const errText = await res.text();
            conflictAlert.style.display = 'flex';
            conflictMessage.textContent = errText;
            return;
        }

        if (!res.ok) {
            const errText = await res.text();
            conflictAlert.style.display = 'flex';
            conflictMessage.textContent = errText || 'Unable to schedule flight.';
            return;
        }

        // Success
        document.getElementById('modal-create-flight').style.display = 'none';
        if (window.toast) window.toast.success('Flight scheduled successfully!');
        await loadFlightsAndAircraft();

    } catch (err) {
        console.error('Error creating flight:', err);
        conflictAlert.style.display = 'flex';
        conflictMessage.textContent = 'Network or server error while creating flight.';
    }
}

window.openEditFlight = function (id) {
    const flight = allFlights.find(f => f.id === id);
    if (!flight) return;

    document.getElementById('edit-flight-id').value = flight.id;
    document.getElementById('edit-source').value = flight.source || '';
    document.getElementById('edit-destination').value = flight.destination || '';
    document.getElementById('edit-departure').value = flight.departureTime ? flight.departureTime.substring(0, 16) : '';
    document.getElementById('edit-arrival').value = flight.arrivalTime ? flight.arrivalTime.substring(0, 16) : '';
    document.getElementById('edit-base-price').value = flight.basePrice || '';
    document.getElementById('edit-status').value = flight.status || 'SCHEDULED';
    document.getElementById('edit-aircraft').value = flight.aircraft ? flight.aircraft.id : '';

    document.getElementById('edit-conflict-alert').style.display = 'none';
    document.getElementById('modal-edit-flight').style.display = 'flex';
};

async function handleEditFlight(e) {
    e.preventDefault();

    const id = document.getElementById('edit-flight-id').value;
    const source = document.getElementById('edit-source').value.trim();
    const destination = document.getElementById('edit-destination').value.trim();
    const departure = document.getElementById('edit-departure').value;
    const arrival = document.getElementById('edit-arrival').value;
    const basePrice = parseFloat(document.getElementById('edit-base-price').value);
    const status = document.getElementById('edit-status').value;
    const aircraftId = document.getElementById('edit-aircraft').value;

    const conflictAlert = document.getElementById('edit-conflict-alert');
    const conflictMessage = document.getElementById('edit-conflict-message');
    conflictAlert.style.display = 'none';

    if (source.toLowerCase() === destination.toLowerCase()) {
        conflictAlert.style.display = 'flex';
        conflictMessage.textContent = 'Origin and destination cannot be identical.';
        return;
    }

    if (new Date(departure) >= new Date(arrival)) {
        conflictAlert.style.display = 'flex';
        conflictMessage.textContent = 'Departure time must be strictly before arrival time.';
        return;
    }

    const payload = {
        source,
        destination,
        departureTime: departure,
        arrivalTime: arrival,
        basePrice,
        status,
        aircraft: aircraftId ? { id: parseInt(aircraftId) } : null
    };

    try {
        const token = window.auth ? window.auth.getToken() : localStorage.getItem('token');
        const res = await fetch(`/api/flights/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.status === 409 || res.status === 400) {
            const errText = await res.text();
            conflictAlert.style.display = 'flex';
            conflictMessage.textContent = errText;
            return;
        }

        if (!res.ok) {
            const errText = await res.text();
            conflictAlert.style.display = 'flex';
            conflictMessage.textContent = errText || 'Unable to update flight schedule.';
            return;
        }

        document.getElementById('modal-edit-flight').style.display = 'none';
        if (window.toast) window.toast.success('Flight schedule updated successfully.');
        await loadFlightsAndAircraft();

    } catch (err) {
        console.error('Error updating flight:', err);
        conflictAlert.style.display = 'flex';
        conflictMessage.textContent = 'Network or server error while updating flight.';
    }
}

window.openDeleteFlight = function (id) {
    const flight = allFlights.find(f => f.id === id);
    if (!flight) return;

    pendingDeleteFlightId = id;
    document.getElementById('delete-flight-title').textContent = `AW-${String(flight.id).padStart(3, '0')} (${flight.source} → ${flight.destination})`;
    document.getElementById('modal-delete-flight').style.display = 'flex';
};

async function handleConfirmDelete() {
    if (!pendingDeleteFlightId) return;

    try {
        const token = window.auth ? window.auth.getToken() : localStorage.getItem('token');
        const res = await fetch(`/api/flights/${pendingDeleteFlightId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status === 409 || res.status === 400) {
            const reason = await res.text();
            document.getElementById('modal-delete-flight').style.display = 'none';
            if (window.toast) {
                window.toast.error(reason);
            } else {
                alert(reason);
            }
            return;
        }

        if (!res.ok) {
            const reason = await res.text();
            document.getElementById('modal-delete-flight').style.display = 'none';
            if (window.toast) window.toast.error(reason || 'Failed to delete flight.');
            return;
        }

        document.getElementById('modal-delete-flight').style.display = 'none';
        if (window.toast) window.toast.success('Flight deleted successfully.');
        pendingDeleteFlightId = null;
        await loadFlightsAndAircraft();

    } catch (err) {
        console.error('Failed to delete flight:', err);
        document.getElementById('modal-delete-flight').style.display = 'none';
        if (window.toast) window.toast.error('Network or server error deleting flight.');
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
