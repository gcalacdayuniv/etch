// ==========================================================
// QUOTATION_PDF.JS
// Scope: Quotations (PDF) — Preview, Download, Navigation
// ==========================================================

// ==========================================
// PDF PREVIEW NAVIGATION (Arrow Keys)
// ==========================================
const PDFNav = {
    _getList() {
        // Use the filtered quotation list from QuotationHistoryManager if available
        if (typeof QuotationHistoryManager !== 'undefined') {
            return QuotationHistoryManager.state.filteredQuotations || [];
        }
        return [];
    },

    currentIndex() {
        const qNum = window._currentPreviewQNum;
        if (!qNum) return -1;
        return this._getList().findIndex(q => q.quotation_number === qNum);
    },

    async navigate(dir) {
        const modal = document.getElementById('pdfPreviewModal');
        if (!modal || modal.classList.contains('hidden')) return;
        const list = this._getList();
        const idx = this.currentIndex();
        if (idx === -1) return;
        const next = idx + dir;
        if (next < 0 || next >= list.length) return;
        await previewPDF(list[next].quotation_number);
    },

    _updateNavButtons() {
        const list = this._getList();
        const idx = this.currentIndex();
        const prevBtn = document.getElementById('pdfNavPrev');
        const nextBtn = document.getElementById('pdfNavNext');
        const counter = document.getElementById('pdfNavCounter');
        if (!prevBtn || !nextBtn) return;
        prevBtn.classList.toggle('opacity-30', idx <= 0);
        prevBtn.disabled = (idx <= 0);
        nextBtn.classList.toggle('opacity-30', idx >= list.length - 1);
        nextBtn.disabled = (idx >= list.length - 1);
        if (counter) counter.innerText = list.length > 1 ? `${idx + 1} / ${list.length}` : '';
    },

    initListeners() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('pdfPreviewModal');
            if (!modal || modal.classList.contains('hidden')) return;
            if (e.key === 'ArrowLeft') this.navigate(-1);
            if (e.key === 'ArrowRight') this.navigate(1);
        });
    }
};

// ==========================================
// CLIENT-SIDE PDF GENERATION
// ==========================================

async function fetchAndPreparePDF(qNumber) {
    showLoading("Fetching Document Data...");
    const res = await apiCall("getQuotationDetail", { qNumber });
    hideLoading();
    if (!res.success) { alert("Failed to load: " + res.message); return null; }

    const d = res.data;

    const logo1El = document.getElementById('pdf-logo-1');
    const logo2El = document.getElementById('pdf-logo-2');
    if (logo1El) logo1El.src = sessionLogo1 ? formatImageUrl(sessionLogo1) : '';
    if (logo2El) logo2El.src = sessionLogo2 ? formatImageUrl(sessionLogo2) : '';

    document.getElementById('pdf-reg-name').innerText    = d.customerName;
    document.getElementById('pdf-tin').innerText         = d.customerTIN || "-";
    document.getElementById('pdf-bus-address').innerText = d.customerAddress || "-";

    const qDate      = new Date(d.createdAt);
    const validUntil = new Date(qDate);
    validUntil.setDate(validUntil.getDate() + 14);

    document.getElementById('pdf-q-date').innerText  = qDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('pdf-q-no').innerText    = d.quotationNumber;
    document.getElementById('pdf-q-valid').innerText = validUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('pdf-payment-terms').innerText = (d.paymentTerms && d.paymentTerms.trim() !== '') ? d.paymentTerms : '-';

    const tbody = document.getElementById('pdf-table-body');
    tbody.innerHTML = "";
    const spacer = '<span style="color: transparent;">.</span>';
    let totalAmt = 0;

    for (let i = 0; i < 12; i++) {
        const item = (d.items && d.items.length > i) ? d.items[i] : null;
        let desc = spacer, qty = spacer, price = spacer, amt = spacer;
        if (item) {
            desc  = item.description;
            qty   = item.quantity;
            price = Number(item.unitCost).toLocaleString('en-US', { minimumFractionDigits: 2 });
            const rowAmt = item.quantity * item.unitCost;
            amt   = Number(rowAmt).toLocaleString('en-US', { minimumFractionDigits: 2 });
            totalAmt += rowAmt;
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="border:0.5pt solid #000;padding:4px 12px;height:30px;text-align:left;">${desc}</td>
            <td style="border:0.5pt solid #000;padding:4px 12px;height:30px;text-align:center;">${qty}</td>
            <td style="border:0.5pt solid #000;padding:4px 12px;height:30px;text-align:right;">${price}</td>
            <td style="border:0.5pt solid #000;padding:4px 12px;height:30px;text-align:right;">${amt}</td>`;
        tbody.appendChild(tr);
    }

    document.getElementById('pdf-total-amt').innerText  = Number(totalAmt).toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('pdf-prep-by').innerText    = d.preparedBy;
    document.getElementById('pdf-prep-phone').innerText = d.preparedByContact || "No Contact info";

    const sigImg = document.getElementById('pdf-prep-sig');
    if (d.signatureUrl && d.signatureUrl !== "") {
        sigImg.src              = formatImageUrl(d.signatureUrl);
        sigImg.style.visibility = "visible";
    } else {
        sigImg.style.visibility = "hidden";
    }

    return { quotationNumber: d.quotationNumber, customerName: d.customerName, createdAt: d.createdAt };
}


// ==========================================
// PDF PREVIEW — FIT & ZOOM
// ==========================================

window._currentPreviewQNum = null;

function fitPDFToScreen() {
    const doc      = document.getElementById('quotation-document');
    const viewport = document.getElementById('pdfPreviewViewport');
    if (!doc || !viewport) return;

    const docW = doc.offsetWidth  || doc.getBoundingClientRect().width;
    const docH = doc.offsetHeight || doc.getBoundingClientRect().height;

    const pad    = 32;
    const availW = viewport.clientWidth  - pad;
    const availH = viewport.clientHeight - pad;

    const scaleByW = availW / docW;
    const scaleByH = availH / docH;
    const scale    = Math.min(scaleByW, scaleByH, 1);

    _applyScale(Math.round(scale * 100));
}

function applyPDFZoom(value) {
    _applyScale(Math.min(200, Math.max(10, Number(value))));
}

function stepPDFZoom(delta) {
    const input = document.getElementById('pdfZoomInput');
    const current = input ? Number(input.value) : 100;
    _applyScale(Math.min(200, Math.max(10, current + delta)));
}

function _applyScale(pct) {
    const wrapper = document.getElementById('pdfScaleWrapper');
    const input   = document.getElementById('pdfZoomInput');
    if (!wrapper) return;

    const scale = pct / 100;
    wrapper.style.transform = `scale(${scale})`;

    const doc = document.getElementById('quotation-document');
    if (doc) {
        const naturalW = doc.offsetWidth  || 816;
        const naturalH = doc.offsetHeight || 1056;
        wrapper.style.width  = (naturalW * scale) + 'px';
        wrapper.style.height = (naturalH * scale) + 'px';
    }

    if (input) input.value = pct;
}

// Pinch-to-zoom (touch)
(function _initPinchZoom() {
    let lastDist = null;
    let baseScale = 100;

    document.addEventListener('touchstart', function(e) {
        if (e.target.closest('#pdfPreviewViewport') && e.touches.length === 2) {
            lastDist = _touchDist(e.touches);
            const input = document.getElementById('pdfZoomInput');
            baseScale = input ? Number(input.value) : 100;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (!lastDist || !e.target.closest('#pdfPreviewViewport') || e.touches.length !== 2) return;
        const newDist = _touchDist(e.touches);
        const ratio   = newDist / lastDist;
        const newPct  = Math.min(200, Math.max(10, Math.round(baseScale * ratio)));
        _applyScale(newPct);
    }, { passive: true });

    document.addEventListener('touchend', function() { lastDist = null; }, { passive: true });

    function _touchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
})();

// Scroll-wheel zoom (desktop, Ctrl+wheel)
document.addEventListener('wheel', function(e) {
    const viewport = document.getElementById('pdfPreviewViewport');
    if (!viewport || !viewport.contains(e.target)) return;
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const input   = document.getElementById('pdfZoomInput');
    const current = input ? Number(input.value) : 100;
    const delta   = e.deltaY < 0 ? 5 : -5;
    _applyScale(Math.min(200, Math.max(10, current + delta)));
}, { passive: false });


async function previewPDF(qNumber) {
    window._currentPreviewQNum = qNumber;
    const quoteMeta = await fetchAndPreparePDF(qNumber);
    if (!quoteMeta) return;

    document.getElementById('pdfPreviewModal').classList.remove('hidden');
    PDFNav._updateNavButtons();

    requestAnimationFrame(() => {
        requestAnimationFrame(() => { fitPDFToScreen(); });
    });
}

async function downloadPDF(qNumber) {
    const quoteMeta = await fetchAndPreparePDF(qNumber);
    if (!quoteMeta) return;

    showLoading("Generating PDF...");
    const element = document.getElementById('quotation-document');

    const wrapper        = document.getElementById('pdfScaleWrapper');
    const savedTransform = wrapper ? wrapper.style.transform : '';
    const savedWidth     = wrapper ? wrapper.style.width     : '';
    const savedHeight    = wrapper ? wrapper.style.height    : '';
    if (wrapper) { wrapper.style.transform = 'scale(1)'; wrapper.style.width = ''; wrapper.style.height = ''; }

    setTimeout(() => {
        const safeName = quoteMeta.customerName.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
        const qDate    = new Date(quoteMeta.createdAt).toISOString().split('T')[0];
        const opt = {
            margin:      0,
            filename:    `${quoteMeta.quotationNumber}_${qDate}_${safeName}.pdf`,
            image:       { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2, useCORS: true, windowHeight: 1056, imageTimeout: 10000, logging: false },
            jsPDF:       { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        window.html2pdf().set(opt).from(element).save()
            .then(() => {
                hideLoading();
                if (wrapper) { wrapper.style.transform = savedTransform; wrapper.style.width = savedWidth; wrapper.style.height = savedHeight; }
            })
            .catch((err) => {
                console.error("PDF Generation Error:", err);
                hideLoading();
                if (wrapper) { wrapper.style.transform = savedTransform; wrapper.style.width = savedWidth; wrapper.style.height = savedHeight; }
                alert("An error occurred. Make sure your logos and signature are valid images.");
            });
    }, 500);
}

// Initialize swipe/keyboard listeners
document.addEventListener('DOMContentLoaded', () => PDFNav.initListeners());
if (document.readyState !== 'loading') PDFNav.initListeners();
