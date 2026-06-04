// --- CONFIGURATION & STATE ---
var API_URL = "https://agent-api.gcalacdayjr.workers.dev/"; 
var ITEMS_PER_PAGE = 10;
var lineItemCount = 0;

var sessionUser = "", sessionPass = "", sessionId = ""; // sessionId = UUID
var sessionName = "", sessionDisplayName = "", sessionEmail = "", sessionContact = "", sessionRole = "";
var sessionHasSig = false;
var sessionAvatarUrl = null;
var sessionAgents = []; // [{ id, username }]

// --- APP CONFIG (loaded at login) ---
var sessionLogo1 = "";
var sessionLogo2 = "";
var sessionFallbackThumb = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+";

var allQuotations = [], filteredQuotations = [], currentQuotePage = 1;
var allProjects = [], filteredProjects = [], currentProjPage = 1;
var currentProject = null;

var globalFixedCosts = [];
var dashboardTabStatus = 'In Progress'; 
var projectTabStatus = 'All';
var quoteTabStatus = 'All';

// --- GLOBAL UTILITIES ---
if ('serviceWorker' in navigator) { 
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js'); }); 
}

async function apiCall(action, payload) {
  try {
    const response = await fetch(API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ action: action, data: payload }) 
    });
    return await response.json();
  } catch (error) { return { success: false, message: error.toString() }; }
}

function formatImageUrl(url) { 
    return !url ? '' : url.replace('https://drive.google.com/file/d/', 'https://lh3.googleusercontent.com/d/').replace('/view?usp=drivesdk', '').replace('/view', ''); 
}

function extractFileId(url) { 
    if (!url) return null; 
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/); 
    return match ? match[1] : null; 
}

async function compressImageToWebP(file) {
  return new Promise((resolve) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image(); img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas'); const MAX_WIDTH = 1200;
        let width = img.width; let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.8)); 
      };
    };
  });
}

// Helper: get agent UUID by username from sessionAgents list
function getAgentIdByName(name) {
  const found = sessionAgents.find(a => a.username === name);
  return found ? found.id : null;
}