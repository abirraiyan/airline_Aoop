/**
 * Aerowing Airlines — Flight & Connecting Journey Search Controller (Phase 3)
 * Handles URL query parameters, server-side search API (/api/flights/search),
 * multi-dimensional filtering (stops, price, journey duration, layover duration, time of day),
 * live sorting (including shortest layover), journey details drawer, and selection persistence.
 */

(function () {
    let allJourneys = [];
    let directJourneys = [];
    let connectingJourneys = [];
    let filteredJourneys = [];

    let searchParams = {
        from: '',
        to: '',
        departure: '',
        returnDate: '',
        trip: 'oneway',
        adults: 1,
        children: 0,
        infants: 0,
        seatClass: 'ECONOMY'
    };

    let activeFilters = {
        typeTab: 'all', // 'all' | 'direct' | 'connecting'
        maxPrice: 3000,
        stops: 'all',   // 'all' | 'direct' | 'connecting'
        maxDurationHours: 48,
        maxLayoverMinutes: 'all',
        timeOfDay: [],
        aircraft: 'all',
        sortBy: 'recommended'
    };

    let fromSelector = null;
    let toSelector = null;
    let passengerDropdown = null;

    document.addEventListener('DOMContentLoaded', () => {
        initSearchParams();
        initSearchSummary();
        initTypeTabs();
        initFilterControls();
        fetchAndRenderJourneys();
    });

    function initSearchParams() {
        const urlParams = new URLSearchParams(window.location.search);
        searchParams.from = urlParams.get('from') || urlParams.get('origin') || '';
        searchParams.to = urlParams.get('to') || urlParams.get('destination') || '';
        searchParams.departure = urlParams.get('departure') || '';
        searchParams.returnDate = urlParams.get('return') || '';
        searchParams.trip = urlParams.get('trip') || 'oneway';
        searchParams.adults = parseInt(urlParams.get('adults')) || 1;
        searchParams.children = parseInt(urlParams.get('children')) || 0;
        searchParams.infants = parseInt(urlParams.get('infants')) || 0;
        searchParams.seatClass = (urlParams.get('class') || 'ECONOMY').toUpperCase();
    }

    function initSearchSummary() {
        const summaryOrigin = document.getElementById('summary-origin');
        const summaryDest = document.getElementById('summary-dest');
        const summaryMeta = document.getElementById('summary-meta');

        if (summaryOrigin) summaryOrigin.innerText = searchParams.from || 'Any Origin';
        if (summaryDest) summaryDest.innerText = searchParams.to || 'All Destinations';

        if (summaryMeta) {
            const dateStr = searchParams.departure 
                ? new Date(searchParams.departure).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' }) 
                : 'Flexible Dates';
            const totalPass = searchParams.adults + searchParams.children + searchParams.infants;
            const classLabel = searchParams.seatClass.replace('_', ' ');
            summaryMeta.innerText = `${dateStr} &middot; ${totalPass} Passenger${totalPass > 1 ? 's' : ''} &middot; ${classLabel}`;
        }

        // Toggle edit search box
        const editBtn = document.getElementById('btn-toggle-edit-search');
        const editBox = document.getElementById('search-edit-box');
        if (editBtn && editBox) {
            editBtn.addEventListener('click', () => {
                const isHidden = editBox.style.display === 'none' || !editBox.style.display;
                editBox.style.display = isHidden ? 'block' : 'none';
                editBtn.innerText = isHidden ? 'Hide Search Form' : 'Edit Search';
                if (isHidden && !fromSelector) {
                    initEditSearchControls();
                }
            });
        }
    }

    function initEditSearchControls() {
        const fromContainer = document.getElementById('edit-from-container');
        const toContainer = document.getElementById('edit-to-container');
        const passContainer = document.getElementById('edit-passenger-container');

        if (fromContainer && window.AirportSelector) {
            fromSelector = new window.AirportSelector(fromContainer, {
                id: 'edit-from-airport',
                label: 'Origin',
                initialCode: searchParams.from
            });
        }

        if (toContainer && window.AirportSelector) {
            toSelector = new window.AirportSelector(toContainer, {
                id: 'edit-to-airport',
                label: 'Destination',
                initialCode: searchParams.to
            });
        }

        if (passContainer && window.PassengerDropdown) {
            passengerDropdown = new window.PassengerDropdown(passContainer, {
                initialAdults: searchParams.adults,
                initialChildren: searchParams.children,
                initialInfants: searchParams.infants
            });
        }

        const deptInput = document.getElementById('edit-departure-date');
        if (deptInput && searchParams.departure) {
            deptInput.value = searchParams.departure;
        }

        const classSelect = document.getElementById('edit-cabin-class');
        if (classSelect && searchParams.seatClass) {
            classSelect.value = searchParams.seatClass;
        }

        // Apply updated search
        const updateBtn = document.getElementById('btn-apply-search-update');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                const newFrom = fromSelector ? (fromSelector.getCity() || fromSelector.getValue()) : searchParams.from;
                const newTo = toSelector ? (toSelector.getCity() || toSelector.getValue()) : searchParams.to;
                const newDept = deptInput ? deptInput.value : searchParams.departure;
                const newPass = passengerDropdown ? passengerDropdown.getValue() : { adults: 1, children: 0, infants: 0 };
                const newClass = classSelect ? classSelect.value : searchParams.seatClass;

                const params = new URLSearchParams({
                    from: newFrom,
                    to: newTo,
                    departure: newDept,
                    adults: newPass.adults,
                    children: newPass.children,
                    infants: newPass.infants,
                    class: newClass
                });

                window.location.search = params.toString();
            });
        }
    }

    function initTypeTabs() {
        const tabs = document.querySelectorAll('.type-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                activeFilters.typeTab = tab.getAttribute('data-type') || 'all';
                applyFiltersAndRender();
            });
        });
    }

    function initFilterControls() {
        // Price Slider
        const priceSlider = document.getElementById('filter-price-range');
        const priceDisplay = document.getElementById('filter-price-value');
        if (priceSlider && priceDisplay) {
            priceSlider.addEventListener('input', (e) => {
                activeFilters.maxPrice = parseFloat(e.target.value);
                priceDisplay.innerText = `$${activeFilters.maxPrice}`;
                applyFiltersAndRender();
            });
        }

        // Max Journey Duration Slider
        const durationSlider = document.getElementById('filter-duration-range');
        const durationDisplay = document.getElementById('filter-duration-value');
        if (durationSlider && durationDisplay) {
            durationSlider.addEventListener('input', (e) => {
                activeFilters.maxDurationHours = parseFloat(e.target.value);
                durationDisplay.innerText = `${activeFilters.maxDurationHours}h`;
                applyFiltersAndRender();
            });
        }

        // Max Layover Duration Select
        const layoverSelect = document.getElementById('filter-layover');
        if (layoverSelect) {
            layoverSelect.addEventListener('change', (e) => {
                activeFilters.maxLayoverMinutes = e.target.value;
                applyFiltersAndRender();
            });
        }

        // Stops Radio
        document.querySelectorAll('input[name="filter-stops"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                activeFilters.stops = e.target.value;
                applyFiltersAndRender();
            });
        });

        // Time of Day Checkboxes
        document.querySelectorAll('input[name="filter-time"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                activeFilters.timeOfDay = Array.from(document.querySelectorAll('input[name="filter-time"]:checked')).map(c => c.value);
                applyFiltersAndRender();
            });
        });

        // Aircraft Dropdown
        const aircraftSelect = document.getElementById('filter-aircraft');
        if (aircraftSelect) {
            aircraftSelect.addEventListener('change', (e) => {
                activeFilters.aircraft = e.target.value;
                applyFiltersAndRender();
            });
        }

        // Sorting
        const sortSelect = document.getElementById('sort-by-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                activeFilters.sortBy = e.target.value;
                applyFiltersAndRender();
            });
        }

        // Mobile Filter Drawer Toggle
        const openMobileFiltersBtn = document.getElementById('btn-open-mobile-filters');
        const closeMobileFiltersBtn = document.getElementById('btn-close-mobile-filters');
        const filterSidebar = document.getElementById('filter-sidebar');

        if (openMobileFiltersBtn && filterSidebar) {
            openMobileFiltersBtn.addEventListener('click', () => {
                filterSidebar.classList.add('mobile-open');
            });
        }

        if (closeMobileFiltersBtn && filterSidebar) {
            closeMobileFiltersBtn.addEventListener('click', () => {
                filterSidebar.classList.remove('mobile-open');
            });
        }

        // Clear filters button
        const clearBtn = document.getElementById('btn-clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', resetFilters);
        }
    }

    function resetFilters() {
        activeFilters.typeTab = 'all';
        activeFilters.maxPrice = 3000;
        activeFilters.stops = 'all';
        activeFilters.maxDurationHours = 48;
        activeFilters.maxLayoverMinutes = 'all';
        activeFilters.timeOfDay = [];
        activeFilters.aircraft = 'all';
        activeFilters.sortBy = 'recommended';

        const priceSlider = document.getElementById('filter-price-range');
        const priceDisplay = document.getElementById('filter-price-value');
        if (priceSlider) priceSlider.value = 3000;
        if (priceDisplay) priceDisplay.innerText = '$3000';

        const durationSlider = document.getElementById('filter-duration-range');
        const durationDisplay = document.getElementById('filter-duration-value');
        if (durationSlider) durationSlider.value = 48;
        if (durationDisplay) durationDisplay.innerText = '48h';

        const layoverSelect = document.getElementById('filter-layover');
        if (layoverSelect) layoverSelect.value = 'all';

        document.querySelectorAll('input[name="filter-stops"][value="all"]').forEach(r => r.checked = true);
        document.querySelectorAll('input[name="filter-time"]').forEach(c => c.checked = false);
        
        const aircraftSelect = document.getElementById('filter-aircraft');
        if (aircraftSelect) aircraftSelect.value = 'all';

        const sortSelect = document.getElementById('sort-by-select');
        if (sortSelect) sortSelect.value = 'recommended';

        document.querySelectorAll('.type-tab-btn').forEach(t => {
            if (t.getAttribute('data-type') === 'all') t.classList.add('active');
            else t.classList.remove('active');
        });

        applyFiltersAndRender();
    }

    async function fetchAndRenderJourneys() {
        const resultsContainer = document.getElementById('flight-results-list');
        const countDisplay = document.getElementById('results-count-text');

        if (!resultsContainer) return;

        // Display Skeleton Loading State
        resultsContainer.innerHTML = `
            <div class="skeleton-card" style="height: 180px; margin-bottom: 1.25rem;"></div>
            <div class="skeleton-card" style="height: 180px; margin-bottom: 1.25rem;"></div>
            <div class="skeleton-card" style="height: 180px;"></div>
        `;

        if (countDisplay) countDisplay.innerText = 'Searching direct & connecting journeys...';

        try {
            // Check if user is authenticated
            if (!window.auth || !window.auth.isAuthenticated()) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                        <div class="empty-title">Sign in to Access Flight Search</div>
                        <div class="empty-desc">Aerowing live flight inventory and multi-leg booking require an authenticated passenger session. Log in to explore real-time availability.</div>
                        <a href="/login.html" class="btn btn-primary">Log In &amp; View Flights</a>
                    </div>
                `;
                if (countDisplay) countDisplay.innerText = 'Authentication required';
                return;
            }

            // Build query params for /api/flights/search
            const queryParams = new URLSearchParams();
            if (searchParams.from) queryParams.append('source', searchParams.from);
            if (searchParams.to) queryParams.append('destination', searchParams.to);
            if (searchParams.departure) queryParams.append('date', searchParams.departure);

            const searchUrl = `/api/flights/search?${queryParams.toString()}`;
            const resultDto = await window.api.get(searchUrl);

            directJourneys = resultDto.directJourneys || [];
            connectingJourneys = resultDto.connectingJourneys || [];
            allJourneys = [...directJourneys, ...connectingJourneys];

            // If user searched for a route that had no exact match on that date, also load general catalog
            // so they can see alternatives or flexible routes
            if (allJourneys.length === 0 && (searchParams.from || searchParams.to)) {
                const catalogDto = await window.api.get('/api/flights/search');
                if (catalogDto && (catalogDto.directJourneys?.length > 0 || catalogDto.connectingJourneys?.length > 0)) {
                    // Keep general catalog accessible if desired
                    window.allCatalogJourneys = [...(catalogDto.directJourneys || []), ...(catalogDto.connectingJourneys || [])];
                }
            }

            // Update Type Tabs Counts
            updateTypeTabsCounts(directJourneys.length, connectingJourneys.length);

            // Populate Aircraft Filter
            populateAircraftFilter(allJourneys);

            // Populate Max Price Slider Range
            const highestPrice = allJourneys.reduce((max, j) => {
                const p = j.pricing ? j.pricing.economyFinalPrice : (j.basePrice || 500);
                return Math.max(max, p);
            }, 1000);

            const sliderMax = Math.ceil(highestPrice * 1.3);
            const priceSlider = document.getElementById('filter-price-range');
            const priceDisplay = document.getElementById('filter-price-value');
            if (priceSlider) {
                priceSlider.max = sliderMax;
                priceSlider.value = sliderMax;
                activeFilters.maxPrice = sliderMax;
            }
            if (priceDisplay) priceDisplay.innerText = `$${sliderMax}`;

            applyFiltersAndRender();
        } catch (error) {
            console.error('Failed to load journeys:', error);
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon" style="color: var(--danger); background: var(--danger-bg);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <div class="empty-title">Unable to Load Flights</div>
                    <div class="empty-desc">We encountered an issue connecting to the flight schedule server. Please verify your connection or try again.</div>
                    <button type="button" class="btn btn-primary" onclick="window.location.reload()">Try Again</button>
                </div>
            `;
            if (countDisplay) countDisplay.innerText = 'Search error';
        }
    }

    function updateTypeTabsCounts(directCount, connectingCount) {
        const tabAll = document.getElementById('tab-all-journeys');
        const tabDirect = document.getElementById('tab-direct-journeys');
        const tabConnecting = document.getElementById('tab-connecting-journeys');

        const total = directCount + connectingCount;
        if (tabAll) tabAll.innerText = `All Journeys (${total})`;
        if (tabDirect) tabDirect.innerText = `Direct Flights (${directCount})`;
        if (tabConnecting) tabConnecting.innerText = `1-Stop Connecting (${connectingCount})`;
    }

    function populateAircraftFilter(journeys) {
        const select = document.getElementById('filter-aircraft');
        if (!select) return;

        const aircraftSet = new Set();
        journeys.forEach(j => {
            if (j.segments) {
                j.segments.forEach(s => {
                    if (s.aircraftModel) aircraftSet.add(s.aircraftModel);
                });
            }
        });

        select.innerHTML = '<option value="all">All Aircraft</option>' + 
            Array.from(aircraftSet).map(model => `<option value="${model}">${model}</option>`).join('');
    }

    function applyFiltersAndRender() {
        const resultsContainer = document.getElementById('flight-results-list');
        const countDisplay = document.getElementById('results-count-text');

        if (!allJourneys.length) {
            renderEmptyState(resultsContainer, countDisplay, 'No flights found for your search criteria.');
            return;
        }

        filteredJourneys = allJourneys.filter(j => {
            // Type tab filter (all | direct | connecting)
            if (activeFilters.typeTab === 'direct' && j.stops > 0) return false;
            if (activeFilters.typeTab === 'connecting' && j.stops === 0) return false;

            // Stops filter (radio)
            if (activeFilters.stops === 'direct' && j.stops > 0) return false;
            if (activeFilters.stops === 'connecting' && j.stops === 0) return false;

            // Price filter
            const price = j.pricing ? j.pricing.economyFinalPrice : (j.basePrice || 0);
            if (price > activeFilters.maxPrice) return false;

            // Max Journey Duration Filter
            const maxDurationMinutes = activeFilters.maxDurationHours * 60;
            if (j.totalDurationMinutes && j.totalDurationMinutes > maxDurationMinutes) return false;

            // Max Layover Duration Filter
            if (activeFilters.maxLayoverMinutes !== 'all' && j.stops > 0) {
                const maxLayoverAllowed = parseInt(activeFilters.maxLayoverMinutes);
                if (j.totalLayoverTimeMinutes && j.totalLayoverTimeMinutes > maxLayoverAllowed) return false;
            }

            // Aircraft model filter
            if (activeFilters.aircraft !== 'all') {
                const hasMatchingAircraft = j.segments?.some(s => s.aircraftModel === activeFilters.aircraft);
                if (!hasMatchingAircraft) return false;
            }

            // Time of Day Filter (checks initial departure time)
            if (activeFilters.timeOfDay.length > 0 && j.departureTime) {
                const hour = new Date(j.departureTime).getHours();
                const matchesTime = activeFilters.timeOfDay.some(slot => {
                    if (slot === 'morning') return hour >= 6 && hour < 12;
                    if (slot === 'afternoon') return hour >= 12 && hour < 18;
                    if (slot === 'evening') return hour >= 18 && hour < 24;
                    if (slot === 'night') return hour >= 0 && hour < 6;
                    return false;
                });
                if (!matchesTime) return false;
            }

            return true;
        });

        // Sort journeys
        sortJourneys(filteredJourneys, activeFilters.sortBy);

        // Update count display
        if (countDisplay) {
            countDisplay.innerText = `${filteredJourneys.length} journey${filteredJourneys.length === 1 ? '' : 's'} found`;
        }

        // Render Cards
        if (filteredJourneys.length === 0) {
            renderEmptyState(resultsContainer, countDisplay, 'No journeys match your active filter criteria.');
            return;
        }

        resultsContainer.innerHTML = '';
        filteredJourneys.forEach(journey => {
            const isConnecting = journey.journeyType === 'CONNECTING' || journey.stops > 0;
            let card;

            if (isConnecting) {
                card = window.FlightCardRenderer.renderConnectingCard(journey, {
                    selectedClass: searchParams.seatClass,
                    onViewDetails: (j) => {
                        if (window.flightDetailsDrawer) {
                            window.flightDetailsDrawer.open(j, onJourneySelected);
                        }
                    },
                    onSelect: onJourneySelected
                });
            } else {
                card = window.FlightCardRenderer.renderDirectCard(journey, {
                    selectedClass: searchParams.seatClass,
                    onViewDetails: (j) => {
                        if (window.flightDetailsDrawer) {
                            window.flightDetailsDrawer.open(j, onJourneySelected);
                        }
                    },
                    onSelect: onJourneySelected
                });
            }

            resultsContainer.appendChild(card);
        });
    }

    function renderEmptyState(container, countEl, message) {
        let specificMsg = message;
        if (activeFilters.typeTab === 'direct' && directJourneys.length === 0) {
            specificMsg = 'No direct flights found for this route.';
        } else if (activeFilters.typeTab === 'connecting' && connectingJourneys.length === 0) {
            specificMsg = 'No connecting flights found for this route.';
        }

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-5.5L22 16z"/></svg>
                </div>
                <div class="empty-title">${specificMsg}</div>
                <div class="empty-desc">Try changing your destination, departure date, or clearing duration/price filters to explore available flights across the network.</div>
                <div style="display: flex; gap: 10px; margin-top: 1rem; flex-wrap: wrap; justify-content: center;">
                    <button type="button" class="btn btn-secondary" onclick="window.resetFilters()">Clear Filters</button>
                    <button type="button" class="btn btn-primary" onclick="document.getElementById('btn-toggle-edit-search').click()">Edit Search Criteria</button>
                </div>
            </div>
        `;
        if (countEl) countEl.innerText = '0 journeys found';
    }

    function sortJourneys(journeys, sortBy) {
        journeys.sort((a, b) => {
            const priceA = a.pricing ? a.pricing.economyFinalPrice : (a.basePrice || 0);
            const priceB = b.pricing ? b.pricing.economyFinalPrice : (b.basePrice || 0);

            if (sortBy === 'cheapest') {
                return priceA - priceB;
            }
            if (sortBy === 'fastest') {
                return (a.totalDurationMinutes || 0) - (b.totalDurationMinutes || 0);
            }
            if (sortBy === 'earliest') {
                return new Date(a.departureTime || 0) - new Date(b.departureTime || 0);
            }
            if (sortBy === 'latest') {
                return new Date(b.departureTime || 0) - new Date(a.departureTime || 0);
            }
            if (sortBy === 'layover') {
                return (a.totalLayoverTimeMinutes || 0) - (b.totalLayoverTimeMinutes || 0);
            }
            // Recommended: Direct first, then scheduled, then price
            if (a.stops !== b.stops) return a.stops - b.stops;
            if (a.status === 'SCHEDULED' && b.status !== 'SCHEDULED') return -1;
            if (b.status === 'SCHEDULED' && a.status !== 'SCHEDULED') return 1;
            return priceA - priceB;
        });
    }

    function onJourneySelected(journey, chosenClass = 'ECONOMY') {
        const finalPrice = journey.pricing 
            ? (chosenClass === 'BUSINESS' ? journey.pricing.businessFinalPrice : (chosenClass === 'FIRST_CLASS' ? journey.pricing.firstClassFinalPrice : journey.pricing.economyFinalPrice))
            : journey.basePrice;

        const selectionPayload = {
            journeyId: journey.journeyId,
            journeyType: journey.journeyType,
            stops: journey.stops,
            origin: journey.origin,
            destination: journey.destination,
            departureTime: journey.departureTime,
            arrivalTime: journey.arrivalTime,
            totalDuration: journey.totalDurationFormatted,
            totalFlightTime: journey.totalFlightTimeFormatted,
            totalLayoverTime: journey.totalLayoverTimeFormatted,
            seatClass: chosenClass,
            finalPrice: finalPrice,
            segments: journey.segments,
            layovers: journey.layovers,
            passengers: {
                adults: searchParams.adults,
                children: searchParams.children,
                infants: searchParams.infants
            }
        };

        sessionStorage.setItem('aerowing_selected_journey', JSON.stringify(selectionPayload));
        // Also persist legacy key for backward compatibility
        sessionStorage.setItem('aerowing_selected_flight', JSON.stringify({
            flightId: journey.segments?.[0]?.flightId,
            source: journey.origin,
            destination: journey.destination,
            seatClass: chosenClass,
            basePrice: finalPrice
        }));

        if (window.toast) {
            window.toast.success(`Journey ${journey.origin} &rarr; ${journey.destination} selected! (${chosenClass})`, 'Journey Selected');
        }

        setTimeout(() => {
            const firstFlightId = journey.segments?.[0]?.flightId || 4;
            window.location.href = `booking.html?flightId=${firstFlightId}&class=${chosenClass}&journeyId=${journey.journeyId}`;
        }, 800);
    }

    window.resetFilters = resetFilters;
})();
