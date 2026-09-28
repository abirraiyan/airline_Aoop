/**
 * Aerowing Airlines — Airport Dataset & Searchable Airport Selector Component
 * Features IATA code lookup, city/country search, keyboard navigation, and mobile support.
 */

(function () {
    // Curated airport dataset covering database destinations & international hubs
    const AIRPORTS = [
        { code: 'DAC', city: 'Dhaka', country: 'Bangladesh', name: 'Hazrat Shahjalal International Airport' },
        { code: 'CGP', city: 'Chittagong', country: 'Bangladesh', name: 'Shah Amanat International Airport' },
        { code: 'ZYL', city: 'Sylhet', country: 'Bangladesh', name: 'Osmani International Airport' },
        { code: 'RUH', city: 'Riyadh', country: 'Saudi Arabia', name: 'King Khalid International Airport' },
        { code: 'JED', city: 'Jeddah', country: 'Saudi Arabia', name: 'King Abdulaziz International Airport' },
        { code: 'MED', city: 'Medina', country: 'Saudi Arabia', name: 'Prince Mohammad Bin Abdulaziz Airport' },
        { code: 'DMM', city: 'Dammam', country: 'Saudi Arabia', name: 'King Fahd International Airport' },
        { code: 'SIN', city: 'Singapore', country: 'Singapore', name: 'Singapore Changi Airport' },
        { code: 'CAN', city: 'Guangzhou', country: 'China', name: 'Guangzhou Baiyun International Airport' },
        { code: 'PEK', city: 'Beijing', country: 'China', name: 'Beijing Capital International Airport' },
        { code: 'PVG', city: 'Shanghai', country: 'China', name: 'Shanghai Pudong International Airport' },
        { code: 'DXB', city: 'Dubai', country: 'United Arab Emirates', name: 'Dubai International Airport' },
        { code: 'AUH', city: 'Abu Dhabi', country: 'United Arab Emirates', name: 'Zayed International Airport' },
        { code: 'DOH', city: 'Doha', country: 'Qatar', name: 'Hamad International Airport' },
        { code: 'LHR', city: 'London', country: 'United Kingdom', name: 'Heathrow Airport' },
        { code: 'JFK', city: 'New York', country: 'United States', name: 'John F. Kennedy International Airport' },
        { code: 'BKK', city: 'Bangkok', country: 'Thailand', name: 'Suvarnabhumi Airport' },
        { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', name: 'Kuala Lumpur International Airport' },
        { code: 'HND', city: 'Tokyo', country: 'Japan', name: 'Tokyo Haneda Airport' }
    ];

    class AirportSelector {
        /**
         * @param {HTMLElement} container 
         * @param {Object} options { id, label, placeholder, initialCode, onChange }
         */
        constructor(container, options = {}) {
            this.container = container;
            this.options = options;
            this.selectedAirport = null;
            this.highlightedIndex = -1;
            this.isOpen = false;

            if (options.initialCode) {
                this.selectedAirport = AIRPORTS.find(a => a.code === options.initialCode || a.city.toLowerCase() === options.initialCode.toLowerCase()) || null;
            }

            this.render();
            this.bindEvents();
        }

        render() {
            const id = this.options.id || 'airport-' + Math.random().toString(36).substring(2, 9);
            const label = this.options.label || 'Airport';
            const placeholder = this.options.placeholder || 'City or Airport Code';

            const displayValue = this.selectedAirport 
                ? `${this.selectedAirport.city} (${this.selectedAirport.code})` 
                : '';

            this.container.innerHTML = `
                <div class="airport-selector-wrapper" id="${id}-wrapper">
                    <label class="form-label" for="${id}-input">
                        ${label}
                    </label>
                    <div class="airport-input-box">
                        <svg class="airport-pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <input type="text" 
                               class="form-control airport-input" 
                               id="${id}-input" 
                               autocomplete="off" 
                               placeholder="${placeholder}" 
                               value="${displayValue}" />
                        ${this.selectedAirport ? `<button type="button" class="airport-clear-btn" title="Clear selection">&times;</button>` : ''}
                    </div>
                    <div class="airport-dropdown-menu" id="${id}-dropdown" style="display: none;">
                        <div class="airport-dropdown-list"></div>
                    </div>
                </div>
            `;

            this.inputEl = this.container.querySelector('.airport-input');
            this.dropdownEl = this.container.querySelector('.airport-dropdown-menu');
            this.listEl = this.container.querySelector('.airport-dropdown-list');
        }

        bindEvents() {
            this.inputEl.addEventListener('focus', () => {
                this.openDropdown();
                this.filterAirports(this.inputEl.value);
            });

            this.inputEl.addEventListener('input', (e) => {
                this.openDropdown();
                this.filterAirports(e.target.value);
            });

            this.inputEl.addEventListener('keydown', (e) => {
                this.handleKeyDown(e);
            });

            const clearBtn = this.container.querySelector('.airport-clear-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.clearSelection();
                });
            }

            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target)) {
                    this.closeDropdown();
                }
            });
        }

        filterAirports(query) {
            const cleanQuery = (query || '').trim().toLowerCase();
            let matches = AIRPORTS;

            if (cleanQuery) {
                matches = AIRPORTS.filter(a => 
                    a.code.toLowerCase().includes(cleanQuery) ||
                    a.city.toLowerCase().includes(cleanQuery) ||
                    a.country.toLowerCase().includes(cleanQuery) ||
                    a.name.toLowerCase().includes(cleanQuery)
                );
            }

            this.renderList(matches);
        }

        renderList(airports) {
            if (airports.length === 0) {
                this.listEl.innerHTML = `
                    <div class="airport-item-empty">No matching airports found</div>
                `;
                return;
            }

            this.listEl.innerHTML = airports.map((airport, idx) => `
                <div class="airport-item" data-code="${airport.code}" data-index="${idx}">
                    <div class="airport-item-code">${airport.code}</div>
                    <div class="airport-item-info">
                        <div class="airport-item-city">${airport.city}, ${airport.country}</div>
                        <div class="airport-item-name">${airport.name}</div>
                    </div>
                </div>
            `).join('');

            this.listEl.querySelectorAll('.airport-item').forEach(itemEl => {
                itemEl.addEventListener('click', () => {
                    const code = itemEl.getAttribute('data-code');
                    const selected = AIRPORTS.find(a => a.code === code);
                    if (selected) this.selectAirport(selected);
                });
            });
        }

        openDropdown() {
            this.isOpen = true;
            this.dropdownEl.style.display = 'block';
            this.filterAirports(this.inputEl.value);
        }

        closeDropdown() {
            this.isOpen = false;
            this.dropdownEl.style.display = 'none';
            if (this.selectedAirport) {
                this.inputEl.value = `${this.selectedAirport.city} (${this.selectedAirport.code})`;
            } else {
                this.inputEl.value = '';
            }
        }

        selectAirport(airport) {
            this.selectedAirport = airport;
            this.inputEl.value = `${airport.city} (${airport.code})`;
            this.closeDropdown();

            if (typeof this.options.onChange === 'function') {
                this.options.onChange(airport);
            }

            // Re-render to show clear button
            this.render();
            this.bindEvents();
        }

        clearSelection() {
            this.selectedAirport = null;
            this.inputEl.value = '';
            if (typeof this.options.onChange === 'function') {
                this.options.onChange(null);
            }
            this.render();
            this.bindEvents();
            this.inputEl.focus();
        }

        getValue() {
            return this.selectedAirport ? this.selectedAirport.code : '';
        }

        getCity() {
            return this.selectedAirport ? this.selectedAirport.city : '';
        }

        getAirport() {
            return this.selectedAirport;
        }

        setValue(codeOrCity) {
            if (!codeOrCity) {
                this.clearSelection();
                return;
            }
            const found = AIRPORTS.find(a => 
                a.code.toLowerCase() === codeOrCity.toLowerCase() ||
                a.city.toLowerCase() === codeOrCity.toLowerCase()
            );
            if (found) {
                this.selectAirport(found);
            }
        }

        handleKeyDown(e) {
            const items = this.listEl.querySelectorAll('.airport-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.highlightedIndex = (this.highlightedIndex + 1) % items.length;
                this.updateHighlight(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.highlightedIndex = (this.highlightedIndex - 1 + items.length) % items.length;
                this.updateHighlight(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.highlightedIndex >= 0 && items[this.highlightedIndex]) {
                    items[this.highlightedIndex].click();
                }
            } else if (e.key === 'Escape') {
                this.closeDropdown();
            }
        }

        updateHighlight(items) {
            items.forEach((item, idx) => {
                if (idx === this.highlightedIndex) {
                    item.classList.add('highlighted');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('highlighted');
                }
            });
        }
    }

    window.AirportSelector = AirportSelector;
    window.AEROWING_AIRPORTS = AIRPORTS;
})();
