/**
 * Aerowing Airlines — Passenger Profile Controller
 * Handles user profile loading and safe field updates via PUT /api/users/me.
 */

(function () {
    let currentUser = null;

    document.addEventListener('DOMContentLoaded', async () => {
        if (!window.auth || !window.auth.requireAuth()) return;
        await loadProfile();
    });

    async function loadProfile() {
        try {
            currentUser = await window.api.get('/api/users/me');
            if (!currentUser) return;

            const nameInput = document.getElementById('profileName');
            const phoneInput = document.getElementById('profilePhone');
            const emailInput = document.getElementById('profileEmail');
            const roleBadge = document.getElementById('roleBadge');
            const tierDisplay = document.getElementById('profileTierDisplay');
            const milesDisplay = document.getElementById('profileMilesDisplay');
            const discountDisplay = document.getElementById('profileDiscountDisplay');

            if (nameInput) nameInput.value = currentUser.name || '';
            if (phoneInput) phoneInput.value = currentUser.phone || '';
            if (emailInput) emailInput.value = currentUser.email || '';
            if (roleBadge) roleBadge.textContent = currentUser.role || 'PASSENGER';

            const tier = currentUser.loyaltyTier || 'SILVER';
            if (tierDisplay) tierDisplay.textContent = tier;
            if (milesDisplay) milesDisplay.textContent = `${(currentUser.totalMiles || 0).toLocaleString()} mi`;

            let discount = '0%';
            if (tier === 'GOLD') discount = '5%';
            if (tier === 'PLATINUM') discount = '10%';
            if (discountDisplay) discountDisplay.textContent = discount;

        } catch (err) {
            console.error('Failed to load profile:', err);
            if (window.toast) window.toast.error('Could not load profile details.');
        }
    }

    window.handleSaveProfile = async function (e) {
        e.preventDefault();

        const nameInput = document.getElementById('profileName');
        const phoneInput = document.getElementById('profilePhone');
        const btn = document.getElementById('saveProfileBtn');

        const newName = nameInput?.value?.trim();
        const newPhone = phoneInput?.value?.trim();

        if (!newName) {
            if (window.toast) window.toast.error('Please enter your full name.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Saving Changes...';
        }

        try {
            const updated = await window.api.put('/api/users/me', {
                name: newName,
                phone: newPhone
            });

            if (updated && updated.id) {
                currentUser = updated;
                if (window.toast) {
                    window.toast.success('Profile updated successfully!', 'Saved');
                } else {
                    alert('Profile updated successfully!');
                }
            }
        } catch (err) {
            console.error('Failed to update profile:', err);
            if (window.toast) {
                window.toast.error(err.message || 'Could not save profile changes.');
            } else {
                alert('Could not save profile changes.');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Save Changes';
            }
        }
    };
})();
