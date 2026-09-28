/**
 * Aerowing Airlines — Interactive Aircraft Seat Map Component (Phase 5)
 * Realistic aircraft cabin layout generator, live inventory integration,
 * multi-passenger seat assignment, multi-segment connecting support,
 * and WCAG AA accessibility compliance.
 */

(function () {
    'use strict';

    /**
     * Aircraft Seat Configuration Engine
     * Dynamically models cabin rows, columns, aisles, positions, and exit doors based on fleet metadata.
     */
    class AircraftSeatConfiguration {
        constructor(aircraft = {}) {
            this.model = aircraft.model || 'Boeing 737-800';
            this.totalSeats = aircraft.totalSeats || 180;
            this.economySeats = aircraft.economySeats || 150;
            this.businessSeats = aircraft.businessSeats || 24;
            this.firstClassSeats = aircraft.firstClassSeats || 6;
        }

        generateLayout() {
            const layout = [];

            // 1. FIRST CLASS (Rows 1–2, 2-2 Configuration: A, B || E, F)
            if (this.firstClassSeats > 0) {
                const fcRows = Math.max(1, Math.ceil(this.firstClassSeats / 4));
                for (let r = 1; r <= fcRows; r++) {
                    layout.push({
                        rowNumber: r,
                        cabinClass: 'FIRST_CLASS',
                        isExitRow: false,
                        isPremium: true,
                        leftSeats: [
                            { col: 'A', position: 'Window' },
                            { col: 'B', position: 'Aisle' }
                        ],
                        rightSeats: [
                            { col: 'E', position: 'Aisle' },
                            { col: 'F', position: 'Window' }
                        ]
                    });
                }
            }

            // 2. BUSINESS CLASS (Rows 3–5, 2-2 Configuration: A, C || D, F)
            if (this.businessSeats > 0) {
                const bcRows = Math.max(1, Math.ceil(this.businessSeats / 4));
                for (let r = 3; r < 3 + bcRows; r++) {
                    layout.push({
                        rowNumber: r,
                        cabinClass: 'BUSINESS',
                        isExitRow: false,
                        isPremium: true,
                        leftSeats: [
                            { col: 'A', position: 'Window' },
                            { col: 'C', position: 'Aisle' }
                        ],
                        rightSeats: [
                            { col: 'D', position: 'Aisle' },
                            { col: 'F', position: 'Window' }
                        ]
                    });
                }
            }

            // 3. ECONOMY CLASS (Rows 10–25, 3-3 Configuration: A, B, C || D, E, F)
            const econRows = Math.max(4, Math.min(18, Math.ceil(this.economySeats / 6)));
            const exitRowIndex1 = 12;
            const exitRowIndex2 = 14;

            for (let i = 0; i < econRows; i++) {
                const r = 10 + i;
                const isExit = (r === exitRowIndex1 || (econRows > 8 && r === exitRowIndex2));
                const isBulkhead = (r === 10);

                layout.push({
                    rowNumber: r,
                    cabinClass: 'ECONOMY',
                    isExitRow: isExit,
                    isPremium: isBulkhead,
                    leftSeats: [
                        { col: 'A', position: 'Window' },
                        { col: 'B', position: 'Middle' },
                        { col: 'C', position: 'Aisle' }
                    ],
                    rightSeats: [
                        { col: 'D', position: 'Aisle' },
                        { col: 'E', position: 'Middle' },
                        { col: 'F', position: 'Window' }
                    ]
                });
            }

            return layout;
        }
    }

    /**
     * Interactive Seat Map UI Component
     */
    class SeatMapComponent {
        /**
         * @param {HTMLElement} container
         * @param {Object} options
         */
        constructor(container, options = {}) {
            this.container = container;
            this.options = {
                segments: options.segments || [],
                selectedClass: options.seatClass || 'ECONOMY',
                passengers: options.passengers || [{ index: 1, name: 'Lead Passenger', type: 'ADULT' }],
                onSelectionChange: options.onSelectionChange || null,
                ...options
            };

            // Active segment state for connecting journeys
            this.activeSegmentIndex = 0;
            // Active passenger selecting seat
            this.activePassengerIndex = 1;
            // State: segmentIndex -> (passengerIndex -> seatCode)
            this.assignments = {};
            // Occupied seats cache: segmentIndex -> Set of seat codes
            this.occupiedSeatsCache = {};

            // Zoom scale
            this.zoomScale = 1.0;

            this.init();
        }

        async init() {
            // Initialize assignments map for each segment
            this.options.segments.forEach((seg, idx) => {
                this.assignments[idx] = {};
            });

            // Fetch live occupied seats for active segment
            await this.fetchOccupiedSeats(this.activeSegmentIndex);

            // Render Component UI
            this.render();
            this.attachEventListeners();
            this.createTooltipPortal();
        }

        async fetchOccupiedSeats(segmentIdx) {
            const segment = this.options.segments[segmentIdx];
            if (!segment || !segment.flightId) {
                this.occupiedSeatsCache[segmentIdx] = new Set();
                return;
            }

            try {
                if (window.api) {
                    const occupiedList = await window.api.get(`/api/bookings/flight/${segment.flightId}/occupied-seats`);
                    if (Array.isArray(occupiedList)) {
                        this.occupiedSeatsCache[segmentIdx] = new Set(occupiedList.map(s => s.toUpperCase()));
                        return;
                    }
                }
            } catch (err) {
                console.warn('Could not load occupied seats from API:', err);
            }
            this.occupiedSeatsCache[segmentIdx] = new Set();
        }

        render() {
            const currentSegment = this.options.segments[this.activeSegmentIndex] || {};
            const aircraft = currentSegment.aircraft || { model: currentSegment.aircraftModel || 'Boeing 737-800' };
            const config = new AircraftSeatConfiguration(aircraft);
            const layout = config.generateLayout();

            const isMultiSegment = this.options.segments.length > 1;

            let html = `
                <div class="interactive-seatmap-wrapper">
                    <!-- Segment Switcher Tabs (For Connecting Journeys) -->
                    ${isMultiSegment ? this.renderSegmentTabs() : ''}

                    <!-- Multi-Passenger Assignment Bar -->
                    ${this.renderPassengerAssignmentBar()}

                    <!-- Seat Legend & Controls -->
                    <div class="seatmap-controls">
                        <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">
                            ${aircraft.model || 'Commercial Aircraft'} &middot; <span style="color: var(--aviation-light);">${(this.options.selectedClass || 'ECONOMY').replace('_', ' ')} Cabin</span>
                        </div>
                        <div class="seatmap-zoom-btn-group">
                            <button type="button" class="seatmap-zoom-btn" id="btn-zoom-out" title="Zoom Out">&minus;</button>
                            <button type="button" class="seatmap-zoom-btn" id="btn-zoom-reset" title="Reset Zoom">100%</button>
                            <button type="button" class="seatmap-zoom-btn" id="btn-zoom-in" title="Zoom In">&plus;</button>
                        </div>
                    </div>

                    <!-- Visual Legend -->
                    <div class="seat-legend-bar" role="region" aria-label="Seat Map Legend">
                        <div class="legend-item">
                            <span class="legend-swatch available">&bull;</span>
                            <span>Available</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-swatch selected">&check;</span>
                            <span>Selected</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-swatch occupied">&times;</span>
                            <span>Occupied</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-swatch premium">&starf;</span>
                            <span>Premium Bulkhead</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-swatch exit">EXIT</span>
                            <span>Exit Row</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-swatch unavailable">&empty;</span>
                            <span>Other Cabin</span>
                        </div>
                    </div>

                    <!-- Aircraft Fuselage Shell -->
                    <div class="aircraft-fuselage-container">
                        <div class="aircraft-fuselage" id="aircraft-fuselage-body" style="transform: scale(${this.zoomScale}); transform-origin: top center;">
                            <!-- Wing Markers -->
                            <div class="wing-marker-left">Port Wing &middot; Engine 1</div>
                            <div class="wing-marker-right">Starboard Wing &middot; Engine 2</div>

                            <!-- Nose & Cockpit -->
                            <div class="aircraft-nose">
                                <div class="cockpit-windows">
                                    <div class="cockpit-window center-left"></div>
                                    <div class="cockpit-window center-right"></div>
                                </div>
                                <div style="font-size: 0.65rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted);">
                                    Cockpit &middot; Forward Entry
                                </div>
                            </div>

                            <div class="forward-door-row">
                                <div class="door-indicator">&larr; Entry Door 1L</div>
                                <div class="door-indicator">Service Door 1R &rarr;</div>
                            </div>

                            <!-- Cabin Rows Section -->
                            <div class="seat-rows-list">
                                ${this.renderRows(layout)}
                            </div>

                            <!-- Aft Galley and Tail -->
                            <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border-light); text-align: center;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">
                                    <span>&larr; Exit Door 2L</span>
                                    <span>Aft Galley &middot; Lavatories</span>
                                    <span>Exit Door 2R &rarr;</span>
                                </div>
                                <div style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; color: var(--text-muted);">
                                    Tail Cone Direction &middot; APU Exhaust
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.container.innerHTML = html;
        }

        renderSegmentTabs() {
            return `
                <div class="segment-seat-tabs" role="tablist" aria-label="Flight Segments">
                    ${this.options.segments.map((seg, idx) => `
                        <button type="button" class="segment-seat-tab ${idx === this.activeSegmentIndex ? 'active' : ''}" 
                                data-segment-index="${idx}" role="tab" aria-selected="${idx === this.activeSegmentIndex}">
                            <span>Segment ${idx + 1}:</span>
                            <strong>${seg.origin} &rarr; ${seg.destination}</strong>
                            <span style="font-size: 0.75rem; opacity: 0.8;">(${seg.flightNumber || 'AW-Flight'})</span>
                        </button>
                    `).join('')}
                </div>
            `;
        }

        renderPassengerAssignmentBar() {
            const currentSegAssignments = this.assignments[this.activeSegmentIndex] || {};

            return `
                <div class="passenger-assignment-bar">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <span class="brand-badge" style="margin-bottom: 2px;">Step 1: Select Traveler</span>
                            <h4 style="margin: 0; font-size: 1.05rem;">Assign Seats for Your Travel Party</h4>
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-secondary);">
                            Click a traveler below, then choose an available seat on the aircraft.
                        </div>
                    </div>

                    <div class="passenger-tabs-grid" role="tablist" aria-label="Travelers">
                        ${this.options.passengers.map(p => {
                            const assignedSeat = currentSegAssignments[p.index];
                            const isActive = p.index === this.activePassengerIndex;

                            return `
                                <button type="button" class="passenger-tab-btn ${isActive ? 'active' : ''} ${assignedSeat ? 'assigned' : ''}" 
                                        data-passenger-index="${p.index}" role="tab" aria-selected="${isActive}">
                                    <div class="pass-index-circle">${p.index}</div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            ${p.fullName || p.name || `Passenger ${p.index}`}
                                        </div>
                                        <div style="font-size: 0.72rem; color: ${assignedSeat ? 'var(--success)' : 'var(--text-muted)'}; font-weight: 600;">
                                            ${assignedSeat ? `Seat: ${assignedSeat}` : 'Seat: Not Selected'}
                                        </div>
                                    </div>
                                    ${assignedSeat ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--success)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>` : ''}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        renderRows(layout) {
            let currentCabin = '';
            let rowsHtml = '';

            const currentOccupied = this.occupiedSeatsCache[this.activeSegmentIndex] || new Set();
            const currentSegAssignments = this.assignments[this.activeSegmentIndex] || {};

            // Reverse-map of seatCode -> passengerIndex
            const seatToPassenger = {};
            Object.entries(currentSegAssignments).forEach(([pIdx, code]) => {
                if (code) seatToPassenger[code] = parseInt(pIdx, 10);
            });

            layout.forEach(row => {
                // If cabin class changed, insert cabin header
                if (row.cabinClass !== currentCabin) {
                    currentCabin = row.cabinClass;
                    const badgeClass = currentCabin === 'FIRST_CLASS' ? 'first-class' : (currentCabin === 'BUSINESS' ? 'business' : 'economy');
                    const label = currentCabin.replace('_', ' ');

                    rowsHtml += `
                        <div class="cabin-zone-divider">
                            <div class="cabin-zone-line"></div>
                            <span class="cabin-zone-badge ${badgeClass}">${label} CLASS</span>
                            <div class="cabin-zone-line"></div>
                        </div>
                    `;
                }

                // Render Left Seats Group
                const leftHtml = row.leftSeats.map(s => this.renderSeat(row, s, currentOccupied, seatToPassenger)).join('');
                // Render Right Seats Group
                const rightHtml = row.rightSeats.map(s => this.renderSeat(row, s, currentOccupied, seatToPassenger)).join('');

                rowsHtml += `
                    <div class="seat-row ${row.isExitRow ? 'exit-row' : ''}" data-row="${row.rowNumber}">
                        <div class="seat-group">${leftHtml}</div>
                        <div class="seat-aisle">
                            <span class="seat-row-num">${row.rowNumber}</span>
                        </div>
                        <div class="seat-group">${rightHtml}</div>
                    </div>
                `;
            });

            return rowsHtml;
        }

        renderSeat(row, seatSpec, occupiedSet, seatToPassenger) {
            const seatCode = `${row.rowNumber}${seatSpec.col}`;
            const isAssignedToAnyPassenger = Boolean(seatToPassenger[seatCode]);
            const isAssignedToActive = seatToPassenger[seatCode] === this.activePassengerIndex;
            const isOccupied = occupiedSet.has(seatCode.toUpperCase());
            const isWrongCabin = (row.cabinClass !== this.options.selectedClass);

            let stateClass = 'available';
            let ariaStatus = 'Available';

            if (isOccupied) {
                stateClass = 'occupied';
                ariaStatus = 'Occupied';
            } else if (isAssignedToAnyPassenger) {
                stateClass = 'selected';
                ariaStatus = `Selected by Passenger ${seatToPassenger[seatCode]}`;
            } else if (isWrongCabin) {
                stateClass = 'unavailable';
                ariaStatus = `Unavailable (${row.cabinClass.replace('_', ' ')} Cabin)`;
            } else if (row.isExitRow) {
                stateClass = 'exit-row available';
                ariaStatus = 'Emergency Exit Row Available';
            } else if (row.isPremium) {
                stateClass = 'premium available';
                ariaStatus = 'Premium Seat Available';
            }

            const accessibleLabel = `Seat ${seatCode}, ${row.cabinClass.replace('_', ' ')} class, ${seatSpec.position} seat, ${ariaStatus}`;

            return `
                <button type="button" class="seat-cell ${stateClass}" 
                        data-seat="${seatCode}" 
                        data-row="${row.rowNumber}" 
                        data-col="${seatSpec.col}" 
                        data-class="${row.cabinClass}" 
                        data-pos="${seatSpec.position}" 
                        data-exit="${row.isExitRow}" 
                        data-premium="${row.isPremium}" 
                        data-occupied="${isOccupied}" 
                        data-wrong-cabin="${isWrongCabin}" 
                        aria-label="${accessibleLabel}" 
                        tabindex="${isOccupied || isWrongCabin ? '-1' : '0'}">
                    <span>${seatSpec.col}</span>
                </button>
            `;
        }

        attachEventListeners() {
            // Segment switch listeners
            this.container.querySelectorAll('.segment-seat-tab').forEach(tab => {
                tab.addEventListener('click', async (e) => {
                    const targetIdx = parseInt(e.currentTarget.dataset.segmentIndex, 10);
                    if (targetIdx !== this.activeSegmentIndex) {
                        this.activeSegmentIndex = targetIdx;
                        await this.fetchOccupiedSeats(targetIdx);
                        this.render();
                        this.attachEventListeners();
                    }
                });
            });

            // Passenger tab switch listeners
            this.container.querySelectorAll('.passenger-tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const pIdx = parseInt(e.currentTarget.dataset.passengerIndex, 10);
                    this.activePassengerIndex = pIdx;
                    this.render();
                    this.attachEventListeners();
                });
            });

            // Zoom controls
            const btnZoomIn = this.container.querySelector('#btn-zoom-in');
            const btnZoomOut = this.container.querySelector('#btn-zoom-out');
            const btnZoomReset = this.container.querySelector('#btn-zoom-reset');
            const fuselageBody = this.container.querySelector('#aircraft-fuselage-body');

            if (btnZoomIn && fuselageBody) {
                btnZoomIn.onclick = () => {
                    this.zoomScale = Math.min(1.25, this.zoomScale + 0.1);
                    fuselageBody.style.transform = `scale(${this.zoomScale})`;
                };
            }
            if (btnZoomOut && fuselageBody) {
                btnZoomOut.onclick = () => {
                    this.zoomScale = Math.max(0.75, this.zoomScale - 0.1);
                    fuselageBody.style.transform = `scale(${this.zoomScale})`;
                };
            }
            if (btnZoomReset && fuselageBody) {
                btnZoomReset.onclick = () => {
                    this.zoomScale = 1.0;
                    fuselageBody.style.transform = `scale(${this.zoomScale})`;
                };
            }

            // Seat cell click & hover interactions
            this.container.querySelectorAll('.seat-cell').forEach(cell => {
                cell.addEventListener('click', (e) => this.handleSeatClick(e.currentTarget));
                cell.addEventListener('mouseenter', (e) => this.showTooltip(e.currentTarget));
                cell.addEventListener('mouseleave', () => this.hideTooltip());
                cell.addEventListener('focus', (e) => this.showTooltip(e.currentTarget));
                cell.addEventListener('blur', () => this.hideTooltip());
            });
        }

        handleSeatClick(cell) {
            const seatCode = cell.dataset.seat;
            const isOccupied = cell.dataset.occupied === 'true';
            const isWrongCabin = cell.dataset.wrongCabin === 'true';

            // 1. Check if occupied
            if (isOccupied) {
                if (window.toast) {
                    window.toast.warning(`Seat ${seatCode} is already occupied by another passenger.`);
                }
                return;
            }

            // 2. Check if wrong cabin class
            if (isWrongCabin) {
                const cabinName = (cell.dataset.class || '').replace('_', ' ');
                if (window.toast) {
                    window.toast.warning(`Seat ${seatCode} is in ${cabinName} class. Your booking is for ${(this.options.selectedClass || 'ECONOMY').replace('_', ' ')}.`);
                }
                return;
            }

            const currentSegAssignments = this.assignments[this.activeSegmentIndex] || {};
            const currentlyAssignedPassenger = Object.keys(currentSegAssignments).find(p => currentSegAssignments[p] === seatCode);

            // 3. Deselect if clicked by the same passenger
            if (currentlyAssignedPassenger && parseInt(currentlyAssignedPassenger, 10) === this.activePassengerIndex) {
                delete currentSegAssignments[this.activePassengerIndex];
                if (window.toast) {
                    window.toast.info(`Seat ${seatCode} deselected.`);
                }
                this.onStateUpdated();
                return;
            }

            // 4. Block if assigned to another passenger in travel party
            if (currentlyAssignedPassenger) {
                if (window.toast) {
                    window.toast.warning(`Seat ${seatCode} is already assigned to Passenger ${currentlyAssignedPassenger}.`);
                }
                return;
            }

            // 5. Assign seat to active passenger
            currentSegAssignments[this.activePassengerIndex] = seatCode;
            this.assignments[this.activeSegmentIndex] = currentSegAssignments;

            if (window.toast) {
                const pass = this.options.passengers.find(p => p.index === this.activePassengerIndex);
                const passName = pass?.fullName || pass?.name || `Passenger ${this.activePassengerIndex}`;
                window.toast.success(`Seat ${seatCode} (${cell.dataset.pos}) assigned to ${passName}.`);
            }

            // Auto-advance to next passenger needing a seat
            const nextUnassigned = this.options.passengers.find(p => !currentSegAssignments[p.index]);
            if (nextUnassigned) {
                this.activePassengerIndex = nextUnassigned.index;
            }

            this.onStateUpdated();
        }

        onStateUpdated() {
            this.render();
            this.attachEventListeners();

            if (typeof this.options.onSelectionChange === 'function') {
                const summary = this.getSelectionSummary();
                this.options.onSelectionChange(summary);
            }
        }

        getSelectionSummary() {
            const currentSegAssignments = this.assignments[this.activeSegmentIndex] || {};
            const selectedSeatsList = Object.values(currentSegAssignments).filter(Boolean);
            const totalRequired = this.options.passengers.length;

            return {
                segmentIndex: this.activeSegmentIndex,
                assignments: { ...this.assignments },
                currentSegmentSeats: selectedSeatsList,
                isCurrentSegmentComplete: selectedSeatsList.length >= totalRequired,
                isAllSegmentsComplete: Object.keys(this.assignments).every(idx => {
                    const seats = Object.values(this.assignments[idx] || {}).filter(Boolean);
                    return seats.length >= totalRequired;
                })
            };
        }

        createTooltipPortal() {
            let portal = document.getElementById('seat-tooltip-portal');
            if (!portal) {
                portal = document.createElement('div');
                portal.id = 'seat-tooltip-portal';
                portal.className = 'seat-tooltip-portal';
                document.body.appendChild(portal);
            }
            this.tooltipEl = portal;
        }

        showTooltip(cell) {
            if (!this.tooltipEl) return;

            const seatCode = cell.dataset.seat;
            const cabinClass = (cell.dataset.class || 'ECONOMY').replace('_', ' ');
            const position = cell.dataset.pos || 'Standard';
            const isExit = cell.dataset.exit === 'true';
            const isPremium = cell.dataset.premium === 'true';
            const isOccupied = cell.dataset.occupied === 'true';
            const isWrongCabin = cell.dataset.wrongCabin === 'true';

            let statusHtml = '<span style="color: var(--success); font-weight: 600;">Available (Complimentary)</span>';
            if (isOccupied) {
                statusHtml = '<span style="color: var(--danger); font-weight: 600;">Occupied</span>';
            } else if (isWrongCabin) {
                statusHtml = `<span style="color: var(--text-muted); font-weight: 600;">Unavailable (${cabinClass})</span>`;
            }

            let specialBadge = '';
            if (isExit) {
                specialBadge = '<div style="font-size: 0.72rem; color: var(--gold-600); margin-top: 4px;">\u26A0 Emergency Exit &middot; Extra Pitch (34")</div>';
            } else if (isPremium) {
                specialBadge = '<div style="font-size: 0.72rem; color: var(--gold-600); margin-top: 4px;">\u2605 Premium Bulkhead &middot; Extra Legroom</div>';
            }

            this.tooltipEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                    <strong style="font-size: 1rem; color: var(--text-primary);">Seat ${seatCode}</strong>
                    <span style="font-size: 0.75rem; color: var(--aviation-light); font-weight: 600;">${position}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">${cabinClass} Class</div>
                <div style="font-size: 0.75rem;">${statusHtml}</div>
                ${specialBadge}
            `;

            const rect = cell.getBoundingClientRect();
            this.tooltipEl.style.top = `${rect.top - 68}px`;
            this.tooltipEl.style.left = `${rect.left + rect.width / 2 - 85}px`;
            this.tooltipEl.classList.add('active');
        }

        hideTooltip() {
            if (this.tooltipEl) {
                this.tooltipEl.classList.remove('active');
            }
        }
    }

    // Expose to global window
    window.AircraftSeatConfiguration = AircraftSeatConfiguration;
    window.SeatMapComponent = SeatMapComponent;
})();
