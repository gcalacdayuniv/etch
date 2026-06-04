// ==========================================================
// DASHBOARD.JS
// Domain: Macro Dashboard, View Modes, & Project Lists
// ==========================================================

const DashboardManager = {
    state: {
        viewMode: 'grid', // 'grid' | 'list'
        tabStatus: 'In Progress' // 'In Progress' | 'Completed' | 'Group B' | 'All'
    },

    _tabOrder: ['all', 'active', 'completed', 'taxable'],

    setViewMode(mode) {
        this.state.viewMode = mode;
        const gridBtn = document.getElementById('projViewToggleGrid');
        const listBtn = document.getElementById('projViewToggleList');
        
        if (gridBtn && listBtn) {
            const activeClass = 'p-1.5 rounded bg-white text-indigo-600 shadow-sm border border-gray-200 transition';
            const inactiveClass = 'p-1.5 rounded text-gray-400 hover:text-gray-600 transition';
            
            gridBtn.className = mode === 'grid' ? activeClass : inactiveClass;
            listBtn.className = mode === 'list' ? activeClass : inactiveClass;
        }
        this.renderUI();
    },

    switchTab(status) {
        // Target #dashboardView to ensure active states reset properly
        document.querySelectorAll('#dashboardView .tab-btn').forEach(btn => {
            btn.className = "tab-btn flex-1 min-w-[80px] py-1.5 px-3 text-xs font-bold text-gray-500 rounded transition hover:bg-gray-200";
        });

        const statusMap = { 'all': 'All', 'active': 'In Progress', 'completed': 'Completed', 'taxable': 'Group B' };
        this.state.tabStatus = statusMap[status] || 'Group B';

        const activeBtn = document.getElementById(`dash-btn-${status}`);
        if (activeBtn) {
            activeBtn.className = "tab-btn active flex-1 min-w-[80px] py-1.5 px-3 text-xs font-bold rounded transition bg-white text-indigo-600 shadow-sm";
        }
        this.renderUI();
    },

    _getCurrentTabKey() {
        const reverseMap = { 'All': 'all', 'In Progress': 'active', 'Completed': 'completed', 'Group B': 'taxable' };
        return reverseMap[this.state.tabStatus] || 'active';
    },

    swipeToAdjacentTab(direction) {
        const isSuperuser = typeof sessionRole !== 'undefined' && sessionRole === 'Superuser';
        const visibleTabs = this._tabOrder.filter(t => {
            if (t === 'taxable' && !isSuperuser) return false;
            return true;
        });
        const currentKey = this._getCurrentTabKey();
        const currentIdx = visibleTabs.indexOf(currentKey);
        if (currentIdx === -1) return;
        const nextIdx = currentIdx + direction;
        if (nextIdx < 0 || nextIdx >= visibleTabs.length) return;
        this.switchTab(visibleTabs[nextIdx]);
    },

    clearFilters() {
        document.getElementById('dashStartDate').value = '';
        document.getElementById('dashEndDate').value = '';
        this.renderUI();
    },

    _skeletonHTML() {
        return Array(3).fill(`
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="flex gap-0">
                    <div class="skeleton w-24 sm:w-28 h-[110px] shrink-0"></div>
                    <div class="flex-1 p-3 flex flex-col justify-between">
                        <div class="skeleton h-4 w-3/4 rounded mb-2"></div>
                        <div class="space-y-1.5">
                            <div class="skeleton h-3 w-full rounded"></div>
                            <div class="skeleton h-3 w-5/6 rounded"></div>
                            <div class="skeleton h-3 w-4/6 rounded"></div>
                            <div class="skeleton h-3 w-3/4 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>`).join('');
    },

    async fetchAndRender() {
        const container = document.getElementById('dashProjectsContainer');
        if (!container) return;
        
        container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        container.innerHTML = this._skeletonHTML();

        try {
            const res = await apiCall("getDashboardData", {
                agentId: typeof sessionId !== 'undefined' ? sessionId : '',
                agentName: typeof sessionName !== 'undefined' ? sessionName : '',
                role: typeof sessionRole !== 'undefined' ? sessionRole : ''
            });

            if (res && res.success) {
                window.allProjects = res.data.projects || [];
                window.globalFixedCosts = res.data.fixedCosts || [];
                this.renderUI();
            } else {
                container.innerHTML = "<p class='col-span-full text-center py-6 text-gray-500 font-bold'>Failed to load dashboard data.</p>";
            }
        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
            container.innerHTML = "<p class='col-span-full text-center py-6 text-red-500 font-bold'>Error loading dashboard.</p>";
        }
    },

    renderUI() {
        const groupBBtn = document.getElementById('dash-btn-taxable');
        if (groupBBtn) {
            if (typeof sessionRole !== 'undefined' && sessionRole !== 'Superuser') {
                groupBBtn.classList.add('hidden');
                if (this.state.tabStatus === 'Group B') this.switchTab('active');
            } else {
                groupBBtn.classList.remove('hidden');
            }
        }

        const sDate = document.getElementById('dashStartDate').value;
        const eDate = document.getElementById('dashEndDate').value;
        let filteredProj = window.allProjects || [];
        let activeFC = window.globalFixedCosts || [];

        if (this.state.tabStatus === 'In Progress') filteredProj = filteredProj.filter(p => p.status === 'In Progress');
        else if (this.state.tabStatus === 'Completed') filteredProj = filteredProj.filter(p => p.status === 'Completed');
        else if (this.state.tabStatus === 'Group B') filteredProj = filteredProj.filter(p => p.is_taxable !== 0);

        if (sDate || eDate) {
            const start = sDate ? new Date(sDate + 'T00:00:00') : new Date('2000-01-01');
            const end = eDate ? new Date(eDate + 'T23:59:59') : new Date('2100-01-01');

            filteredProj = filteredProj.filter(p => {
                let pDate = new Date(p.created_at);
                if (p.transactions && p.transactions.length > 0) {
                    const latestTx = p.transactions.reduce((latest, t) => new Date(t.created_at) > new Date(latest.created_at) ? t : latest, p.transactions[0]);
                    pDate = new Date(latestTx.created_at);
                }
                return pDate >= start && pDate <= end;
            });

            activeFC = activeFC.filter(fc => {
                const fcDate = new Date(fc.created_at);
                return fcDate >= start && fcDate <= end;
            });
        }

        filteredProj.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const container = document.getElementById('dashProjectsContainer');

        if (typeof sessionRole !== 'undefined' && sessionRole === 'Superuser') {
            this._renderAdminView(container, filteredProj, activeFC);
        } else {
            this._renderAgentView(container, filteredProj);
        }
    },

    _processProjectData(filteredProj, role) {
        return filteredProj.map(p => {
            let pSales = 0, pExp = 0;
            const txs = p.transactions || [];
            
            txs.forEach(t => {
                const amt = Number(t.amount);
                if (t.type === 'Sales') pSales += amt;
                else if (t.type === 'Expense') pExp += amt;
            });

            const isTaxable = (p.is_taxable !== 0);
            const taxAmt = isTaxable ? (pSales * 0.08) : 0;
            pExp += taxAmt;
            
            const netBeforeShares = pSales - pExp;
            const hasCo = p.co_agent && p.co_agent.trim() !== "";
            const shareRatio = hasCo ? (1 / 3) : 0.5;
            const totalAgentGrossShares = netBeforeShares * shareRatio * (hasCo ? 2 : 1);
            const pNetToCompany = netBeforeShares - totalAgentGrossShares;
            
            const thumbUrl = p.thumbnail_url ? formatImageUrl(p.thumbnail_url) : (typeof sessionFallbackThumb !== 'undefined' ? sessionFallbackThumb : '');
            
            if (role === 'superuser') {
                return { p, pSales, pExp, taxAmt, totalAgentGrossShares, pNetToCompany, thumbUrl, rawExp: pExp - taxAmt };
            } else {
                const grossShare = netBeforeShares * shareRatio;
                const myDeds = txs.filter(t => t.type === 'Deduction' && t.agent_id === sessionId).reduce((sum, t) => sum + Number(t.amount), 0);
                const myAbonos = txs.filter(t => t.type === 'Abono' && t.agent_id === sessionId).reduce((sum, t) => sum + Number(t.amount), 0);
                const netPayout = grossShare - myDeds + myAbonos;
                return { p, grossShare, myDeds, myAbonos, netPayout, thumbUrl };
            }
        });
    },

    _renderAdminView(container, filteredProj, activeFC) {
        document.getElementById('adminDashboard').classList.remove('hidden');
        document.getElementById('agentDashboard').classList.add('hidden');

        if (filteredProj.length === 0) {
            container.className = 'grid grid-cols-1';
            container.innerHTML = "<p class='col-span-full text-center py-6 text-gray-500 font-bold'>No projects match this filter.</p>";
        } else {
            const projData = this._processProjectData(filteredProj, 'superuser');
            if (this.state.viewMode === 'list') this._renderProjectListView(container, projData, 'superuser');
            else this._renderProjectGridView(container, projData, 'superuser');
            this._updateAdminMetrics(projData, activeFC);
        }
    },

    _renderAgentView(container, filteredProj) {
        document.getElementById('adminDashboard').classList.add('hidden');
        document.getElementById('agentDashboard').classList.remove('hidden');

        let totalAgentShare = 0;
        if (filteredProj.length === 0) {
            container.className = 'grid grid-cols-1';
            container.innerHTML = "<p class='col-span-full text-center py-6 text-gray-500 font-bold'>No active projects for you in this filter.</p>";
        } else {
            const projData = this._processProjectData(filteredProj, 'agent');
            projData.forEach(d => totalAgentShare += d.grossShare);
            if (this.state.viewMode === 'list') this._renderProjectListView(container, projData, 'agent');
            else this._renderProjectGridView(container, projData, 'agent');
        }
        if(typeof fmt !== 'undefined') document.getElementById('agentGrossShare').innerText = fmt(totalAgentShare);
    },

    _updateAdminMetrics(projData, activeFC) {
        let macroGrossRev = 0, macroProjExp = 0, macroFixedCosts = 0;
        let totalRawExp = 0, totalShares = 0, totalTax = 0;
        let gRows = '', eRows = '', fcRowsHtml = '';
        
        const isHidden = (typeof amountsHidden !== 'undefined') ? amountsHidden : false;

        const sortedFC = [...activeFC].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (this.state.tabStatus === 'In Progress') {
            fcRowsHtml = "<tr><td colspan='3' class='py-8 text-center text-gray-400 font-semibold'>Fixed costs are intentionally omitted in the 'In Progress' view.</td></tr>";
        } else if (sortedFC.length === 0) {
            fcRowsHtml = "<tr><td colspan='3' class='py-8 text-center font-bold text-gray-400'>No fixed costs recorded for this period.</td></tr>";
        } else {
            sortedFC.forEach(fc => {
                const amt = Number(fc.amount);
                macroFixedCosts += amt;
                const dt = new Date(fc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                fcRowsHtml += `<tr class="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td class="px-2 py-2 whitespace-nowrap text-xs text-gray-500">${dt}</td>
                    <td class="px-2 py-2 w-1/2 whitespace-normal break-words leading-tight">${fc.description}</td>
                    <td class="px-2 py-2 text-right font-bold text-orange-600">${typeof fmt !== 'undefined' ? fmt(amt) : amt}</td>
                </tr>`;
            });
        }

        projData.forEach(({ p, pSales, pExp, taxAmt, totalAgentGrossShares, rawExp }) => {
            macroGrossRev += pSales;
            macroProjExp += (pExp + totalAgentGrossShares);
            totalRawExp += rawExp;
            totalTax += taxAmt;
            totalShares += totalAgentGrossShares;

            const pDate = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            if(typeof fmt !== 'undefined') {
                gRows += `<tr class="hover:bg-gray-50 transition">
                    <td class="px-2 py-2.5"><div class="font-semibold text-gray-800">${p.name}</div><div class="text-[10px] text-gray-400">${pDate}</div></td>
                    <td class="px-2 py-2.5 text-right font-bold text-emerald-600">${fmt(pSales)}</td>
                </tr>`;

                const isTaxable = (p.is_taxable !== 0);
                const rowTotal = rawExp + taxAmt + totalAgentGrossShares;
                eRows += `<tr class="hover:bg-gray-50 transition">
                    <td class="px-2 py-2.5"><div class="font-semibold text-gray-800">${p.name}</div><div class="text-[10px] text-gray-400">${pDate}</div></td>
                    <td class="px-2 py-2.5 text-right font-bold text-red-500">${fmt(rawExp)}</td>
                    <td class="px-2 py-2.5 text-right font-bold text-orange-500">${fmt(totalAgentGrossShares)}</td>
                    <td class="px-2 py-2.5 text-right font-bold text-yellow-600">${isTaxable ? fmt(taxAmt) : '<span class="text-gray-300">—</span>'}</td>
                    <td class="px-2 py-2.5 text-right font-black text-gray-800">${fmt(rowTotal)}</td>
                </tr>`;
            }
        });

        if(typeof fmt !== 'undefined') {
            document.getElementById('dashGrossRev').innerText = fmt(macroGrossRev);
            document.getElementById('dashProjExp').innerText = isHidden ? '***' : '- ₱' + macroProjExp.toLocaleString(undefined, {minimumFractionDigits: 2});
            document.getElementById('dashFixedCosts').innerText = isHidden ? '***' : '- ₱' + macroFixedCosts.toLocaleString(undefined, {minimumFractionDigits: 2});
            document.getElementById('dashNetIncome').innerText = fmt(macroGrossRev - macroProjExp - macroFixedCosts);
            document.getElementById('fixedCostsBody').innerHTML = fcRowsHtml;

            const grossRevBody = document.getElementById('grossRevBody');
            if (grossRevBody) {
                gRows += `<tr class="border-t-2 border-emerald-200 bg-emerald-50">
                    <td class="px-2 py-2.5 font-black text-emerald-800 uppercase text-xs tracking-wider">Total</td>
                    <td class="px-2 py-2.5 text-right font-black text-emerald-700">${fmt(macroGrossRev)}</td>
                </tr>`;
                grossRevBody.innerHTML = gRows;
            }

            const projExpBody = document.getElementById('projExpBody');
            if (projExpBody) {
                eRows += `<tr class="border-t border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase">
                    <td class="px-2 py-1.5 font-bold">Subtotals</td>
                    <td class="px-2 py-1.5 text-right font-bold text-red-400">${fmt(totalRawExp)}</td>
                    <td class="px-2 py-1.5 text-right font-bold text-orange-400">${fmt(totalShares)}</td>
                    <td class="px-2 py-1.5 text-right font-bold text-yellow-500">${fmt(totalTax)}</td>
                    <td class="px-2 py-1.5 text-right font-black text-gray-600"></td>
                </tr>
                <tr class="border-t-2 border-red-200 bg-red-50">
                    <td class="px-2 py-2.5 font-black text-red-800 uppercase text-xs tracking-wider">Grand Total</td>
                    <td colspan="3"></td>
                    <td class="px-2 py-2.5 text-right font-black text-red-700">${fmt(totalRawExp + totalTax + totalShares)}</td>
                </tr>`;
                projExpBody.innerHTML = eRows;
            }
        }
    },

    _renderProjectGridView(container, projData, role) {
        container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        container.innerHTML = projData.map(data => this._buildCardHTML(data, role, 'grid')).join('');
    },

    _renderProjectListView(container, projData, role) {
        container.className = 'flex flex-col gap-2';
        container.innerHTML = projData.map(data => this._buildCardHTML(data, role, 'list')).join('');
    },

    _buildCardHTML(data, role, layout) {
        const { p, thumbUrl } = data;
        const pDate = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const isHidden = (typeof amountsHidden !== 'undefined') ? amountsHidden : false;
        
        if (layout === 'grid') {
            const metricsHTML = role === 'superuser' 
                ? `<div class="flex justify-between text-xs"><span class="text-gray-400">Sales</span><span class="font-bold text-emerald-600">${fmt(data.pSales)}</span></div>
                   <div class="flex justify-between text-xs"><span class="text-gray-400">Expenses</span><span class="font-bold text-red-500">${isHidden ? '***' : '-₱' + data.pExp.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                   <div class="flex justify-between text-xs pb-1.5 border-b border-gray-100"><span class="text-gray-400">Agent Shares</span><span class="font-bold text-orange-500">${isHidden ? '***' : '-₱' + data.totalAgentGrossShares.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                   <div class="flex justify-between text-xs pt-0.5"><span class="font-bold text-indigo-900">Net to Co.</span><span class="font-black text-indigo-700">${fmt(data.pNetToCompany)}</span></div>`
                : `<div class="flex justify-between text-xs"><span class="text-gray-400">Gross Share</span><span class="font-bold text-emerald-600">${fmt(data.grossShare)}</span></div>
                   <div class="flex justify-between text-xs"><span class="text-gray-400">Deductions</span><span class="font-bold text-red-500">${isHidden ? '***' : '-₱' + data.myDeds.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                   <div class="flex justify-between text-xs pb-1.5 border-b border-gray-100"><span class="text-gray-400">Abonos</span><span class="font-bold text-emerald-500">${isHidden ? '***' : '+₱' + data.myAbonos.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                   <div class="flex justify-between text-xs pt-0.5"><span class="font-bold text-indigo-900">Net Takeaway</span><span class="font-black text-indigo-700">${fmt(data.netPayout)}</span></div>`;

            return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition overflow-hidden cursor-pointer" onclick="navigateTo('/ledger/${encodeURIComponent(p.name)}')">
                <div class="flex gap-0">
                    <div class="relative w-24 sm:w-28 shrink-0 h-[110px]">
                        <img src="${thumbUrl}" class="w-full h-full object-cover object-center" onerror="this.src=typeof sessionFallbackThumb !== 'undefined' ? sessionFallbackThumb : ''">
                    </div>
                    <div class="flex-1 p-3 flex flex-col justify-between min-w-0">
                        <div>
                            <h3 class="font-bold text-gray-800 truncate text-sm">${p.name}</h3>
                            <p class="text-[10px] text-gray-400 mb-1">${pDate}</p>
                        </div>
                        <div class="space-y-0.5">${metricsHTML}</div>
                    </div>
                </div>
            </div>`;
        } else {
            const statusDot = p.status === 'Completed' ? `<span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0 inline-block" title="Completed"></span>` : `<span class="w-2 h-2 rounded-full bg-blue-400 shrink-0 inline-block" title="In Progress"></span>`;
            
            const listStatsHTML = role === 'superuser'
                ? `<span>Sales: <b class="text-emerald-600">${fmt(data.pSales)}</b></span>
                   <span>Exp: <b class="text-red-500">${isHidden ? '***' : '₱' + data.pExp.toLocaleString(undefined,{minimumFractionDigits:2})}</b></span>
                   <span>Shares: <b class="text-orange-500">${isHidden ? '***' : '₱' + data.totalAgentGrossShares.toLocaleString(undefined,{minimumFractionDigits:2})}</b></span>`
                : `<span>Share: <b class="text-emerald-600">${fmt(data.grossShare)}</b></span>
                   <span>Deds: <b class="text-red-500">${isHidden ? '***' : '₱' + data.myDeds.toLocaleString(undefined,{minimumFractionDigits:2})}</b></span>
                   <span>Abono: <b class="text-emerald-500">${isHidden ? '***' : '₱' + data.myAbonos.toLocaleString(undefined,{minimumFractionDigits:2})}</b></span>`;

            const listRightHTML = role === 'superuser'
                ? `<p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net to Co.</p><p class="text-sm font-black text-indigo-700 whitespace-nowrap">${fmt(data.pNetToCompany)}</p>`
                : `<p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Take</p><p class="text-sm font-black text-indigo-700 whitespace-nowrap">${fmt(data.netPayout)}</p>`;

            return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition overflow-hidden cursor-pointer flex items-center gap-0" onclick="navigateTo('/ledger/${encodeURIComponent(p.name)}')">
                <div class="w-16 h-16 shrink-0">
                    <img src="${thumbUrl}" class="w-full h-full object-cover object-center" onerror="this.src=typeof sessionFallbackThumb !== 'undefined' ? sessionFallbackThumb : ''">
                </div>
                <div class="flex-1 px-3 py-2 min-w-0 flex flex-col justify-center gap-0.5">
                    <div class="flex items-center gap-1.5 min-w-0">
                        ${statusDot}
                        <h3 class="font-bold text-gray-800 truncate text-sm">${p.name}</h3>
                    </div>
                    <div class="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                        <span class="text-[10px] text-gray-400">${pDate}</span>
                        ${listStatsHTML}
                    </div>
                </div>
                <div class="shrink-0 px-3 py-2 text-right">${listRightHTML}</div>
            </div>`;
        }
    },

    async submitFixedCost(e) {
        e.preventDefault();
        const btn = document.getElementById('fcSubmitBtn');
        btn.innerText = "Saving..."; btn.disabled = true;
        
        const res = await apiCall("addFixedCost", {
            date: document.getElementById('fcDate').value,
            description: document.getElementById('fcDesc').value,
            amount: document.getElementById('fcAmt').value,
            agentName: sessionName,
            agentId: sessionId
        });
        
        btn.innerText = "Save"; btn.disabled = false;
        if (res.success) {
            closeFSModal('fixedCostModal');
            document.getElementById('fixedCostForm').reset();
            document.getElementById('fcDate').value = new Date().toISOString().split('T')[0];
            this.fetchAndRender();
        } else {
            alert("Error: " + res.message);
        }
    },

    // ==========================================
    // SWIPE GESTURE INIT FOR DASHBOARD TABS
    // ==========================================
    initSwipeGesture() {
        const view = document.getElementById('dashboardView');
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
                DashboardManager.swipeToAdjacentTab(dx < 0 ? 1 : -1);
            }
        }, { passive: true });
    }
};

// ==========================================
// EVENT LISTENERS & GLOBAL EXPORTS
// ==========================================

document.getElementById('fixedCostForm')?.addEventListener('submit', DashboardManager.submitFixedCost.bind(DashboardManager));
document.addEventListener('DOMContentLoaded', () => DashboardManager.initSwipeGesture());
if (document.readyState !== 'loading') DashboardManager.initSwipeGesture();

window.setProjectViewMode = DashboardManager.setViewMode.bind(DashboardManager);
window.switchDashTab = DashboardManager.switchTab.bind(DashboardManager);
window.clearDashFilters = DashboardManager.clearFilters.bind(DashboardManager);
window.renderDashboardUI = DashboardManager.renderUI.bind(DashboardManager);
window.fetchAndRenderDashboard = DashboardManager.fetchAndRender.bind(DashboardManager);