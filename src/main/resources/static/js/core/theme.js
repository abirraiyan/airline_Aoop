/**
 * Aerowing Airlines — Theme Engine (Light / Dark Mode)
 * Persists theme in localStorage and coordinates smooth visual transitions.
 */

(function () {
    const STORAGE_KEY = 'aerowing_theme';

    class ThemeManager {
        constructor() {
            this.theme = this.getStoredTheme() || this.getSystemPreference();
            this.applyTheme(this.theme, false);
            this.setupSystemListener();
        }

        getStoredTheme() {
            return localStorage.getItem(STORAGE_KEY);
        }

        getSystemPreference() {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        setupSystemListener() {
            if (!window.matchMedia) return;
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only adapt if user hasn't explicitly set a preference
                if (!this.getStoredTheme()) {
                    this.applyTheme(e.matches ? 'dark' : 'light', true);
                }
            });
        }

        applyTheme(theme, animate = true) {
            this.theme = theme;
            document.documentElement.setAttribute('data-theme', theme);

            if (theme === 'dark') {
                document.documentElement.classList.add('dark-theme');
            } else {
                document.documentElement.classList.remove('dark-theme');
            }

            this.updateToggleButtons();

            window.dispatchEvent(new CustomEvent('aerowing:theme-changed', {
                detail: { theme }
            }));
        }

        toggle() {
            const nextTheme = this.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem(STORAGE_KEY, nextTheme);
            this.applyTheme(nextTheme, true);
        }

        updateToggleButtons() {
            const isDark = this.theme === 'dark';
            document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
                btn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
                btn.innerHTML = isDark
                    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
                    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
            });
        }
    }

    const themeInstance = new ThemeManager();
    window.theme = themeInstance;

    // Attach click handlers when DOM loads
    document.addEventListener('DOMContentLoaded', () => {
        themeInstance.updateToggleButtons();
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.theme-toggle-btn')) {
                themeInstance.toggle();
            }
        });
    });
})();
