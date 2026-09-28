/**
 * Aerowing Airlines — Authentication & Identity Manager
 * Manages JWT tokens, role decoding, session state, and route protection.
 */

(function () {
    class AuthManager {
        constructor() {
            this.profileCache = null;
        }

        getToken() {
            return localStorage.getItem('token');
        }

        getUserEmail() {
            return localStorage.getItem('email') || '';
        }

        setSession(token, email) {
            localStorage.setItem('token', token);
            if (email) localStorage.setItem('email', email);
            this.profileCache = null;
            window.dispatchEvent(new CustomEvent('aerowing:auth-changed', { detail: { isAuthenticated: true } }));
        }

        clearSession() {
            localStorage.removeItem('token');
            localStorage.removeItem('email');
            this.profileCache = null;
            window.dispatchEvent(new CustomEvent('aerowing:auth-changed', { detail: { isAuthenticated: false } }));
        }

        decodeToken() {
            const token = this.getToken();
            if (!token) return null;
            try {
                const parts = token.split('.');
                if (parts.length !== 3) return null;
                const payload = JSON.parse(atob(parts[1]));
                return payload;
            } catch (e) {
                console.warn('Failed to parse JWT payload:', e);
                return null;
            }
        }

        getUserRole() {
            const payload = this.decodeToken();
            if (!payload || !payload.role) return null;
            let r = String(payload.role).toUpperCase();
            if (r.startsWith('ROLE_')) r = r.substring(5);
            return r;
        }

        isAuthenticated() {
            const token = this.getToken();
            if (!token) return false;
            const payload = this.decodeToken();
            if (!payload) return false;
            // Check exp claim if present
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                this.clearSession();
                return false;
            }
            return true;
        }

        isAdmin() {
            const role = this.getUserRole();
            return role === 'ADMIN';
        }

        isPassenger() {
            const role = this.getUserRole();
            return role === 'PASSENGER';
        }

        async getProfile() {
            if (!this.isAuthenticated()) return null;
            if (this.profileCache) return this.profileCache;
            try {
                if (window.api) {
                    this.profileCache = await window.api.get('/api/users/me');
                    return this.profileCache;
                }
            } catch (e) {
                console.error('Failed to load user profile:', e);
            }
            return null;
        }

        requireAuth(requiredRole = null, redirectUrl = '/login.html') {
            if (!this.isAuthenticated()) {
                window.location.href = redirectUrl;
                return false;
            }
            if (requiredRole && this.getUserRole() !== requiredRole.toUpperCase().replace(/^ROLE_/, '')) {
                if (window.toast) {
                    window.toast.error('Unauthorized access to this section.');
                }
                window.location.href = this.isAdmin() ? '/admin/index.html' : '/dashboard.html';
                return false;
            }
            return true;
        }

        requireAdmin(redirectUrl = '/login.html') {
            if (!this.isAuthenticated()) {
                window.location.href = redirectUrl + '?redirect=' + encodeURIComponent(window.location.pathname);
                return false;
            }
            if (!this.isAdmin()) {
                if (window.toast) {
                    window.toast.error('Access denied: Administrator privileges required.');
                }
                window.location.href = '/dashboard.html';
                return false;
            }
            return true;
        }

        logout() {
            this.clearSession();
            if (window.toast) {
                window.toast.info('You have been logged out.');
            }
            window.location.href = '/login.html';
        }
    }

    const authInstance = new AuthManager();
    window.auth = authInstance;

    // Backward-compatibility exports for existing pages & scripts
    window.token = authInstance.getToken();
    window.userEmail = authInstance.getUserEmail();
    window.decodeRole = function (jwt) {
        return authInstance.getUserRole();
    };
    window.logout = function () {
        authInstance.logout();
    };
    window.formatDate = function (iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
})();
