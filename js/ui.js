// ==========================================================
// UI.JS
// Domain: Auth, Modals, Drawers & Global UI State
// ==========================================================

const UIManager = {
    // ==========================================
    // LOADING OVERLAY
    // ==========================================
    showLoading(text) {
        const textEl = document.getElementById('loadingText');
        if (textEl) textEl.innerText = text || "Processing...";
        document.getElementById('loadingOverlay')?.classList.remove('hidden');
    },

    hideLoading() {
        document.getElementById('loadingOverlay')?.classList.add('hidden');
    },

    // ==========================================
    // MODALS
    // ==========================================
    openFSModal(id) {
        document.getElementById(id)?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    closeFSModal(id) {
        document.getElementById(id)?.classList.add('hidden');
        // Exclude persistent/layered modals from the "restore scroll" check
        const openModals = document.querySelectorAll(
            '.fixed:not(.hidden):not(#loadingOverlay):not(.z-50):not(#navMenu):not(#accountMenu):not(#bottomNavContainer):not(#ledgerBottomNav):not(#ledgerModal):not(#ledgerBackdrop):not(#recordModal)'
        );
        if (openModals.length <= 1) document.body.style.overflow = '';
    },

    // ==========================================
    // DRAWERS (Menus)
    // ==========================================
    toggleNavMenu() {
        const menu = document.getElementById('navMenu');
        const backdrop = document.getElementById('menuBackdrop');
        if (!menu || !backdrop) return;

        if (menu.classList.contains('-translate-x-full')) {
            this.closeAllMenus();
            menu.classList.remove('-translate-x-full');
            backdrop.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } else {
            this.closeAllMenus();
        }
    },

    toggleAccountMenu() {
        const menu = document.getElementById('accountMenu');
        const backdrop = document.getElementById('menuBackdrop');
        if (!menu || !backdrop) return;

        if (menu.classList.contains('translate-x-full')) {
            this.closeAllMenus();
            this._refreshAccountDrawer();
            menu.classList.remove('translate-x-full');
            backdrop.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } else {
            this.closeAllMenus();
        }
    },

    _refreshAccountDrawer() {
        document.getElementById('menuName').innerText = sessionDisplayName || sessionName;
        document.getElementById('menuUsername').innerText = '@' + sessionUser;
        document.getElementById('menuEmail').innerText = sessionEmail;
        
        const sigStatus = document.getElementById('menuSigStatus');
        if (sigStatus) {
            sigStatus.innerText = sessionHasSig ? "Active" : "None";
            sigStatus.className = sessionHasSig ? "text-emerald-600" : "text-red-500";
        }

        const avatarSrc = sessionAvatarUrl
            ? formatImageUrl(sessionAvatarUrl)
            : this._generateAvatarUrl(sessionDisplayName || sessionName);
            
        document.getElementById('menuAvatar').src = avatarSrc;
        document.getElementById('headerAvatar').src = avatarSrc;
    },

    _generateAvatarUrl(name) {
        return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=4f46e5&color=fff&size=256';
    },

    closeAllMenus() {
        document.getElementById('navMenu')?.classList.add('-translate-x-full');
        document.getElementById('accountMenu')?.classList.add('translate-x-full');
        document.getElementById('menuBackdrop')?.classList.add('hidden');
        document.body.style.overflow = '';
    },

    // ==========================================
    // FAB
    // ==========================================
    toggleFAB() {
        const fabMenu = document.getElementById('fabMenu');
        const fabIcon = document.getElementById('fabIcon');
        if (fabMenu) {
            fabMenu.classList.toggle('hidden');
            fabMenu.classList.toggle('flex');
        }
        if (fabIcon) {
            fabIcon.classList.toggle('rotate-45');
        }
    },

    // ==========================================
    // AUTHENTICATION
    // ==========================================
    initAuth() {
        window.addEventListener('load', () => {
            const savedU = localStorage.getItem('etch_u');
            const savedP = localStorage.getItem('etch_p');
            if (savedU && savedP) {
                const uInput = document.getElementById('loginUser');
                const pInput = document.getElementById('loginPass');
                if (uInput) uInput.value = savedU;
                if (pInput) pInput.value = savedP;
                this.doLogin(savedU, savedP);
            }
            
            const fcDate = document.getElementById('fcDate');
            if(fcDate) fcDate.value = new Date().toISOString().split('T')[0];
        });

        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.doLogin(
                document.getElementById('loginUser').value,
                document.getElementById('loginPass').value
            );
        });
    },

    logout() {
        localStorage.removeItem('etch_u');
        localStorage.removeItem('etch_p');
        location.reload();
    },

    async doLogin(user, pass) {
        sessionUser = user;
        sessionPass = pass;
        const feedback = document.getElementById('loginFeedback');
        if (feedback) feedback.innerText = "";
        
        this.showLoading("Authenticating...");
        const res = await apiCall("login", { username: sessionUser, password: sessionPass });
        this.hideLoading();

        if (res.success) {
            localStorage.setItem('etch_u', sessionUser);
            localStorage.setItem('etch_p', sessionPass);

            // Populate Globals
            sessionId = res.userId;
            sessionUser = res.username || sessionUser;
            sessionName = res.name;
            sessionDisplayName = res.displayName || res.name;
            sessionEmail = res.email;
            sessionContact = res.contact;
            sessionRole = res.role;
            sessionHasSig = res.hasSignature;
            sessionAvatarUrl = res.avatarUrl || null;

            sessionLogo1 = res.logo1Url || "";
            sessionLogo2 = res.logo2Url || "";
            sessionFallbackThumb = res.fallbackThumbUrl || (typeof sessionFallbackThumb !== 'undefined' ? sessionFallbackThumb : '');

            // Update header avatar immediately
            const avatarSrc = sessionAvatarUrl
                ? formatImageUrl(sessionAvatarUrl)
                : this._generateAvatarUrl(sessionDisplayName);
            
            const hdrAvatar = document.getElementById('headerAvatar');
            const dspName = document.getElementById('displayUserName');
            if (hdrAvatar) hdrAvatar.src = avatarSrc;
            if (dspName) dspName.innerText = sessionDisplayName.split(' ')[0];

            if (res.agents && typeof populateAgentDropdowns === 'function') {
                sessionAgents = res.agents;
                populateAgentDropdowns();
            }

            if (res.status === 'FORCE_CHANGE') {
                document.getElementById('loginView')?.classList.add('hidden');
                document.getElementById('changePassView')?.classList.remove('hidden');
            } else {
                this.loadMainApp();
            }
        } else {
            if (feedback) feedback.innerText = res.message;
            localStorage.removeItem('etch_u');
            localStorage.removeItem('etch_p');
        }
    },

    loadMainApp() {
        document.getElementById('loginView')?.classList.add('hidden');
        document.getElementById('appView')?.classList.remove('hidden');

        // Pre-fill profile form fields
        const mapVals = {
            'updUsername': sessionUser,
            'updDisplayName': sessionDisplayName || sessionName,
            'updEmail': sessionEmail,
            'updContact': sessionContact
        };
        for (const [id, val] of Object.entries(mapVals)) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }

        // Header logo
        const headerLogo = document.getElementById('headerLogo1');
        if (headerLogo) headerLogo.src = sessionLogo1 ? formatImageUrl(sessionLogo1) : '';

        // Superuser-only sections
        const logoSection = document.getElementById('logoUploadSection');
        if (logoSection) logoSection.classList.toggle('hidden', sessionRole !== 'Superuser');

        const prev1 = document.getElementById('logoPreview1');
        const prev2 = document.getElementById('logoPreview2');
        if (prev1) prev1.src = sessionLogo1 ? formatImageUrl(sessionLogo1) : '';
        if (prev2) prev2.src = sessionLogo2 ? formatImageUrl(sessionLogo2) : '';

        if (typeof navigateTo === 'function') {
            navigateTo('/dashboard', true); 
        }
    },

    // ==========================================
    // ACCOUNT/PROFILE FORM BINDINGS
    // ==========================================
    bindForms() {
        document.getElementById('changePassForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const feedback = document.getElementById('changeFeedback');
            const newU = document.getElementById('newUsername').value;
            const newP = document.getElementById('newPassword').value;
            if (newP !== document.getElementById('confirmPassword').value) {
                if (feedback) feedback.innerText = "Passwords do not match.";
                return;
            }
            if (feedback) feedback.innerText = "";
            this.showLoading("Updating...");
            const res = await apiCall("updateCredentials", {
                oldUser: sessionUser, oldPass: sessionPass, newUser: newU, newPass: newP,
                newEmail: document.getElementById('newEmail').value,
                newContact: document.getElementById('newContact').value
            });
            this.hideLoading();
            if (res.success) { alert(res.message); this.logout(); }
            else if (feedback) { feedback.innerText = res.message; }
        });

        document.getElementById('uploadSigForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pass = document.getElementById('sigPass').value;
            if (pass !== sessionPass) { alert("Incorrect password"); return; }
            const file = document.getElementById('sigFile').files[0];
            this.showLoading("Uploading...");
            const fileData = await compressImageToWebP(file);
            const res = await apiCall("uploadSignature", { user: sessionUser, pass: sessionPass, image: fileData });
            this.hideLoading();
            if (res.success) {
                sessionHasSig = true;
                alert("Saved!");
                this.closeFSModal('uploadSigModal');
            } else alert("Error: " + res.message);
        });

        // Avatar Preview
        document.getElementById('avatarFile')?.addEventListener('change', function() {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('avatarPreviewImg').src = e.target.result;
                document.getElementById('avatarPreviewImg').classList.remove('hidden');
                document.getElementById('avatarPreviewPlaceholder').classList.add('hidden');
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('uploadAvatarForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pass = document.getElementById('avatarPass').value;
            if (pass !== sessionPass) { alert("Incorrect password."); return; }
            const file = document.getElementById('avatarFile').files[0];
            if (!file) { alert("Please select an image."); return; }
            this.showLoading("Uploading avatar...");
            const fileData = await compressImageToWebP(file);
            const res = await apiCall("uploadAvatar", { userId: sessionId, pass: sessionPass, image: fileData });
            this.hideLoading();
            if (res.success) {
                sessionAvatarUrl = res.avatarUrl;
                const newSrc = formatImageUrl(sessionAvatarUrl);
                document.getElementById('headerAvatar').src = newSrc;
                document.getElementById('menuAvatar').src   = newSrc;
                alert("Avatar updated!");
                this.closeFSModal('uploadAvatarModal');
            } else alert("Error: " + res.message);
        });

        document.getElementById('updateProfileForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.showLoading("Updating Details...");
            const res = await apiCall("updateProfileDetails", {
                userId: sessionId, pass: document.getElementById('updPassConfirm').value,
                newUsername: document.getElementById('updUsername').value.trim(),
                newDisplayName: document.getElementById('updDisplayName').value.trim(),
                newEmail: document.getElementById('updEmail').value.trim(),
                newContact: document.getElementById('updContact').value.trim()
            });
            this.hideLoading();
            if (res.success) {
                sessionUser = res.newUsername;
                sessionDisplayName = res.displayName;
                sessionEmail = res.email;
                sessionContact = res.contact;
                localStorage.setItem('etch_u', sessionUser);
                
                document.getElementById('displayUserName').innerText = sessionDisplayName.split(' ')[0];
                this._refreshAccountDrawer();
                alert("Profile updated!");
                this.closeFSModal('updateProfileModal');
            } else alert(res.message);
        });

        document.getElementById('updatePasswordForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.showLoading("Updating Security...");
            const res = await apiCall("updateAccountPassword", {
                user: sessionUser,
                oldPass: document.getElementById('updOldPass').value,
                newPass: document.getElementById('updNewPass').value
            });
            this.hideLoading();
            if (res.success) {
                sessionPass = document.getElementById('updNewPass').value;
                localStorage.setItem('etch_p', sessionPass);
                alert("Changed!");
                this.closeFSModal('updatePasswordModal');
            } else alert(res.message);
        });
        
        // Logo Uploads
        document.getElementById('uploadLogo1Form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('logo1File').files[0];
            if (!file) return;
            this.showLoading("Uploading Logo 1...");
            const fileData = await compressImageToWebP(file);
            const res = await apiCall("uploadLogo", { key: 'logo1_url', image: fileData, user: sessionUser, pass: sessionPass });
            this.hideLoading();
            if (res.success) {
                sessionLogo1 = res.fileUrl;
                const prev1 = document.getElementById('logoPreview1');
                if (prev1) prev1.src = formatImageUrl(sessionLogo1);
                const headerLogo = document.getElementById('headerLogo1');
                if (headerLogo) headerLogo.src = formatImageUrl(sessionLogo1);
                alert("Logo 1 updated!");
                this.closeFSModal('uploadLogosModal');
            } else alert("Error: " + res.message);
        });

        document.getElementById('uploadLogo2Form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('logo2File').files[0];
            if (!file) return;
            this.showLoading("Uploading Logo 2...");
            const fileData = await compressImageToWebP(file);
            const res = await apiCall("uploadLogo", { key: 'logo2_url', image: fileData, user: sessionUser, pass: sessionPass });
            this.hideLoading();
            if (res.success) {
                sessionLogo2 = res.fileUrl;
                const prev2 = document.getElementById('logoPreview2');
                if (prev2) prev2.src = formatImageUrl(sessionLogo2);
                alert("Logo 2 updated!");
                this.closeFSModal('uploadLogosModal');
            } else alert("Error: " + res.message);
        });
    }
};

// ==========================================
// INITIALIZATION & GLOBAL EXPORTS
// ==========================================

UIManager.initAuth();
UIManager.bindForms();

// Expose globally for HTML onclick attributes
window.showLoading = UIManager.showLoading.bind(UIManager);
window.hideLoading = UIManager.hideLoading.bind(UIManager);
window.openFSModal = UIManager.openFSModal.bind(UIManager);
window.closeFSModal = UIManager.closeFSModal.bind(UIManager);
window.toggleNavMenu = UIManager.toggleNavMenu.bind(UIManager);
window.toggleAccountMenu = UIManager.toggleAccountMenu.bind(UIManager);
window.closeAllMenus = UIManager.closeAllMenus.bind(UIManager);
window.toggleFAB = UIManager.toggleFAB.bind(UIManager);
window.logout = UIManager.logout.bind(UIManager);

// Polyfill for old `navTo` function if it exists anywhere in the HTML (e.g. PDF generation modal)
window.navTo = function(section) {
    if (typeof navigateTo === 'function') {
        if (section === 'dashboard') navigateTo('/dashboard');
        else if (section === 'history') navigateTo('/quotations');
    }
};