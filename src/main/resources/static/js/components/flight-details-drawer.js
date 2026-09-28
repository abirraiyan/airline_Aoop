/**
 * Aerowing Airlines — Flight & Journey Details Drawer / Modal Component
 * Supports both direct flights and multi-leg connecting journeys with breakdown of segments,
 * layovers, fare pricing, and seat availability.
 */

(function () {
    class FlightDetailsDrawer {
        constructor() {
            this.container = null;
            this.currentData = null;
            this.onSelectCallback = null;
            this.ensureContainer();
        }

        ensureContainer() {
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.className = 'modal-overlay flight-details-overlay';
                this.container.id = 'flight-details-drawer';
                document.body.appendChild(this.container);
            }
        }

        open(data, onSelect) {
            this.currentData = data;
            this.onSelectCallback = onSelect;
            this.render();
            this.container.classList.add('open');
        }

        close() {
            this.container.classList.remove('open');
        }

        render() {
            const data = this.currentData;
            if (!data) return;

            const isConnecting = data.journeyType === 'CONNECTING' || (data.segments && data.segments.length > 1);

            if (isConnecting) {
                this.renderConnectingDetails(data);
            } else {
                this.renderDirectDetails(data);
            }

            // Bind close buttons
            this.container.querySelectorAll('.btn-close-details').forEach(btn => {
                btn.addEventListener('click', () => this.close());
            });

            // Bind select action
            const selectBtn = this.container.querySelector('.btn-select-details');
            if (selectBtn) {
                selectBtn.addEventListener('click', () => {
                    this.close();
                    if (typeof this.onSelectCallback === 'function') {
                        this.onSelectCallback(data);
                    }
                });
            }

            this.container.addEventListener('click', (e) => {
                if (e.target === this.container) this.close();
            });
        }

        renderDirectDetails(data) {
            // Handle both JourneyDTO and Flight entity
            const isJourneyDto = Boolean(data.journeyType && data.segments);
            const f = isJourneyDto ? data.segments[0] : data;

            const basePrice = isJourneyDto && data.pricing ? data.pricing.basePriceSubtotal : (f.basePrice || 0);
            const flightNumber = f.flightNumber || `AW-${100 + (f.flightId || f.id || 0)}`;
            const aircraft = f.aircraft || { model: f.aircraftModel || 'Boeing 737', totalSeats: 180 };

            const ecoPrice = isJourneyDto && data.pricing ? data.pricing.economyFinalPrice : (basePrice * 1.0).toFixed(0);
            const bizPrice = isJourneyDto && data.pricing ? data.pricing.businessFinalPrice : (basePrice * 2.2).toFixed(0);
            const firstPrice = isJourneyDto && data.pricing ? data.pricing.firstClassFinalPrice : (basePrice * 3.5).toFixed(0);

            const depDate = f.departureTime ? new Date(f.departureTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
            const arrDate = f.arrivalTime ? new Date(f.arrivalTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';

            this.container.innerHTML = `
                <div class="modal-box flight-details-modal" style="max-width: 620px;">
                    <div class="modal-header">
                        <div>
                            <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--gold-500); letter-spacing: 0.05em;">Direct Flight Details &middot; Aerowing Airlines</div>
                            <h3 class="modal-title">${f.source} &rarr; ${f.destination}</h3>
                        </div>
                        <button type="button" class="modal-close btn-close-details">&times;</button>
                    </div>

                    <div class="modal-body">
                        <!-- Route Banner -->
                        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-subtle); padding: 1rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
                            <div>
                                <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">${f.source}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">${depDate}</div>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center;">
                                <span class="badge badge-${(f.status || 'SCHEDULED').toLowerCase()}">${f.status || 'SCHEDULED'}</span>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Direct &middot; ${flightNumber}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">${f.destination}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">${arrDate}</div>
                            </div>
                        </div>

                        <!-- Aircraft & Capacity Specs -->
                        <div style="margin-bottom: 1.25rem;">
                            <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; letter-spacing: 0.04em;">Aircraft &amp; Fleet</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem;">
                                <div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">Aircraft Model</div>
                                    <div style="font-weight: 600; color: var(--text-primary);">${aircraft.model || f.aircraftModel || 'Boeing 737'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">Configuration</div>
                                    <div style="font-weight: 600; color: var(--text-primary);">${aircraft.totalSeats || '180'} Seats (3-Class)</div>
                                </div>
                            </div>
                        </div>

                        <!-- Real Seat Inventory by Cabin Class -->
                        <div style="margin-bottom: 1.25rem;">
                            <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; letter-spacing: 0.04em;">Available Inventory &amp; Pricing</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
                                <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.75rem; text-align: center; background: var(--surface);">
                                    <span class="badge badge-economy" style="margin-bottom: 4px;">Economy</span>
                                    <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-primary);">$${ecoPrice}</div>
                                    <div style="font-size: 0.72rem; color: var(--text-muted);">${f.availableEconomySeats ?? 0} seats left</div>
                                </div>
                                <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.75rem; text-align: center; background: var(--surface);">
                                    <span class="badge badge-business" style="margin-bottom: 4px;">Business</span>
                                    <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-primary);">$${bizPrice}</div>
                                    <div style="font-size: 0.72rem; color: var(--text-muted);">${f.availableBusinessSeats ?? 0} seats left</div>
                                </div>
                                <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.75rem; text-align: center; background: var(--surface);">
                                    <span class="badge badge-first" style="margin-bottom: 4px;">First Class</span>
                                    <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-primary);">$${firstPrice}</div>
                                    <div style="font-size: 0.72rem; color: var(--text-muted);">${f.availableFirstClassSeats ?? 0} seats left</div>
                                </div>
                            </div>
                        </div>

                        <!-- Fare Policies & Inclusions -->
                        <div style="background: var(--surface-subtle); padding: 1rem; border-radius: var(--radius-md); font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                            <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">Fare Conditions &amp; Inclusions</div>
                            <ul style="padding-left: 1.25rem; margin: 0;">
                                <li><strong>Baggage:</strong> 20kg Checked Baggage + 7kg Carry-on included in Economy; +10kg in Business; +20kg in First Class.</li>
                                <li><strong>Cancellation:</strong> 100% refund &ge; 7 days prior; 50% refund 2–7 days prior; 0% under 48 hours.</li>
                                <li><strong>Loyalty Points:</strong> Earn 1 Aerowing Mile per $1 spent. Silver, Gold, Platinum tier perks apply.</li>
                            </ul>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary btn-close-details">Close</button>
                        <button type="button" class="btn btn-accent btn-select-details" ${f.status === 'CANCELLED' ? 'disabled' : ''}>
                            ${f.status === 'CANCELLED' ? 'Flight Cancelled' : 'Select Flight'}
                        </button>
                    </div>
                </div>
            `;
        }

        renderConnectingDetails(journey) {
            const seg1 = journey.segments[0];
            const seg2 = journey.segments[1];
            const layover = journey.layovers[0] || { airport: seg1.destination, durationFormatted: '2h', isWarning: false };
            const pricing = journey.pricing || {
                basePriceSubtotal: 800,
                multiLegDiscount: 40,
                economyFinalPrice: 760,
                businessFinalPrice: 1672,
                firstClassFinalPrice: 2660
            };
            const avail = journey.availability || { economySeats: 10, businessSeats: 2, firstClassSeats: 1 };

            const dep1 = new Date(seg1.departureTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
            const arr1 = new Date(seg1.arrivalTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
            const dep2 = new Date(seg2.departureTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
            const arr2 = new Date(seg2.arrivalTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

            const isCancelled = journey.status === 'CANCELLED' || !journey.isSelectable;

            this.container.innerHTML = `
                <div class="modal-box flight-details-modal" style="max-width: 680px;">
                    <div class="modal-header">
                        <div>
                            <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--gold-500); letter-spacing: 0.05em;">Connecting Journey Details &middot; 1 Stop</div>
                            <h3 class="modal-title">${journey.origin} &rarr; ${layover.airport} &rarr; ${journey.destination}</h3>
                        </div>
                        <button type="button" class="modal-close btn-close-details">&times;</button>
                    </div>

                    <div class="modal-body">
                        <!-- Journey Metrics Banner -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; background: var(--surface-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; text-align: center;">
                            <div>
                                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Total Duration</div>
                                <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">${journey.totalDurationFormatted}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Total Flight Time</div>
                                <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">${journey.totalFlightTimeFormatted}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Layover</div>
                                <div style="font-weight: 700; font-size: 1.1rem; color: var(--gold-600);">${journey.totalLayoverTimeFormatted}</div>
                            </div>
                        </div>

                        <!-- Step 1: Flight Segment 1 -->
                        <div class="card" style="padding: 1rem; margin-bottom: 0.75rem; border-left: 3px solid var(--aviation-light);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <div style="font-weight: 700; color: var(--text-primary);">Flight 1: ${seg1.flightNumber} &middot; ${seg1.source} &rarr; ${seg1.destination}</div>
                                <span class="badge badge-${(seg1.status || 'SCHEDULED').toLowerCase()}">${seg1.status || 'SCHEDULED'}</span>
                            </div>
                            <div style="font-size: 0.82rem; color: var(--text-secondary); display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                                <span>Departure: <strong>${dep1}</strong> (${seg1.source})</span>
                                <span>Arrival: <strong>${arr1}</strong> (${seg1.destination})</span>
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">
                                Aircraft: ${seg1.aircraftModel} &middot; Duration: ${seg1.durationFormatted} &middot; Base: $${seg1.basePrice}
                            </div>
                        </div>

                        <!-- Connection / Layover Alert -->
                        <div style="background: rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--gold-600);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <div>
                                    <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${layover.durationFormatted} Layover in ${layover.airport}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Self-transfer or terminal transit &middot; Checked baggage forwarded to final destination</div>
                                </div>
                            </div>
                            ${layover.isWarning ? '<span class="badge badge-cancelled">Tight Connection</span>' : ''}
                        </div>

                        <!-- Step 2: Flight Segment 2 -->
                        <div class="card" style="padding: 1rem; margin-bottom: 1.25rem; border-left: 3px solid var(--gold-500);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <div style="font-weight: 700; color: var(--text-primary);">Flight 2: ${seg2.flightNumber} &middot; ${seg2.source} &rarr; ${seg2.destination}</div>
                                <span class="badge badge-${(seg2.status || 'SCHEDULED').toLowerCase()}">${seg2.status || 'SCHEDULED'}</span>
                            </div>
                            <div style="font-size: 0.82rem; color: var(--text-secondary); display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                                <span>Departure: <strong>${dep2}</strong> (${seg2.source})</span>
                                <span>Arrival: <strong>${arr2}</strong> (${seg2.destination})</span>
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">
                                Aircraft: ${seg2.aircraftModel} &middot; Duration: ${seg2.durationFormatted} &middot; Base: $${seg2.basePrice}
                            </div>
                        </div>

                        <!-- Multi-leg Pricing Breakdown -->
                        <div style="background: var(--surface-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
                            <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Multi-Leg Pricing &amp; Incentive</div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                                <span>Segment 1 Base (${seg1.flightNumber}):</span>
                                <span>$${seg1.basePrice}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                                <span>Segment 2 Base (${seg2.flightNumber}):</span>
                                <span>$${seg2.basePrice}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem; font-weight: 600;">
                                <span>Base Fare Subtotal:</span>
                                <span>$${pricing.basePriceSubtotal}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--success); font-weight: 600; margin-bottom: 0.5rem;">
                                <span>Multi-Leg Discount (5%):</span>
                                <span>-$${pricing.multiLegDiscount}</span>
                            </div>
                            <div style="border-top: 1px solid var(--border); padding-top: 0.5rem; display: flex; justify-content: space-between; font-size: 1rem; font-weight: 700;">
                                <span>Final Combined Economy Fare:</span>
                                <span style="color: var(--text-primary);">$${pricing.economyFinalPrice}</span>
                            </div>
                        </div>

                        <!-- Availability by Class -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; text-align: center;">
                            <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.6rem; background: var(--surface);">
                                <span class="badge badge-economy">Economy</span>
                                <div style="font-weight: 700; margin-top: 4px;">$${pricing.economyFinalPrice}</div>
                                <div style="font-size: 0.72rem; color: var(--text-muted);">${avail.economySeats} seats left</div>
                            </div>
                            <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.6rem; background: var(--surface);">
                                <span class="badge badge-business">Business</span>
                                <div style="font-weight: 700; margin-top: 4px;">$${pricing.businessFinalPrice}</div>
                                <div style="font-size: 0.72rem; color: var(--text-muted);">${avail.businessSeats} seats left</div>
                            </div>
                            <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.6rem; background: var(--surface);">
                                <span class="badge badge-first">First Class</span>
                                <div style="font-weight: 700; margin-top: 4px;">$${pricing.firstClassFinalPrice}</div>
                                <div style="font-size: 0.72rem; color: var(--text-muted);">${avail.firstClassSeats} seats left</div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary btn-close-details">Close</button>
                        <button type="button" class="btn btn-accent btn-select-details" ${isCancelled ? 'disabled' : ''}>
                            ${isCancelled ? 'Journey Unavailable' : 'Select Connecting Journey'}
                        </button>
                    </div>
                </div>
            `;
        }
    }

    window.flightDetailsDrawer = new FlightDetailsDrawer();
})();
