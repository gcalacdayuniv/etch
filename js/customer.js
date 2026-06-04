// ==========================================================
// CUSTOMER.JS
// Domain: D1-backed Customer DB + LocalStorage Cache + Autocomplete
// ==========================================================

const CustomerManager = {
    state: {
        dbCustomers: [], // Loaded from D1 on demand
        lastFetch: 0
    },

    // ==========================================
    // LOCAL STORAGE (offline cache)
    // ==========================================
    _getLocal() {
        try { return JSON.parse(localStorage.getItem('etch_customers') || '[]'); }
        catch(e) { return []; }
    },

    _saveLocal(customers) {
        localStorage.setItem('etch_customers', JSON.stringify(customers.slice(0, 100)));
    },

    _upsertLocal(name, tin, address) {
        if (!name || !address) return;
        const customers = this._getLocal();
        const key = name.trim().toLowerCase();
        const idx = customers.findIndex(c => c.name.trim().toLowerCase() === key);
        const entry = { name: name.trim(), tin: (tin || '').trim(), address: address.trim() };
        if (idx > -1) customers[idx] = entry;
        else customers.unshift(entry);
        this._saveLocal(customers);
    },

    _deleteLocal(name) {
        const customers = this._getLocal().filter(c => c.name.trim().toLowerCase() !== name.trim().toLowerCase());
        this._saveLocal(customers);
    },

    // ==========================================
    // D1 SYNC
    // ==========================================
    async fetchFromDB() {
        const res = await apiCall('getCustomers', {});
        if (res.success) {
            this.state.dbCustomers = res.data || [];
            this.state.lastFetch = Date.now();
            // Merge into local cache so offline works
            const local = this._getLocal();
            const localNames = new Set(local.map(c => c.name.trim().toLowerCase()));
            res.data.forEach(c => {
                if (!localNames.has(c.name.trim().toLowerCase())) {
                    local.unshift({ name: c.name, tin: c.tin || '', address: c.address });
                }
            });
            this._saveLocal(local);
        }
        return this.state.dbCustomers;
    },

    async saveToDB(name, tin, address) {
        if (!name || !address) return;
        // Optimistically update local first
        this._upsertLocal(name, tin, address);
        // Sync to D1 (fire and forget, no blocking)
        apiCall('saveCustomer', { name: name.trim(), tin: (tin || '').trim(), address: address.trim(), userId: sessionId })
            .then(res => {
                if (res.success) {
                    // Refresh the in-memory list
                    const idx = this.state.dbCustomers.findIndex(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
                    if (idx > -1) {
                        this.state.dbCustomers[idx] = { ...this.state.dbCustomers[idx], tin: (tin || '').trim(), address: address.trim() };
                    } else {
                        this.state.dbCustomers.unshift({ id: res.id, name: name.trim(), tin: (tin || '').trim(), address: address.trim() });
                    }
                }
            });
    },

    async deleteFromDB(id, name, pass) {
        showLoading("Deleting customer...");
        const res = await apiCall('deleteDbCustomer', { id, userId: sessionId, pass });
        hideLoading();
        if (res.success) {
            this.state.dbCustomers = this.state.dbCustomers.filter(c => c.id !== id);
            this._deleteLocal(name);
            return true;
        } else {
            alert("Error: " + res.message);
            return false;
        }
    },

    // ==========================================
    // MERGED SOURCE (D1 + local, deduped by name)
    // ==========================================
    _getMerged() {
        const db = this.state.dbCustomers;
        const local = this._getLocal();
        const seen = new Set();
        const merged = [];
        // DB entries take priority
        db.forEach(c => {
            const key = c.name.trim().toLowerCase();
            if (!seen.has(key)) { seen.add(key); merged.push(c); }
        });
        // Fill with local-only entries (not yet synced or offline)
        local.forEach(c => {
            const key = c.name.trim().toLowerCase();
            if (!seen.has(key)) { seen.add(key); merged.push(c); }
        });
        return merged;
    },

    // ==========================================
    // AUTOCOMPLETE DROPDOWN
    // ==========================================
    renderDropdown(query, inputId, dropdownId, selectCallback) {
        const list = document.getElementById(dropdownId);
        if (!list) return;

        const customers = this._getMerged();
        const q = (query || '').trim().toLowerCase();
        const matches = q ? customers.filter(c => c.name.toLowerCase().includes(q)) : customers;

        if (matches.length === 0) {
            list.classList.add('hidden');
            return;
        }

        list.innerHTML = matches.map(c => `
            <div class="flex items-center justify-between px-3 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-0 group"
                 onclick="(${selectCallback.toString()})(${JSON.stringify(c).replace(/"/g,'&quot;')})">
                <div class="min-w-0 flex-1">
                    <p class="font-bold text-gray-800 text-sm truncate">${c.name}</p>
                    <p class="text-xs text-gray-400 truncate">${c.address}</p>
                </div>
            </div>`).join('');
        list.classList.remove('hidden');
    },

    // New quotation dropdown
    renderNewDropdown(query) {
        this.renderDropdown(query, 'customerName', 'customerSuggestions', (c) => {
            document.getElementById('customerName').value = c.name;
            document.getElementById('customerTIN').value = c.tin || '';
            document.getElementById('customerAddress').value = c.address;
            document.getElementById('customerSuggestions').classList.add('hidden');
        });
    },

    // Edit quotation dropdown
    renderEditDropdown(query) {
        this.renderDropdown(query, 'editCustomerName', 'editCustomerSuggestions', (c) => {
            document.getElementById('editCustomerName').value = c.name;
            document.getElementById('editCustomerTIN').value = c.tin || '';
            document.getElementById('editCustomerAddress').value = c.address;
            document.getElementById('editCustomerSuggestions').classList.add('hidden');
        });
    },

    // Legacy select (used by old HTML onclick bindings)
    select(c) {
        document.getElementById('customerName').value = c.name;
        document.getElementById('customerTIN').value = c.tin || '';
        document.getElementById('customerAddress').value = c.address;
        document.getElementById('customerSuggestions')?.classList.add('hidden');
    },

    // ==========================================
    // AUTOCOMPLETE SETUP
    // ==========================================
    setupAutocomplete() {
        this._setupInput('customerName', 'customerSuggestions', (q) => this.renderNewDropdown(q));
    },

    setupEditAutocomplete() {
        this._setupInput('editCustomerName', 'editCustomerSuggestions', (q) => this.renderEditDropdown(q));
    },

    _setupInput(inputId, dropdownId, renderFn) {
        const nameInput = document.getElementById(inputId);
        if (!nameInput) return;

        // Remove existing dropdown if present (re-setup)
        let existing = document.getElementById(dropdownId);
        if (!existing) {
            const wrapper = nameInput.closest('.relative') || nameInput.parentElement;
            wrapper.style.position = 'relative';
            const dropdown = document.createElement('div');
            dropdown.id = dropdownId;
            dropdown.className = 'hidden absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto';
            wrapper.appendChild(dropdown);
        }

        // Remove old listeners by cloning
        const fresh = nameInput.cloneNode(true);
        nameInput.parentNode.replaceChild(fresh, nameInput);

        fresh.addEventListener('input', (e) => renderFn(e.target.value));
        fresh.addEventListener('focus', (e) => {
            // Fetch fresh from DB if cache is stale (> 60s)
            if (Date.now() - this.state.lastFetch > 60000) {
                this.fetchFromDB().then(() => renderFn(e.target.value));
            } else {
                renderFn(e.target.value);
            }
        });
    },

    // ==========================================
    // CUSTOMER MANAGEMENT MODAL
    // ==========================================
    async openManageModal() {
        showLoading("Loading customers...");
        await this.fetchFromDB();
        hideLoading();
        this.renderManageList('');
        openFSModal('manageCustomersModal');
    },

    renderManageList(query) {
        const tbody = document.getElementById('customerManageBody');
        if (!tbody) return;

        const customers = this._getMerged();
        const q = (query || '').trim().toLowerCase();
        const filtered = q ? customers.filter(c => c.name.toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q)) : customers;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-10 text-center text-gray-400 font-semibold">No customers found.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(c => `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition group" id="cust-row-${c.id || ''}">
                <td class="px-3 py-2.5">
                    <p class="font-bold text-gray-800 text-sm">${c.name}</p>
                    <p class="text-xs text-gray-400">${c.address}</p>
                </td>
                <td class="px-3 py-2.5 text-xs text-gray-500">${c.tin || '—'}</td>
                <td class="px-3 py-2.5 text-right">
                    <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onclick="CustomerManager.openEditCustomerModal(${JSON.stringify(c).replace(/"/g,'&quot;')})"
                            class="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition" title="Edit">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        ${c.id ? `<button onclick="CustomerManager.promptDeleteCustomer('${c.id}', '${c.name.replace(/'/g, "\\'")}' )"
                            class="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" title="Delete">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>` : ''}
                    </div>
                </td>
            </tr>`).join('');
    },

    openAddCustomerModal() {
        document.getElementById('custModalTitle').innerText = 'Add Customer';
        document.getElementById('custSaveId').value = '';
        document.getElementById('custSaveName').value = '';
        document.getElementById('custSaveTIN').value = '';
        document.getElementById('custSaveAddress').value = '';
        openFSModal('saveCustomerModal');
    },

    openEditCustomerModal(c) {
        document.getElementById('custModalTitle').innerText = 'Edit Customer';
        document.getElementById('custSaveId').value = c.id || '';
        document.getElementById('custSaveName').value = c.name;
        document.getElementById('custSaveTIN').value = c.tin || '';
        document.getElementById('custSaveAddress').value = c.address;
        openFSModal('saveCustomerModal');
    },

    async submitSaveCustomer(e) {
        e.preventDefault();
        const id = document.getElementById('custSaveId').value;
        const name = document.getElementById('custSaveName').value.trim();
        const tin = document.getElementById('custSaveTIN').value.trim();
        const address = document.getElementById('custSaveAddress').value.trim();

        if (!name || !address) { alert("Name and address are required."); return; }

        showLoading("Saving...");
        const res = await apiCall('saveCustomer', { name, tin, address, userId: sessionId });
        hideLoading();

        if (res.success) {
            this._upsertLocal(name, tin, address);
            const idx = this.state.dbCustomers.findIndex(c => c.name.trim().toLowerCase() === name.toLowerCase());
            if (idx > -1) {
                this.state.dbCustomers[idx] = { ...this.state.dbCustomers[idx], tin, address };
            } else {
                this.state.dbCustomers.unshift({ id: res.id, name, tin, address });
            }
            closeFSModal('saveCustomerModal');
            this.renderManageList(document.getElementById('customerManageSearch')?.value || '');
        } else {
            alert("Error: " + res.message);
        }
    },

    promptDeleteCustomer(id, name) {
        if (!confirm(`Delete "${name}" from the customer database? This cannot be undone.`)) return;
        const pass = prompt("Enter your password to confirm:");
        if (!pass) return;
        this.deleteFromDB(id, name, pass).then(ok => {
            if (ok) this.renderManageList(document.getElementById('customerManageSearch')?.value || '');
        });
    },

    // ==========================================
    // LEGACY COMPAT
    // ==========================================
    getSaved() { return this._getLocal(); },

    save(name, tin, address) { this.saveToDB(name, tin, address); },

    delete(name) {
        this._deleteLocal(name);
        this.renderNewDropdown(document.getElementById('customerName')?.value || '');
    },

    // ==========================================
    // GLOBAL LISTENERS
    // ==========================================
    initGlobalListeners() {
        document.addEventListener('click', (e) => {
            // Close new quotation dropdown
            const sugg = document.getElementById('customerSuggestions');
            const nameField = document.getElementById('customerName');
            if (sugg && nameField && !nameField.contains(e.target) && !sugg.contains(e.target)) {
                sugg.classList.add('hidden');
            }
            // Close edit quotation dropdown
            const editSugg = document.getElementById('editCustomerSuggestions');
            const editField = document.getElementById('editCustomerName');
            if (editSugg && editField && !editField.contains(e.target) && !editSugg.contains(e.target)) {
                editSugg.classList.add('hidden');
            }
            // Close quote action menus
            if (!e.target.closest('.quote-more-btn') && !e.target.closest('.quote-action-menu')) {
                document.querySelectorAll('.quote-action-menu').forEach(m => m.classList.add('hidden'));
            }
        });

        // Auto-save to D1 on form submit
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'quotationForm') {
                const name = document.getElementById('customerName')?.value;
                const tin = document.getElementById('customerTIN')?.value;
                const address = document.getElementById('customerAddress')?.value;
                if (name && address) this.saveToDB(name, tin, address);
            } else if (e.target.id === 'editQuotationForm') {
                const name = document.getElementById('editCustomerName')?.value;
                const tin = document.getElementById('editCustomerTIN')?.value;
                const address = document.getElementById('editCustomerAddress')?.value;
                if (name && address) this.saveToDB(name, tin, address);
            }
        });

        // Save customer form
        document.getElementById('saveCustomerForm')?.addEventListener('submit', this.submitSaveCustomer.bind(this));

        // Manage modal search
        document.getElementById('customerManageSearch')?.addEventListener('input', (e) => {
            this.renderManageList(e.target.value);
        });
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    CustomerManager.setupAutocomplete();
    // Pre-load customers from D1 in background on app load
    if (typeof sessionId !== 'undefined' && sessionId) CustomerManager.fetchFromDB();
});

// Re-export for router/ui triggers
CustomerManager.initGlobalListeners();

// Global exports
window.CustomerManager = CustomerManager;
window.saveCustomer    = CustomerManager.save.bind(CustomerManager);
window.deleteCustomer  = CustomerManager.delete.bind(CustomerManager);
window.selectCustomer  = CustomerManager.select.bind(CustomerManager);