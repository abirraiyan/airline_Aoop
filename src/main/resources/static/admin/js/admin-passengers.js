/**
 * Aerowing Airlines — Passengers & Member Directory Logic (Phase 7)
 * Authoritative user roster, Aerowing Club loyalty status,
 * passenger search/filtering, and customer reservation dossier.
 */

let allUsers = [];
let allBookings = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (window.adminShell) {
        window.adminShell.init({
            pageTitle: 'Passengers & Member Directory',
            breadcrumbs: ['Aerowing Admin', 'Bookings', 'Passengers'],
            activeRoute: '/admin/passengers.html'
        });
    }

    setupEventListeners();
    await loadPassengersAndBookings();
});

function setupEventListeners() {
    document.getElementById('btn-refresh-passengers')?.addEventListener('click', loadPassengersAndBookings);

    document.getElementById('passenger-search-input')?.addEventListener('input', applyFilters);
    document.getElementById('passenger-tier-filter')?.addEventListener('change', applyFilters);
    document.getElementById('passenger-role-filter')?.addEventListener('change', applyFilters);

    document.getElementById('btn-clear-passenger-filters')?.addEventListener('click', () => {
        const search = document.getElementById('passenger-search-input');
        const tier = document.getElementById('passenger-tier-filter');
        const role = document.getElementById('passenger-role-filter');
        if (search) search.value = '';
        if (tier) tier.value = 'ALL';
        if (role) role.value = 'ALL';
        applyFilters();
    });

    const modal = document.getElementById('modal-passenger-details');
    document.getElementById('btn-close-passenger-modal')?.addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('btn-dismiss-passenger-modal')?.addEventListener('click', () => modal.style.display = 'none');
}

async function loadPassengersAndBookings() {
    try {
        const [users, bookings] = await Promise.all([
            window.api.get('/api/users'),
            window.api.get('/api/bookings')
        ]);

        allUsers = users || [];
        allBookings = bookings || [];

        applyFilters();

    } catch (err) {
        console.error('Failed to load passengers:', err);
        if (window.toast) window.toast.error('Unable to fetch passenger directory.');
    }
}

function applyFilters() {
    const searchVal = (document.getElementById('passenger-search-input')?.value || '').toLowerCase().trim();
    const tierVal = document.getElementById('passenger-tier-filter')?.value || 'ALL';
    const roleVal = document.getElementById('passenger-role-filter')?.value || 'ALL';

    const filtered = allUsers.filter(u => {
        // Tier filter
        const uTier = (u.loyaltyTier || 'SILVER').toUpperCase();
        const matchesTier = tierVal === 'ALL' || uTier === tierVal;

        // Role filter
        let uRole = (u.role || 'PASSENGER').toUpperCase();
        if (uRole.startsWith('ROLE_')) uRole = uRole.substring(5);
        const matchesRole = roleVal === 'ALL' || uRole === roleVal;

        // Search text
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const idStr = `p-${u.id}`;

        const matchesSearch = !searchVal ||
            name.includes(searchVal) ||
            email.includes(searchVal) ||
            phone.includes(searchVal) ||
            idStr.includes(searchVal);

        return matchesTier && matchesRole && matchesSearch;
    });

    renderPassengersTable(filtered);
}

function renderPassengersTable(users) {
    const tbody = document.getElementById('passengers-table-body');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    No passenger records match the specified search and filter criteria.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(u => {
        const tier = (u.loyaltyTier || 'SILVER').toUpperCase();
        let tierColor = 'var(--text-secondary)';
        let tierBg = 'var(--surface-subtle)';
        if (tier === 'PLATINUM') {
            tierColor = '#9333ea';
            tierBg = 'rgba(147, 51, 234, 0.12)';
        } else if (tier === 'GOLD') {
            tierColor = '#b45309';
            tierBg = 'rgba(212, 175, 55, 0.15)';
        }

        let roleDisplay = (u.role || 'PASSENGER').toUpperCase();
        if (roleDisplay.startsWith('ROLE_')) roleDisplay = roleDisplay.substring(5);

        return `
            <tr>
                <td><strong style="font-family: var(--font-mono, monospace);">P-${String(u.id).padStart(4, '0')}</strong></td>
                <td><strong>${escapeHtml(u.name || 'Unnamed Passenger')}</strong></td>
                <td><small>${escapeHtml(u.email)}</small></td>
                <td><small>${escapeHtml(u.phone || '--')}</small></td>
                <td>
                    <span class="brand-badge" style="font-size: 0.68rem;">${roleDisplay}</span>
                </td>
                <td>
                    <span class="brand-badge" style="background: ${tierBg}; color: ${tierColor}; font-weight: 700;">
                        ${tier}
                    </span>
                </td>
                <td><strong>${(u.totalMiles || 0).toLocaleString()}</strong> mi</td>
                <td style="text-align: right;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="openPassengerDetails(${u.id})" style="font-size: 0.78rem; padding: 0.25rem 0.6rem;">
                        View Dossier
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.openPassengerDetails = function (userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('passenger-modal-name').textContent = `${user.name || user.email} — Profile Dossier`;
    document.getElementById('modal-detail-name').textContent = user.name || 'Not provided';
    document.getElementById('modal-detail-email').textContent = user.email || '--';
    document.getElementById('modal-detail-phone').textContent = user.phone || 'Not recorded';

    const tier = (user.loyaltyTier || 'SILVER').toUpperCase();
    document.getElementById('modal-detail-tier').innerHTML = `
        <span class="brand-badge" style="font-size: 0.78rem; font-weight: 700;">
            ${tier} &middot; ${(user.totalMiles || 0).toLocaleString()} Miles
        </span>
    `;

    // Filter bookings belonging to this passenger
    const userBookings = allBookings.filter(b => b.user && b.user.id === user.id);
    const tbody = document.getElementById('tbody-passenger-bookings');

    if (userBookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No booking reservations on record for this passenger.</td></tr>`;
    } else {
        tbody.innerHTML = userBookings.map(b => {
            const ref = `AW-BK-${String(b.id).padStart(4, '0')}`;
            const route = b.flight ? `${escapeHtml(b.flight.source)} &rarr; ${escapeHtml(b.flight.destination)}` : 'Route';
            const dateStr = b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : '--';
            const statusLower = (b.status || 'CONFIRMED').toLowerCase();

            return `
                <tr>
                    <td><strong>${ref}</strong></td>
                    <td><small>${route}</small></td>
                    <td><small>${dateStr}</small></td>
                    <td>${b.numberOfSeats || 1}</td>
                    <td><span class="cabin-badge eco">${b.seatClass || 'ECONOMY'}</span></td>
                    <td><strong>$${(b.totalPrice || 0).toFixed(2)}</strong></td>
                    <td><span class="status-badge ${statusLower}">${b.status}</span></td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('modal-passenger-details').style.display = 'flex';
};

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
