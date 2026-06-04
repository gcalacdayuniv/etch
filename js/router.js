// ==========================================================
// ROUTER.JS
// Domain: Client-Side Hash Routing & View Management
// ==========================================================

const AppRouter = {
    routes: {},

    init() {
        window.addEventListener('hashchange', this.handleHashChange.bind(this));
        window.addEventListener('load', this.handleHashChange.bind(this));
    },

    addRoute(path, handler) {
        this.routes[path] = handler;
    },

    navigate(path, force = false) {
        if (window.location.hash === path || window.location.hash === '#' + path) {
            if (force) this.handleHashChange();
        } else {
            window.location.hash = path;
        }
    },

    handleHashChange() {
        const appView = document.getElementById('appView');
        if (appView && appView.classList.contains('hidden')) return;

        if (typeof UIManager !== 'undefined' && typeof UIManager.closeAllMenus === 'function') {
            UIManager.closeAllMenus();
        }

        // Only hide ledger nav when navigating AWAY from /ledger
        const rawHash = window.location.hash.replace('#', '') || '/dashboard';
        const basePath = '/' + (rawHash.split('/').filter(Boolean)[0] || 'dashboard');
        if (basePath !== '/ledger' && typeof LedgerNav !== 'undefined') LedgerNav.hide();

        // Exclude ledgerModal and ledgerBackdrop from cleanup so the
        // sheet-open animation is not interrupted when navigating to /ledger
        const openModals = document.querySelectorAll(
            '.fixed:not(.hidden):not(#loadingOverlay):not(#navMenu):not(#accountMenu):not(#menuBackdrop):not([id^="fab"]):not(#bottomNavContainer):not(#ledgerBottomNav):not(#ledgerModal):not(#ledgerBackdrop):not(#recordModal)'
        );
        openModals.forEach(modal => modal.classList.add('hidden'));
        document.body.style.overflow = '';

        const parts = rawHash.split('/').filter(Boolean);
        const param = parts[1] ? decodeURIComponent(parts[1]) : null;

        ['dashboardView', 'quotationsView'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = '';
                el.classList.add('hidden');
                el.classList.remove('block');
            }
        });

        document.querySelectorAll('.menu-link').forEach(el => {
            el.classList.remove('bg-indigo-50', 'text-indigo-700', 'font-bold');
            el.classList.add('hover:bg-indigo-50', 'hover:text-indigo-700');
        });

        if (this.routes[basePath]) {
            this.routes[basePath](param);
        } else {
            this.navigate('/dashboard');
        }
    }
};

// ==========================================
// ROUTE DEFINITIONS
// ==========================================

AppRouter.addRoute('/dashboard', () => {
    const view = document.getElementById('dashboardView');
    if (view) {
        view.classList.remove('hidden');
        view.classList.add('block');
    } else {
        console.error("CRITICAL: #dashboardView not found in DOM!");
    }

    const title = document.getElementById('appTitle');
    if (title) title.innerText = "Dashboard";

    const btn = document.getElementById('menu-dashboard');
    if (btn) {
        btn.classList.add('bg-indigo-50', 'text-indigo-700', 'font-bold');
        btn.classList.remove('hover:bg-indigo-50', 'hover:text-indigo-700');
    }

    if (typeof DashboardManager !== 'undefined') {
        DashboardManager.fetchAndRender();
    } else {
        console.error("DashboardManager not defined!");
    }
});

AppRouter.addRoute('/quotations', () => {
    const view = document.getElementById('quotationsView');
    if (view) {
        view.classList.remove('hidden');
        view.classList.add('block');
    } else {
        console.error("CRITICAL: #quotationsView not found in DOM!");
    }

    const title = document.getElementById('appTitle');
    if (title) title.innerText = "My Quotations";

    const btn = document.getElementById('menu-quotations');
    if (btn) {
        btn.classList.add('bg-indigo-50', 'text-indigo-700', 'font-bold');
        btn.classList.remove('hover:bg-indigo-50', 'hover:text-indigo-700');
    }

    if (typeof QuotationHistoryManager !== 'undefined') {
        QuotationHistoryManager.load();
    } else if (typeof showHistory === 'function') {
        showHistory();
    }
});

AppRouter.addRoute('/ledger', (projectName) => {
    const view = document.getElementById('dashboardView');
    if (view) {
        view.classList.remove('hidden');
        view.classList.add('block');
    }

    if (projectName) {
        if (typeof LedgerManager !== 'undefined' && typeof LedgerManager.open === 'function') {
            LedgerManager.open(projectName);
        } else if (typeof openLedger === 'function') {
            openLedger(projectName);
        } else {
            console.error("Ledger function not found!");
            AppRouter.navigate('/dashboard');
        }
    } else {
        AppRouter.navigate('/dashboard');
    }
});

AppRouter.init();

window.navigateTo = AppRouter.navigate.bind(AppRouter);