// --- PRIVACY TOGGLE ---
var amountsHidden = false;

// Helper: returns masked string when privacy is on, formatted currency otherwise
function fmt(amount) {
    if (amountsHidden) return '***';
    return '₱' + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function toggleAmountVisibility() {
    amountsHidden = !amountsHidden;
    applyPrivacyState();
}

function applyPrivacyState() {
    const eyeIcons   = document.querySelectorAll('.privacy-eye-icon');
    const eyeOffIcons = document.querySelectorAll('.privacy-eye-off-icon');

    if (amountsHidden) {
        eyeIcons.forEach(el => el.classList.add('hidden'));
        eyeOffIcons.forEach(el => el.classList.remove('hidden'));
    } else {
        eyeIcons.forEach(el => el.classList.remove('hidden'));
        eyeOffIcons.forEach(el => el.classList.add('hidden'));
    }

    // Re-render wherever amounts are currently displayed so *** is applied immediately
    // Dashboard re-render handles dashboard + project cards
    renderDashboardUI();
    // Ledger re-render if ledger modal is open
    if (currentProject && !document.getElementById('ledgerModal').classList.contains('hidden')) {
        refreshLedgerCalculation();
    }
}