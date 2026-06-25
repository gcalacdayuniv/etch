// ==========================================================
// LEDGER.JS
// Handles: Project Ledgers, Records, & Financial Calculations
// ==========================================================

// ==========================================
// LEDGER NAVIGATION (Arrow Keys)
// ==========================================
const LedgerNav = {
    currentIndex() {
        if (!currentProject || !allProjects) return -1;
        return allProjects.findIndex(p => p.name === currentProject.name);
    },

    navigate(dir) {
        const modal = document.getElementById('ledgerModal');
        if (!modal || modal.classList.contains('hidden')) return;
        const childOpen = document.querySelector(
            '#recordModal:not(.hidden), #subLedgerModal:not(.hidden), #imageModal:not(.hidden)'
        );
        if (childOpen) return;

        const idx = this.currentIndex();
        if (idx === -1) return;
        const next = idx + dir;
        if (next < 0 || next >= allProjects.length) return;

        const nextProject = allProjects[next];
        navigateTo('/ledger/' + encodeURIComponent(nextProject.name));
    },

    hide() {
        const modal = document.getElementById('ledgerModal');
        if (modal) {
            modal.classList.remove('ledger-sheet-open');
            setTimeout(() => modal.classList.add('hidden'), 320);
        }
        document.getElementById('ledgerBottomNav')?.classList.add('hidden');
        document.getElementById('ledgerBackdrop')?.classList.add('hidden');
        document.body.style.overflow = '';
    },

    _updateNavButtons() {
        const idx = this.currentIndex();
        const prevBtn = document.getElementById('ledgerNavPrev');
        const nextBtn = document.getElementById('ledgerNavNext');
        const counter = document.getElementById('ledgerNavCounter');
        if (!prevBtn || !nextBtn) return;
        prevBtn.classList.toggle('opacity-30', idx <= 0);
        prevBtn.disabled = (idx <= 0);
        nextBtn.classList.toggle('opacity-30', idx >= allProjects.length - 1);
        nextBtn.disabled = (idx >= allProjects.length - 1);
        if (counter) counter.innerText = allProjects.length > 1 ? `${idx + 1} / ${allProjects.length}` : '';
    },

    initListeners() {
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('ledgerModal');
            if (!modal || modal.classList.contains('hidden')) return;
            const childOpen = document.querySelector(
                '#recordModal:not(.hidden), #subLedgerModal:not(.hidden), #imageModal:not(.hidden)'
            );
            if (childOpen) return;
            if (e.key === 'ArrowLeft') this.navigate(-1);
            if (e.key === 'ArrowRight') this.navigate(1);
        });
    }
};

// ==========================================
// CORE LEDGER FUNCTIONS
// ==========================================

function switchLedgerTab(tabName) {
    document.querySelectorAll('#ledgerModal .tab-btn').forEach(btn => btn.classList.remove('active', 'bg-white', 'text-indigo-600', 'shadow-sm'));
    document.querySelectorAll('#ledgerModal .tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById('btn-' + tabName).classList.add('active', 'bg-white', 'text-indigo-600', 'shadow-sm');
    document.getElementById('view-' + tabName).classList.add('active');
}

async function openLedger(pName) {
    document.getElementById('mProjName').innerText = pName;
    switchLedgerTab('profit');

    document.getElementById('topNetProfit').innerHTML = '<div class="skeleton h-8 w-32 mx-auto rounded"></div>';
    document.getElementById('totalCashBal').innerHTML = '<div class="skeleton h-6 w-24 mx-auto rounded"></div>';
    document.getElementById('unpaidBal').innerHTML = '<div class="skeleton h-6 w-24 mx-auto rounded"></div>';
    document.getElementById('ledgerBody').innerHTML = '<tr><td colspan="4" class="p-4"><div class="skeleton h-4 w-full mb-2"></div><div class="skeleton h-4 w-3/4"></div></td></tr>';
    document.getElementById('shareDisplay').innerHTML = '<div class="skeleton h-24 w-full mt-3 rounded-xl col-span-1 md:col-span-2"></div>';
    document.getElementById('cashBody').innerHTML = '<tr><td colspan="4" class="p-4"><div class="skeleton h-4 w-full"></div></td></tr>';
    document.getElementById('ledgerThumbImg').src = typeof sessionFallbackThumb !== 'undefined' ? sessionFallbackThumb : '';
    document.getElementById('ledgerThumbUploadBtn').classList.add('hidden');

    // Show backdrop
    const backdrop = document.getElementById('ledgerBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
    }

    // Show modal as bottom sheet
    const modal = document.getElementById('ledgerModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add('ledger-sheet-open');
            });
        });
    }

    document.getElementById('ledgerBottomNav')?.classList.remove('hidden');
    LedgerNav._updateNavButtons();
    await fetchAndRefreshLedger(pName);
}

function closeLedgerModal() {
    LedgerNav.hide();
    navigateTo('/dashboard');
}

async function fetchAndRefreshLedger(projectName) {
    const res = await apiCall("getProjectLedger", { projectName });
    if (res.success) {
        currentProject = res.data;
        document.getElementById('govDueCheck').checked = (currentProject.is_taxable !== 0);

        const statusSel = document.getElementById('ledgerStatusSelect');
        const dbStatus = currentProject.status || 'In Progress';
        statusSel.value = dbStatus;
        statusSel.className = 'status-badge status-' + dbStatus.replace(/\s+/g, '');

        const thumbUrl = currentProject.thumbnail_url ? formatImageUrl(currentProject.thumbnail_url) : sessionFallbackThumb;
        const thumbImg = document.getElementById('ledgerThumbImg');
        thumbImg.src = thumbUrl;
        thumbImg.onerror = function() { this.src = sessionFallbackThumb; this.onerror = null; };

        const canUpload = (sessionRole === 'Superuser' || sessionId === currentProject.mainAgentId || sessionId === currentProject.coAgentId);
        document.getElementById('ledgerThumbUploadBtn').classList.toggle('hidden', !canUpload);

        document.getElementById('mProjName').innerText = currentProject.name;
        LedgerNav._updateNavButtons();

        refreshLedgerCalculation();
    } else {
        alert("Error loading ledger details.");
    }
}

async function toggleTaxPreference() {
    const isTaxable = document.getElementById('govDueCheck').checked;
    const res = await apiCall("toggleProjectTax", { projectName: currentProject.name, isTaxable });
    if (res.success) {
        currentProject.is_taxable = isTaxable ? 1 : 0;
        const pIndex = allProjects.findIndex(p => p.name === currentProject.name);
        if (pIndex > -1) allProjects[pIndex].is_taxable = currentProject.is_taxable;
        refreshLedgerCalculation();
        if (typeof fetchAndRenderDashboard === 'function') fetchAndRenderDashboard();
    } else {
        alert("Failed to save tax preference.");
        document.getElementById('govDueCheck').checked = !isTaxable;
    }
}

async function toggleProjectStatus(newStatus) {
    const sel = document.getElementById('ledgerStatusSelect');
    sel.className = 'status-badge status-' + newStatus.replace(/\s+/g, '');
    const res = await apiCall("updateProjectStatus", { projectName: currentProject.name, status: newStatus });
    if (res.success) {
        currentProject.status = newStatus;
        const pIndex = allProjects.findIndex(p => p.name === currentProject.name);
        if (pIndex > -1) allProjects[pIndex].status = newStatus;
        if (typeof fetchAndRenderDashboard === 'function') fetchAndRenderDashboard();
    } else {
        alert("Failed to update status.");
        sel.value = currentProject.status;
        sel.className = 'status-badge status-' + (currentProject.status || 'In Progress').replace(/\s+/g, '');
    }
}

function triggerLedgerThumbUpload() {
    document.getElementById('ledgerThumbInput').click();
}

async function handleLedgerThumbUpload(event) {
    const file = event.target.files[0];
    if (!file || !currentProject) return;
    
    showLoading("Uploading...");
    const fileData = await compressImageToWebP(file);
    const res = await apiCall("updateThumbnail", {
        projectName: currentProject.name,
        fileData,
        callerId: sessionId,
        callerRole: sessionRole
    });
    
    hideLoading();
    document.getElementById('ledgerThumbInput').value = "";
    
    if (res.success) {
        const newUrl = formatImageUrl(res.thumbnailUrl);
        const thumbImg = document.getElementById('ledgerThumbImg');
        thumbImg.src = newUrl;
        thumbImg.onerror = function() { this.src = sessionFallbackThumb; this.onerror = null; };
        currentProject.thumbnail_url = res.thumbnailUrl;
        const pIndex = allProjects.findIndex(p => p.name === currentProject.name);
        if (pIndex > -1) allProjects[pIndex].thumbnail_url = res.thumbnailUrl;
        if (typeof fetchAndRenderDashboard === 'function') fetchAndRenderDashboard();
    } else {
        alert("Failed: " + (res.message || ""));
    }
}

function refreshLedgerCalculation() {
    if (!currentProject) return;
    const p = currentProject;

    const ledgerFAB = document.getElementById('ledgerFAB');
    if (ledgerFAB) ledgerFAB.onclick = () => _openRecordForm(p);

    let rows = "";
    let totalSales = 0, totalExpenses = 0;

    const mainLedgerItems = p.transactions.filter(t => t.type === 'Sales' || t.type === 'Expense').sort((a, b) => (a.type === 'Sales' ? -1 : 1));

    mainLedgerItems.forEach(t => {
        const amt = Number(t.amount);
        if (t.type === 'Sales') totalSales += amt;
        else totalExpenses += amt;

        let trClickAttr = "", trStyleAttr = "", iconHtml = "";
        if (t.receipt_url) {
            const imgUrl = formatImageUrl(t.receipt_url);
            trClickAttr = `onclick="openFSModal('imageModal'); document.getElementById('modalImageSrc').src='${imgUrl}'" title="View Receipt"`;
            trStyleAttr = "cursor-pointer hover:bg-indigo-50 transition";
            iconHtml = ` <svg class="w-4 h-4 inline text-indigo-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
        }
        const dt = new Date(t.created_at).toISOString().split('T')[0];
        const typeClass = t.type === 'Sales' ? 'text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-xs' : 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs';
        rows += `<tr ${trClickAttr} class="${trStyleAttr} border-b border-gray-50">
            <td class="px-3 py-2 whitespace-nowrap">${dt}</td>
            <td class="px-3 py-2 whitespace-nowrap"><span class="${typeClass}">${t.type}</span></td>
            <td class="px-3 py-2 text-gray-700 w-1/2 whitespace-normal break-words leading-tight">${t.description}${iconHtml}</td>
            <td class="px-3 py-2 text-right font-bold text-gray-800 whitespace-nowrap">${fmt(amt)}</td>
        </tr>`;
    });

    const isGovDue = document.getElementById('govDueCheck').checked;
    const govDueAmt = isGovDue ? (totalSales * 0.08) : 0;
    if (isGovDue) {
        rows += `<tr class="border-b border-gray-50">
            <td class="px-3 py-2">-</td>
            <td class="px-3 py-2"><span class="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded text-xs">Expense</span></td>
            <td class="px-3 py-2 text-gray-500 italic w-1/2 whitespace-normal break-words leading-tight">Tax (8%)</td>
            <td class="px-3 py-2 text-right font-bold text-gray-500">${fmt(govDueAmt)}</td>
        </tr>`;
        totalExpenses += govDueAmt;
    }
    document.getElementById('ledgerBody').innerHTML = rows;

    const netBeforeShares = totalSales - totalExpenses;
    const hasCoAgent = p.coAgent && p.coAgent.trim() !== "";
    const shareRatio = hasCoAgent ? (1 / 3) : 0.5;
    const mainGrossShare = netBeforeShares * shareRatio;
    const coGrossShare = hasCoAgent ? (netBeforeShares * shareRatio) : 0;
    const netToCompany = netBeforeShares - (mainGrossShare + coGrossShare);

    if (sessionRole === 'Superuser') {
        document.getElementById('ledgerNetProfitLabel').innerText = 'Net to Company';
        document.getElementById('topNetProfit').innerHTML = fmt(netToCompany);
    } else {
        document.getElementById('ledgerNetProfitLabel').innerText = 'Net Project Profit';
        document.getElementById('topNetProfit').innerHTML = fmt(netBeforeShares);
    }

    let shareHTML = '';
    if (sessionRole === 'Superuser') {
        shareHTML += _generatePayoutHTML(p, p.mainAgentId, p.mainAgent, mainGrossShare);
        if (hasCoAgent) shareHTML += _generatePayoutHTML(p, p.coAgentId, p.coAgent, coGrossShare);
    } else {
        shareHTML += _generatePayoutHTML(p, sessionId, sessionName, netBeforeShares * shareRatio);
    }
    document.getElementById('shareDisplay').innerHTML = shareHTML;

    // Cash Flow
    let cashRows = "", runningCashBal = 0, totalPayments = 0;
    const cashFlowItems = p.transactions.filter(t => ['Payment', 'Abono', 'Expense', 'Deduction'].includes(t.type));

    if (cashFlowItems.length === 0) {
        cashRows = "<tr><td colspan='4' class='text-center py-6 text-gray-500 font-semibold'>No cash transactions.</td></tr>";
    } else {
        cashFlowItems.forEach(t => {
            const amt = Number(t.amount);
            let dagdagStr = "-", bawasStr = "-";
            if (t.type === 'Payment' || t.type === 'Abono') {
                runningCashBal += amt;
                if (t.type === 'Payment') totalPayments += amt;
                dagdagStr = fmt(amt);
            } else {
                runningCashBal -= amt;
                bawasStr = fmt(amt);
            }
            
            let trClickAttr = "", trStyleAttr = "", iconHtml = "";
            if (t.receipt_url) {
                const imgUrl = formatImageUrl(t.receipt_url);
                trClickAttr = `onclick="openFSModal('imageModal'); document.getElementById('modalImageSrc').src='${imgUrl}'" title="View Receipt"`;
                trStyleAttr = "cursor-pointer hover:bg-indigo-50 transition";
                iconHtml = ` <svg class="w-4 h-4 inline text-indigo-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
            }
            const dt = new Date(t.created_at).toISOString().split('T')[0];
            cashRows += `<tr ${trClickAttr} class="${trStyleAttr} border-b border-gray-50">
                <td class="px-3 py-2 whitespace-nowrap">${dt}</td>
                <td class="px-3 py-2 text-gray-700 w-1/2 whitespace-normal break-words leading-tight"><b>[${t.type}]</b> ${t.description}${iconHtml}</td>
                <td class="px-3 py-2 text-emerald-600 text-right font-black whitespace-nowrap">${dagdagStr}</td>
                <td class="px-3 py-2 text-red-500 text-right font-bold whitespace-nowrap">${bawasStr}</td>
            </tr>`;
        });
    }
    document.getElementById('cashBody').innerHTML = cashRows;
    document.getElementById('totalCashBal').innerHTML = fmt(runningCashBal);
    document.getElementById('unpaidBal').innerHTML = fmt(totalSales - totalPayments);
}

function _generatePayoutHTML(p, targetAgentId, targetAgentName, grossShare) {
    const myDeductions = p.transactions.filter(t => t.type === 'Deduction' && t.agent_id === targetAgentId).reduce((sum, t) => sum + Number(t.amount), 0);
    const myAbonos = p.transactions.filter(t => t.type === 'Abono' && t.agent_id === targetAgentId).reduce((sum, t) => sum + Number(t.amount), 0);
    const finalPayout = grossShare - myDeductions + myAbonos;
    
    return `<div class="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mt-3 shadow-sm">
        <div class="flex justify-between items-center text-indigo-900 mb-1.5"><b>${targetAgentName} Share:</b><b class="text-base">${fmt(grossShare)}</b></div>
        <div class="flex justify-between items-center text-xs cursor-pointer hover:bg-indigo-100/50 p-1.5 rounded transition border border-transparent hover:border-indigo-200" onclick="openSubLedger('Deduction', '${targetAgentId}', '${targetAgentName}')">
            <span class="text-red-500 font-semibold">Less Deductions:</span>
            <span class="text-red-500 font-bold">${amountsHidden ? '***' : '- ₱' + myDeductions.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
        </div>
        <div class="flex justify-between items-center text-xs cursor-pointer hover:bg-indigo-100/50 p-1.5 rounded transition border border-transparent hover:border-indigo-200 mt-1" onclick="openSubLedger('Abono', '${targetAgentId}', '${targetAgentName}')">
            <span class="text-emerald-600 font-semibold">Add Abono:</span>
            <span class="text-emerald-600 font-bold">${amountsHidden ? '***' : '+ ₱' + myAbonos.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
        </div>
        <div class="flex justify-between items-center text-lg mt-3 pt-3 border-t border-indigo-200">
            <b>Total Payout:</b><b class="text-indigo-700">${fmt(finalPayout)}</b>
        </div>
    </div>`;
}

// ==========================================
// RECORD FORM — MULTI-ENTRY
// ==========================================

let _recordEntries = [];

// Opens the record modal WITHOUT going through openFSModal/closeFSModal
// to prevent those utilities from hiding the ledger modal underneath.
function _openRecordForm(p) {
    const hasCoAgent = p.coAgent && p.coAgent.trim() !== "";
    document.getElementById('recProjName').innerText = p.name;

    let agentOpts = `<option value="${p.mainAgentId}" data-name="${p.mainAgent}">${p.mainAgent}</option>`;
    if (hasCoAgent) agentOpts += `<option value="${p.coAgentId}" data-name="${p.coAgent}">${p.coAgent}</option>`;

    if (sessionRole === 'Superuser') {
        document.getElementById('recAgentContainer').classList.remove('hidden');
        document.getElementById('recAgent').innerHTML = agentOpts;
        document.getElementById('recAgent').value = (sessionId === p.coAgentId) ? p.coAgentId : p.mainAgentId;
    } else {
        document.getElementById('recAgentContainer').classList.add('hidden');
        document.getElementById('recAgent').innerHTML = agentOpts;
        document.getElementById('recAgent').value = sessionId;
    }
    
    // Reset multi-entry state
    _recordEntries = [];
    document.getElementById('recordEntriesContainer').innerHTML = '';
    _addRecordEntry();

    // Directly show the record modal — bypass openFSModal to avoid scroll/overflow side-effects
    const recordModal = document.getElementById('recordModal');
    if (recordModal) recordModal.classList.remove('hidden');

    // Ensure ledger stays visible and body stays locked
    const lModal = document.getElementById('ledgerModal');
    if (lModal) {
        lModal.classList.remove('hidden');
        lModal.classList.add('ledger-sheet-open');
    }
    document.body.style.overflow = 'hidden';
}

// Closes the record modal and ensures ledger is still visible
function _closeRecordModal() {
    const recordModal = document.getElementById('recordModal');
    if (recordModal) recordModal.classList.add('hidden');

    // Keep ledger visible
    const lModal = document.getElementById('ledgerModal');
    if (lModal) {
        lModal.classList.remove('hidden');
        lModal.classList.add('ledger-sheet-open');
    }
    document.body.style.overflow = 'hidden';
}

function _addRecordEntry() {
    const idx = _recordEntries.length;
    _recordEntries.push({ idx });

    const container = document.getElementById('recordEntriesContainer');
    const div = document.createElement('div');
    div.id = `record-entry-${idx}`;
    div.className = 'record-entry bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 relative';

    div.innerHTML = `
        ${idx > 0 ? `<button type="button" onclick="removeRecordEntry(${idx})" class="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition text-xs font-bold shrink-0">✕</button>` : ''}
        <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Entry ${idx + 1}</span>
        </div>
        <select id="recType_${idx}" class="w-full px-3 py-2 bg-white border rounded-lg font-bold text-sm" onchange="handleEntryTypeChange(${idx})" required>
            <option value="">-- Record Type --</option>
            <option value="Sales">Sales (Billed/Invoice)</option>
            <option value="Payment">Payment (Cash Received)</option>
            <option value="Expense">Expense</option>
            <option value="Deduction">Deduction</option>
            <option value="Abono">Abono</option>
        </select>
        <input type="text" id="recDesc_${idx}" class="w-full px-3 py-2 bg-white border rounded-lg text-sm" placeholder="Description" required>
        <input type="number" id="recAmt_${idx}" class="w-full px-3 py-2 bg-white border rounded-lg text-base font-bold" placeholder="Amount (PHP)" step="0.01" required>
        <div id="abonoSection_${idx}" class="hidden bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
            <label class="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <input type="checkbox" id="recIsAbono_${idx}" class="w-4 h-4 rounded" onchange="toggleAbonoInput(${idx})"> Include Agent Abono?
            </label>
            <div id="abonoAmtContainer_${idx}" class="hidden mt-2">
                <input type="number" id="recAbonoAmt_${idx}" class="w-full px-3 py-2 border rounded-lg font-bold text-sm" placeholder="Abono Amount" step="0.01">
            </div>
        </div>
        <div id="recImageContainer_${idx}" class="p-3 border-2 border-dashed border-gray-200 rounded-lg bg-white text-center">
            <label class="block text-xs font-bold text-gray-600 mb-2">Receipt (Optional)</label>
            <input type="file" id="recFile_${idx}" accept="image/*" class="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-gray-200">
        </div>`;

    container.appendChild(div);
    _renumberEntries();
}

function removeRecordEntry(idx) {
    const el = document.getElementById(`record-entry-${idx}`);
    if (el) el.remove();
    _recordEntries = _recordEntries.filter(e => e.idx !== idx);
    _renumberEntries();
}

function _renumberEntries() {
    document.querySelectorAll('.record-entry').forEach((el, i) => {
        const label = el.querySelector('[id^="recType_"]')?.closest('.record-entry')?.querySelector('.text-indigo-400');
        if (label) label.innerText = `Entry ${i + 1}`;
    });
}

function handleEntryTypeChange(idx) {
    const type = document.getElementById(`recType_${idx}`)?.value;
    if (!type) return;
    const abonoSection = document.getElementById(`abonoSection_${idx}`);
    if (type === 'Expense') {
        abonoSection?.classList.remove('hidden');
    } else {
        abonoSection?.classList.add('hidden');
        const cb = document.getElementById(`recIsAbono_${idx}`);
        if (cb) cb.checked = false;
        toggleAbonoInput(idx);
    }
}

// Legacy handler for backward compat
function handleRecordTypeChange() {
    handleEntryTypeChange(0);
}

function toggleAbonoInput(idx) {
    const isChecked = document.getElementById(`recIsAbono_${idx}`)?.checked;
    const container = document.getElementById(`abonoAmtContainer_${idx}`);
    const input = document.getElementById(`recAbonoAmt_${idx}`);
    if (isChecked) {
        container?.classList.remove('hidden');
        if (input) input.required = true;
    } else {
        container?.classList.add('hidden');
        if (input) { input.required = false; input.value = ""; }
    }
}

function openSubLedger(type, targetAgentId, targetAgentName) {
    if (!currentProject) return;
    const items = currentProject.transactions.filter(t => t.type === type && t.agent_id === targetAgentId);
    
    document.getElementById('subLedgerTitle').innerText = type + " Details";
    document.getElementById('subLedgerSubtitle').innerText = targetAgentName;
    
    let rows = "";
    if (items.length === 0) {
        rows = "<tr><td colspan='3' class='text-center py-6 text-gray-500 font-semibold'>No records.</td></tr>";
    } else {
        items.forEach(i => {
            let trClickAttr = "", trStyleAttr = "", iconHtml = "";
            if (i.receipt_url) {
                const imgUrl = formatImageUrl(i.receipt_url);
                trClickAttr = `onclick="openFSModal('imageModal'); document.getElementById('modalImageSrc').src='${imgUrl}'"`;
                trStyleAttr = "cursor-pointer hover:bg-gray-100 transition";
                iconHtml = ` <svg class="w-4 h-4 inline text-indigo-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
            }
            const dt = new Date(i.created_at).toISOString().split('T')[0];
            rows += `<tr ${trClickAttr} class="${trStyleAttr} border-b border-gray-100">
                <td class="px-2 py-2 whitespace-nowrap">${dt}</td>
                <td class="px-2 py-2 w-1/2 whitespace-normal break-words leading-tight">${i.description}${iconHtml}</td>
                <td class="px-2 py-2 text-right font-bold text-gray-700 whitespace-nowrap">${fmt(Number(i.amount))}</td>
            </tr>`;
        });
    }
    document.getElementById('subLedgerBody').innerHTML = rows;
    openFSModal('subLedgerModal');
}

// ==========================================
// RECORD FORM SUBMIT — MULTI-ENTRY
// ==========================================
document.getElementById('recordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('recSubmitBtn');
    btn.innerText = "Saving..."; btn.disabled = true;

    const agentSel = document.getElementById('recAgent');
    const targetAgentId = agentSel.value;
    const targetAgentName = agentSel.options[agentSel.selectedIndex]?.getAttribute('data-name') || agentSel.options[agentSel.selectedIndex]?.text || sessionName;

    const entryEls = document.querySelectorAll('.record-entry');
    let allSuccess = true;
    let errorMsg = '';

    for (const entryEl of entryEls) {
        const idxMatch = entryEl.id.match(/record-entry-(\d+)/);
        if (!idxMatch) continue;
        const idx = idxMatch[1];

        const type = document.getElementById(`recType_${idx}`)?.value;
        const desc = document.getElementById(`recDesc_${idx}`)?.value;
        const amt = document.getElementById(`recAmt_${idx}`)?.value;

        if (!type || !desc || !amt) continue;

        const file = document.getElementById(`recFile_${idx}`)?.files[0];
        let fileData = null;
        if (file) fileData = await compressImageToWebP(file);

        const isAbono = document.getElementById(`recIsAbono_${idx}`)?.checked || false;
        const abonoAmt = document.getElementById(`recAbonoAmt_${idx}`)?.value || '';

        const res = await apiCall("addExpense", {
            projectId: currentProject.id,
            projectName: currentProject.name,
            type,
            description: desc,
            amount: amt,
            agentName: targetAgentName,
            agentId: targetAgentId,
            image: fileData,
            isAbono,
            abonoAmount: abonoAmt
        });

        if (!res.success) {
            allSuccess = false;
            errorMsg = res.message || 'Unknown error';
            break;
        }
    }

    btn.innerText = "Save Records"; btn.disabled = false;

    if (allSuccess) {
        _closeRecordModal();
        document.getElementById('ledgerBody').innerHTML = '<tr><td colspan="4" class="p-4"><div class="skeleton h-4 w-full mb-2"></div><div class="skeleton h-4 w-full"></div></td></tr>';
        document.getElementById('cashBody').innerHTML = '<tr><td colspan="4" class="p-4"><div class="skeleton h-4 w-full"></div></td></tr>';
        await fetchAndRefreshLedger(currentProject.name);
        if (typeof fetchAndRenderDashboard === 'function') fetchAndRenderDashboard();
    } else {
        alert("Error: " + errorMsg);
    }
});

// Initialize swipe/keyboard listeners after DOM is ready
document.addEventListener('DOMContentLoaded', () => LedgerNav.initListeners());
if (document.readyState !== 'loading') LedgerNav.initListeners();

// Global exports
window.openLedger = openLedger;
window.closeLedgerModal = closeLedgerModal;
window.switchLedgerTab = switchLedgerTab;
window.toggleTaxPreference = toggleTaxPreference;
window.toggleProjectStatus = toggleProjectStatus;
window.triggerLedgerThumbUpload = triggerLedgerThumbUpload;
window.handleLedgerThumbUpload = handleLedgerThumbUpload;
window.openSubLedger = openSubLedger;
window.handleRecordTypeChange = handleRecordTypeChange;
window.handleEntryTypeChange = handleEntryTypeChange;
window.toggleAbonoInput = toggleAbonoInput;
window.addRecordEntry = _addRecordEntry;
window.removeRecordEntry = removeRecordEntry;
