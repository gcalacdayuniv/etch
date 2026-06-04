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

    const res = await apiCall("createProject", {
        projectName: document.getElementById('newProjName').value,
        mainAgent: mainAgentName,
        mainAgentId: mainAgentId,
        coAgent: coAgentName,
        coAgentId: coAgentId
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