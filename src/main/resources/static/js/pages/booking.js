/**
 * Aerowing Airlines — Booking Flow Controller (Phase 4)
 * Manages the 6-step passenger checkout journey:
 * 01 Journey Review -> 02 Passengers & Age Validation -> 03 Seat Selection Preparation ->
 * 04 Extras -> 05 Payment Processing & Retry -> 06 Booking Confirmation
 */

(function () {
    'use strict';

    // Application State
    let currentStep = 1;
    let selectedJourney = null;
    let userProfile = null;
    let passengerCount = 1;
    let passengerData = [];
    let selectedExtras = ['baggage', 'meal'];
    let currentPaymentMethod = 'CREDIT CARD';
    let failedBookingId = null;
    let confirmedBooking = null;
    let selectedSeatsString = '';
    let selectedSeatsBySegment = {};

    // DOM Elements Cache
    const elements = {
        stepperItems: document.querySelectorAll('.step-item'),
        stepPanels: {
            1: document.getElementById('step-panel-1'),
            2: document.getElementById('step-panel-2'),
            3: document.getElementById('step-panel-3'),
            4: document.getElementById('step-panel-4'),
            5: document.getElementById('step-panel-5'),
            6: document.getElementById('step-panel-6')
        },
        journeyReviewContainer: document.getElementById('journey-review-container'),
        passengersFormContainer: document.getElementById('passengers-form-container'),
        seatmapContainer: document.getElementById('seatmap-container'),
        confirmedReceiptContainer: document.getElementById('confirmed-receipt-container'),
        confirmedBookingRef: document.getElementById('confirmed-booking-ref'),
        btnCopyRef: document.getElementById('btn-copy-ref'),
        paymentFailureBox: document.getElementById('payment-failure-box'),
        paymentFailureDesc: document.getElementById('payment-failure-desc'),
        btnRetryPayment: document.getElementById('btn-retry-payment'),
        btnSubmitPayment: document.getElementById('btn-submit-payment'),
        btnChangePaymentMethod: document.getElementById('btn-change-payment-method'),
        contactName: document.getElementById('contact-name'),
        contactEmail: document.getElementById('contact-email'),
        contactPhone: document.getElementById('contact-phone'),
        summaryRouteBox: document.getElementById('summary-route-box'),
        summaryPassCount: document.getElementById('summary-pass-count'),
        summaryBaseFare: document.getElementById('summary-base-fare'),
        summaryCabinLabel: document.getElementById('summary-cabin-label'),
        summaryClassMultiplier: document.getElementById('summary-class-multiplier'),
        summaryLoyaltyRow: document.getElementById('summary-loyalty-row'),
        summaryLoyaltyTier: document.getElementById('summary-loyalty-tier'),
        summaryLoyaltyDiscount: document.getElementById('summary-loyalty-discount'),
        summaryMultilegRow: document.getElementById('summary-multileg-row'),
        summaryMultilegDiscount: document.getElementById('summary-multileg-discount'),
        summarySeatsRow: document.getElementById('summary-seats-row'),
        summarySeatsVal: document.getElementById('summary-seats-val'),
        summaryTotalPrice: document.getElementById('summary-total-price'),
        mobileBarTotal: document.getElementById('mobile-bar-total'),
        mobileBarActionBtn: document.getElementById('mobile-bar-action-btn')
    };

    // Navigation & Action Buttons
    const buttons = {
        gotoStep2: document.getElementById('btn-goto-step-2'),
        backToStep1: document.getElementById('btn-back-to-step-1'),
        gotoStep3: document.getElementById('btn-goto-step-3'),
        backToStep2: document.getElementById('btn-back-to-step-2'),
        gotoStep4: document.getElementById('btn-goto-step-4'),
        backToStep3: document.getElementById('btn-back-to-step-3'),
        gotoStep5: document.getElementById('btn-goto-step-5'),
        backToStep4: document.getElementById('btn-back-to-step-4'),
        downloadTicket: document.getElementById('btn-download-ticket')
    };

    /**
     * Entry Point Initialization
     */
    async function init() {
        // Enforce Authentication
        if (!window.auth || !window.auth.isAuthenticated()) {
            if (window.toast) {
                window.toast.info('Please log in to your Aerowing account to proceed with booking.');
            }
            const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
            setTimeout(() => {
                window.location.href = `/login.html?redirect=${currentUrl}`;
            }, 800);
            return;
        }

        // Fetch User Profile for Contact Pre-population and Loyalty Discount
        try {
            userProfile = await window.auth.getProfile();
            if (userProfile) {
                if (elements.contactName) elements.contactName.value = userProfile.name || '';
                if (elements.contactEmail) elements.contactEmail.value = userProfile.email || '';
            }
        } catch (err) {
            console.warn('Could not load user profile:', err);
        }

        // Load Journey Data from Session Storage or URL Params
        await loadJourneyData();

        if (!selectedJourney) {
            if (window.toast) {
                window.toast.warning('No flight selected. Please choose a flight to begin booking.');
            }
            setTimeout(() => {
                window.location.href = '/search.html';
            }, 1000);
            return;
        }

        // Calculate passenger count from journey metadata
        calculatePassengerCount();

        // Bind DOM Event Handlers
        bindEvents();

        // Render Step 1 & Sticky Summary
        renderStep1JourneyReview();
        renderSummarySidebar();

        // Setup live credit card formatting & reflection
        setupCreditCardLivePreview();

        // Check if query parameter specifies step
        const urlParams = new URLSearchParams(window.location.search);
        const targetStep = parseInt(urlParams.get('step'), 10);
        if (targetStep && targetStep >= 1 && targetStep <= 5) {
            goToStep(targetStep);
        }
    }

    /**
     * Load journey from sessionStorage or fetch via API if fallback URL parameter given
     */
    async function loadJourneyData() {
        const stored = sessionStorage.getItem('aerowing_selected_journey');
        if (stored) {
            try {
                selectedJourney = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse aerowing_selected_journey:', e);
            }
        }

        // Fallback to legacy single flight storage if present
        if (!selectedJourney) {
            const legacyStored = sessionStorage.getItem('aerowing_selected_flight');
            if (legacyStored) {
                try {
                    const legacy = JSON.parse(legacyStored);
                    selectedJourney = synthesizeJourneyFromFlight(legacy);
                } catch (e) {
                    console.error('Failed to parse aerowing_selected_flight:', e);
                }
            }
        }

        // Fallback to URL query parameter flightId / journeyId
        if (!selectedJourney) {
            const urlParams = new URLSearchParams(window.location.search);
            const flightId = urlParams.get('flightId');
            const chosenClass = urlParams.get('class') || 'ECONOMY';
            if (flightId && window.api) {
                try {
                    const flight = await window.api.get(`/api/flights/${flightId}`);
                    if (flight) {
                        flight.seatClass = chosenClass;
                        selectedJourney = synthesizeJourneyFromFlight(flight);
                    }
                } catch (err) {
                    console.error('Failed to fetch flight from API:', err);
                }
            }
        }
    }

    /**
     * Synthesize a unified JourneyDTO-like object from a legacy Flight object
     */
    function synthesizeJourneyFromFlight(flight) {
        const seatClass = flight.seatClass || 'ECONOMY';
        const mult = seatClass === 'BUSINESS' ? 2.2 : (seatClass === 'FIRST_CLASS' ? 3.5 : 1.0);
        const finalPrice = Math.round((flight.basePrice || 100) * mult);

        return {
            journeyId: `DJ-${flight.id || flight.flightId || 4}`,
            journeyType: 'DIRECT',
            stops: 0,
            origin: flight.source || 'DAC',
            destination: flight.destination || 'DXB',
            departureTime: flight.departureTime || new Date(Date.now() + 86400000).toISOString(),
            arrivalTime: flight.arrivalTime || new Date(Date.now() + 104400000).toISOString(),
            totalDurationFormatted: '5h 00m',
            totalFlightTimeFormatted: '5h 00m',
            totalLayoverTimeFormatted: null,
            seatClass: seatClass,
            finalPrice: finalPrice,
            basePrice: flight.basePrice || 100,
            segments: [
                {
                    segmentOrder: 1,
                    flightId: flight.id || flight.flightId || 4,
                    flightNumber: flight.flightNumber || `AW-${flight.id || flight.flightId || 4}`,
                    origin: flight.source || 'DAC',
                    destination: flight.destination || 'DXB',
                    departureTime: flight.departureTime || new Date(Date.now() + 86400000).toISOString(),
                    arrivalTime: flight.arrivalTime || new Date(Date.now() + 104400000).toISOString(),
                    durationFormatted: '5h 00m',
                    aircraftModel: flight.aircraft ? flight.aircraft.model : 'Boeing 737-800',
                    economySeatsLeft: flight.availableEconomySeats ?? 100,
                    businessSeatsLeft: flight.availableBusinessSeats ?? 20,
                    firstClassSeatsLeft: flight.availableFirstClassSeats ?? 8
                }
            ],
            layovers: [],
            passengers: { adults: 1, children: 0, infants: 0 }
        };
    }

    /**
     * Compute total passenger count from search metadata
     */
    function calculatePassengerCount() {
        if (selectedJourney && selectedJourney.passengers) {
            const p = selectedJourney.passengers;
            passengerCount = (p.adults || 1) + (p.children || 0) + (p.infants || 0);
        } else {
            passengerCount = 1;
        }
        if (elements.summaryPassCount) {
            elements.summaryPassCount.textContent = passengerCount;
        }
    }

    /**
     * Calculate financial totals including loyalty discount
     */
    function calculateTotals() {
        if (!selectedJourney) return { base: 0, multiplier: 1.0, subtotal: 0, discount: 0, total: 0 };

        const chosenClass = selectedJourney.seatClass || 'ECONOMY';
        let multiplier = 1.0;
        if (chosenClass === 'BUSINESS') multiplier = 2.2;
        if (chosenClass === 'FIRST_CLASS') multiplier = 3.5;

        // Multi-leg discount (5% built into connecting pricing)
        const isConnecting = selectedJourney.journeyType === 'CONNECTING';

        const baseUnit = selectedJourney.basePrice || 100;
        const subtotal = Math.round(baseUnit * multiplier * passengerCount);

        // Loyalty Tier Discount from backend rule: GOLD = 5%, PLATINUM = 10%
        let tierDiscountPct = 0;
        const tier = (userProfile && userProfile.loyaltyTier) ? userProfile.loyaltyTier.toUpperCase() : 'SILVER';
        if (tier === 'GOLD') tierDiscountPct = 0.05;
        if (tier === 'PLATINUM') tierDiscountPct = 0.10;

        const loyaltyDiscount = Math.round(subtotal * tierDiscountPct);
        const multilegDiscount = isConnecting ? Math.round(subtotal * 0.05) : 0;
        const total = Math.max(0, subtotal - loyaltyDiscount - multilegDiscount);

        return {
            baseUnit,
            multiplier,
            subtotal,
            tier,
            tierDiscountPct,
            loyaltyDiscount,
            isConnecting,
            multilegDiscount,
            total
        };
    }

    /**
     * Render Sticky Summary Sidebar and Mobile Bar
     */
    function renderSummarySidebar() {
        if (!selectedJourney) return;

        const totals = calculateTotals();
        const firstSeg = selectedJourney.segments?.[0] || {};
        const lastSeg = selectedJourney.segments?.[selectedJourney.segments.length - 1] || firstSeg;

        // Route box
        if (elements.summaryRouteBox) {
            const depDate = new Date(selectedJourney.departureTime).toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric'
            });

            elements.summaryRouteBox.innerHTML = `
                <div style="background: var(--surface-subtle); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 700; font-size: 1.1rem;">${selectedJourney.origin} &rarr; ${selectedJourney.destination}</span>
                        <span class="brand-badge" style="font-size: 0.72rem;">${selectedJourney.stops === 0 ? 'Direct' : selectedJourney.stops + ' Stop'}</span>
                    </div>
                    <div style="font-size: 0.82rem; color: var(--text-secondary);">
                        ${depDate} &middot; ${selectedJourney.totalDurationFormatted || 'Direct'}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                        Flight ${firstSeg.flightNumber || 'AW-Flight'} &middot; ${firstSeg.aircraftModel || 'Aviation Fleet'}
                    </div>
                </div>
            `;
        }

        // Breakdown items
        if (elements.summaryPassCount) elements.summaryPassCount.textContent = passengerCount;
        if (elements.summaryBaseFare) elements.summaryBaseFare.textContent = `$${totals.baseUnit * passengerCount}`;
        if (elements.summaryCabinLabel) elements.summaryCabinLabel.textContent = (selectedJourney.seatClass || 'ECONOMY').replace('_', ' ');
        if (elements.summaryClassMultiplier) elements.summaryClassMultiplier.textContent = `\u00D7 ${totals.multiplier}`;

        // Loyalty Tier row
        if (elements.summaryLoyaltyRow) {
            if (totals.tierDiscountPct > 0) {
                elements.summaryLoyaltyRow.style.display = 'flex';
                elements.summaryLoyaltyTier.textContent = `${totals.tier} (${Math.round(totals.tierDiscountPct * 100)}%)`;
                elements.summaryLoyaltyDiscount.textContent = `-$${totals.loyaltyDiscount}`;
            } else {
                elements.summaryLoyaltyRow.style.display = 'none';
            }
        }

        // Multi-leg row
        if (elements.summaryMultilegRow) {
            if (totals.isConnecting) {
                elements.summaryMultilegRow.style.display = 'flex';
                elements.summaryMultilegDiscount.textContent = `-$${totals.multilegDiscount}`;
            } else {
                elements.summaryMultilegRow.style.display = 'none';
            }
        }

        // Total
        if (elements.summaryTotalPrice) elements.summaryTotalPrice.textContent = `$${totals.total}`;
        if (elements.mobileBarTotal) elements.mobileBarTotal.textContent = `$${totals.total}`;
    }

    /**
     * STEP 1: Render Journey Review Content
     */
    function renderStep1JourneyReview() {
        if (!elements.journeyReviewContainer || !selectedJourney) return;

        const depDate = new Date(selectedJourney.departureTime).toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
        });
        const depTime = new Date(selectedJourney.departureTime).toLocaleTimeString(undefined, {
            hour: '2-digit', minute: '2-digit'
        });
        const arrTime = new Date(selectedJourney.arrivalTime).toLocaleTimeString(undefined, {
            hour: '2-digit', minute: '2-digit'
        });

        const chosenClass = (selectedJourney.seatClass || 'ECONOMY').replace('_', ' ');
        const isConnecting = selectedJourney.journeyType === 'CONNECTING';

        let segmentsHtml = '';
        if (selectedJourney.segments && selectedJourney.segments.length > 0) {
            segmentsHtml = selectedJourney.segments.map((seg, idx) => {
                const segDep = new Date(seg.departureTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                const segArr = new Date(seg.arrivalTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                const layover = selectedJourney.layovers?.[idx];

                return `
                    <div style="background: var(--surface-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="brand-badge">Segment ${idx + 1} of ${selectedJourney.segments.length}</span>
                                <strong style="font-size: 1rem; color: var(--text-primary);">${seg.flightNumber || 'AW-Flight'}</strong>
                            </div>
                            <span style="font-size: 0.82rem; color: var(--text-muted);">${seg.aircraftModel || 'Commercial Aircraft'}</span>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem; text-align: center;">
                            <div style="text-align: left;">
                                <div style="font-size: 1.25rem; font-weight: 700; font-family: var(--font-heading);">${segDep}</div>
                                <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);">${seg.origin}</div>
                            </div>

                            <div style="display: flex; flex-direction: column; align-items: center;">
                                <span style="font-size: 0.75rem; color: var(--text-muted);">${seg.durationFormatted || ''}</span>
                                <div style="display: flex; align-items: center; gap: 4px; width: 100px; margin: 4px 0;">
                                    <div style="flex: 1; height: 2px; background: var(--border);"></div>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--aviation-light)"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                                    <div style="flex: 1; height: 2px; background: var(--border);"></div>
                                </div>
                                <span style="font-size: 0.72rem; color: var(--success); font-weight: 600;">Non-stop Segment</span>
                            </div>

                            <div style="text-align: right;">
                                <div style="font-size: 1.25rem; font-weight: 700; font-family: var(--font-heading);">${segArr}</div>
                                <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);">${seg.destination}</div>
                            </div>
                        </div>

                        ${layover ? `
                            <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(212, 175, 55, 0.1); border-left: 3px solid var(--gold-500); border-radius: 4px; display: flex; align-items: center; gap: 8px; font-size: 0.82rem;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--gold-600);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span>Transit connection at <strong>${layover.airport}</strong>: <strong>${layover.durationFormatted}</strong> layover &middot; Self-transfer not required</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }

        elements.journeyReviewContainer.innerHTML = `
            <div class="card" style="padding: 1.75rem; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light);">
                    <div>
                        <div style="font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Outbound Flight &middot; ${depDate}</div>
                        <h3 style="font-size: 1.6rem; margin: 0.25rem 0 0; color: var(--text-primary);">
                            ${selectedJourney.origin} &rarr; ${selectedJourney.destination}
                        </h3>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="brand-badge" style="font-size: 0.82rem; background: rgba(46, 134, 171, 0.12); border-color: rgba(46, 134, 171, 0.3); color: var(--aviation-light);">
                            ${chosenClass}
                        </span>
                        <span class="brand-badge" style="font-size: 0.82rem;">
                            ${selectedJourney.stops === 0 ? 'Direct Journey' : selectedJourney.stops + ' Transit Stop'}
                        </span>
                    </div>
                </div>

                <!-- Segments Breakdown -->
                <div>
                    ${segmentsHtml}
                </div>

                <!-- Cabin Features Included -->
                <div style="background: var(--surface-subtle); border-radius: var(--radius-md); padding: 1rem; margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 1.5rem; font-size: 0.82rem; color: var(--text-secondary);">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--success);"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>20kg Included Baggage</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--success);"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Complimentary Dining</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--success);"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Earn Aerowing Frequent Flyer Miles</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * STEP 2: Render Passenger Detail Forms based on passengerCount
     */
    function renderStep2PassengerForms() {
        if (!elements.passengersFormContainer) return;

        let html = '';
        for (let i = 1; i <= passengerCount; i++) {
            const isPrimary = i === 1;
            const existing = passengerData[i - 1] || {};

            // Pre-fill primary passenger from authenticated user profile
            const firstName = existing.firstName || (isPrimary && userProfile?.name ? userProfile.name.split(' ')[0] : '');
            const lastName = existing.lastName || (isPrimary && userProfile?.name ? userProfile.name.split(' ').slice(1).join(' ') : '');

            html += `
                <div class="card passenger-form-card" data-passenger-index="${i}" style="padding: 1.75rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-light);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--aviation-dark); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
                                ${i}
                            </div>
                            <h4 style="margin: 0; font-size: 1.15rem;">Passenger ${i} ${isPrimary ? '(Lead Traveler)' : ''}</h4>
                        </div>
                        <div id="passenger-${i}-age-badge">
                            <span class="brand-badge" style="font-size: 0.75rem;">Age Pending</span>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="pass-${i}-title">Title <span style="color: var(--danger);">*</span></label>
                            <select class="form-select" id="pass-${i}-title" required>
                                <option value="MR" ${existing.title === 'MR' ? 'selected' : ''}>Mr</option>
                                <option value="MS" ${existing.title === 'MS' ? 'selected' : ''}>Ms</option>
                                <option value="MRS" ${existing.title === 'MRS' ? 'selected' : ''}>Mrs</option>
                                <option value="DR" ${existing.title === 'DR' ? 'selected' : ''}>Dr</option>
                            </select>
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="pass-${i}-firstname">First / Given Name <span style="color: var(--danger);">*</span></label>
                            <input type="text" class="form-control" id="pass-${i}-firstname" value="${firstName}" placeholder="As shown on passport" required>
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="pass-${i}-lastname">Last / Family Name <span style="color: var(--danger);">*</span></label>
                            <input type="text" class="form-control" id="pass-${i}-lastname" value="${lastName}" placeholder="As shown on passport" required>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="pass-${i}-dob">Date of Birth <span style="color: var(--danger);">*</span></label>
                            <input type="date" class="form-control pass-dob-input" id="pass-${i}-dob" data-index="${i}" value="${existing.dob || ''}" max="${new Date().toISOString().split('T')[0]}" required>
                            <div class="form-hint" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">Used for mandatory aviation age category validation.</div>
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="pass-${i}-gender">Gender <span style="color: var(--danger);">*</span></label>
                            <select class="form-select" id="pass-${i}-gender" required>
                                <option value="MALE" ${existing.gender === 'MALE' ? 'selected' : ''}>Male</option>
                                <option value="FEMALE" ${existing.gender === 'FEMALE' ? 'selected' : ''}>Female</option>
                                <option value="OTHER" ${existing.gender === 'OTHER' ? 'selected' : ''}>Other / Undisclosed</option>
                            </select>
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="pass-${i}-nationality">Nationality <span style="color: var(--danger);">*</span></label>
                            <select class="form-select" id="pass-${i}-nationality" required>
                                <option value="USA" ${existing.nationality === 'USA' ? 'selected' : ''}>United States</option>
                                <option value="BGD" ${existing.nationality === 'BGD' ? 'selected' : (!existing.nationality ? 'selected' : '')}>Bangladesh</option>
                                <option value="GBR" ${existing.nationality === 'GBR' ? 'selected' : ''}>United Kingdom</option>
                                <option value="UAE" ${existing.nationality === 'UAE' ? 'selected' : ''}>United Arab Emirates</option>
                                <option value="CAN" ${existing.nationality === 'CAN' ? 'selected' : ''}>Canada</option>
                                <option value="AUS" ${existing.nationality === 'AUS' ? 'selected' : ''}>Australia</option>
                                <option value="SGP" ${existing.nationality === 'SGP' ? 'selected' : ''}>Singapore</option>
                                <option value="QAT" ${existing.nationality === 'QAT' ? 'selected' : ''}>Qatar</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="pass-${i}-passport">Passport / National ID <span style="color: var(--danger);">*</span></label>
                            <input type="text" class="form-control" id="pass-${i}-passport" value="${existing.passport || ''}" placeholder="e.g. A12345678" minlength="6" required>
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="pass-${i}-passport-exp">Passport Expiry Date <span style="color: var(--danger);">*</span></label>
                            <input type="date" class="form-control" id="pass-${i}-passport-exp" value="${existing.passportExp || ''}" min="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                    </div>
                </div>
            `;
        }

        elements.passengersFormContainer.innerHTML = html;

        // Attach Real-time Age Calculation Listener to DOB inputs
        document.querySelectorAll('.pass-dob-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                updatePassengerAgeBadge(idx, e.target.value);
            });
            // Run initial check if prefilled
            if (input.value) {
                updatePassengerAgeBadge(parseInt(input.dataset.index, 10), input.value);
            }
        });
    }

    /**
     * Compute Age in Years from DOB and update visual badge
     */
    function calculateAge(dobString) {
        if (!dobString) return null;
        const dob = new Date(dobString);
        if (isNaN(dob.getTime())) return null;

        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    }

    /**
     * Update Passenger Age Category Badge
     */
    function updatePassengerAgeBadge(index, dobValue) {
        const badgeEl = document.getElementById(`passenger-${index}-age-badge`);
        if (!badgeEl) return;

        const age = calculateAge(dobValue);
        if (age === null || age < 0) {
            badgeEl.innerHTML = `<span class="brand-badge" style="font-size: 0.75rem;">Age Pending</span>`;
            return;
        }

        if (age >= 18) {
            badgeEl.innerHTML = `<span class="brand-badge" style="background: rgba(16, 185, 129, 0.12); color: var(--success); border-color: rgba(16, 185, 129, 0.3); font-size: 0.75rem;">Adult (${age} yrs)</span>`;
        } else if (age >= 2) {
            badgeEl.innerHTML = `<span class="brand-badge" style="background: rgba(212, 175, 55, 0.15); color: var(--gold-600); border-color: rgba(212, 175, 55, 0.35); font-size: 0.75rem;">Child (${age} yrs)</span>`;
        } else {
            badgeEl.innerHTML = `<span class="brand-badge" style="background: rgba(46, 134, 171, 0.15); color: var(--aviation-light); border-color: rgba(46, 134, 171, 0.35); font-size: 0.75rem;">Infant (${age} yrs)</span>`;
        }
    }

    /**
     * Validate Step 2 Passenger details and Under-18 Accompaniment Rule
     */
    function validatePassengerDetails() {
        // 1. Primary contact validation
        const cName = elements.contactName?.value?.trim();
        const cEmail = elements.contactEmail?.value?.trim();
        const cPhone = elements.contactPhone?.value?.trim();

        if (!cName || !cEmail || !cPhone) {
            if (window.toast) window.toast.warning('Please complete all contact details before proceeding.');
            return false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(cEmail)) {
            if (window.toast) window.toast.warning('Please provide a valid contact email address.');
            return false;
        }

        // 2. Validate individual passengers & harvest data
        const collected = [];
        let hasAdult = false;
        let hasMinor = false;
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 1; i <= passengerCount; i++) {
            const title = document.getElementById(`pass-${i}-title`)?.value;
            const firstName = document.getElementById(`pass-${i}-firstname`)?.value?.trim();
            const lastName = document.getElementById(`pass-${i}-lastname`)?.value?.trim();
            const dob = document.getElementById(`pass-${i}-dob`)?.value;
            const gender = document.getElementById(`pass-${i}-gender`)?.value;
            const nationality = document.getElementById(`pass-${i}-nationality`)?.value;
            const passport = document.getElementById(`pass-${i}-passport`)?.value?.trim();
            const passportExp = document.getElementById(`pass-${i}-passport-exp`)?.value;

            if (!firstName || !lastName || !dob || !passport || !passportExp) {
                if (window.toast) window.toast.warning(`Please complete all required fields for Passenger ${i}.`);
                return false;
            }

            if (passportExp <= todayStr) {
                if (window.toast) window.toast.warning(`Passenger ${i}'s passport has expired or expires today. Must be valid.`);
                return false;
            }

            const age = calculateAge(dob);
            if (age === null || age < 0) {
                if (window.toast) window.toast.warning(`Please provide a valid date of birth for Passenger ${i}.`);
                return false;
            }

            if (age >= 18) {
                hasAdult = true;
            } else {
                hasMinor = true;
            }

            collected.push({
                index: i,
                title,
                firstName,
                lastName,
                fullName: `${title} ${firstName} ${lastName}`,
                dob,
                age,
                gender,
                nationality,
                passport,
                passportExp
            });
        }

        // 3. MANDATORY UNDER-18 ACCOMPANIMENT VALIDATION
        // If there is ANY minor passenger (< 18), there MUST be at least ONE adult passenger (>= 18)
        if (hasMinor && !hasAdult) {
            if (window.toast) {
                window.toast.error(
                    'Unaccompanied Minors Policy: Passengers under 18 years old must travel with at least one adult passenger (aged 18 or above).',
                    'Age Validation Block'
                );
            }
            return false;
        }

        passengerData = collected;
        return true;
    }

    /**
     * STEP 3: Render Interactive Seat Map Component (Phase 5)
     */
    function renderStep3SeatSelection() {
        if (!elements.seatmapContainer || !selectedJourney) return;

        const chosenClass = selectedJourney.seatClass || 'ECONOMY';
        const passengersToPass = passengerData.length > 0 ? passengerData : [
            { index: 1, fullName: userProfile?.name || 'Lead Traveler', type: 'ADULT' }
        ];

        if (window.SeatMapComponent) {
            new window.SeatMapComponent(elements.seatmapContainer, {
                segments: selectedJourney.segments && selectedJourney.segments.length > 0 ? selectedJourney.segments : [
                    {
                        flightId: selectedJourney.flightId || 4,
                        origin: selectedJourney.origin || 'DAC',
                        destination: selectedJourney.destination || 'DXB',
                        flightNumber: 'AW-Flight',
                        aircraftModel: selectedJourney.aircraftModel || 'Boeing 737-800'
                    }
                ],
                seatClass: chosenClass,
                passengers: passengersToPass,
                onSelectionChange: (summary) => {
                    selectedSeatsBySegment = summary.assignments;
                    const seg0 = summary.assignments[0] || {};
                    const seats = Object.values(seg0).filter(Boolean);
                    selectedSeatsString = seats.join(', ');
                    updateAssignedSeatsSidebar(seats);
                }
            });
        }
    }

    /**
     * Update Assigned Seats in Sticky Sidebar
     */
    function updateAssignedSeatsSidebar(seats) {
        if (elements.summarySeatsRow && elements.summarySeatsVal) {
            if (seats && seats.length > 0) {
                elements.summarySeatsRow.style.display = 'flex';
                elements.summarySeatsVal.textContent = seats.join(', ');
            } else {
                elements.summarySeatsRow.style.display = 'none';
                elements.summarySeatsVal.textContent = 'None';
            }
        }
    }

    /**
     * STEP 4: Setup Extras Listeners
     */
    function setupExtras() {
        document.querySelectorAll('.extra-card').forEach(card => {
            card.addEventListener('click', () => {
                const extraKey = card.dataset.extra;
                if (card.classList.contains('selected')) {
                    card.classList.remove('selected');
                    selectedExtras = selectedExtras.filter(e => e !== extraKey);
                } else {
                    card.classList.add('selected');
                    if (!selectedExtras.includes(extraKey)) {
                        selectedExtras.push(extraKey);
                    }
                }
            });
        });
    }

    /**
     * STEP 5: Payment Processing Logic
     */
    function setupCreditCardLivePreview() {
        const nameInput = document.getElementById('card-holder-name');
        const numInput = document.getElementById('card-number');
        const expInput = document.getElementById('card-expiry');

        const prevName = document.getElementById('card-preview-name');
        const prevNum = document.getElementById('card-preview-number');
        const prevExp = document.getElementById('card-preview-expiry');

        if (nameInput && prevName) {
            nameInput.addEventListener('input', (e) => {
                prevName.textContent = e.target.value.toUpperCase() || 'PASSENGER NAME';
            });
        }

        if (numInput && prevNum) {
            numInput.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '').slice(0, 16);
                let formatted = v.replace(/(.{4})/g, '$1 ').trim();
                e.target.value = formatted;

                if (v.length > 0) {
                    let masked = v.padEnd(16, '\u2022');
                    prevNum.textContent = masked.replace(/(.{4})/g, '$1 ').trim();
                } else {
                    prevNum.textContent = '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 4242';
                }
            });
        }

        if (expInput && prevExp) {
            expInput.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                if (v.length >= 3) {
                    v = v.slice(0, 2) + '/' + v.slice(2);
                }
                e.target.value = v;
                prevExp.textContent = v || '12/28';
            });
        }

        // Method tabs switching
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.payment-method-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');

                const method = btn.dataset.method;
                currentPaymentMethod = method;

                const formCard = document.getElementById('payment-form-card');
                const formWallet = document.getElementById('payment-form-wallet');
                const formBank = document.getElementById('payment-form-netbanking');

                if (formCard) formCard.style.display = method === 'CREDIT CARD' ? 'block' : 'none';
                if (formWallet) formWallet.style.display = method === 'WALLET' ? 'block' : 'none';
                if (formBank) formBank.style.display = method === 'NET BANKING' ? 'block' : 'none';
            });
        });
    }

    /**
     * Submit Booking to Backend: POST /api/bookings
     */
    async function submitPayment() {
        if (!selectedJourney) return;

        // Extract primary flight ID from selected journey segments
        const flightId = selectedJourney.segments?.[0]?.flightId || 4;
        const seatClass = selectedJourney.seatClass || 'ECONOMY';

        // Payment Reference resolution based on selected tab
        let paymentRef = '4111222233334444';
        if (currentPaymentMethod === 'CREDIT CARD') {
            const cardNum = document.getElementById('card-number')?.value?.replace(/\s/g, '');
            if (!cardNum || cardNum.length < 4) {
                if (window.toast) window.toast.warning('Please enter a valid card number (or "0000" to test failure).');
                return;
            }
            paymentRef = cardNum;
        } else if (currentPaymentMethod === 'WALLET') {
            paymentRef = document.getElementById('wallet-id')?.value?.trim() || 'wallet-user-aerowing';
        } else if (currentPaymentMethod === 'NET BANKING') {
            paymentRef = document.getElementById('bank-acc-id')?.value?.trim() || 'bank-ref-100234';
        }

        const payload = {
            flightId: flightId,
            seatClass: seatClass,
            numberOfSeats: passengerCount,
            seatNumbers: selectedSeatsString,
            paymentMethod: currentPaymentMethod,
            paymentRef: paymentRef
        };

        // Guard against double submission
        setPaymentButtonLoading(true);

        try {
            const response = await window.api.post('/api/bookings', payload);

            // Check if backend returned a string indicating payment failure
            if (typeof response === 'string' && response.includes('Payment failed')) {
                handlePaymentFailure(response);
            } else if (typeof response === 'string') {
                // Other rejection (e.g. "Seat 12A is no longer available" or "Not enough seats available")
                if (window.toast) window.toast.error(response, 'Booking Rejected');
            } else if (response && response.id) {
                // Success: full booking object returned
                handlePaymentSuccess(response);
            } else {
                throw new Error('Unexpected response format from booking gateway');
            }
        } catch (err) {
            console.error('Booking submission error:', err);
            if (window.toast) {
                window.toast.error(err.message || 'Payment processing failed. Please verify information and try again.');
            }
        } finally {
            setPaymentButtonLoading(false);
        }
    }

    /**
     * Retry Payment for a failed booking: POST /api/bookings/{id}/retry-payment
     */
    async function retryFailedPayment() {
        if (!failedBookingId) {
            if (window.toast) window.toast.error('No pending booking ID available to retry.');
            return;
        }

        let newRef = '4111222233334444';
        const cardNum = document.getElementById('card-number')?.value?.replace(/\s/g, '');
        if (cardNum && cardNum !== '0000') {
            newRef = cardNum;
        } else {
            // Auto-fill valid card number for retry test convenience
            const cardInput = document.getElementById('card-number');
            if (cardInput) cardInput.value = '4111 2222 3333 4444';
            newRef = '4111222233334444';
        }

        const flightId = selectedJourney.segments?.[0]?.flightId || 4;
        const seatClass = selectedJourney.seatClass || 'ECONOMY';

        const payload = {
            flightId: flightId,
            seatClass: seatClass,
            numberOfSeats: passengerCount,
            seatNumbers: selectedSeatsString,
            paymentMethod: currentPaymentMethod,
            paymentRef: newRef
        };

        if (elements.btnRetryPayment) {
            elements.btnRetryPayment.disabled = true;
            elements.btnRetryPayment.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" style="width: 14px; height: 14px; border-width: 2px; margin-right: 6px; display: inline-block;"></span>
                Retrying Transaction...
            `;
        }

        try {
            const response = await window.api.post(`/api/bookings/${failedBookingId}/retry-payment`, payload);

            if (typeof response === 'string' && response.includes('Payment failed')) {
                if (window.toast) window.toast.error('Payment retry declined again. Please provide a different card number.');
            } else if (typeof response === 'string') {
                if (window.toast) window.toast.error(response, 'Retry Rejected');
            } else if (response && response.id) {
                // Succeeded upon retry!
                if (elements.paymentFailureBox) elements.paymentFailureBox.style.display = 'none';
                handlePaymentSuccess(response);
            }
        } catch (err) {
            console.error('Payment retry error:', err);
            if (window.toast) window.toast.error(err.message || 'Payment retry encountered an unexpected error.');
        } finally {
            if (elements.btnRetryPayment) {
                elements.btnRetryPayment.disabled = false;
                elements.btnRetryPayment.textContent = 'Retry Payment';
            }
        }
    }

    /**
     * Handle Failure Response
     */
    function handlePaymentFailure(responseString) {
        // Extract booking ID: "Payment failed. You can retry payment for booking #12"
        const match = responseString.match(/booking #(\d+)/i);
        if (match && match[1]) {
            failedBookingId = parseInt(match[1], 10);
        }

        if (elements.paymentFailureBox) {
            elements.paymentFailureBox.style.display = 'block';
            if (elements.paymentFailureDesc) {
                elements.paymentFailureDesc.innerHTML = `
                    Your transaction was declined by the simulated card issuer. 
                    Your booking reference <strong>#${failedBookingId || 'PENDING'}</strong> has been created in 
                    <span class="brand-badge" style="background: rgba(239, 68, 68, 0.15); color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">PAYMENT_FAILED</span> status.
                    Seats are held pending valid payment. You can retry with a different card number.
                `;
            }
            elements.paymentFailureBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        if (window.toast) {
            window.toast.error(
                'Card transaction was declined (card "0000"). You can retry with another card number.',
                'Payment Declined'
            );
        }
    }

    /**
     * Handle Success Response
     */
    function handlePaymentSuccess(booking) {
        confirmedBooking = booking;
        // Hide failure box if visible
        if (elements.paymentFailureBox) elements.paymentFailureBox.style.display = 'none';

        // Clear stored journey to prevent duplicate checkout
        sessionStorage.removeItem('aerowing_selected_journey');
        sessionStorage.removeItem('aerowing_selected_flight');

        if (window.toast) {
            window.toast.success('Your flight booking has been confirmed!', 'Reservation Issued');
        }

        // Navigate to confirmation step
        goToStep(6);
        renderStep6Confirmation();
    }

    /**
     * STEP 6: Render Confirmation Screen
     */
    function renderStep6Confirmation() {
        if (!confirmedBooking) return;

        const bookingRefCode = `AW-BK-${confirmedBooking.id.toString().padStart(4, '0')}`;
        if (elements.confirmedBookingRef) {
            elements.confirmedBookingRef.textContent = bookingRefCode;
        }

        // Copy button listener
        if (elements.btnCopyRef) {
            elements.btnCopyRef.onclick = () => {
                navigator.clipboard.writeText(bookingRefCode).then(() => {
                    if (window.toast) window.toast.info(`Booking Reference ${bookingRefCode} copied to clipboard!`);
                }).catch(() => {
                    if (window.toast) window.toast.info(`Reference: ${bookingRefCode}`);
                });
            };
        }

        // Render Comprehensive Receipt
        if (elements.confirmedReceiptContainer) {
            const flight = confirmedBooking.flight || {};
            const user = confirmedBooking.user || userProfile || {};
            const depDate = new Date(flight.departureTime || selectedJourney?.departureTime || Date.now()).toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
            });
            const depTime = new Date(flight.departureTime || selectedJourney?.departureTime || Date.now()).toLocaleTimeString(undefined, {
                hour: '2-digit', minute: '2-digit'
            });
            const arrTime = new Date(flight.arrivalTime || selectedJourney?.arrivalTime || Date.now()).toLocaleTimeString(undefined, {
                hour: '2-digit', minute: '2-digit'
            });

            // Passengers breakdown with assigned seat numbers
            const seg0Assignments = selectedSeatsBySegment[0] || {};
            let passListHtml = passengerData.map((p, idx) => {
                const assignedSeat = seg0Assignments[p.index] || (confirmedBooking.seatNumbers ? confirmedBooking.seatNumbers.split(',')[idx] : null);
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0; border-bottom: 1px dashed var(--border-light); font-size: 0.85rem;">
                        <div>
                            <strong style="color: var(--text-primary); font-size: 0.95rem;">${p.fullName}</strong>
                            <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 6px;">(${p.nationality}, Passport: ${p.passport})</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            ${assignedSeat ? `
                                <span class="brand-badge" style="background: rgba(46, 134, 171, 0.15); color: var(--aviation-light); font-weight: 700; border-color: rgba(46, 134, 171, 0.35);">
                                    Seat ${assignedSeat.trim()}
                                </span>
                            ` : ''}
                            <span class="brand-badge" style="font-size: 0.72rem;">${p.age >= 18 ? 'Adult' : 'Child'} &middot; ${p.age} yrs</span>
                        </div>
                    </div>
                `;
            }).join('');

            if (!passListHtml) {
                passListHtml = `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; font-size: 0.85rem;">
                        <strong style="color: var(--text-primary);">${user.name || 'Passenger'}</strong>
                        <span class="brand-badge" style="font-size: 0.72rem;">Lead Passenger</span>
                    </div>
                `;
            }

            elements.confirmedReceiptContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <span class="brand-badge" style="margin-bottom: 4px;">Verified Electronic Ticket</span>
                        <h3 style="margin: 0; font-size: 1.35rem; color: var(--text-primary);">Booking Confirmation &amp; Receipt</h3>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Status</div>
                        <span class="badge badge-success" style="font-size: 0.85rem; padding: 4px 10px;">${confirmedBooking.status || 'CONFIRMED'}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Flight Route</div>
                        <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">
                            ${flight.source || selectedJourney?.origin} &rarr; ${flight.destination || selectedJourney?.destination}
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                            Flight ${flight.flightNumber || 'AW-Flight'} &middot; ${depDate}
                        </div>
                    </div>

                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Schedule</div>
                        <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-top: 2px;">
                            Departure: ${depTime}
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                            Arrival: ${arrTime}
                        </div>
                    </div>

                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Reserved Cabin</div>
                        <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">
                            ${(confirmedBooking.seatClass || 'ECONOMY').replace('_', ' ')}
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                            ${confirmedBooking.numberOfSeats || passengerCount} Confirmed Seat${(confirmedBooking.numberOfSeats || passengerCount) > 1 ? 's' : ''}
                        </div>
                    </div>

                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Payment Succeeded</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--aviation-dark); margin-top: 2px;">
                            $${confirmedBooking.totalPrice}
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
                            via ${confirmedBooking.paymentMethod || currentPaymentMethod}
                        </div>
                    </div>
                </div>

                <!-- Passengers List -->
                <div style="background: var(--surface-subtle); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">
                        Ticketed Passengers (${passengerCount})
                    </div>
                    ${passListHtml}
                </div>

                <!-- Included In-Flight Amenities -->
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    <span class="brand-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); border-color: rgba(16, 185, 129, 0.3);">
                        &check; Included Checked Luggage (20kg)
                    </span>
                    <span class="brand-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); border-color: rgba(16, 185, 129, 0.3);">
                        &check; In-Flight Hot Dining &amp; Refreshments
                    </span>
                    ${selectedExtras.includes('priority') ? `
                        <span class="brand-badge" style="background: rgba(46, 134, 171, 0.1); color: var(--aviation-light); border-color: rgba(46, 134, 171, 0.3);">
                            &check; Priority Boarding Service
                        </span>
                    ` : ''}
                    ${selectedExtras.includes('assistance') ? `
                        <span class="brand-badge" style="background: rgba(46, 134, 171, 0.1); color: var(--aviation-light); border-color: rgba(46, 134, 171, 0.3);">
                            &check; Special Airport Assistance
                        </span>
                    ` : ''}
                </div>
            `;
        }

        // Hide sidebar and mobile sticky bar in confirmation state
        const sidebar = document.getElementById('booking-summary-sidebar');
        if (sidebar) sidebar.style.display = 'none';

        const mobileBar = document.querySelector('.mobile-booking-bar');
        if (mobileBar) mobileBar.style.display = 'none';
    }

    /**
     * Stepper State Transition
     */
    function goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > 6) return;

        // Hide all step panels
        Object.values(elements.stepPanels).forEach(panel => {
            if (panel) panel.style.display = 'none';
        });

        // Show active panel
        const activePanel = elements.stepPanels[stepNumber];
        if (activePanel) {
            activePanel.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Update Stepper Navigation visuals
        elements.stepperItems.forEach(item => {
            const itemStep = parseInt(item.dataset.step, 10);
            item.classList.remove('active', 'completed');

            if (itemStep < stepNumber) {
                item.classList.add('completed');
            } else if (itemStep === stepNumber) {
                item.classList.add('active');
            }
        });

        currentStep = stepNumber;

        // Step-specific trigger logic
        if (stepNumber === 2) {
            renderStep2PassengerForms();
        } else if (stepNumber === 3) {
            renderStep3SeatSelection();
        } else if (stepNumber === 4) {
            setupExtras();
        } else if (stepNumber === 5) {
            const totals = calculateTotals();
            if (elements.btnSubmitPayment) {
                elements.btnSubmitPayment.innerHTML = `
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    Pay $${totals.total} &amp; Confirm Booking
                `;
            }
        }

        // Update Mobile Action Button Label
        updateMobileBarButton();
    }

    /**
     * Mobile Sticky Action Bar State
     */
    function updateMobileBarButton() {
        if (!elements.mobileBarActionBtn) return;

        const totals = calculateTotals();
        switch (currentStep) {
            case 1:
                elements.mobileBarActionBtn.textContent = 'Continue to Passengers \u2192';
                break;
            case 2:
                elements.mobileBarActionBtn.textContent = 'Continue to Seats \u2192';
                break;
            case 3:
                elements.mobileBarActionBtn.textContent = 'Continue to Extras \u2192';
                break;
            case 4:
                elements.mobileBarActionBtn.textContent = 'Continue to Payment \u2192';
                break;
            case 5:
                elements.mobileBarActionBtn.textContent = `Pay $${totals.total} \u2192`;
                break;
            case 6:
                elements.mobileBarActionBtn.textContent = 'View My Bookings';
                break;
        }
    }

    /**
     * Disable/Enable submit button with loading spinner
     */
    function setPaymentButtonLoading(loading) {
        if (!elements.btnSubmitPayment) return;

        if (loading) {
            elements.btnSubmitPayment.disabled = true;
            elements.btnSubmitPayment.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" style="width: 16px; height: 16px; border-width: 2px; margin-right: 8px; display: inline-block;"></span>
                Processing Flight Reservation...
            `;
        } else {
            elements.btnSubmitPayment.disabled = false;
            const totals = calculateTotals();
            elements.btnSubmitPayment.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                Pay $${totals.total} &amp; Confirm Booking
            `;
        }
    }

    /**
     * Bind all interactive DOM event listeners
     */
    function bindEvents() {
        // Step Navigation Buttons
        buttons.gotoStep2?.addEventListener('click', () => goToStep(2));
        buttons.backToStep1?.addEventListener('click', () => goToStep(1));

        buttons.gotoStep3?.addEventListener('click', () => {
            if (validatePassengerDetails()) {
                goToStep(3);
            }
        });
        buttons.backToStep2?.addEventListener('click', () => goToStep(2));

        buttons.gotoStep4?.addEventListener('click', () => {
            const seg0 = selectedSeatsBySegment[0] || {};
            const selectedCount = Object.values(seg0).filter(Boolean).length;
            if (selectedCount < passengerCount) {
                if (window.toast) {
                    window.toast.warning(`Please assign a seat for all ${passengerCount} traveler${passengerCount > 1 ? 's' : ''} before continuing.`);
                }
                return;
            }
            goToStep(4);
        });
        buttons.backToStep3?.addEventListener('click', () => goToStep(3));

        buttons.gotoStep5?.addEventListener('click', () => goToStep(5));
        buttons.backToStep4?.addEventListener('click', () => goToStep(4));

        // Stepper item clickable navigation for completed steps
        elements.stepperItems.forEach(item => {
            item.addEventListener('click', () => {
                const target = parseInt(item.dataset.step, 10);
                if (target < currentStep) {
                    goToStep(target);
                }
            });
        });

        // Mobile Bar Action
        elements.mobileBarActionBtn?.addEventListener('click', () => {
            if (currentStep === 1) goToStep(2);
            else if (currentStep === 2) {
                if (validatePassengerDetails()) goToStep(3);
            }
            else if (currentStep === 3) {
                const seg0 = selectedSeatsBySegment[0] || {};
                const selectedCount = Object.values(seg0).filter(Boolean).length;
                if (selectedCount < passengerCount) {
                    if (window.toast) {
                        window.toast.warning(`Please assign a seat for all ${passengerCount} traveler${passengerCount > 1 ? 's' : ''} before continuing.`);
                    }
                    return;
                }
                goToStep(4);
            }
            else if (currentStep === 4) goToStep(5);
            else if (currentStep === 5) submitPayment();
            else if (currentStep === 6) window.location.href = '/bookings.html';
        });

        // Payment submission
        elements.btnSubmitPayment?.addEventListener('click', (e) => {
            e.preventDefault();
            submitPayment();
        });

        // Retry Payment
        elements.btnRetryPayment?.addEventListener('click', (e) => {
            e.preventDefault();
            retryFailedPayment();
        });

        // Change method from failure box
        elements.btnChangePaymentMethod?.addEventListener('click', () => {
            if (elements.paymentFailureBox) elements.paymentFailureBox.style.display = 'none';
            const cardInput = document.getElementById('card-number');
            if (cardInput) {
                cardInput.value = '';
                cardInput.focus();
            }
        });

        // Download ticket preview trigger
        buttons.downloadTicket?.addEventListener('click', () => {
            if (window.toast) {
                window.toast.info('Downloading official E-Ticket PDF receipt preview...', 'Download Ticket');
            }
            setTimeout(() => {
                window.print();
            }, 600);
        });
    }

    // Auto-boot on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
