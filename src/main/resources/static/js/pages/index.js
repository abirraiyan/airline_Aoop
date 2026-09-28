/**
 * Aerowing Airlines — Passenger Homepage Controller
 * Manages hero flight search widget, trip type tabs, airport selection, date validation,
 * passenger counter, flight status preview card, and popular destinations.
 */

(function () {
    let fromSelector = null;
    let toSelector = null;
    let passengerDropdown = null;
    let currentTripType = 'roundtrip'; // 'roundtrip' | 'oneway' | 'multicity'

    document.addEventListener('DOMContentLoaded', () => {
        initSearchWidget();
        initTripTabs();
        initDatePickers();
        initFlightStatusWidget();
        loadPopularDestinations();
    });

    function initSearchWidget() {
        // From Airport Selector
        const fromContainer = document.getElementById('home-from-container');
        if (fromContainer && window.AirportSelector) {
            fromSelector = new window.AirportSelector(fromContainer, {
                id: 'home-from',
                label: 'From (Origin)',
                placeholder: 'Dhaka (DAC)',
                initialCode: 'DAC'
            });
        }

        // To Airport Selector
        const toContainer = document.getElementById('home-to-container');
        if (toContainer && window.AirportSelector) {
            toSelector = new window.AirportSelector(toContainer, {
                id: 'home-to',
                label: 'To (Destination)',
                placeholder: 'Saudi Arabia, Singapore, Dubai...',
                initialCode: 'RUH'
            });
        }

        // Swap Button
        const swapBtn = document.getElementById('btn-swap-airports');
        if (swapBtn) {
            swapBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (fromSelector && toSelector) {
                    const fromAirport = fromSelector.getAirport();
                    const toAirport = toSelector.getAirport();
                    fromSelector.selectAirport(toAirport || { code: '', city: '' });
                    toSelector.selectAirport(fromAirport || { code: '', city: '' });
                }
            });
        }

        // Passenger Selector
        const passContainer = document.getElementById('home-passenger-container');
        if (passContainer && window.PassengerDropdown) {
            passengerDropdown = new window.PassengerDropdown(passContainer, {
                initialAdults: 1,
                initialChildren: 0,
                initialInfants: 0
            });
        }

        // Search Form Submission
        const searchBtn = document.getElementById('btn-search-flights');
        if (searchBtn) {
            searchBtn.addEventListener('click', handleSearchSubmit);
        }
    }

    function initTripTabs() {
        const tabs = document.querySelectorAll('.search-tab-btn');
        const returnDateGroup = document.getElementById('return-date-group');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                currentTripType = tab.getAttribute('data-trip') || 'roundtrip';

                if (returnDateGroup) {
                    if (currentTripType === 'oneway') {
                        returnDateGroup.style.display = 'none';
                    } else {
                        returnDateGroup.style.display = 'flex';
                    }
                }
            });
        });
    }

    function initDatePickers() {
        const deptDateInput = document.getElementById('home-dept-date');
        const returnDateInput = document.getElementById('home-return-date');

        const today = new Date().toISOString().split('T')[0];
        if (deptDateInput) {
            deptDateInput.min = today;
            // Default to tomorrow
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            deptDateInput.value = tomorrow;

            deptDateInput.addEventListener('change', (e) => {
                if (returnDateInput) {
                    returnDateInput.min = e.target.value;
                    if (returnDateInput.value && returnDateInput.value < e.target.value) {
                        returnDateInput.value = e.target.value;
                    }
                }
            });
        }

        if (returnDateInput) {
            const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            returnDateInput.min = today;
            returnDateInput.value = nextWeek;
        }
    }

    function handleSearchSubmit(e) {
        if (e) e.preventDefault();

        const fromCity = fromSelector ? (fromSelector.getCity() || fromSelector.getValue()) : '';
        const toCity = toSelector ? (toSelector.getCity() || toSelector.getValue()) : '';
        const deptDate = document.getElementById('home-dept-date')?.value;
        const returnDate = document.getElementById('home-return-date')?.value;
        const cabinClass = document.getElementById('home-cabin-class')?.value || 'ECONOMY';
        const passengers = passengerDropdown ? passengerDropdown.getValue() : { adults: 1, children: 0, infants: 0 };

        // Search Validations using Toast notification system
        if (!fromCity) {
            if (window.toast) window.toast.warning('Please select an origin airport/city.', 'Search Incomplete');
            return;
        }

        if (!toCity) {
            if (window.toast) window.toast.warning('Please select a destination airport/city.', 'Search Incomplete');
            return;
        }

        if (fromCity.toLowerCase() === toCity.toLowerCase()) {
            if (window.toast) window.toast.warning('Origin and destination cannot be the same airport.', 'Invalid Route');
            return;
        }

        if (!deptDate) {
            if (window.toast) window.toast.warning('Please select a departure date.', 'Date Required');
            return;
        }

        if (currentTripType === 'roundtrip' && !returnDate) {
            if (window.toast) window.toast.warning('Please select a return date for round trip.', 'Return Date Required');
            return;
        }

        if (passengers.adults < 1) {
            if (window.toast) window.toast.warning('At least one adult passenger is required.', 'Passenger Requirement');
            return;
        }

        // Form URL Search Params
        const params = new URLSearchParams({
            from: fromCity,
            to: toCity,
            departure: deptDate,
            trip: currentTripType,
            adults: passengers.adults,
            children: passengers.children,
            infants: passengers.infants,
            class: cabinClass
        });

        if (currentTripType === 'roundtrip' && returnDate) {
            params.append('return', returnDate);
        }

        window.location.href = `/search.html?${params.toString()}`;
    }

    function initFlightStatusWidget() {
        const checkBtn = document.getElementById('btn-check-flight-status');
        const flightInput = document.getElementById('status-flight-number-input');
        const resultContainer = document.getElementById('status-result-container');

        if (!checkBtn || !flightInput || !resultContainer) return;

        checkBtn.addEventListener('click', async () => {
            const query = flightInput.value.trim().toUpperCase();
            if (!query) {
                if (window.toast) window.toast.warning('Please enter a flight number or destination.');
                return;
            }

            resultContainer.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted);">Checking live status...</div>`;

            try {
                // If not logged in, inform user politely
                if (!window.auth || !window.auth.isAuthenticated()) {
                    resultContainer.innerHTML = `
                        <div class="alert alert-info" style="margin-top: 10px;">
                            Please <a href="/login.html" style="font-weight: 700; text-decoration: underline;">log in</a> to query real-time flight telemetry.
                        </div>
                    `;
                    return;
                }

                const flights = await window.api.get('/api/flights');
                const matched = flights.find(f => 
                    `AW-${100 + f.id}`.includes(query) || 
                    `AW${f.id}`.includes(query) ||
                    f.id.toString() === query ||
                    (f.destination && f.destination.toUpperCase().includes(query))
                );

                if (!matched) {
                    resultContainer.innerHTML = `
                        <div class="alert alert-warning" style="margin-top: 10px;">
                            No active flight found matching "${query}". Check scheduled flights or try flight number (e.g. AW-104).
                        </div>
                    `;
                    return;
                }

                const depTime = matched.departureTime ? new Date(matched.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled';
                const statusBadgeClass = `badge-${(matched.status || 'SCHEDULED').toLowerCase()}`;

                resultContainer.innerHTML = `
                    <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem; margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-weight: 700; color: var(--text-primary);">AW-${100 + matched.id}: ${matched.source} &rarr; ${matched.destination}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Departs: ${depTime} &middot; Aircraft: ${matched.aircraft ? matched.aircraft.model : 'Boeing 737'}</div>
                        </div>
                        <span class="badge ${statusBadgeClass}">${matched.status || 'SCHEDULED'}</span>
                    </div>
                `;
            } catch (err) {
                console.error(err);
                resultContainer.innerHTML = `
                    <div class="alert alert-danger" style="margin-top: 10px;">
                        Unable to connect to status system. Please try again.
                    </div>
                `;
            }
        });
    }

    async function loadPopularDestinations() {
        const destGrid = document.getElementById('popular-destinations-grid');
        if (!destGrid) return;

        // Visual destination cards mapped to real scheduled destinations
        const destinations = [
            { city: 'Riyadh & Jeddah', country: 'Saudi Arabia', code: 'RUH / JED', price: '$700', imgGrad: 'linear-gradient(135deg, #1b3960, #d4af37)', desc: 'Direct daily flights to the Kingdom of Saudi Arabia' },
            { city: 'Singapore', country: 'Singapore', code: 'SIN', price: '$380', imgGrad: 'linear-gradient(135deg, #0a1f44, #2e86ab)', desc: 'Experience the world’s leading garden city & aviation hub' },
            { city: 'Guangzhou & Beijing', country: 'China', code: 'CAN / PEK', price: '$560', imgGrad: 'linear-gradient(135deg, #254d80, #b89628)', desc: 'Seamless connections across commercial and cultural capitals' },
            { city: 'Dubai', country: 'United Arab Emirates', code: 'DXB', price: '$450', imgGrad: 'linear-gradient(135deg, #050d1a, #1b6ca8)', desc: 'Iconic skylines, luxury shopping, and golden deserts' }
        ];

        destGrid.innerHTML = destinations.map(dest => `
            <div class="card card-interactive destination-card" style="cursor: pointer;" onclick="window.quickSearchDest('${dest.country}')">
                <div style="height: 140px; background: ${dest.imgGrad}; border-radius: var(--radius-md) var(--radius-md) 0 0; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; color: #ffffff;">
                    <span class="brand-badge" style="align-self: flex-start; background: rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.2);">${dest.code}</span>
                    <div>
                        <div style="font-size: 1.25rem; font-weight: 700; font-family: var(--font-heading);">${dest.city}</div>
                        <div style="font-size: 0.8rem; opacity: 0.9;">${dest.country}</div>
                    </div>
                </div>
                <div class="card-body" style="padding: 1.25rem;">
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">${dest.desc}</p>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Fares from</span>
                            <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); font-family: var(--font-heading);">${dest.price}</div>
                        </div>
                        <span class="btn btn-sm btn-outline">Find Flights &rarr;</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.quickSearchDest = function (destCountry) {
        if (toSelector) {
            toSelector.setValue(destCountry);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.location.href = `/search.html?from=Dhaka&to=${encodeURIComponent(destCountry)}`;
        }
    };
})();
