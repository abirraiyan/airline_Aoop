/**
 * Aerowing Airlines — Passenger Selector Dropdown Component
 * Steppers for Adults, Children, and Infants with live summary calculations.
 */

(function () {
    class PassengerDropdown {
        /**
         * @param {HTMLElement} container 
         * @param {Object} options { initialAdults, initialChildren, initialInfants, onChange }
         */
        constructor(container, options = {}) {
            this.container = container;
            this.adults = options.initialAdults || 1;
            this.children = options.initialChildren || 0;
            this.infants = options.initialInfants || 0;
            this.onChange = options.onChange || null;
            this.isOpen = false;

            this.render();
            this.bindEvents();
        }

        render() {
            const summaryText = this.getSummaryText();

            this.container.innerHTML = `
                <div class="passenger-dropdown-wrapper">
                    <label class="form-label">Passengers</label>
                    <button type="button" class="passenger-summary-btn" id="passenger-summary-toggle">
                        <svg class="passenger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span class="passenger-summary-label">${summaryText}</span>
                        <svg class="passenger-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>

                    <div class="passenger-popover" id="passenger-popover" style="display: none;">
                        <div class="passenger-tier-row">
                            <div class="passenger-tier-info">
                                <div class="passenger-tier-title">Adults</div>
                                <div class="passenger-tier-sub">Age 12+ years</div>
                            </div>
                            <div class="stepper-controls">
                                <button type="button" class="stepper-btn btn-adult-minus" ${this.adults <= 1 ? 'disabled' : ''}>&minus;</button>
                                <span class="stepper-count count-adults">${this.adults}</span>
                                <button type="button" class="stepper-btn btn-adult-plus" ${this.adults >= 9 ? 'disabled' : ''}>&#43;</button>
                            </div>
                        </div>

                        <div class="passenger-tier-row">
                            <div class="passenger-tier-info">
                                <div class="passenger-tier-title">Children</div>
                                <div class="passenger-tier-sub">Age 2–11 years</div>
                            </div>
                            <div class="stepper-controls">
                                <button type="button" class="stepper-btn btn-child-minus" ${this.children <= 0 ? 'disabled' : ''}>&minus;</button>
                                <span class="stepper-count count-children">${this.children}</span>
                                <button type="button" class="stepper-btn btn-child-plus" ${this.children >= 8 ? 'disabled' : ''}>&#43;</button>
                            </div>
                        </div>

                        <div class="passenger-tier-row">
                            <div class="passenger-tier-info">
                                <div class="passenger-tier-title">Infants</div>
                                <div class="passenger-tier-sub">Under 2 years (on lap)</div>
                            </div>
                            <div class="stepper-controls">
                                <button type="button" class="stepper-btn btn-infant-minus" ${this.infants <= 0 ? 'disabled' : ''}>&minus;</button>
                                <span class="stepper-count count-infants">${this.infants}</span>
                                <button type="button" class="stepper-btn btn-infant-plus" ${this.infants >= this.adults ? 'disabled' : ''}>&#43;</button>
                            </div>
                        </div>

                        <div class="passenger-popover-footer">
                            <button type="button" class="btn btn-sm btn-primary w-full btn-passenger-apply">Apply</button>
                        </div>
                    </div>
                </div>
            `;

            this.summaryBtn = this.container.querySelector('#passenger-summary-toggle');
            this.popoverEl = this.container.querySelector('#passenger-popover');
        }

        bindEvents() {
            this.summaryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePopover();
            });

            // Adults
            this.container.querySelector('.btn-adult-minus').addEventListener('click', () => {
                if (this.adults > 1) {
                    this.adults--;
                    if (this.infants > this.adults) this.infants = this.adults;
                    this.updateCounts();
                }
            });
            this.container.querySelector('.btn-adult-plus').addEventListener('click', () => {
                if (this.adults < 9) {
                    this.adults++;
                    this.updateCounts();
                }
            });

            // Children
            this.container.querySelector('.btn-child-minus').addEventListener('click', () => {
                if (this.children > 0) {
                    this.children--;
                    this.updateCounts();
                }
            });
            this.container.querySelector('.btn-child-plus').addEventListener('click', () => {
                if (this.children < 8) {
                    this.children++;
                    this.updateCounts();
                }
            });

            // Infants
            this.container.querySelector('.btn-infant-minus').addEventListener('click', () => {
                if (this.infants > 0) {
                    this.infants--;
                    this.updateCounts();
                }
            });
            this.container.querySelector('.btn-infant-plus').addEventListener('click', () => {
                if (this.infants < this.adults) {
                    this.infants++;
                    this.updateCounts();
                }
            });

            // Apply button
            this.container.querySelector('.btn-passenger-apply').addEventListener('click', () => {
                this.closePopover();
            });

            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target)) {
                    this.closePopover();
                }
            });
        }

        updateCounts() {
            this.container.querySelector('.count-adults').innerText = this.adults;
            this.container.querySelector('.count-children').innerText = this.children;
            this.container.querySelector('.count-infants').innerText = this.infants;

            this.container.querySelector('.btn-adult-minus').disabled = this.adults <= 1;
            this.container.querySelector('.btn-adult-plus').disabled = this.adults >= 9;
            this.container.querySelector('.btn-child-minus').disabled = this.children <= 0;
            this.container.querySelector('.btn-child-plus').disabled = this.children >= 8;
            this.container.querySelector('.btn-infant-minus').disabled = this.infants <= 0;
            this.container.querySelector('.btn-infant-plus').disabled = this.infants >= this.adults;

            this.container.querySelector('.passenger-summary-label').innerText = this.getSummaryText();

            if (typeof this.onChange === 'function') {
                this.onChange(this.getValue());
            }
        }

        getSummaryText() {
            const parts = [];
            parts.push(`${this.adults} Adult${this.adults > 1 ? 's' : ''}`);
            if (this.children > 0) {
                parts.push(`${this.children} Child${this.children > 1 ? 'ren' : ''}`);
            }
            if (this.infants > 0) {
                parts.push(`${this.infants} Infant${this.infants > 1 ? 's' : ''}`);
            }
            return parts.join(', ');
        }

        togglePopover() {
            this.isOpen = !this.isOpen;
            this.popoverEl.style.display = this.isOpen ? 'block' : 'none';
        }

        closePopover() {
            this.isOpen = false;
            this.popoverEl.style.display = 'none';
        }

        getValue() {
            return {
                adults: this.adults,
                children: this.children,
                infants: this.infants,
                total: this.adults + this.children + this.infants
            };
        }

        setValue({ adults = 1, children = 0, infants = 0 }) {
            this.adults = Math.max(1, adults);
            this.children = Math.max(0, children);
            this.infants = Math.max(0, infants);
            this.updateCounts();
        }
    }

    window.PassengerDropdown = PassengerDropdown;
})();
