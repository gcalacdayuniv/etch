// ==========================================================
// QUOTATION-FORM.JS
// Domain: Creating and Editing Quotations (Modals & Logic)
// ==========================================================

const QuotationFormManager = {
    state: {
        newLineItemCount: 0,
        editLineItemCount: 0,
        editingQNumber: null
    },

    // --- NEW QUOTATION ---
    openNew() {
        if (this.state.newLineItemCount === 0) this.addLineItem();
        CustomerManager.setupAutocomplete();
        // Refresh dropdown data in background
        if (Date.now() - CustomerManager.state.lastFetch > 60000) CustomerManager.fetchFromDB();
        openFSModal('newQuotationModal');
    },

    clear() {
        document.getElementById('quotationForm')?.reset();
        const container = document.getElementById('lineItemsContainer');
        if (container) container.innerHTML = "";
        this.state.newLineItemCount = 0;
        this.addLineItem();
        document.getElementById('customerSuggestions')?.classList.add('hidden');
    },

    addLineItem() {
        this.state.newLineItemCount++;
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-4 rounded-xl border border-gray-200 relative mb-3';
        div.innerHTML = `
          <div class="flex justify-between items-center mb-2">
            <h3 class="item-number-label font-bold text-gray-400 text-[10px] tracking-widest uppercase">Item No.${this.state.newLineItemCount}</h3>
            ${this.state.newLineItemCount > 1 ? '<button type="button" class="text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded text-xs font-bold" onclick="removeItem(this)">Remove</button>' : ''}
          </div>
          <input type="text" name="itemDescription" class="w-full px-3 py-2 mb-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Description" required>
          <div class="flex flex-col sm:flex-row gap-2">
            <input type="number" name="quantity" class="w-full sm:w-1/3 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Qty" required>
            <input type="number" name="unitCost" class="w-full sm:w-2/3 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Unit Price" step="0.01" required>
          </div>`;
        document.getElementById('lineItemsContainer')?.appendChild(div);
    },

    removeItem(btn) {
        btn.closest('div.bg-gray-50').remove();
        const labels = document.querySelectorAll('.item-number-label');
        this.state.newLineItemCount = labels.length;
        labels.forEach((l, i) => l.innerText = 'Item No.' + (i + 1));
    },

    async submitNew(e) {
        e.preventDefault();
        showLoading("Submitting...");
        const customerName = document.getElementById('customerName').value;
        const customerTIN = document.getElementById('customerTIN').value;
        const customerAddress = document.getElementById('customerAddress').value;
        const paymentTerms = document.getElementById('paymentTerms').value;

        const data = {
            customerName, customerTIN, customerAddress, paymentTerms,
            preparedBy: sessionName,
            preparedById: sessionId,
            preparedByEmail: sessionEmail,
            preparedByContact: sessionContact,
            itemDescription: Array.from(document.getElementsByName('itemDescription')).map(el => el.value),
            quantity: Array.from(document.getElementsByName('quantity')).map(el => el.value),
            unitCost: Array.from(document.getElementsByName('unitCost')).map(el => el.value)
        };

        const res = await apiCall("processForm", data);
        hideLoading();
        if (res.success) {
            // Save customer to D1
            CustomerManager.saveToDB(customerName, customerTIN, customerAddress);
            this.clear();
            closeFSModal('newQuotationModal');
            document.getElementById('postGenActions')?.classList.remove('hidden');
            openFSModal('pdfModal');
            if(typeof showHistory === 'function') showHistory();
        } else {
            alert("Error saving: " + res.message);
        }
    },

    // --- EDIT QUOTATION ---
    async openEdit(qNumber) {
        showLoading("Loading quotation...");
        const res = await apiCall("getQuotationDetail", { qNumber });
        hideLoading();
        if (!res.success) { alert("Failed to load: " + res.message); return; }

        const d = res.data;
        this.state.editingQNumber = qNumber;

        document.getElementById('editQNumber').value = qNumber;
        document.getElementById('editCustomerName').value = d.customerName;
        document.getElementById('editCustomerTIN').value = d.customerTIN || '';
        document.getElementById('editCustomerAddress').value = d.customerAddress || '';
        document.getElementById('editPaymentTerms').value = d.paymentTerms || '';

        const container = document.getElementById('editLineItemsContainer');
        container.innerHTML = '';
        this.state.editLineItemCount = 0;
        
        (d.items || []).forEach(item => this.addEditLineItem(item.description, item.quantity, item.unitCost));
        if (this.state.editLineItemCount === 0) this.addEditLineItem();

        openFSModal('editQuotationModal');

        // Setup edit autocomplete after modal is open (DOM is ready)
        requestAnimationFrame(() => {
            CustomerManager.setupEditAutocomplete();
            if (Date.now() - CustomerManager.state.lastFetch > 60000) CustomerManager.fetchFromDB();
        });
    },

    addEditLineItem(desc = '', qty = '', price = '') {
        this.state.editLineItemCount++;
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-4 rounded-xl border border-gray-200 relative mb-3';
        div.innerHTML = `
          <div class="flex justify-between items-center mb-2">
            <h3 class="edit-item-number-label font-bold text-gray-400 text-[10px] tracking-widest uppercase">Item No.${this.state.editLineItemCount}</h3>
            ${this.state.editLineItemCount > 1 ? '<button type="button" class="text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded text-xs font-bold" onclick="removeEditItem(this)">Remove</button>' : ''}
          </div>
          <input type="text" name="editItemDescription" class="w-full px-3 py-2 mb-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Description" value="${desc.replace(/"/g,'&quot;')}" required>
          <div class="flex flex-col sm:flex-row gap-2">
            <input type="number" name="editQuantity" class="w-full sm:w-1/3 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Qty" value="${qty}" required>
            <input type="number" name="editUnitCost" class="w-full sm:w-2/3 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Unit Price" step="0.01" value="${price}" required>
          </div>`;
        document.getElementById('editLineItemsContainer').appendChild(div);
    },

    removeEditItem(btn) {
        btn.closest('div.bg-gray-50').remove();
        const labels = document.querySelectorAll('.edit-item-number-label');
        this.state.editLineItemCount = labels.length;
        labels.forEach((l, i) => l.innerText = 'Item No.' + (i + 1));
    },

    async submitEdit(e) {
        e.preventDefault();
        if (!this.state.editingQNumber) return;
        showLoading("Saving changes...");

        const customerName = document.getElementById('editCustomerName').value;
        const customerTIN = document.getElementById('editCustomerTIN').value;
        const customerAddress = document.getElementById('editCustomerAddress').value;
        const paymentTerms = document.getElementById('editPaymentTerms').value;

        const data = {
            qNumber: this.state.editingQNumber,
            userId: sessionId,
            customerName,
            customerTIN,
            customerAddress,
            paymentTerms,
            itemDescription: Array.from(document.getElementsByName('editItemDescription')).map(el => el.value),
            quantity: Array.from(document.getElementsByName('editQuantity')).map(el => el.value),
            unitCost: Array.from(document.getElementsByName('editUnitCost')).map(el => el.value)
        };

        const res = await apiCall("editQuotation", data);
        hideLoading();
        if (res.success) {
            // Save/update customer in D1
            CustomerManager.saveToDB(customerName, customerTIN, customerAddress);
            closeFSModal('editQuotationModal');
            if(typeof showHistory === 'function') showHistory();
        } else {
            alert("Error: " + res.message);
        }
    }
};

// Event Listeners
document.getElementById('quotationForm')?.addEventListener('submit', QuotationFormManager.submitNew.bind(QuotationFormManager));
document.getElementById('editQuotationForm')?.addEventListener('submit', QuotationFormManager.submitEdit.bind(QuotationFormManager));

// Global exports for HTML onclick bindings
window.openNewQuotationModal  = QuotationFormManager.openNew.bind(QuotationFormManager);
window.clearQuotationForm     = QuotationFormManager.clear.bind(QuotationFormManager);
window.addLineItem            = QuotationFormManager.addLineItem.bind(QuotationFormManager);
window.removeItem             = QuotationFormManager.removeItem.bind(QuotationFormManager);
window.openEditQuotationModal = QuotationFormManager.openEdit.bind(QuotationFormManager);
window.addEditLineItem        = QuotationFormManager.addEditLineItem.bind(QuotationFormManager);
window.removeEditItem         = QuotationFormManager.removeEditItem.bind(QuotationFormManager);
