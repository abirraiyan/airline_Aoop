/**
 * Aerowing Airlines — Admin Aircraft Fleet Management (Phase 5)
 * Fleet listing, KPI summaries, visual cabin preview via SeatMapComponent,
 * Add / Edit aircraft modals with real-time capacity validation,
 * and conflict-safe deletion.
 */

(function () {
    'use strict';

    let fleetData = [];
    let editingAircraftId = null;

    const tableBody   = document.getElementById('fleet-table-body');
    const kpiTotal    = document.getElementById('kpi-total-aircraft');
    const kpiCapacity = document.getElementById('kpi-total-capacity');
    const kpiStatus   = document.getElementById('kpi-config-status');

    const previewModal = document.getElementById('preview-modal');
    const editModal    = document.getElementById('edit-modal');
    const deleteModal  = document.getElementById('delete-aircraft-modal');

    const formAircraftId  = document.getElementById('form-aircraft-id');
    const formModel       = document.getElementById('form-model');
    const formTotal       = document.getElementById('form-total-seats');
    const formEconomy     = document.getElementById('form-economy-seats');
    const formBusiness    = document.getElementById('form-business-seats');
    const formFirst       = document.getElementById('form-first-seats');
    const capacitySumText = document.getElementById('capacity-sum-text');
    const capacityAlert   = document.getElementById('capacity-alert-message');
    const editModalTitle  = document.getElementById('edit-modal-title');

    // ─── Init ───────────────────────────────────────────────────────
    async function init() {
        if (!window.auth || !window.auth.isAuthenticated()) {
            window.location.href = '/login.html';
            return;
        }
        if (!window.auth.isAdmin()) {
            window.location.href = '/index.html';
            return;
        }
        bindEvents();
        await loadFleet();
    }

    // ─── Data Loading ────────────────────────────────────────────────
    async function loadFleet() {
        try {
            const data = await window.api.get('/api/aircraft');
            fleetData = Array.isArray(data) ? data : [];
            renderKPIs();
            renderFleetTable();
        } catch (err) {
            console.error('Failed to load fleet:', err);
            if (window.toast) window.toast.error('Could not retrieve fleet data from the server.');
            renderFleetTableError();
        }
    }

    // ─── KPI Cards ───────────────────────────────────────────────────
    function renderKPIs() {
        const totalAircraft = fleetData.length;
        const totalCapacity = fleetData.reduce((sum, a) => sum + (a.totalSeats || 0), 0);
        const allValid = fleetData.every(a =>
            (a.economySeats + a.businessSeats + a.firstClassSeats) <= a.totalSeats
        );

        if (kpiTotal)    kpiTotal.textContent    = totalAircraft;
        if (kpiCapacity) kpiCapacity.textContent = totalCapacity.toLocaleString();
        if (kpiStatus) {
            if (fleetData.length === 0) {
                kpiStatus.textContent = '--';
                kpiStatus.style.color = 'var(--text-muted)';
            } else if (allValid) {
                kpiStatus.textContent = '100%';
                kpiStatus.style.color = 'var(--success)';
            } else {
                kpiStatus.textContent = 'Invalid!';
                kpiStatus.style.color = 'var(--danger)';
            }
        }
    }

    // ─── Fleet Table ─────────────────────────────────────────────────
    function renderFleetTable() {
        if (!tableBody) return;

        if (fleetData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">&#9992;</div>
                        <strong>No aircraft in fleet.</strong><br>
                        <span style="font-size: 0.85rem;">Click "Add Aircraft" to register the first airframe.</span>
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = fleetData.map(aircraft => {
            const sumCabins = aircraft.economySeats + aircraft.businessSeats + aircraft.firstClassSeats;
            const isValid   = sumCabins <= aircraft.totalSeats;
            const diff      = aircraft.totalSeats - sumCabins;

            const statusHtml = isValid
                ? `<span style="color: var(--success); font-weight: 600; font-size: 0.82rem;">&#10004; Valid (${diff} spare)</span>`
                : `<span style="color: var(--danger); font-weight: 600; font-size: 0.82rem;">&#10008; Overcapacity (${-diff} over)</span>`;

            return `
                <tr>
                    <td>
                        <span class="brand-badge" style="font-family: var(--font-mono, monospace);">
                            AC-${String(aircraft.id).padStart(3, '0')}
                        </span>
                    </td>
                    <td><strong style="color: var(--text-primary);">${escHtml(aircraft.model)}</strong></td>
                    <td><strong>${aircraft.totalSeats}</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">pax</span></td>
                    <td>${aircraft.economySeats}</td>
                    <td>${aircraft.businessSeats}</td>
                    <td>${aircraft.firstClassSeats}</td>
                    <td>${statusHtml}</td>
                    <td style="text-align: right;">
                        <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
                            <button type="button" class="btn btn-outline btn-sm"
                                    data-action="preview" data-id="${aircraft.id}">&#128506; Preview</button>
                            <button type="button" class="btn btn-primary btn-sm"
                                    data-action="edit" data-id="${aircraft.id}">&#9998; Edit</button>
                            <button type="button" class="btn btn-sm"
                                    data-action="delete" data-id="${aircraft.id}"
                                    style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.25);">
                                &#128465; Delete
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    function renderFleetTableError() {
        if (!tableBody) return;
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--danger);">
                    <strong>Error loading fleet data.</strong> Check server connectivity.
                </td>
            </tr>`;
    }

    // ─── Visual Preview Modal ─────────────────────────────────────────
    function openPreviewModal(aircraftId) {
        const aircraft = fleetData.find(a => a.id === aircraftId);
        if (!aircraft || !previewModal) return;

        const titleEl = document.getElementById('preview-modal-title');
        if (titleEl) titleEl.textContent = aircraft.model + ' — Visual Cabin Layout';

        const container = document.getElementById('preview-seatmap-container');
        if (container) {
            container.innerHTML = '';
            if (window.SeatMapComponent) {
                new window.SeatMapComponent(container, {
                    segments: [{
                        flightId: null,
                        origin: 'FWD',
                        destination: 'AFT',
                        flightNumber: aircraft.model,
                        aircraft: aircraft
                    }],
                    seatClass: 'ADMIN_VIEW',
                    passengers: [],
                    onSelectionChange: null
                });
            } else {
                container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted);"><strong>Seat map engine unavailable.</strong></div>';
            }
        }

        previewModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closePreviewModal() {
        if (previewModal) previewModal.style.display = 'none';
        document.body.style.overflow = '';
        const c = document.getElementById('preview-seatmap-container');
        if (c) c.innerHTML = '';
    }

    // ─── Edit / Add Modal ─────────────────────────────────────────────
    function openEditModal(aircraftId) {
        editingAircraftId = aircraftId || null;

        if (editModalTitle) {
            editModalTitle.textContent = aircraftId ? 'Edit Aircraft Configuration' : 'Register New Aircraft';
        }

        if (aircraftId) {
            const a = fleetData.find(x => x.id === aircraftId);
            if (!a) return;
            if (formAircraftId)  formAircraftId.value  = a.id;
            if (formModel)       formModel.value        = a.model;
            if (formTotal)       formTotal.value        = a.totalSeats;
            if (formEconomy)     formEconomy.value      = a.economySeats;
            if (formBusiness)    formBusiness.value     = a.businessSeats;
            if (formFirst)       formFirst.value        = a.firstClassSeats;
        } else {
            if (formAircraftId)  formAircraftId.value  = '';
            if (formModel)       formModel.value        = '';
            if (formTotal)       formTotal.value        = '';
            if (formEconomy)     formEconomy.value      = '0';
            if (formBusiness)    formBusiness.value     = '0';
            if (formFirst)       formFirst.value        = '0';
        }

        updateCapacityValidationBox();
        if (editModal) {
            editModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function closeEditModal() {
        if (editModal) editModal.style.display = 'none';
        document.body.style.overflow = '';
        editingAircraftId = null;
    }

    function updateCapacityValidationBox() {
        const total = parseInt(formTotal && formTotal.value ? formTotal.value : '0', 10);
        const econ  = parseInt(formEconomy && formEconomy.value ? formEconomy.value : '0', 10);
        const biz   = parseInt(formBusiness && formBusiness.value ? formBusiness.value : '0', 10);
        const first = parseInt(formFirst && formFirst.value ? formFirst.value : '0', 10);
        const sum   = econ + biz + first;

        if (capacitySumText) capacitySumText.textContent = sum + ' / ' + (total || '?');

        if (!capacityAlert) return;

        if (total <= 0) {
            capacityAlert.style.color = 'var(--text-muted)';
            capacityAlert.textContent = 'Enter total capacity to validate.';
        } else if (sum > total) {
            capacityAlert.style.color = 'var(--danger)';
            capacityAlert.textContent = 'Invalid: Cabin seats (' + sum + ') exceed total capacity (' + total + ') by ' + (sum - total) + '.';
        } else {
            capacityAlert.style.color = 'var(--success)';
            capacityAlert.textContent = 'Valid: Cabin allocations (' + sum + ') within airframe capacity (' + total + ').';
        }
    }

    async function saveAircraft() {
        const total = parseInt(formTotal && formTotal.value ? formTotal.value : '0', 10);
        const econ  = parseInt(formEconomy && formEconomy.value ? formEconomy.value : '0', 10);
        const biz   = parseInt(formBusiness && formBusiness.value ? formBusiness.value : '0', 10);
        const first = parseInt(formFirst && formFirst.value ? formFirst.value : '0', 10);
        const model = formModel ? formModel.value.trim() : '';

        if (!model) {
            if (window.toast) window.toast.warning('Aircraft model specification is required.');
            return;
        }
        if (total < 10) {
            if (window.toast) window.toast.warning('Total capacity must be at least 10 seats.');
            return;
        }
        if (econ + biz + first > total) {
            if (window.toast) {
                window.toast.error(
                    'Cabin seat sum (' + (econ + biz + first) + ') exceeds total capacity (' + total + '). Please correct the configuration.',
                    'Capacity Validation Error'
                );
            }
            return;
        }

        const payload = {
            model: model,
            totalSeats: total,
            economySeats: econ,
            businessSeats: biz,
            firstClassSeats: first
        };

        const saveBtn = document.getElementById('btn-save-aircraft');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

        try {
            let result;
            if (editingAircraftId) {
                result = await window.api.put('/api/aircraft/' + editingAircraftId, payload);
            } else {
                result = await window.api.post('/api/aircraft', payload);
            }

            if (typeof result === 'string' && result.toLowerCase().includes('invalid')) {
                if (window.toast) window.toast.error(result, 'Server Validation Rejected');
                return;
            }

            if (window.toast) {
                window.toast.success(
                    editingAircraftId
                        ? 'Aircraft "' + model + '" updated successfully.'
                        : 'Aircraft "' + model + '" added to fleet.',
                    'Fleet Updated'
                );
            }
            closeEditModal();
            await loadFleet();
        } catch (err) {
            console.error('Save aircraft error:', err);
            if (window.toast) window.toast.error(err.message || 'Failed to save aircraft configuration.');
        } finally {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Aircraft Configuration'; }
        }
    }

    // ─── Delete Modal ─────────────────────────────────────────────────
    var pendingDeleteId = null;

    function openDeleteModal(aircraftId) {
        const aircraft = fleetData.find(a => a.id === aircraftId);
        if (!aircraft || !deleteModal) return;
        pendingDeleteId = aircraftId;
        const nameEl = document.getElementById('delete-aircraft-name');
        if (nameEl) nameEl.textContent = aircraft.model + ' (AC-' + String(aircraft.id).padStart(3, '0') + ')';
        deleteModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeDeleteModal() {
        if (deleteModal) deleteModal.style.display = 'none';
        document.body.style.overflow = '';
        pendingDeleteId = null;
    }

    async function confirmDeleteAircraft() {
        if (!pendingDeleteId) return;
        const confirmBtn = document.getElementById('btn-confirm-delete-aircraft');
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Decommissioning...'; }

        try {
            const result = await window.api.delete('/api/aircraft/' + pendingDeleteId);
            if (typeof result === 'string' && result.toLowerCase().includes('cannot delete')) {
                if (window.toast) window.toast.error(result, 'Cannot Decommission');
            } else {
                if (window.toast) window.toast.success('Aircraft successfully removed from fleet.', 'Fleet Updated');
                closeDeleteModal();
                await loadFleet();
            }
        } catch (err) {
            console.error('Delete aircraft error:', err);
            if (window.toast) window.toast.error(err.message || 'Failed to delete aircraft.');
        } finally {
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm Deletion'; }
        }
    }

    // ─── Event Binding ────────────────────────────────────────────────
    function bindEvents() {
        const refreshBtn = document.getElementById('btn-refresh-fleet');
        if (refreshBtn) refreshBtn.addEventListener('click', loadFleet);

        const addBtn = document.getElementById('btn-add-aircraft');
        if (addBtn) addBtn.addEventListener('click', function() { openEditModal(null); });

        if (tableBody) {
            tableBody.addEventListener('click', function(e) {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const action = btn.dataset.action;
                const id = parseInt(btn.dataset.id, 10);
                if (action === 'preview') openPreviewModal(id);
                if (action === 'edit')    openEditModal(id);
                if (action === 'delete')  openDeleteModal(id);
            });
        }

        const closePrev = document.getElementById('btn-close-preview');
        if (closePrev) closePrev.addEventListener('click', closePreviewModal);
        const dismissPrev = document.getElementById('btn-dismiss-preview');
        if (dismissPrev) dismissPrev.addEventListener('click', closePreviewModal);
        if (previewModal) previewModal.addEventListener('click', function(e) { if (e.target === previewModal) closePreviewModal(); });

        const closeEdit = document.getElementById('btn-close-edit');
        if (closeEdit) closeEdit.addEventListener('click', closeEditModal);
        const cancelEdit = document.getElementById('btn-cancel-edit');
        if (cancelEdit) cancelEdit.addEventListener('click', closeEditModal);
        if (editModal) editModal.addEventListener('click', function(e) { if (e.target === editModal) closeEditModal(); });

        const saveBtn = document.getElementById('btn-save-aircraft');
        if (saveBtn) saveBtn.addEventListener('click', saveAircraft);

        [formTotal, formEconomy, formBusiness, formFirst].forEach(function(input) {
            if (input) input.addEventListener('input', updateCapacityValidationBox);
        });

        const closeDelBtn = document.getElementById('btn-close-delete-aircraft');
        if (closeDelBtn) closeDelBtn.addEventListener('click', closeDeleteModal);
        const cancelDelBtn = document.getElementById('btn-cancel-delete-aircraft');
        if (cancelDelBtn) cancelDelBtn.addEventListener('click', closeDeleteModal);
        const confirmDelBtn = document.getElementById('btn-confirm-delete-aircraft');
        if (confirmDelBtn) confirmDelBtn.addEventListener('click', confirmDeleteAircraft);
        if (deleteModal) deleteModal.addEventListener('click', function(e) { if (e.target === deleteModal) closeDeleteModal(); });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (previewModal && previewModal.style.display === 'flex') closePreviewModal();
                if (editModal && editModal.style.display === 'flex')       closeEditModal();
                if (deleteModal && deleteModal.style.display === 'flex')   closeDeleteModal();
            }
        });
    }

    // ─── Utility ──────────────────────────────────────────────────────
    function escHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ─── Boot ─────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
