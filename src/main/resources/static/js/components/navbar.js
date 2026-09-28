/**
 * Aerowing Airlines — Global Navigation Shell & Header Component
 * Provides role-aware desktop navigation and accessible mobile drawer.
 */

(function () {
    class NavbarComponent {
        constructor() {
            this.init();
        }

        init() {
            // Find existing header or create one at the top of document.body
            let header = document.querySelector('header.aerowing-navbar') || document.querySelector('nav');
            if (!header) {
                header = document.createElement('header');
                header.className = 'aerowing-navbar';
                document.body.prepend(header);
            } else {
                header.className = 'aerowing-navbar';
            }

            this.render(header);
            this.bindEvents(header);
        }

        render(container) {
            const isAuth = window.auth ? window.auth.isAuthenticated() : false;
            const isAdmin = window.auth ? window.auth.isAdmin() : false;
            const email = window.auth ? window.auth.getUserEmail() : '';
            const path = window.location.pathname;

            const isCurrent = (route) => {
                if (route === '/index.html' && (path === '/' || path.endsWith('/index.html'))) return 'active';
                return path.endsWith(route) ? 'active' : '';
            };

            let linksHtml = '';

            if (!isAuth) {
                linksHtml = `
                    <a href="/index.html" class="nav-link-item ${isCurrent('/index.html')}">Home</a>
                    <a href="/flights.html" class="nav-link-item ${isCurrent('/flights.html')}">Flights</a>
                `;
            } else if (isAdmin) {
                linksHtml = `
                    <a href="/admin/index.html" class="nav-link-item ${isCurrent('/admin/index.html')}">Admin Portal</a>
                    <a href="/admin/flights.html" class="nav-link-item ${isCurrent('/admin/flights.html')}">Flight Ops</a>
                    <a href="/admin/aircraft.html" class="nav-link-item ${isCurrent('/admin/aircraft.html')}">Fleet Aircraft</a>
                    <a href="/admin/bookings.html" class="nav-link-item ${isCurrent('/admin/bookings.html')}">All Bookings</a>
                `;
            } else {
                linksHtml = `
                    <a href="/dashboard.html" class="nav-link-item ${isCurrent('/dashboard.html')}">Dashboard</a>
                    <a href="/search.html" class="nav-link-item ${isCurrent('/search.html')}">Search Flights</a>
                    <a href="/bookings.html" class="nav-link-item ${isCurrent('/bookings.html')}">My Bookings</a>
                    <a href="/loyalty.html" class="nav-link-item ${isCurrent('/loyalty.html')}">Loyalty</a>
                    <a href="/profile.html" class="nav-link-item ${isCurrent('/profile.html')}">Profile</a>
                `;
            }

            let authActionsHtml = '';
            if (isAuth) {
                authActionsHtml = `
                    <div class="user-menu-wrapper" style="position: relative; display: inline-block;">
                        <button class="user-pill" id="user-menu-trigger" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; background: rgba(255,255,255,0.12); padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.18); color: #fff; cursor: pointer;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--success);"></span>
                            <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;">${email}</span>
                            ${isAdmin ? '<span class="brand-badge" style="font-size: 10px; padding: 2px 6px;">ADMIN</span>' : ''}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <div class="user-dropdown-menu" id="user-dropdown-menu" style="display: none; position: absolute; right: 0; top: calc(100% + 8px); min-width: 180px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 1000; overflow: hidden; padding: 4px 0;">
                            ${isAdmin ? `
                                <a href="/admin/index.html" style="display: block; padding: 8px 14px; font-size: 13px; color: var(--text-primary); text-decoration: none;">Operations Portal</a>
                                <a href="/admin/flights.html" style="display: block; padding: 8px 14px; font-size: 13px; color: var(--text-primary); text-decoration: none;">Flight Dispatch</a>
                                <a href="/admin/aircraft.html" style="display: block; padding: 8px 14px; font-size: 13px; color: var(--text-primary); text-decoration: none;">Fleet Aircraft</a>
                                <a href="/admin/bookings.html" style="display: block; padding: 8px 14px; font-size: 13px; color: var(--text-primary); text-decoration: none;">Reservations</a>
                            ` : `
                                <a href="/dashboard.html" style="display: block; padding: 8px 14px; font-size: 13px; color: var(--text-primary); text-decoration: none;">Dashboard</a>
                                <a href="/profile.html" style="display: block; padding: 8px 14px; font-size: 13px; color: var(--text-primary); text-decoration: none;">My Profile</a>
                                <a href="/bookings.html" style="display: block; padding: 8px 14px; font-size: 13px; color: var(--text-primary); text-decoration: none;">My Bookings</a>
                                <a href="/loyalty.html" style="display: block; padding: 8px 14px; font-size: 13px; color: var(--text-primary); text-decoration: none;">Loyalty Club</a>
                            `}
                            <div style="border-top: 1px solid var(--border); margin: 4px 0;"></div>
                            <button type="button" onclick="window.auth.logout()" style="width: 100%; text-align: left; padding: 8px 14px; font-size: 13px; color: var(--danger); background: none; border: none; cursor: pointer;">Log Out</button>
                        </div>
                    </div>
                `;
            } else {
                authActionsHtml = `
                    <a href="/login.html" class="btn btn-sm btn-ghost" style="color:var(--nav-text);">Log In</a>
                    <a href="/register.html" class="btn btn-sm btn-accent">Sign Up</a>
                `;
            }

            container.innerHTML = `
                <div class="container">
                    <div class="nav-inner">
                        <a href="/index.html" class="brand-logo">
                            <svg viewBox="0 0 24 24"><path d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-5.5L22 16z"/></svg>
                            <span>Aerowing Airlines</span>
                            ${isAdmin ? '<span class="brand-badge">STAFF</span>' : ''}
                        </a>

                        <nav class="nav-links-desktop">
                            ${linksHtml}
                        </nav>

                        <div class="nav-actions">
                            <button class="theme-toggle-btn" aria-label="Toggle Theme" title="Toggle Light / Dark Mode"></button>
                            <div class="auth-group" style="display: flex; align-items: center; gap: 0.5rem;">
                                ${authActionsHtml}
                            </div>
                            <button class="mobile-menu-btn" id="mobile-menu-toggle" aria-label="Open Navigation Menu">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Mobile Drawer -->
                <div class="mobile-nav-drawer" id="mobile-nav-drawer">
                    <div class="drawer-header">
                        <div class="brand-logo" style="color: var(--text-primary);">
                            <svg viewBox="0 0 24 24" style="fill: var(--gold-500); width: 22px; height: 22px;"><path d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-5.5L22 16z"/></svg>
                            <span>Aerowing</span>
                        </div>
                        <button class="modal-close" id="mobile-drawer-close">&times;</button>
                    </div>
                    <div class="drawer-links">
                        ${linksHtml.replaceAll('nav-link-item', 'drawer-link')}
                    </div>
                    <div style="margin-top: auto; padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.75rem;">
                        ${isAuth ? `
                            <div style="font-size: 0.85rem; color: var(--text-muted);">${email}</div>
                            <button class="btn btn-secondary w-full" onclick="window.auth.logout()">Log Out</button>
                        ` : `
                            <a href="/login.html" class="btn btn-secondary w-full">Log In</a>
                            <a href="/register.html" class="btn btn-accent w-full">Sign Up</a>
                        `}
                    </div>
                </div>
            `;

            if (window.theme) {
                window.theme.updateToggleButtons();
            }
        }

        bindEvents(container) {
            const toggleBtn = container.querySelector('#mobile-menu-toggle');
            const drawer = container.querySelector('#mobile-nav-drawer');
            const closeBtn = container.querySelector('#mobile-drawer-close');

            if (toggleBtn && drawer) {
                toggleBtn.addEventListener('click', () => drawer.classList.add('open'));
            }

            if (closeBtn && drawer) {
                closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
            }

            const userMenuTrigger = container.querySelector('#user-menu-trigger');
            const userDropdown = container.querySelector('#user-dropdown-menu');
            if (userMenuTrigger && userDropdown) {
                userMenuTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isVisible = userDropdown.style.display === 'block';
                    userDropdown.style.display = isVisible ? 'none' : 'block';
                });
            }

            document.addEventListener('click', (e) => {
                if (drawer && drawer.classList.contains('open') && !drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
                    drawer.classList.remove('open');
                }
                if (userDropdown && userDropdown.style.display === 'block' && !userDropdown.contains(e.target) && !userMenuTrigger.contains(e.target)) {
                    userDropdown.style.display = 'none';
                }
            });
        }
    }

    // Auto-mount navbar on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new NavbarComponent());
    } else {
        new NavbarComponent();
    }
})();
