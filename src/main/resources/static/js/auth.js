// Shared across dashboard.html, flights.html, bookings.html.
// Must be loaded BEFORE the page-specific script (dashboard.js / flights.js / bookings.js)
// since those rely on the `token` and `userEmail` variables and functions defined here.

const token = localStorage.getItem("token");
const userEmail = localStorage.getItem("email");

if (!token) {
    window.location.href = "login.html";
}

// A JWT is three base64 parts separated by dots: header.payload.signature.
// We only need the middle part (payload) to read the role — no backend call needed.
function decodeRole(jwt) {
    try {
        const payload = jwt.split(".")[1];
        const decoded = JSON.parse(atob(payload));
        return decoded.role || null;
    } catch (e) {
        return null;
    }
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    window.location.href = "login.html";
}

// Hide any nav link marked admin-only-nav if the logged-in user isn't an Admin.
// Runs immediately since this script loads after the nav markup in every page.
(function () {
    const currentRole = decodeRole(token);
    if (currentRole !== "ADMIN") {
        document.querySelectorAll(".admin-only-nav").forEach(el => el.style.display = "none");
    }
})();