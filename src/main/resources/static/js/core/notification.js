/**
 * Aerowing Airlines — Toast Notification & Dialog Engine
 * Replaces native alert(), confirm(), and prompt() with accessible, styled UI components.
 */

(function () {
    class NotificationManager {
        constructor() {
            this.container = null;
            this.ensureContainer();
        }

        ensureContainer() {
            if (!this.container) {
                this.container = document.getElementById('toast-container');
                if (!this.container) {
                    this.container = document.createElement('div');
                    this.container.id = 'toast-container';
                    document.body.appendChild(this.container);
                }
            }
        }

        show(type, title, message, duration = 4000) {
            this.ensureContainer();

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;

            const iconMap = {
                success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
                error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
                warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
                info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
            };

            toast.innerHTML = `
                ${iconMap[type] || iconMap.info}
                <div class="toast-content">
                    ${title ? `<div class="toast-title">${title}</div>` : ''}
                    <div class="toast-desc">${message}</div>
                </div>
                <button class="toast-close" aria-label="Close notification">&times;</button>
                <div class="toast-progress"></div>
            `;

            this.container.appendChild(toast);

            const progressBar = toast.querySelector('.toast-progress');
            if (progressBar && duration > 0) {
                progressBar.style.transition = `width ${duration}ms linear`;
                setTimeout(() => { progressBar.style.width = '0%'; }, 10);
            }

            const dismiss = () => {
                toast.classList.add('toast-exit');
                setTimeout(() => {
                    if (toast.parentElement) toast.parentElement.removeChild(toast);
                }, 250);
            };

            toast.querySelector('.toast-close').addEventListener('click', dismiss);

            if (duration > 0) {
                setTimeout(dismiss, duration);
            }

            return toast;
        }

        success(message, title = 'Success') {
            return this.show('success', title, message, 3500);
        }

        error(message, title = 'Error') {
            return this.show('error', title, message, 5000);
        }

        warning(message, title = 'Notice') {
            return this.show('warning', title, message, 4500);
        }

        info(message, title = 'Information') {
            return this.show('info', title, message, 4000);
        }
    }

    window.toast = new NotificationManager();

    // Custom Styled Confirmation & Prompt Modal Replacement
    window.dialog = {
        confirm: function ({ title = 'Confirm Action', message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay open';
                overlay.innerHTML = `
                    <div class="modal-box" style="max-width: 420px;">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p style="color: var(--text-secondary); line-height: 1.5;">${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary cancel-btn">${cancelText}</button>
                            <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'} confirm-btn">${confirmText}</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);

                const cleanUp = (result) => {
                    overlay.classList.remove('open');
                    setTimeout(() => {
                        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
                    }, 200);
                    resolve(result);
                };

                overlay.querySelector('.modal-close').addEventListener('click', () => cleanUp(false));
                overlay.querySelector('.cancel-btn').addEventListener('click', () => cleanUp(false));
                overlay.querySelector('.confirm-btn').addEventListener('click', () => cleanUp(true));
            });
        },

        prompt: function ({ title = 'Input Required', message, placeholder = '', defaultValue = '', confirmText = 'Submit' }) {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay open';
                overlay.innerHTML = `
                    <div class="modal-box" style="max-width: 440px;">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p style="color: var(--text-secondary); margin-bottom: 0.75rem;">${message}</p>
                            <input type="text" class="form-control prompt-input" placeholder="${placeholder}" value="${defaultValue}" />
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary cancel-btn">Cancel</button>
                            <button class="btn btn-primary confirm-btn">${confirmText}</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);

                const input = overlay.querySelector('.prompt-input');
                setTimeout(() => input.focus(), 100);

                const cleanUp = (val) => {
                    overlay.classList.remove('open');
                    setTimeout(() => {
                        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
                    }, 200);
                    resolve(val);
                };

                overlay.querySelector('.modal-close').addEventListener('click', () => cleanUp(null));
                overlay.querySelector('.cancel-btn').addEventListener('click', () => cleanUp(null));
                overlay.querySelector('.confirm-btn').addEventListener('click', () => cleanUp(input.value.trim()));
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') cleanUp(input.value.trim());
                    if (e.key === 'Escape') cleanUp(null);
                });
            });
        }
    };
})();
