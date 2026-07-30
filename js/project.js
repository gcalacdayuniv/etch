// ==========================================================
// PROJECT.JS
// Handles: Project Creation & General Project Utilities
// ==========================================================

function populateAgentDropdowns() {
    const agents = typeof sessionAgents !== 'undefined' ? sessionAgents : [];
    const mainSelect = document.getElementById('newProjMainAgent');
    const coSelect = document.getElementById('newProjCoAgent');
    
    let mainOpts = '';
    let coOpts = '<option value="">None (1 Agent Only)</option>';
    
    agents.forEach(a => {
        const name = a.name || a.username;
        const opt = `<option value="${a.id}" data-name="${name}">${name}</option>`;
        mainOpts += opt;
        coOpts += opt;
    });
    
    if (mainSelect) mainSelect.innerHTML = mainOpts;
    if (coSelect) coSelect.innerHTML = coOpts;
    if (mainSelect && typeof sessionId !== 'undefined') mainSelect.value = sessionId;
}

async function openNewProjectModal() {
    populateAgentDropdowns();
    
    // 1. Fetch Customers and populate dropdown
    const custRes = await apiCall('getCustomers', {});
    if (custRes.success) {
        const select = document.getElementById('newProjCustomer');
        if (select) {
            const opts = custRes.data.map(c => `<option value="${c.id}">${c.name}</option>`);
            select.innerHTML = '<option value="">-- Select Customer --</option>' + opts.join('');
        }
    }

    // 2. Fetch Quotations and populate dropdown
    const res = await apiCall('getUserQuotations', { agentId: sessionId, role: sessionRole });
    if (res.success) {
        const select = document.getElementById('newProjQuotation');
        if (select) {
            const opts = res.data.filter(q => q.status === 'Approved').map(q => `<option value="${q.quotation_number}">${q.quotation_number} - ${q.customer_name}</option>`);
            select.innerHTML = '<option value="">-- Select Approved Quotation --</option>' + opts.join('');
        }
    }
    
    openFSModal('newProjectModal');
}

document.getElementById('newProjectForm')?.addEventListener('reset', () => {
    setTimeout(() => {
        const container = document.getElementById('newProjAgentContainer');
        const mainSelect = document.getElementById('newProjMainAgent');
        
        if (sessionRole === 'Superuser') {
            container.classList.remove('hidden');
            const myAgent = sessionAgents.find(a => a.id === sessionId);
            if (myAgent) mainSelect.value = myAgent.id;
        } else {
            container.classList.add('hidden');
            mainSelect.innerHTML = `<option value="${sessionId}">${sessionName}</option>`;
        }
    }, 10);
});

document.getElementById('newProjectForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading("Deploying...");

    let mainAgentId = sessionId;
    let mainAgentName = sessionName;

    if (sessionRole === 'Superuser') {
        const mainSelect = document.getElementById('newProjMainAgent');
        mainAgentId = mainSelect.value;
        mainAgentName = mainSelect.options[mainSelect.selectedIndex]?.getAttribute('data-name') || mainSelect.options[mainSelect.selectedIndex]?.text || sessionName;
    }

    const coSelect = document.getElementById('newProjCoAgent');
    const coAgentId = coSelect.value || null;
    const coAgentName = coAgentId ? (coSelect.options[coSelect.selectedIndex]?.getAttribute('data-name') || coSelect.options[coSelect.selectedIndex]?.text) : null;
    
    const customerSelect = document.getElementById('newProjCustomer');
    const customerId = customerSelect ? customerSelect.value : null;

    const quotationSelect = document.getElementById('newProjQuotation');
    const quotationNumber = quotationSelect ? quotationSelect.value : null;

    const res = await apiCall("createProject", {
        projectName: document.getElementById('newProjName').value,
        customerId: customerId,
        mainAgent: mainAgentName,
        mainAgentId: mainAgentId,
        coAgent: coAgentName,
        coAgentId: coAgentId,
        quotationNumber: quotationNumber
    });

    hideLoading();
    if (res.success) {
        closeFSModal('newProjectModal');
        if (typeof fetchAndRenderDashboard === 'function') fetchAndRenderDashboard();
    } else {
        alert("Error: " + res.message);
    }
});

function triggerThumbUpload(pName) {
    document.getElementById('uploadThumbTargetProject').value = pName;
    document.getElementById('globalThumbInput').click();
}

async function handleThumbUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const pName = document.getElementById('uploadThumbTargetProject').value;
    showLoading("Uploading...");
    
    const fileData = await compressImageToWebP(file);
    const res = await apiCall("updateThumbnail", {
        projectName: pName,
        fileData: fileData,
        callerId: sessionId,
        callerRole: sessionRole
    });
    
    hideLoading();
    document.getElementById('globalThumbInput').value = "";
    
    if (res.success && typeof fetchAndRenderDashboard === 'function') {
        fetchAndRenderDashboard();
    } else if (!res.success) {
        alert("Failed: " + (res.message || ""));
    }
}

window.openNewProjectModal = openNewProjectModal;
