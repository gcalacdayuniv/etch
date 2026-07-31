// ==========================================================
// SOA_PDF.JS
// Handles the generation and preview of Statement of Account PDFs
// ==========================================================

let currentSOAData = null;

/**
 * Triggers the SOA PDF generation modal using the data passed from the SOA table 
 * or the Dashboard.
 */
async function openSOAPDFPreview(projectData) {
    currentSOAData = projectData;
    showLoading("Generating SOA Preview...");

    try {
        // 1. Populate header details
        document.getElementById('soa-pdf-reg-name').textContent = projectData.customer_name || 'N/A';
        document.getElementById('soa-pdf-tin').textContent = projectData.customer_tin || 'N/A';
        document.getElementById('soa-pdf-bus-address').textContent = projectData.customer_address || 'N/A';
        
        document.getElementById('soa-pdf-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
        document.getElementById('soa-pdf-inv-no').textContent = projectData.invoice_number || 'N/A';
        document.getElementById('soa-pdf-due-date').textContent = projectData.due_date ? new Date(projectData.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : 'N/A';

        // 2. Populate Logos globally saved in the session
        if (typeof sessionLogo1Url !== 'undefined' && sessionLogo1Url) {
            document.getElementById('soa-pdf-logo-1').src = sessionLogo1Url;
        }
        if (typeof sessionLogo2Url !== 'undefined' && sessionLogo2Url) {
            document.getElementById('soa-pdf-logo-2').src = sessionLogo2Url;
        }

        // 3. Populate Preparer Signature
        document.getElementById('soa-pdf-prep-by').textContent = typeof sessionName !== 'undefined' ? sessionName : 'Admin';
        if (typeof sessionSignatureUrl !== 'undefined' && sessionSignatureUrl) {
            const sigImg = document.getElementById('soa-pdf-prep-sig');
            sigImg.src = sessionSignatureUrl;
            sigImg.style.visibility = 'visible';
        }

        // 4. Fetch Ledger Data to build the table
        const res = await apiCall('getProjectLedger', { projectName: projectData.project_name });
        if (!res.success) throw new Error(res.message);

        const transactions = res.data.transactions || [];
        const tbody = document.getElementById('soa-pdf-table-body');
        tbody.innerHTML = '';

        let totalCharges = 0;
        let totalPayments = 0;

        // Add initial Sales charge
        transactions.filter(t => t.type === 'Sales').forEach(sale => {
            totalCharges += Number(sale.amount);
            tbody.innerHTML += `
                <tr>
                    <td style="border: 0.5pt solid #000; padding: 4px 12px; text-align: center;">${new Date(sale.created_at).toLocaleDateString()}</td>
                    <td style="border: 0.5pt solid #000; padding: 4px 12px;">${sale.description || 'Project Total Amount'}</td>
                    <td style="border: 0.5pt solid #000; padding: 4px 12px; text-align: right;">${Number(sale.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    <td style="border: 0.5pt solid #000; padding: 4px 12px; text-align: right;">-</td>
                </tr>
            `;
        });

        // Add Payments
        transactions.filter(t => t.type === 'Payment').forEach(payment => {
            totalPayments += Number(payment.amount);
            tbody.innerHTML += `
                <tr>
                    <td style="border: 0.5pt solid #000; padding: 4px 12px; text-align: center;">${new Date(payment.created_at).toLocaleDateString()}</td>
                    <td style="border: 0.5pt solid #000; padding: 4px 12px;">Payment: ${payment.description || 'Received'}</td>
                    <td style="border: 0.5pt solid #000; padding: 4px 12px; text-align: right;">-</td>
                    <td style="border: 0.5pt solid #000; padding: 4px 12px; text-align: right;">${Number(payment.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        });

        const balance = totalCharges - totalPayments;
        document.getElementById('soa-pdf-balance-due').textContent = 'PHP ' + balance.toLocaleString('en-US', {minimumFractionDigits: 2});

        hideLoading();
        openFSModal('soaPdfPreviewModal');
        
        // Slight delay to allow DOM to render before calculating scale
        setTimeout(() => {
            fitSOAPDFToScreen();
        }, 50);

    } catch (error) {
        hideLoading();
        alert("Error generating SOA: " + error.message);
    }
}

function applySOAPDFZoom(zoomValue) {
    const wrapper = document.getElementById('soaPdfScaleWrapper');
    if (wrapper) wrapper.style.transform = `scale(${zoomValue / 100})`;
}

function fitSOAPDFToScreen() {
    const viewport = document.getElementById('soaPdfPreviewViewport');
    const doc = document.getElementById('soa-document');
    const inp = document.getElementById('soaPdfZoomInput');
    
    if (viewport && doc && inp) {
        const vWidth = viewport.clientWidth - 32; 
        const dWidth = doc.offsetWidth;
        const scale = Math.min(2, Math.max(0.2, vWidth / dWidth));
        const zoomPct = Math.floor(scale * 100);
        
        inp.value = zoomPct;
        applySOAPDFZoom(zoomPct);
    }
}

async function downloadSOAPDF() {
    if (!currentSOAData) return;
    
    // Check if html2pdf is loaded, otherwise we cannot process the request
    if (typeof html2pdf === 'undefined') {
        alert("PDF generator script not loaded. Please check your connection or reload.");
        return;
    }

    const element = document.getElementById('soa-document');
    const safeName = currentSOAData.customer_name ? currentSOAData.customer_name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'client';
    
    const opt = {
        margin: 0,
        filename: `SOA_${safeName}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    const wrapper = document.getElementById('soaPdfScaleWrapper');
    const originalTransform = wrapper.style.transform;
    
    // Reset transform before passing DOM into the PDF generator so it does not capture a shrunken view
    wrapper.style.transform = 'scale(1)';
    
    showLoading("Downloading PDF...");
    try {
        await html2pdf().set(opt).from(element).save();
    } catch (e) {
        alert("Failed to generate PDF. Check console for details.");
        console.error(e);
    }
    
    // Restore user viewport setting
    wrapper.style.transform = originalTransform;
    hideLoading();
}

window.openSOAPDFPreview = openSOAPDFPreview;
window.applySOAPDFZoom = applySOAPDFZoom;
window.fitSOAPDFToScreen = fitSOAPDFToScreen;
window.downloadSOAPDF = downloadSOAPDF;
