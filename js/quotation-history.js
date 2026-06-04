// ==========================================================
// QUOTATION-HISTORY.JS
// Domain: History List, Filtering, Pagination & Soft Deletes
// ==========================================================

const QuotationHistoryManager = {
    state: {
        viewMode: 'grid', // 'grid' | 'list'
        tabStatus: 'All',
        currentPage: 1,
        itemsPerPage: typeof ITEMS_PER_PAGE !== 'undefined' ? ITEMS_PER_PAGE : 10,
        allQuotations: [],
        filteredQuotations: []
    },

    _tabOrder: ['All', 'Sent', 'Approved', 'Rejected', 'Deleted'],

    _skeletonHTML() {
        return '<div class="bg-white p-5 rounded-xl border border-gray-100 col-span-1 md:col-span-2 lg:col-span-3"><div class="skeleton h-5 w-3/4 mb-2"></div><div class="skeleton h-3 w-1/2"></div></div>';
    },

    async load() {
        document.getElementById('quotationCardsContainer').innerHTML = this._skeletonHTML();
        this._enforceDeletedTab();

        const res = await apiCall("getUserQuotations", { agentId: sessionId, agentName: sessionName, role: sessionRole });

        if (res.success) {
            this.state.allQuotations = (res.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            if (this.state.tabStatus === 'Deleted' && sessionRole !== 'Superuser') {
                this.state.tabStatus = 'All';
            }
            if (this.state.tabStatus === 'Deleted') this._loadDeleted();
            else this.filter();
        }
    },

    _enforceDeletedTab() {
        const deletedTabBtn = document.getElementById('quote-btn-Deleted');
        if (!deletedTabBtn) return;
        if (sessionRole === 'Superuser') {
            deletedTabBtn.classList.remove('hidden');
        } else {
            deletedTabBtn.classList.add('hidden');
            if (this.state.tabStatus === 'Deleted') this.state.tabStatus = 'All';
        }
    },

    async _loadDeleted() {
        const res = await apiCall("getUserQuotations", { agentId: sessionId, agentName: sessionName, role: sessionRole, showDeleted: true });
        if (res.success) {
            this.state.filteredQuotations = (res.deletedData || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            this.state.currentPage = 1;
            this.render();
        }
    },

    setViewMode(mode) {
        this.state.viewMode = mode;
        const gridBtn = document.getElementById('viewToggleGrid');
        const listBtn = document.getElementById('viewToggleList');
        if (gridBtn && listBtn) {
            const activeClass = 'p-1.5 rounded bg-white text-indigo-600 shadow-sm border border-gray-200 transition';
            const inactiveClass = 'p-1.5 rounded text-gray-400 hover:text-gray-600 transition';
            gridBtn.className = mode === 'grid' ? activeClass : inactiveClass;
            listBtn.className = mode === 'list' ? activeClass : inactiveClass;
        }
        this.render();
    },

    async switchTab(status) {
        if (status === 'Deleted' && sessionRole !== 'Superuser') return;
        this.state.tabStatus = status;
        this._enforceDeletedTab();

        document.querySelectorAll('.tab-btn-quote').forEach(btn => {
            btn.className = "tab-btn-quote flex-1 min-w-[70px] py-1.5 px-3 text-xs font-bold text-gray-500 rounded transition hover:bg-gray-200";
        });
        const activeTabEl = document.getElementById(`quote-btn-${status}`);
        if (activeTabEl) {
            activeTabEl.className = "tab-btn-quote active flex-1 min-w-[70px] py-1.5 px-3 text-xs font-bold rounded transition bg-white text-indigo-600 shadow-sm";
        }

        if (status === 'Deleted' && sessionRole === 'Superuser') {
            document.getElementById('quotationCardsContainer').innerHTML = this._skeletonHTML();
            await this._loadDeleted();
        } else {
            this.filter();
        }
    },

    swipeToAdjacentTab(direction) {
        const visibleTabs = this._tabOrder.filter(t => {
            if (t === 'Deleted' && sessionRole !== 'Superuser') return false;
            return true;
        });
        const currentIdx = visibleTabs.indexOf(this.state.tabStatus);
        if (currentIdx === -1) return;
        const nextIdx = currentIdx + direction;
        if (nextIdx < 0 || nextIdx >= visibleTabs.length) return;
        this.switchTab(visibleTabs[nextIdx]);
    },

    changePage(dir) {
        this.state.currentPage += dir;
        this.render();
    },

    filter() {
        const query = document.getElementById('searchBar')?.value.toLowerCase() || "";
        this.state.filteredQuotations = this.state.allQuotations.filter(q => {
            const matchesSearch = q.customer_name.toLowerCase().includes(query) || q.quotation_number.toLowerCase().includes(query);
            const matchesTab = this.state.tabStatus === 'All' || q.status === this.state.tabStatus;
            return matchesSearch && matchesTab;
        });
        this.state.currentPage = 1;
        this.render();
    },

    render() {
        const container = document.getElementById('quotationCardsContainer');
        if (!container) return;
        container.innerHTML = "";
        
        const start = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const paginatedItems = this.state.filteredQuotations.slice(start, start + this.state.itemsPerPage);

        // Safeguard to ensure classes override always preserves the min-height for swiping capabilities
        if (paginatedItems.length === 0) {
            container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[75vh] content-start';
            container.innerHTML = "<p class='col-span-full text-center text-gray-500 font-semibold py-8'>No quotations found.</p>";
            document.getElementById('prevQuoteBtn')?.classList.add('hidden');
            document.getElementById('nextQuoteBtn')?.classList.add('hidden');
            return;
        }

        const isDeletedView = (this.state.tabStatus === 'Deleted');

        if (this.state.viewMode === 'list') this._renderList(container, paginatedItems, isDeletedView, start);
        else this._renderGrid(container, paginatedItems, isDeletedView);

        document.getElementById('prevQuoteBtn')?.classList.toggle('hidden', this.state.currentPage <= 1);
        document.getElementById('nextQuoteBtn')?.classList.toggle('hidden', (this.state.currentPage * this.state.itemsPerPage) >= this.state.filteredQuotations.length);
    },

    _buildMeta(q) {
        const qDate = new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const statusClass = 'status-' + q.status.replace(/\s+/g, '');
        const totalAmt = q.total_amount != null ? '₱' + Number(q.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : null;
        return { qDate, statusClass, totalAmt };
    },

    _buildStatusControl(q, isDeletedView, statusClass) {
        if (isDeletedView) return `<span class="status-badge ${statusClass}">${q.status}</span>`;
        if (q.status === 'Approved' && sessionRole !== 'Superuser') {
            return `<span class="status-badge ${statusClass}" title="Approved — contact a Superuser to change">${q.status}</span>`;
        }
        return `<select class="status-badge ${statusClass}" onchange="this.className='status-badge status-'+this.value.replace(/\\s+/g,''); updateQStatus('${q.quotation_number}', this.value, this)">
            <option value="Sent" ${q.status==='Sent'?'selected':''}>Sent</option>
            <option value="Approved" ${q.status==='Approved'?'selected':''}>Approved</option>
            <option value="Rejected" ${q.status==='Rejected'?'selected':''}>Rejected</option>
        </select>`;
    },

    _renderGrid(container, items, isDeletedView) {
        container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[75vh] content-start';
        items.forEach(q => {
            const { qDate, statusClass, totalAmt } = this._buildMeta(q);
            const div = document.createElement('div');
            div.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 relative flex flex-col hover:shadow-md transition' + (isDeletedView ? ' opacity-60' : '');

            const deleteBtn = isDeletedView
                ? `<span class="absolute top-3 right-3 px-2 py-0.5 bg-red-50 text-red-400 rounded-full text-[10px] font-bold border border-red-100">Deleted</span>`
                : `<button class="absolute top-3 right-3 p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition" onclick="confirmDelete('${q.quotation_number}')" title="Delete"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>`;

            const canEdit = (!isDeletedView && (q.status !== 'Approved' || sessionRole === 'Superuser'));
            const showPDFActions = !isDeletedView || sessionRole === 'Superuser';
            
            const actionButtons = showPDFActions ? `
                <div class="flex gap-2 w-full mt-auto pt-3">
                  ${canEdit ? `<button class="flex-1 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold py-1.5 rounded-lg transition text-[11px] uppercase tracking-wide" onclick="openEditQuotationModal('${q.quotation_number}')">Edit</button>` : ''}
                  <button class="flex-1 bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 font-bold py-1.5 rounded-lg transition text-[11px] uppercase tracking-wide" onclick="previewPDF('${q.quotation_number}')">Preview</button>
                  <button class="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-1.5 rounded-lg transition text-[11px] uppercase tracking-wide" onclick="downloadPDF('${q.quotation_number}')">Download</button>
                </div>` : '';

            div.innerHTML = `
                ${deleteBtn}
                <h3 class="font-bold text-base text-gray-800 pr-8 mb-1 truncate">${q.customer_name}</h3>
                <div class="flex justify-between items-center mb-1">
                    <p class="text-xs font-bold text-indigo-600">#${q.quotation_number}</p>
                    <p class="text-[10px] text-gray-500">${qDate}</p>
                </div>
                ${totalAmt ? `<p class="text-sm font-black text-emerald-600 mb-2">${totalAmt}</p>` : ''}
                <div class="mb-2">${this._buildStatusControl(q, isDeletedView, statusClass)}</div>
                ${actionButtons}`;
            container.appendChild(div);
        });
    },

    _renderList(container, items, isDeletedView, startIdx) {
        container.className = 'flex flex-col gap-1.5 min-h-[75vh]';
        items.forEach((q, index) => {
            const { qDate, statusClass, totalAmt } = this._buildMeta(q);
            const sequenceNumber = startIdx + index + 1;
            const menuId = `qmenu-${q.quotation_number}`;

            const div = document.createElement('div');
            div.className = 'bg-white px-2 py-1.5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2 hover:shadow-md transition' + (isDeletedView ? ' opacity-60' : '');

            const canEdit = !isDeletedView && ((q.status !== 'Approved') || (sessionRole === 'Superuser'));
            const showPDFActions = !isDeletedView || sessionRole === 'Superuser';

            let menuItems = '';
            if (showPDFActions) {
                menuItems += `
                    <button class="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition" onclick="previewPDF('${q.quotation_number}'); document.getElementById('${menuId}').classList.add('hidden')">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Preview
                    </button>
                    <button class="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg transition" onclick="downloadPDF('${q.quotation_number}'); document.getElementById('${menuId}').classList.add('hidden')">
                        <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Download PDF
                    </button>`;
            }
            if (canEdit) {
                menuItems += `
                    <button class="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition" onclick="openEditQuotationModal('${q.quotation_number}'); document.getElementById('${menuId}').classList.add('hidden')">
                        <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        Edit
                    </button>`;
            }
            if (!isDeletedView) {
                menuItems += `
                    <div class="border-t border-gray-100 my-1"></div>
                    <button class="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition" onclick="confirmDelete('${q.quotation_number}'); document.getElementById('${menuId}').classList.add('hidden')">
                        <svg class="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        Delete
                    </button>`;
            }
            if (isDeletedView) {
                menuItems += `<p class="px-3 py-2 text-[10px] font-bold text-red-400 uppercase tracking-wider">Deleted</p>`;
            }

            div.innerHTML = `
                <div class="shrink-0 w-7 h-7 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">${sequenceNumber}</div>
                <div class="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 class="text-xs font-bold text-gray-900 leading-tight truncate" title="${q.customer_name}">${q.customer_name}</h3>
                    <p class="text-[9px] text-gray-500 truncate mt-0.5"><span class="font-bold text-indigo-400">#${q.quotation_number}</span> &bull; ${qDate}</p>
                </div>
                <div class="shrink-0 flex flex-col items-end justify-center">
                    ${totalAmt ? `<span class="text-xs font-black text-gray-800 leading-none mb-0.5">${totalAmt}</span>` : ''}
                    <div class="scale-90 origin-right">${this._buildStatusControl(q, isDeletedView, statusClass)}</div>
                </div>
                <div class="relative shrink-0">
                    <button class="quote-more-btn p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition" onclick="event.stopPropagation(); document.querySelectorAll('.quote-action-menu').forEach(m=>m.id!=='${menuId}'&&m.classList.add('hidden')); document.getElementById('${menuId}').classList.toggle('hidden')"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
                    <div id="${menuId}" class="quote-action-menu hidden absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-44 p-1">${menuItems}</div>
                </div>`;
            container.appendChild(div);
        });
    },

    confirmDelete(qNumber) {
        document.getElementById('delQNum').value = qNumber;
        document.getElementById('delPass').value = "";
        openFSModal('deleteModal');
    },

    async processDelete(e) {
        e.preventDefault();
        const pass = document.getElementById('delPass').value;
        const qNum = document.getElementById('delQNum').value;
        showLoading("Deleting...");
        const res = await apiCall("deleteQuotation", { qNumber: qNum, userId: sessionId, pass });
        hideLoading();
        
        if (res.success) {
            closeFSModal('deleteModal');
            this.state.allQuotations = this.state.allQuotations.filter(q => q.quotation_number !== qNum);
            this.filter();
        } else {
            alert("Error: " + res.message);
        }
    },

    async updateStatus(qNum, newStatus, selectEl) {
        const res = await apiCall("updateQuotationStatus", { qNumber: qNum, status: newStatus });
        if (res.success) {
            const idx = this.state.allQuotations.findIndex(q => q.quotation_number === qNum);
            if (idx > -1) this.state.allQuotations[idx].status = newStatus;
            this.filter();
        } else {
            alert("Failed to update status.");
            if (selectEl) {
                const orig = this.state.allQuotations.find(q => q.quotation_number === qNum);
                if (orig) {
                    selectEl.value = orig.status;
                    selectEl.className = 'status-badge status-' + orig.status.replace(/\s+/g, '');
                }
            }
        }
    },

    // ==========================================
    // SWIPE GESTURE INIT FOR QUOTATION TABS
    // ==========================================
    initSwipeGesture() {
        const view = document.getElementById('quotationsView');
        if (!view) return;
        let startX = 0, startY = 0;

        view.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        view.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                QuotationHistoryManager.swipeToAdjacentTab(dx < 0 ? 1 : -1);
            }
        }, { passive: true });
    }
};

// Event Listeners
document.getElementById('deleteForm')?.addEventListener('submit', QuotationHistoryManager.processDelete.bind(QuotationHistoryManager));
document.getElementById('searchBar')?.addEventListener('input', QuotationHistoryManager.filter.bind(QuotationHistoryManager));
document.addEventListener('DOMContentLoaded', () => QuotationHistoryManager.initSwipeGesture());
if (document.readyState !== 'loading') QuotationHistoryManager.initSwipeGesture();

// Global exports for HTML onclick bindings
window.showHistory = QuotationHistoryManager.load.bind(QuotationHistoryManager);
window.setQuoteViewMode = QuotationHistoryManager.setViewMode.bind(QuotationHistoryManager);
window.switchQuoteTab = QuotationHistoryManager.switchTab.bind(QuotationHistoryManager);
window.changeQuotePage = QuotationHistoryManager.changePage.bind(QuotationHistoryManager);
window.confirmDelete = QuotationHistoryManager.confirmDelete.bind(QuotationHistoryManager);
window.updateQStatus = QuotationHistoryManager.updateStatus.bind(QuotationHistoryManager);