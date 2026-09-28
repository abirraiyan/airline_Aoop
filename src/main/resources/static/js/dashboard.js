// Requires auth.js loaded first (provides `token`, `userEmail`, `decodeRole`)

document.getElementById("welcomeEmail").innerText = userEmail || "";

const role = decodeRole(token);
loadMyProfile();

if (role === "ADMIN") {
    loadAllUsers();
} else {
    // Passengers don't see the traveller list at all
    document.getElementById("travellersPanel").style.display = "none";
}

// ---------- Loyalty card (any logged-in user, own data only) ----------

async function loadMyProfile() {
    try {
        const response = await fetch("/api/users/me", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("email");
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) return;

        const me = await response.json();
        renderLoyaltyCard(me);
    } catch (error) {
        console.error(error);
    }
}

const TIER_INFO = {
    SILVER:   { color: "#8896a8", next: "GOLD", nextAt: 5000,  perks: "Standard baggage allowance · Standard cancellation policy" },
    GOLD:     { color: "#c99400", next: "PLATINUM", nextAt: 15000, perks: "+10kg baggage · 5% booking discount · Flexible cancellation" },
    PLATINUM: { color: "#5b3fa0", next: null, nextAt: null, perks: "+20kg baggage · 10% booking discount · Priority boarding & handling" }
};

function renderLoyaltyCard(me) {
    const container = document.getElementById("loyaltyCard");
    if (!container || !me) return;

    const tier = me.loyaltyTier || "SILVER";
    const miles = me.totalMiles || 0;
    const info = TIER_INFO[tier] || TIER_INFO.SILVER;

    let progressHtml = "";
    if (info.nextAt) {
        const pct = Math.min(100, Math.round((miles / info.nextAt) * 100));
        progressHtml = `
            <div style="margin-top:10px; font-size:12px; opacity:0.85;">
                ${miles.toLocaleString()} / ${info.nextAt.toLocaleString()} miles to ${info.next}
            </div>
            <div style="background:rgba(255,255,255,0.25); border-radius:6px; height:6px; margin-top:6px; overflow:hidden;">
                <div style="background:#F0A500; height:100%; width:${pct}%;"></div>
            </div>
        `;
    } else {
        progressHtml = `<div style="margin-top:10px; font-size:12px; opacity:0.85;">Highest tier reached — ${miles.toLocaleString()} lifetime miles</div>`;
    }

    container.innerHTML = `
        <div class="eyebrow">Loyalty Status</div>
        <h2 style="margin:0 0 4px;">${tier} Member</h2>
        <div style="font-size:12.5px; opacity:0.85;">${info.perks}</div>
        ${progressHtml}
    `;
    container.style.background = `linear-gradient(135deg, var(--navy) 0%, ${info.color} 130%)`;
}

// ---------- Traveller list (ADMIN ONLY) ----------

async function loadAllUsers() {
    const statusDiv = document.getElementById("status");

    try {
        const response = await fetch("/api/users", {
            method: "GET",
            headers: { "Authorization": "Bearer " + token }
        });

        if (response.status === 401 || response.status === 403) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "You don't have permission to view this.";
            return;
        }

        if (!response.ok) {
            statusDiv.style.color = "#dc2626";
            statusDiv.innerText = "Failed to load users (status " + response.status + ").";
            return;
        }

        const users = await response.json();
        statusDiv.innerText = "";

        const tableBody = document.getElementById("userTableBody");
        tableBody.innerHTML = "";
        users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td>${user.loyaltyTier || 'SILVER'}</td>
                <td>${(user.totalMiles || 0).toLocaleString()}</td>
            `;
            tableBody.appendChild(row);
        });

        const wrapper = document.getElementById("userTableWrapper");
        if (wrapper) wrapper.style.display = "block";
        document.getElementById("userTable").style.display = "table";
    } catch (error) {
        statusDiv.style.color = "#dc2626";
        statusDiv.innerText = "Could not connect to server. Is the backend running?";
        console.error(error);
    }
}