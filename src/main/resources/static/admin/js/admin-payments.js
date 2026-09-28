/**
 * Aerowing Airlines — Payment & Transaction Auditing Logic (Phase 7)
 * Authoritative financial telemetry, net revenue aggregation,
 * payment method breakdown, and transaction ledger.
 */

let allPayments = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (window.adminShell) {
        window.adminShell.init({
            pageTitle: 'Payments & Revenue Transactions',
            breadcrumbs: ['Aerowing Admin', 'Bookings', 'Payments'],
            activeRoute: '/admin/payments.html'
        });
    }

    setupEventListeners();
    await loadPayments();
});

function setupEventListeners() {
    document.getElementById('btn-refresh-payments')?.addEventListener('click', loadPayments);

    document.getElementById('payment-search-input')?.addEventListener('input', applyFilters);
    document.getElementById('payment-status-filter')?.addEventListener('change', applyFilters);
    document.getElementById('payment-method-filter')?.addEventListener('change', applyFilters);

    document.getElementById('btn-clear-payment-filters')?.addEventListener('click', () => {
        const search = document.getElementById('payment-search-input');
        const status = document.getElementById('payment-status-filter');
        const method = document.getElementById('payment-method-filter');
        if (search) search.value = '';
        if (status) status.value = 'ALL';
        if (method) method.value = 'ALL';
        applyFilters();
    });
}

async function loadPayments() {
    try {
        const data = await window.api.get('/api/payments');
        allPayments = Array.isArray(data) ? data : [];
        calculateFinancialKpis(allPayments);
        applyFilters();
    } catch (err) {
        console.error('Failed to load payments:', err);
        if (window.toast) window.toast.error('Unable to fetch transaction logs.');
    }
}

function calculateFinancialKpis(payments) {
    let gross = 0;
    let grossCount = 0;
    let refunds = 0;
    let refundCount = 0;

    payments.forEach(p => {
        const amt = Number(p.amount) || 0;
        if (p.status === 'SUCCESS' && p.method !== 'REFUND') {
            gross += amt;
            grossCount++;
        } else if (p.method === 'REFUND' || p.status === 'REFUNDED') {
            refunds += amt;
            refundCount++;
        }
    });

    const net = Math.max(0, gross - refunds);

    document.getElementById('kpi-gross-revenue').textContent = `$${gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('kpi-gross-count').textContent = `${grossCount} successful charges`;

    document.getElementById('kpi-refunds-total').textContent = `-$${refunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('kpi-refunds-count').textContent = `${refundCount} refund transactions`;

    document.getElementById('kpi-net-revenue').textContent = `$${net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function applyFilters() {
    const searchVal = (document.getElementById('payment-search-input')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('payment-status-filter')?.value || 'ALL';
    const methodVal = document.getElementById('payment-method-filter')?.value || 'ALL';

    const filtered = allPayments.filter(p => {
        const pStatus = (p.status || 'SUCCESS').toUpperCase();
        const matchesStatus = statusVal === 'ALL' || pStatus === statusVal;

        const pMethod = (p.method || 'CREDIT_CARD').toUpperCase();
        const matchesMethod = methodVal === 'ALL' || pMethod === methodVal;

        const txId = `tx-${String(p.id).padStart(5, '0')}`.toLowerCase();
        const bookingRef = p.booking ? `aw-bk-${String(p.booking.id).padStart(4, '0')}`.toLowerCase() : '';
        const passenger = (p.booking && p.booking.user ? `${p.booking.user.name || ''} ${p.booking.user.email || ''}` : '').toLowerCase();

        const matchesSearch = !searchVal ||
            txId.includes(searchVal) ||
            bookingRef.includes(searchVal) ||
            passenger.includes(searchVal);

        return matchesStatus && matchesMethod && matchesSearch;
    });

    renderPaymentsTable(filtered);
}

function renderPaymentsTable(payments) {
    const tbody = document.getElementById('payments-table-body');
    if (!tbody) return;

    if (payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    No payment transactions match the specified search and filter criteria.
                </td>
            </tr>
        `;
        return;
    }

    const sorted = [...payments].sort((a, b) => (b.id || 0) - (a.id || 0));

    tbody.innerHTML = sorted.map(p => {
        const txId = `TX-${String(p.id).padStart(5, '0')}`;
        const bookingRef = p.booking ? `AW-BK-${String(p.booking.id).padStart(4, '0')}` : '--';
        const passengerName = p.booking && p.booking.user ? escapeHtml(p.booking.user.name || p.booking.user.email) : 'Passenger';
        const passengerEmail = p.booking && p.booking.user ? escapeHtml(p.booking.user.email) : '';
        const statusLower = (p.status || 'SUCCESS').toLowerCase();
        const dateStr = p.transactionDate ? new Date(p.transactionDate).toLocaleString() : '--';

        const isRefund = p.method === 'REFUND' || p.status === 'REFUNDED';
        const amountDisplay = isRefund ?
            `<span style="color: #ef4444; font-weight: 700;">-$${(p.amount || 0).toFixed(2)}</span>` :
            `<span style="font-weight: 700;">$${(p.amount || 0).toFixed(2)}</span>`;

        return `
            <tr>
                <td><strong style="font-family: var(--font-mono, monospace);">${txId}</strong></td>
                <td>
                    <span class="brand-badge" style="font-family: var(--font-mono, monospace); font-size: 0.72rem;">
                        ${bookingRef}
                    </span>
                </td>
                <td>
                    <div style="font-weight: 600;">${passengerName}</div>
                    <small style="color: var(--text-secondary);">${passengerEmail}</small>
                </td>
                <td>${amountDisplay}</td>
                <td>
                    <span class="brand-badge" style="font-size: 0.72rem;">${escapeHtml(p.method || 'CREDIT_CARD')}</span>
                </td>
                <td>
                    <span class="status-badge ${statusLower}">${p.status}</span>
                </td>
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
