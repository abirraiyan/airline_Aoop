/**
 * Aerowing Airlines — Crew Personnel & Flight Assignment Logic (Phase 7)
 * Authoritative crew roster CRUD, flight assignment dispatch,
 * and backend scheduling overlap conflict detection surface.
 */

let allCrew = [];
let allFlights = [];
let selectedFlightId = null;
let pendingDeleteCrewId = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (window.adminShell) {
        window.adminShell.init({
            pageTitle: 'Flight Crew & Assignments',
            breadcrumbs: ['Aerowing Admin', 'Operations', 'Crew'],
            activeRoute: '/admin/crew.html'
        });
    }

    setupEventListeners();
    await loadInitialData();
});

function setupEventListeners() {
    document.getElementById('btn-refresh-crew')?.addEventListener('click', loadInitialData);

    // Flight selection for assignments
    const flightSelect = document.getElementById('select-assignment-flight');
    if (flightSelect) {
        flightSelect.addEventListener('change', (e) => {
            selectedFlightId = e.target.value ? parseInt(e.target.value, 10) : null;
            hideConflictAlert();
            loadFlightAssignments(selectedFlightId);
        });
    }

    // Submit assignment
    document.getElementById('btn-submit-assignment')?.addEventListener('click', handleAssignCrew);

    // Filter roster
    document.getElementById('crew-search-input')?.addEventListener('input', applyRosterFilters);
    document.getElementById('crew-role-filter')?.addEventListener('change', applyRosterFilters);

    // Add / Edit Modal
    const modal = document.getElementById('modal-crew');
    document.getElementById('btn-add-crew')?.addEventListener('click', () => {
        document.getElementById('form-crew').reset();
        document.getElementById('crew-id').value = '';
        document.getElementById('modal-crew-title').textContent = 'Add Crew Member';
        modal.style.display = 'flex';
    });

    document.getElementById('btn-close-crew-modal')?.addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('btn-cancel-crew-modal')?.addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('form-crew')?.addEventListener('submit', handleSaveCrew);

    // Delete Modal
    const deleteModal = document.getElementById('modal-delete-crew');
    document.getElementById('btn-close-delete-crew')?.addEventListener('click', () => deleteModal.style.display = 'none');
    document.getElementById('btn-cancel-delete-crew')?.addEventListener('click', () => deleteModal.style.display = 'none');
    document.getElementById('btn-confirm-delete-crew')?.addEventListener('click', handleConfirmDeleteCrew);
}

async function loadInitialData() {
    try {
        const [crew, flights] = await Promise.all([
            window.api.get('/api/crew'),
            window.api.get('/api/flights')
        ]);

        allCrew = Array.isArray(crew) ? crew : [];
        allFlights = Array.isArray(flights) ? flights : [];

        populateFlightSelect();
        populateCrewCandidateSelect();
        applyRosterFilters();

        if (selectedFlightId) {
            await loadFlightAssignments(selectedFlightId);
        }

    } catch (err) {
        console.error('Failed to load crew or flights:', err);
        if (window.toast) window.toast.error('Unable to fetch crew personnel data.');
    }
}

function populateFlightSelect() {
    const select = document.getElementById('select-assignment-flight');
    if (!select) return;

    select.innerHTML = '<option value="">Select a flight to view/assign crew...</option>';
    allFlights.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        const dep = f.departureTime ? new Date(f.departureTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        opt.textContent = `AW-${String(f.id).padStart(3, '0')} (${f.source} → ${f.destination}) — ${dep} [${f.status || 'SCHEDULED'}]`;
        if (selectedFlightId && f.id === selectedFlightId) opt.selected = true;
        select.appendChild(opt);
    });
}

function populateCrewCandidateSelect() {
    const select = document.getElementById('select-assignment-crew');
    if (!select) return;

    select.innerHTML = '<option value="">Select crew member...</option>';
    allCrew.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.role})`;
        select.appendChild(opt);
    });
}

async function loadFlightAssignments(flightId) {
    const tbody = document.getElementById('tbody-flight-assignments');
    const badge = document.getElementById('flight-crew-count-badge');
    if (!tbody) return;

    if (!flightId) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 1.25rem; color: var(--text-muted);">Select a flight above to view assigned crew members.</td></tr>`;
        if (badge) badge.textContent = '0 Assigned';
        return;
    }

    try {
        const assignments = await window.api.get(`/api/crew-assignments/flight/${flightId}`);
        const list = Array.isArray(assignments) ? assignments : [];

        if (badge) badge.textContent = `${list.length} Assigned`;

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 1.25rem; color: var(--text-muted);">No crew personnel currently assigned to this flight.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(a => {
            const crew = a.crew || {};
            return `
                <tr>
                    <td><strong>${escapeHtml(crew.name || 'Personnel')}</strong></td>
                    <td><span class="brand-badge" style="font-size: 0.72rem;">${escapeHtml(crew.role || '--')}</span></td>
                    <td><span class="status-badge scheduled">ACTIVE ON FLIGHT</span></td>
                    <td style="text-align: right;">
                        <button type="button" class="btn btn-outline btn-sm" onclick="handleRemoveAssignment(${a.id})" style="font-size: 0.75rem; padding: 0.2rem 0.6rem; color: #ef4444; border-color: rgba(239,68,68,0.3);">
                            Unassign
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load assignments:', err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger); padding: 1rem;">Failed to load assignments.</td></tr>`;
    }
}

async function handleAssignCrew() {
    hideConflictAlert();

    const flightId = document.getElementById('select-assignment-flight')?.value;
    const crewId = document.getElementById('select-assignment-crew')?.value;

    if (!flightId) {
        if (window.toast) window.toast.error('Please select a commercial flight first.');
        return;
    }
    if (!crewId) {
        if (window.toast) window.toast.error('Please select a crew member candidate to assign.');
        return;
    }

    try {
        const token = window.auth ? window.auth.getToken() : localStorage.getItem('token');
        const res = await fetch('/api/crew-assignments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                flightId: parseInt(flightId, 10),
                crewId: parseInt(crewId, 10)
            })
        });

        if (res.status === 409 || res.status === 400) {
            const errText = await res.text();
            showConflictAlert('Assignment Scheduling Conflict', errText);
            if (window.toast) window.toast.error(errText);
            return;
        }

        if (!res.ok) {
            const errText = await res.text();
            showConflictAlert('Assignment Error', errText || 'Unable to complete crew assignment.');
            return;
        }

        if (window.toast) window.toast.success('Crew member successfully assigned to flight.');
        document.getElementById('select-assignment-crew').value = '';
        await loadFlightAssignments(flightId);

    } catch (err) {
        console.error('Assignment error:', err);
        showConflictAlert('Network Error', 'Could not communicate with crew assignment server.');
    }
}

window.handleRemoveAssignment = async function (assignmentId) {
    try {
        const token = window.auth ? window.auth.getToken() : localStorage.getItem('token');
        const res = await fetch(`/api/crew-assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const err = await res.text();
            if (window.toast) window.toast.error(err || 'Failed to remove assignment.');
            return;
        }

        if (window.toast) window.toast.success('Crew assignment removed.');
        if (selectedFlightId) {
            await loadFlightAssignments(selectedFlightId);
        }
    } catch (err) {
        console.error('Remove assignment error:', err);
        if (window.toast) window.toast.error('Network error removing assignment.');
    }
};

function showConflictAlert(title, message) {
    const card = document.getElementById('crew-conflict-alert');
    const titleEl = document.getElementById('crew-conflict-title');
    const descEl = document.getElementById('crew-conflict-desc');
    if (card && titleEl && descEl) {
        titleEl.textContent = title;
        descEl.textContent = message;
        card.style.display = 'flex';
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function hideConflictAlert() {
    const card = document.getElementById('crew-conflict-alert');
    if (card) card.style.display = 'none';
}

function applyRosterFilters() {
    const searchVal = (document.getElementById('crew-search-input')?.value || '').toLowerCase().trim();
    const roleVal = document.getElementById('crew-role-filter')?.value || 'ALL';

    const filtered = allCrew.filter(c => {
        const matchesRole = roleVal === 'ALL' || (c.role || '').toUpperCase() === roleVal;
        const matchesSearch = !searchVal || (c.name || '').toLowerCase().includes(searchVal);
        return matchesRole && matchesSearch;
    });

    renderCrewRosterTable(filtered);
}

function renderCrewRosterTable(crewList) {
    const tbody = document.getElementById('tbody-crew-roster');
    if (!tbody) return;

    if (crewList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No crew personnel found.</td></tr>`;
        return;
    }

    tbody.innerHTML = crewList.map(c => {
        return `
            <tr>
                <td><strong style="font-family: var(--font-mono, monospace);">CRW-${String(c.id).padStart(4, '0')}</strong></td>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td><span class="brand-badge" style="font-size: 0.75rem;">${escapeHtml(c.role)}</span></td>
                <td><span class="status-badge active">CERTIFIED</span></td>
                <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="openEditCrew(${c.id})" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; margin-right: 4px;">
                        Edit
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="openDeleteCrew(${c.id})" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: #ef4444; border-color: rgba(239,68,68,0.3);">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.openEditCrew = function (id) {
    const member = allCrew.find(c => c.id === id);
    if (!member) return;

    document.getElementById('crew-id').value = member.id;
    document.getElementById('crew-name').value = member.name || '';
    document.getElementById('crew-role').value = member.role || 'PILOT';
    document.getElementById('modal-crew-title').textContent = 'Edit Crew Member';
    document.getElementById('modal-crew').style.display = 'flex';
};

async function handleSaveCrew(e) {
    e.preventDefault();

    const id = document.getElementById('crew-id').value;
    const name = document.getElementById('crew-name').value.trim();
    const role = document.getElementById('crew-role').value;

    const payload = { name, role };

    try {
        const token = window.auth ? window.auth.getToken() : localStorage.getItem('token');
        let res;

        if (id) {
            res = await fetch(`/api/crew/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/crew', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) {
            const err = await res.text();
            if (window.toast) window.toast.error(err || 'Failed to save crew member.');
            return;
        }

        document.getElementById('modal-crew').style.display = 'none';
        if (window.toast) window.toast.success(`Crew member ${id ? 'updated' : 'added'} successfully.`);
        await loadInitialData();

    } catch (err) {
        console.error('Save crew error:', err);
        if (window.toast) window.toast.error('Network error saving crew member.');
    }
}

window.openDeleteCrew = function (id) {
    const member = allCrew.find(c => c.id === id);
    if (!member) return;

    pendingDeleteCrewId = id;
    document.getElementById('delete-crew-name').textContent = `${member.name} (${member.role})`;
    document.getElementById('modal-delete-crew').style.display = 'flex';
};

async function handleConfirmDeleteCrew() {
    if (!pendingDeleteCrewId) return;

    try {
        const token = window.auth ? window.auth.getToken() : localStorage.getItem('token');
        const res = await fetch(`/api/crew/${pendingDeleteCrewId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 409 || res.status === 400) {
            const reason = await res.text();
            document.getElementById('modal-delete-crew').style.display = 'none';
            if (window.toast) window.toast.error(reason);
            else alert(reason);
            return;
        }

        if (!res.ok) {
            const reason = await res.text();
            document.getElementById('modal-delete-crew').style.display = 'none';
            if (window.toast) window.toast.error(reason || 'Failed to delete crew member.');
            return;
        }

        document.getElementById('modal-delete-crew').style.display = 'none';
        if (window.toast) window.toast.success('Crew member removed from roster.');
        pendingDeleteCrewId = null;
        await loadInitialData();

    } catch (err) {
        console.error('Delete crew error:', err);
        document.getElementById('modal-delete-crew').style.display = 'none';
        if (window.toast) window.toast.error('Network error deleting crew member.');
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
