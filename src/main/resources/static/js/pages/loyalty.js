/**
 * Aerowing Airlines — Loyalty Club Portal Controller
 * Computes live tier progress, milestones, and highlights verified privileges.
 */

(function () {
    document.addEventListener('DOMContentLoaded', async () => {
        if (!window.auth || !window.auth.requireAuth()) return;
        await loadLoyaltyData();
    });

    async function loadLoyaltyData() {
        try {
            const user = await window.api.get('/api/users/me');
            if (!user) return;

            const miles = user.totalMiles || 0;
            const tier = (user.loyaltyTier || 'SILVER').toUpperCase();

            // Hero tier text
            const heroTierEl = document.getElementById('loyaltyHeroTier');
            const milesNumEl = document.getElementById('loyaltyMilesNumber');
            const targetTextEl = document.getElementById('loyaltyProgressTargetText');
            const meterFillEl = document.getElementById('loyaltyMeterFill');

            if (heroTierEl) heroTierEl.textContent = tier;
            if (milesNumEl) milesNumEl.textContent = miles.toLocaleString();

            let progressPercent = 0;
            let targetDescription = '';

            if (tier === 'PLATINUM') {
                progressPercent = 100;
                targetDescription = 'Top Tier Unlocked! Enjoy Maximum 10% Savings & VIP Privileges';
            } else if (tier === 'GOLD') {
                const surplus = Math.max(0, miles - 5000);
                progressPercent = Math.min(100, Math.round((surplus / 10000) * 100));
                const remaining = Math.max(0, 15000 - miles);
                targetDescription = `${remaining.toLocaleString()} miles to reach Platinum (10% discount)`;
            } else {
                // Silver
                progressPercent = Math.min(100, Math.round((miles / 5000) * 100));
                const remaining = Math.max(0, 5000 - miles);
                targetDescription = `${remaining.toLocaleString()} miles to reach Gold (5% discount)`;
            }

            if (targetTextEl) targetTextEl.textContent = targetDescription;
            if (meterFillEl) {
                setTimeout(() => {
                    meterFillEl.style.width = `${progressPercent}%`;
                }, 100);
            }

            // Highlight current tier card
            ['SILVER', 'GOLD', 'PLATINUM'].forEach(t => {
                const card = document.getElementById(`card-${t}`);
                if (card) {
                    if (t === tier) {
                        card.classList.add('active-tier');
                    } else {
                        card.classList.remove('active-tier');
                    }
                }
            });

        } catch (err) {
            console.error('Failed to load loyalty details:', err);
            if (window.toast) window.toast.error('Could not load loyalty details from server.');
        }
    }
})();
