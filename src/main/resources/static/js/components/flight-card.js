/**
 * Aerowing Airlines — Flight & Connecting Journey Card Component Library
 * Renders direct flight cards and multi-leg connecting journey cards with real backend data.
 */

(function () {
    const CLASS_MULTIPLIERS = {
        ECONOMY: 1.0,
        BUSINESS: 2.2,
        FIRST_CLASS: 3.5
    };

    function getAirportCode(cityOrName) {
        if (!cityOrName) return 'DAC';
        const str = cityOrName.trim().toLowerCase();
        if (str.includes('dhaka')) return 'DAC';
        if (str.includes('saudi') || str.includes('riyadh')) return 'RUH';
        if (str.includes('jeddah')) return 'JED';
        if (str.includes('singapore')) return 'SIN';
        if (str.includes('china') || str.includes('guangzhou')) return 'CAN';
        if (str.includes('beijing')) return 'PEK';
        if (str.includes('shanghai')) return 'PVG';
        if (str.includes('dubai')) return 'DXB';
        if (str.includes('london')) return 'LHR';
        if (str.includes('doha')) return 'DOH';
        if (str.includes('tokyo') || str.includes('haneda') || str.includes('narita')) return 'HND';
        if (str.includes('new york')) return 'JFK';
        if (str.includes('bangkok')) return 'BKK';
        return cityOrName.substring(0, 3).toUpperCase();
    }

    function formatTime(iso) {
        if (!iso) return '--:--';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
    }

    function calculateDuration(depIso, arrIso) {
        if (!depIso || !arrIso) return 'N/A';
        const dep = new Date(depIso);
        const arr = new Date(arrIso);
        const diffMs = arr - dep;
        if (diffMs <= 0) return 'Direct';
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
    }

    class FlightCardRenderer {
        /**
         * Renders a direct flight or direct journey card
         */
        static renderDirectCard(data, options = {}) {
            // Handle both raw Flight entity and JourneyDTO
            const isJourneyDto = Boolean(data.journeyType && data.segments);
            const flight = isJourneyDto ? data.segments[0] : data;

            const selectedClass = options.selectedClass || 'ECONOMY';
            const depCode = getAirportCode(flight.source);
            const arrCode = getAirportCode(flight.destination);
            const depTimeStr = formatTime(flight.departureTime);
            const arrTimeStr = formatTime(flight.arrivalTime);
            const depDateStr = formatDate(flight.departureTime);
            const durationStr = isJourneyDto && data.totalDurationFormatted ? data.totalDurationFormatted : calculateDuration(flight.departureTime, flight.arrivalTime);

            const flightNumber = flight.flightNumber || `AW-${100 + (flight.flightId || flight.id || 0)}`;
            const aircraftModel = (flight.aircraft && flight.aircraft.model) || flight.aircraftModel || 'Boeing 737';

            const ecoSeats = flight.availableEconomySeats ?? 0;
            const bizSeats = flight.availableBusinessSeats ?? 0;
            const firstSeats = flight.availableFirstClassSeats ?? 0;
            const totalSeatsLeft = ecoSeats + bizSeats + firstSeats;

            const baseFare = isJourneyDto && data.pricing ? data.pricing.basePriceSubtotal : (flight.basePrice || 0);
            const ecoPrice = isJourneyDto && data.pricing ? data.pricing.economyFinalPrice : Math.round(baseFare * CLASS_MULTIPLIERS.ECONOMY);
            const bizPrice = isJourneyDto && data.pricing ? data.pricing.businessFinalPrice : Math.round(baseFare * CLASS_MULTIPLIERS.BUSINESS);
            const firstPrice = isJourneyDto && data.pricing ? data.pricing.firstClassFinalPrice : Math.round(baseFare * CLASS_MULTIPLIERS.FIRST_CLASS);

            const status = flight.status || 'SCHEDULED';
            const isCancelled = status === 'CANCELLED';
            const isDelayed = status === 'DELAYED';
            const isSoldOut = totalSeatsLeft <= 0;

            const cardEl = document.createElement('div');
            cardEl.className = `flight-card ${isCancelled ? 'flight-card-cancelled' : ''}`;
            cardEl.setAttribute('data-id', flight.flightId || flight.id);

            cardEl.innerHTML = `
                <div class="flight-card-main">
                    <!-- Airline & Flight Info -->
                    <div class="flight-airline-info">
                        <div class="airline-badge-icon">
                            <svg viewBox="0 0 24 24"><path d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-5.5L22 16z"/></svg>
                        </div>
                        <div>
                            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">Aerowing Airlines</div>
                            <div style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                                <span>${flightNumber}</span> &middot; <span>${aircraftModel}</span>
                            </div>
                            <div style="margin-top: 4px;">
                                <span class="badge badge-${status.toLowerCase()}">${status}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Flight Route Timeline -->
                    <div class="flight-timeline">
                        <div class="timeline-point">
                            <div class="timeline-time">${depTimeStr}</div>
                            <div class="timeline-city"><strong>${depCode}</strong> &middot; ${flight.source}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">${depDateStr}</div>
                        </div>

                        <div class="timeline-track">
                            <div class="timeline-duration">${durationStr}</div>
                            <div class="timeline-bar">
                                <svg viewBox="0 0 24 24"><path d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-5.5L22 16z"/></svg>
                            </div>
                            <div class="timeline-stops">NON-STOP</div>
                        </div>

                        <div class="timeline-point">
                            <div class="timeline-time">${arrTimeStr}</div>
                            <div class="timeline-city"><strong>${arrCode}</strong> &middot; ${flight.destination}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">${formatDate(flight.arrivalTime)}</div>
                        </div>
                    </div>

                    <!-- Pricing & Action -->
                    <div class="flight-pricing-cta">
                        <div class="flight-price-caption">Starting from</div>
                        <div class="flight-price-amount">$${ecoPrice}</div>
                        <div style="font-size: 0.75rem; color: ${isSoldOut ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">
                            ${isSoldOut ? 'Sold Out' : `${totalSeatsLeft} seats left`}
                        </div>
                        <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; justify-content: flex-end;">
                            <button type="button" class="btn btn-sm btn-outline btn-view-flight">View Details</button>
                            <button type="button" class="btn btn-sm btn-accent btn-select-flight" 
                                    ${isCancelled || isSoldOut ? 'disabled' : ''}>
                                ${isCancelled ? 'Cancelled' : (isSoldOut ? 'Sold Out' : 'Select Flight')}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Cabin Class Pricing Tier Bar -->
                <div class="flight-card-tiers">
                    <div class="tier-pill ${selectedClass === 'ECONOMY' ? 'active' : ''}" data-class="ECONOMY">
                        <div class="tier-pill-name">Economy</div>
                        <div class="tier-pill-price">$${ecoPrice}</div>
                        <div class="tier-pill-seats">${ecoSeats} left</div>
                    </div>
                    <div class="tier-pill ${selectedClass === 'BUSINESS' ? 'active' : ''}" data-class="BUSINESS">
                        <div class="tier-pill-name">Business</div>
                        <div class="tier-pill-price">$${bizPrice}</div>
                        <div class="tier-pill-seats">${bizSeats} left</div>
                    </div>
                    <div class="tier-pill ${selectedClass === 'FIRST_CLASS' ? 'active' : ''}" data-class="FIRST_CLASS">
                        <div class="tier-pill-name">First Class</div>
                        <div class="tier-pill-price">$${firstPrice}</div>
                        <div class="tier-pill-seats">${firstSeats} left</div>
                    </div>
                </div>
            `;

            // Bind click handlers
            const viewBtn = cardEl.querySelector('.btn-view-flight');
            if (viewBtn && typeof options.onViewDetails === 'function') {
                viewBtn.addEventListener('click', () => options.onViewDetails(data));
            }

            const selectBtn = cardEl.querySelector('.btn-select-flight');
            if (selectBtn && typeof options.onSelect === 'function') {
                selectBtn.addEventListener('click', () => {
                    const activeTier = cardEl.querySelector('.tier-pill.active');
                    const chosenClass = activeTier ? activeTier.getAttribute('data-class') : selectedClass;
                    options.onSelect(data, chosenClass);
                });
            }

            // Interactive tier pill selector
            cardEl.querySelectorAll('.tier-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    cardEl.querySelectorAll('.tier-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    const newClass = pill.getAttribute('data-class');
                    let newPrice = ecoPrice;
                    if (newClass === 'BUSINESS') newPrice = bizPrice;
                    if (newClass === 'FIRST_CLASS') newPrice = firstPrice;
                    cardEl.querySelector('.flight-price-amount').innerText = `$${newPrice}`;
                });
            });

            return cardEl;
        }

        /**
         * Renders a connecting / multi-leg journey card (Phase 3)
         */
        static renderConnectingCard(journey, options = {}) {
            const selectedClass = options.selectedClass || 'ECONOMY';
            const seg1 = journey.segments[0];
            const seg2 = journey.segments[1];
            const layover = journey.layovers[0] || { airport: seg1.destination, durationFormatted: '2h', isWarning: false };

            const originCode = getAirportCode(journey.origin || seg1.source);
            const destCode = getAirportCode(journey.destination || seg2.destination);
            const hubCode = getAirportCode(layover.airport);

            const depTimeStr = formatTime(journey.departureTime || seg1.departureTime);
            const arrTimeStr = formatTime(journey.arrivalTime || seg2.arrivalTime);
            const depDateStr = formatDate(journey.departureTime || seg1.departureTime);
            const arrDateStr = formatDate(journey.arrivalTime || seg2.arrivalTime);

            const totalDurationStr = journey.totalDurationFormatted || '12h';
            const totalFlightTimeStr = journey.totalFlightTimeFormatted || '10h';

            const flightNumbers = `${seg1.flightNumber || 'AW-101'} + ${seg2.flightNumber || 'AW-102'}`;
            const aircraftModels = `${seg1.aircraftModel} / ${seg2.aircraftModel}`;

            const pricing = journey.pricing || {
                basePriceSubtotal: 800,
                multiLegDiscount: 40,
                economyFinalPrice: 760,
                businessFinalPrice: 1672,
                firstClassFinalPrice: 2660
            };

            const avail = journey.availability || {
                economySeats: 10,
                businessSeats: 2,
                firstClassSeats: 1,
                isAvailable: true,
                isLimitedAvailability: false
            };

            const isCancelled = journey.status === 'CANCELLED' || !journey.isSelectable;
            const isDelayed = journey.status === 'DELAYED';

            const cardEl = document.createElement('div');
            cardEl.className = `connecting-journey-card ${isCancelled ? 'journey-cancelled' : ''}`;
            cardEl.setAttribute('data-journey-id', journey.journeyId);

            cardEl.innerHTML = `
                <!-- Top Layover Summary Banner -->
                <div class="layover-banner">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="layover-badge ${layover.isWarning ? 'layover-warning' : ''}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            ${layover.durationFormatted} Layover in ${layover.airport} (${hubCode})
                        </span>
                        ${layover.isWarning ? '<span style="color: var(--danger); font-size: 0.72rem; font-weight: 700;">Fast Connection</span>' : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-muted);">
                        <span>Flight Time: ${totalFlightTimeStr}</span>
                        ${pricing.multiLegDiscount > 0 ? `<span class="multi-leg-discount-badge">-$${pricing.multiLegDiscount} Multi-Leg Discount</span>` : ''}
                    </div>
                </div>

                <div class="flight-card-main">
                    <!-- Multi-leg Airlines & Flight Info -->
                    <div class="flight-airline-info">
                        <div class="airline-badge-icon" style="background: linear-gradient(135deg, #0a1f44 0%, #d4af37 100%);">
                            <svg viewBox="0 0 24 24"><path d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-5.5L22 16z"/></svg>
                        </div>
                        <div>
                            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">Aerowing Connecting</div>
                            <div style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                                <span>${flightNumbers}</span>
                            </div>
                            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                                ${aircraftModels}
                            </div>
                            <div style="margin-top: 4px;">
                                <span class="badge badge-${(journey.status || 'SCHEDULED').toLowerCase()}">${journey.status || 'SCHEDULED'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Multi-stop Route Timeline -->
                    <div class="flight-timeline">
                        <div class="timeline-point">
                            <div class="timeline-time">${depTimeStr}</div>
                            <div class="timeline-city"><strong>${originCode}</strong> &middot; ${journey.origin || seg1.source}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">${depDateStr}</div>
                        </div>

                        <div class="timeline-track">
                            <div class="timeline-duration">${totalDurationStr}</div>
                            <div class="timeline-bar" style="background: linear-gradient(90deg, var(--border) 0%, var(--gold-500) 50%, var(--border) 100%);">
                                <span style="position: absolute; top: -18px; font-size: 0.7rem; font-weight: 700; color: var(--gold-600); background: var(--surface); padding: 0 4px; border-radius: 4px;">via ${hubCode}</span>
                                <svg viewBox="0 0 24 24"><path d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-5.5L22 16z"/></svg>
                            </div>
                            <div class="timeline-stops connecting">1 STOP (${hubCode})</div>
                        </div>

                        <div class="timeline-point">
                            <div class="timeline-time">${arrTimeStr}</div>
                            <div class="timeline-city"><strong>${destCode}</strong> &middot; ${journey.destination || seg2.destination}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">${arrDateStr}</div>
                        </div>
                    </div>

                    <!-- Combined Pricing & Action -->
                    <div class="flight-pricing-cta">
                        <div class="flight-price-caption">Combined journey from</div>
                        <div class="flight-price-amount">$${pricing.economyFinalPrice}</div>
                        <div style="font-size: 0.75rem; color: ${avail.isAvailable ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">
                            ${avail.isAvailable ? `${avail.economySeats} seats remaining` : 'Class Unavailable'}
                        </div>
                        <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; justify-content: flex-end;">
                            <button type="button" class="btn btn-sm btn-outline btn-view-journey">View Journey</button>
                            <button type="button" class="btn btn-sm btn-accent btn-select-journey" 
                                    ${isCancelled || !avail.isAvailable ? 'disabled' : ''}>
                                ${isCancelled ? 'Journey Cancelled' : (!avail.isAvailable ? 'Sold Out' : 'Select Journey')}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Cabin Class Pricing Tier Bar -->
                <div class="flight-card-tiers">
                    <div class="tier-pill ${selectedClass === 'ECONOMY' ? 'active' : ''}" data-class="ECONOMY">
                        <div class="tier-pill-name">Economy</div>
                        <div class="tier-pill-price">$${pricing.economyFinalPrice}</div>
                        <div class="tier-pill-seats">${avail.economySeats} left</div>
                    </div>
                    <div class="tier-pill ${selectedClass === 'BUSINESS' ? 'active' : ''}" data-class="BUSINESS">
                        <div class="tier-pill-name">Business</div>
                        <div class="tier-pill-price">$${pricing.businessFinalPrice}</div>
                        <div class="tier-pill-seats">${avail.businessSeats} left</div>
                    </div>
                    <div class="tier-pill ${selectedClass === 'FIRST_CLASS' ? 'active' : ''}" data-class="FIRST_CLASS">
                        <div class="tier-pill-name">First Class</div>
                        <div class="tier-pill-price">$${pricing.firstClassFinalPrice}</div>
                        <div class="tier-pill-seats">${avail.firstClassSeats} left</div>
                    </div>
                </div>
            `;

            // Click handlers
            const viewBtn = cardEl.querySelector('.btn-view-journey');
            if (viewBtn && typeof options.onViewDetails === 'function') {
                viewBtn.addEventListener('click', () => options.onViewDetails(journey));
            }

            const selectBtn = cardEl.querySelector('.btn-select-journey');
            if (selectBtn && typeof options.onSelect === 'function') {
                selectBtn.addEventListener('click', () => {
                    const activeTier = cardEl.querySelector('.tier-pill.active');
                    const chosenClass = activeTier ? activeTier.getAttribute('data-class') : selectedClass;
                    options.onSelect(journey, chosenClass);
                });
            }

            // Interactive tier pill selector
            cardEl.querySelectorAll('.tier-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    cardEl.querySelectorAll('.tier-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    const newClass = pill.getAttribute('data-class');
                    let newPrice = pricing.economyFinalPrice;
                    if (newClass === 'BUSINESS') newPrice = pricing.businessFinalPrice;
                    if (newClass === 'FIRST_CLASS') newPrice = pricing.firstClassFinalPrice;
                    cardEl.querySelector('.flight-price-amount').innerText = `$${newPrice}`;
                });
            });

            return cardEl;
        }
    }

    window.FlightCardRenderer = FlightCardRenderer;
    window.CLASS_MULTIPLIERS = CLASS_MULTIPLIERS;
})();
