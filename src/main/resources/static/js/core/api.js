/**
 * Aerowing Airlines — Centralized API Layer
 * Handles authentication headers, error normalizing, and HTTP request lifecycle.
 */

(function () {
    class ApiClient {
        constructor() {
            this.baseUrl = '';
        }

        getToken() {
            return localStorage.getItem('token');
        }

        async request(endpoint, options = {}) {
            const url = this.baseUrl + endpoint;
            const headers = {
                'Accept': 'application/json, text/plain, */*',
                ...options.headers
            };

            const token = this.getToken();
            if (token && !headers['Authorization']) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(options.body);
            }

            try {
                const response = await fetch(url, { ...options, headers });

                // Handle session expiration
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('email');
                    window.dispatchEvent(new CustomEvent('aerowing:unauthorized'));
                    if (window.toast) {
                        window.toast.warning('Your session has expired. Please log in again.');
                    }
                    if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html')) {
                        setTimeout(() => {
                            window.location.href = '/login.html';
                        }, 1200);
                    }
                    throw new Error('Session expired');
                }

                // Handle access denied
                if (response.status === 403) {
                    if (window.toast) {
                        window.toast.error('Access Denied: You do not have permission for this operation.');
                    }
                    throw new Error('Access Denied');
                }

                const contentType = response.headers.get('content-type') || '';
                let data = null;

                if (contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    try {
                        data = JSON.parse(text);
                    } catch (e) {
                        data = text;
                    }
                }

                if (!response.ok) {
                    const errorMessage = (data && typeof data === 'object' && data.message) 
                        ? data.message 
                        : (typeof data === 'string' && data ? data : `Request failed with status ${response.status}`);
                    throw new Error(errorMessage);
                }

                return data;
            } catch (error) {
                console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error.message);
                throw error;
            }
        }

        get(endpoint, options = {}) {
            return this.request(endpoint, { ...options, method: 'GET' });
        }

        post(endpoint, body, options = {}) {
            return this.request(endpoint, { ...options, method: 'POST', body });
        }

        put(endpoint, body, options = {}) {
            return this.request(endpoint, { ...options, method: 'PUT', body });
        }

        delete(endpoint, options = {}) {
            return this.request(endpoint, { ...options, method: 'DELETE' });
        }
    }

    window.api = new ApiClient();
})();
