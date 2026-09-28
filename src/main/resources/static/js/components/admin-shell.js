/**
 * Aerowing Airlines — Enterprise Administration Shell Component (Phase 7)
 * Authoritative Admin Portal Layout: Unified Sidebar, Topbar, Responsive Drawer,
 * Client Authorization Guard, and Theme System Integration.
 */

(function () {
    const navItems = [
        {
            group: 'Dashboard',
            items: [
                {
                    id: 'nav-dashboard',
                    path: '/admin/index.html',
                    label: 'Operations Center',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`
                }
            ]
        },
        {
            group: 'Operations',
            items: [
                {
                    id: 'nav-flights',
                    path: '/admin/flights.html',
                    label: 'Flight Operations',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`
                },
                {
                    id: 'nav-aircraft',
                    path: '/admin/aircraft.html',
                    label: 'Fleet & Seat Layout',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>`
                },
                {
                    id: 'nav-crew',
                    path: '/admin/crew.html',
                    label: 'Crew & Assignments',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
                },
                {
                    id: 'nav-occupancy',
                    path: '/admin/occupancy.html',
                    label: 'Seat Inventory & Load',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
                }
            ]
        },
        {
            group: 'Bookings & Revenue',
            items: [
                {
                    id: 'nav-bookings',
                    path: '/admin/bookings.html',
                    label: 'All Bookings',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
                },
                {
                    id: 'nav-passengers',
                    path: '/admin/passengers.html',
                    label: 'Passengers Directory',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
                },
                {
                    id: 'nav-payments',
                    path: '/admin/payments.html',
                    label: 'Payments & Revenue',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`
                }
            ]
        },
        {
            group: 'System & Portal',
            items: [
                {
                    id: 'nav-passenger-portal',
                    path: '/dashboard.html',
                    label: 'Passenger Portal',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`
                },
                {
                    id: 'nav-home',
                    path: '/index.html',
                    label: 'Public Website',
                    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
                }
            ]
        }
    ];

    function renderAdminShell(options = {}) {
        // 1. Authoritative Guard
        if (window.auth && typeof window.auth.requireAdmin === 'function') {
            if (!window.auth.requireAdmin()) {
                return; // Navigation will be redirected
            }
        }

        const pageTitle = options.pageTitle || 'Operations Center';
        const breadcrumbs = options.breadcrumbs || ['Admin', 'Operations'];
        const currentPath = options.activeRoute || window.location.pathname;

        const email = (window.auth && window.auth.getUserEmail()) || 'admin@example.com';
        const userInitial = email.charAt(0).toUpperCase();

        // 2. Build Sidebar Navigation Links
        let navHtml = '';
        navItems.forEach(group => {
            navHtml += `<div class="admin-nav-group-title">${group.group}</div>`;
            group.items.forEach(item => {
                const isActive = currentPath.endsWith(item.path) || (item.path === '/admin/index.html' && (currentPath === '/admin/' || currentPath.endsWith('/admin/index.html')));
                navHtml += `
                    <a href="${item.path}" class="admin-nav-item ${isActive ? 'active' : ''}" id="${item.id}">
                        ${item.icon}
                        <span>${item.label}</span>
                    </a>
                `;
            });
        });

        // 3. Inject Container Shell if not present
        const body = document.body;
        const mainContent = document.getElementById('admin-main-container');

        // Check if layout elements exist or need to be assembled
        let shellWrapper = document.getElementById('admin-shell-layout');
        if (!shellWrapper) {
            shellWrapper = document.createElement('div');
            shellWrapper.id = 'admin-shell-layout';
            shellWrapper.className = 'admin-layout';

            // Sidebar
            const sidebar = document.createElement('aside');
            sidebar.className = 'admin-sidebar';
            sidebar.id = 'admin-sidebar';
            sidebar.innerHTML = `
                <div class="admin-sidebar-header">
                    <a href="/admin/index.html" class="admin-sidebar-brand">
                        <div class="admin-brand-icon">&#9992;</div>
                        <div class="admin-brand-text">
                            <h2>Aerowing</h2>
                            <span>Operations Control</span>
                        </div>
                    </a>
                </div>
                <nav class="admin-nav">
                    ${navHtml}
                    <div style="margin-top: 1rem; padding: 0.5rem 0.75rem;">
                        <button type="button" class="btn btn-outline" id="btn-admin-logout" style="width: 100%; border-color: rgba(255,255,255,0.2); color: #ffffff; font-size: 0.8rem; padding: 0.5rem;">
                            Sign Out
                        </button>
                    </div>
                </nav>
                <div class="admin-sidebar-footer">
                    <div class="admin-user-pill">
                        <div class="admin-avatar">${userInitial}</div>
                        <div class="admin-user-info">
                            <div class="admin-user-name" title="${email}">${email}</div>
                            <div class="admin-user-role">Operations Admin</div>
                        </div>
                    </div>
                </div>
            `;

            // Mobile Overlay
            const overlay = document.createElement('div');
            overlay.className = 'admin-sidebar-overlay';
            overlay.id = 'admin-sidebar-overlay';

            // Main Shell
            const main = document.createElement('div');
            main.className = 'admin-main';

            // Topbar
            const topbar = document.createElement('header');
            topbar.className = 'admin-topbar';
            topbar.innerHTML = `
                <div class="admin-topbar-left">
                    <button type="button" class="admin-mobile-toggle" id="admin-mobile-toggle" aria-label="Toggle navigation menu">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                    <div class="admin-topbar-title">
                        <h1>${pageTitle}</h1>
                        <div class="admin-breadcrumbs">
                            ${breadcrumbs.map((b, i) => `<span>${b}</span>${i < breadcrumbs.length - 1 ? '<span>&rsaquo;</span>' : ''}`).join('')}
                        </div>
                    </div>
                </div>
                <div class="admin-topbar-right">
                    <button type="button" class="btn btn-icon" id="theme-toggle" aria-label="Toggle theme" title="Toggle theme">
                        <svg class="sun-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                        <svg class="moon-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    </button>
                    <span class="brand-badge" style="background: rgba(212, 175, 55, 0.15); color: var(--gold-500, #d4af37);">
                        ROLE_ADMIN
                    </span>
                </div>
            `;

            // Content Area
            const content = document.createElement('main');
            content.className = 'admin-content';
            content.id = 'admin-content-area';

            // Move existing content inside content
            if (mainContent) {
                while (mainContent.firstChild) {
                    content.appendChild(mainContent.firstChild);
                }
                mainContent.remove();
            }

            main.appendChild(topbar);
            main.appendChild(content);

            shellWrapper.appendChild(sidebar);
            shellWrapper.appendChild(overlay);
            shellWrapper.appendChild(main);

            body.insertBefore(shellWrapper, body.firstChild);
        }

        // 4. Setup Mobile Drawer Toggle
        const toggleBtn = document.getElementById('admin-mobile-toggle');
        const sidebar = document.getElementById('admin-sidebar');
        const overlay = document.getElementById('admin-sidebar-overlay');

        if (toggleBtn && sidebar && overlay) {
            toggleBtn.onclick = () => {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
            };
            overlay.onclick = () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            };
        }

        // 5. Setup Sign Out Button
        const logoutBtn = document.getElementById('btn-admin-logout');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                if (window.auth) window.auth.logout();
                else {
                    localStorage.removeItem('token');
                    window.location.href = '/login.html';
                }
            };
        }

        // 6. Global Escape Key Listener for Modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (sidebar) sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
                document.querySelectorAll('.admin-modal-backdrop, .modal-backdrop').forEach(m => {
                    m.style.display = 'none';
                });
            }
        });
    }

    window.adminShell = {
        init: renderAdminShell
    };
})();
