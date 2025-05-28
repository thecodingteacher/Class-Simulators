// --- Login Logic ---
function handleLogin() {
    const usernameInputVal = document.getElementById('loginUsername').value;
    const passwordInputVal = document.getElementById('loginPassword').value;
    const loginErrorEl = document.getElementById('loginErrorMessage');
    loginErrorEl.style.display = 'none';
    let userDataFound = null;

    if (MOCK_USER_DB[usernameInputVal] && MOCK_USER_DB[usernameInputVal].password === passwordInputVal) {
        userDataFound = MOCK_USER_DB[usernameInputVal];
    } else {
        for (const id in MOCK_USER_DB) {
            if (MOCK_USER_DB[id].username === usernameInputVal && MOCK_USER_DB[id].password === passwordInputVal) {
                userDataFound = MOCK_USER_DB[id];
                break;
            }
        }
    }

    if (userDataFound) {
        localStorage.setItem('currentUserData', JSON.stringify(userDataFound));
        currentLoggedInUser = userDataFound;

        document.cookie = `isAdmin=${userDataFound.isAdmin};path=/;SameSite=Lax;max-age=86400`; // Expires in 1 day

        if (localStorage.getItem('experimentalFeature_AdvancedNLP_Enabled') === null) {
            localStorage.setItem('experimentalFeature_AdvancedNLP_Enabled', 'false');
        }
        if (localStorage.getItem('isPremiumUser') === null) {
            localStorage.setItem('isPremiumUser', 'false');
        }

        userAccount.name = userDataFound.username;
        userAccount.tokens = userDataFound.tokens;
        userAccount.role = userDataFound.isAdmin ? 'admin' : 'user';

        updateNavLinksVisibility(true);
        showPage('dashboardPage');
    } else {
        loginErrorEl.textContent = "Invalid username/ID or password.";
        loginErrorEl.style.display = 'block';
    }
}

function handleLogout() { // It's good practice to have a logout, though not explicitly asked before
    localStorage.removeItem('currentUserData');
    localStorage.removeItem('experimentalFeature_AdvancedNLP_Enabled');
    localStorage.removeItem('isPremiumUser');
    currentLoggedInUser = null;
    document.cookie = "isAdmin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    userAccount = { name: "Default User", tokens: 100, role: "user" };
    updateNavLinksVisibility(false);
    history.replaceState(null, null, '#loginPage');
    showPage('loginPage');
}

// --- Dashboard Logic ---
function updateDashboardDisplay() {
    if (!currentLoggedInUser) return;
    const urlParams = new URLSearchParams(window.location.search);
    const nameFromUrl = urlParams.get('displayName');
    const welcomeNameEl = document.getElementById('welcomeName');

    let loggedInUserData = JSON.parse(localStorage.getItem('currentUserData'));

    if (nameFromUrl) {
        welcomeNameEl.innerHTML = decodeURIComponent(nameFromUrl);
    } else if (loggedInUserData && loggedInUserData.username) {
        welcomeNameEl.textContent = loggedInUserData.username;
    } else {
        welcomeNameEl.textContent = "User";
    }

    const tokensDisplayEl = document.getElementById('userTokensDisplay');
    if (loggedInUserData && typeof loggedInUserData.tokens !== 'undefined') {
        tokensDisplayEl.textContent = loggedInUserData.tokens;
    } else {
         tokensDisplayEl.textContent = userAccount.tokens;
    }

    const expFeatureStatusEl = document.getElementById('experimentalFeatureStatus');
    if (localStorage.getItem('experimentalFeature_AdvancedNLP_Enabled') === 'true') {
        expFeatureStatusEl.innerHTML = "Status: <strong style='color:var(--success-color)'>Advanced NLP Model ACTIVE</strong>";
    } else {
        expFeatureStatusEl.textContent = "No experimental features currently active.";
    }
}

// --- Profile/Records Logic ---
function loadUserProfileView() {
    if (!currentLoggedInUser) return;
    const urlParams = new URLSearchParams(window.location.search);
    let userIdToView = urlParams.get('userId');
    let loggedInUserData = JSON.parse(localStorage.getItem('currentUserData'));

    if (!userIdToView && loggedInUserData) {
        userIdToView = loggedInUserData.id;
    }

    const profileUserIdEl = document.getElementById('profileUserId');
    const profileUsernameEl = document.getElementById('profileUsername');
    const profileEmailEl = document.getElementById('profileEmail');
    const profileBioEl = document.getElementById('profileBio');
    const profileTokensEl = document.getElementById('profileTokens');
    const profileLastLoginEl = document.getElementById('profileLastLogin');

    if (!userIdToView) {
        profileUserIdEl.textContent = "N/A";
        profileUsernameEl.textContent = "N/A";
        profileEmailEl.textContent = "N/A";
        profileBioEl.textContent = "No user data to display.";
        profileTokensEl.textContent = "N/A";
        profileLastLoginEl.textContent = "N/A";
        return;
    }

    const userDataToDisplay = MOCK_USER_DB[userIdToView];
    if (userDataToDisplay) {
        profileUserIdEl.textContent = userDataToDisplay.id;
        profileUsernameEl.textContent = userDataToDisplay.username;
        profileEmailEl.textContent = userDataToDisplay.email;
        profileBioEl.textContent = userDataToDisplay.bio;
        profileTokensEl.textContent = userDataToDisplay.tokens;
        profileLastLoginEl.textContent = new Date(userDataToDisplay.lastLogin).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } else {
        profileUserIdEl.textContent = userIdToView;
        profileUsernameEl.textContent = `User Not Found`;
        profileEmailEl.textContent = "N/A";
        profileBioEl.textContent = "No records available for this user ID.";
        profileTokensEl.textContent = "N/A";
        profileLastLoginEl.textContent = "N/A";
    }
}

// --- Settings Page Logic ---
function loadSettingsPageData() {
    if (!currentLoggedInUser) return;
    const userData = JSON.parse(localStorage.getItem('currentUserData'));
    if (userData) {
        document.getElementById('settingsUsername').textContent = userData.username;
        document.getElementById('settingsEmail').value = userData.email || "";
        document.getElementById('settingsTokens').textContent = userData.tokens;
    }
    const siteVerDisp = document.getElementById('siteVersionDisplay');
    const siteVerDispInternal = document.getElementById('siteVersionDisplayInternal');
    if (siteVerDisp) siteVerDisp.textContent = siteVersion;
    if (siteVerDispInternal) siteVerDispInternal.textContent = siteVersion;
}

function saveUserSettings() {
    if (!currentLoggedInUser) return;
    let userData = JSON.parse(localStorage.getItem('currentUserData'));
    if (userData) {
        userData.email = document.getElementById('settingsEmail').value;
        localStorage.setItem('currentUserData', JSON.stringify(userData));
        MOCK_USER_DB[userData.id].email = userData.email;
        displayStatusMessage('settingsSaveStatus', "Settings updated.", 'success');
        if (document.getElementById('profilePage').classList.contains('active-page')) loadUserProfileView();
        loadSettingsPageData();
    } else {
        displayStatusMessage('settingsSaveStatus', "Error: No user data found.", 'error');
    }
}

// --- Admin Panel Logic ---
function checkAdminAccess() {
    const adminPanelLink = document.getElementById('adminPanelLink');
    if (!adminPanelLink) return;

    const isAdminCookie = document.cookie.split('; ').find(row => row.startsWith('isAdmin='));
    const isAdminFromCookie = isAdminCookie ? isAdminCookie.split('=')[1] === 'true' : false;

    if (currentLoggedInUser && currentLoggedInUser.isAdmin && isAdminFromCookie) {
         adminPanelLink.style.display = 'inline-block';
    } else {
         adminPanelLink.style.display = 'none';
    }
}

// --- Premium Activation Logic ---
function activatePremium() {
    if (!currentLoggedInUser) return;
    const userInputCode = document.getElementById('premiumCodeInput').value;
    const statusElId = 'premiumActivationStatus';
    const actualSecretDecoded = "PREMIUM_UNLOCK_2024";
    const actualSecretEncoded = btoa(actualSecretDecoded);

    if (userInputCode === actualSecretEncoded || userInputCode === actualSecretDecoded) {
        localStorage.setItem('isPremiumUser', 'true');
        displayStatusMessage(statusElId, "Premium Status activated!", 'success');
    }
    else {
        displayStatusMessage(statusElId, "Invalid activation code.", 'error');
    }
    updatePremiumStatusDisplay();
}

function updatePremiumStatusDisplay() {
    if (!currentLoggedInUser) return;
    const premiumStatusEl = document.getElementById('premiumStatus');
    if (premiumStatusEl) {
        if (localStorage.getItem('isPremiumUser') === 'true') {
            premiumStatusEl.innerHTML = "Current Status: <strong style='color:var(--success-color);'>Premium Account Active</strong>";
        } else {
            premiumStatusEl.innerHTML = "Current Status: <strong style='color: var(--warning-color);'>Standard Account</strong>";
        }
    }
}

// --- Experimental Feature Activation ---
function activateExperimentalFeature() {
    if (!currentLoggedInUser) return;
    const key = document.getElementById('experimentalFeatureKeyInput').value;
    const statusElId = 'experimentalKeyStatus';
    const targetFeatureFlag = 'experimentalFeature_AdvancedNLP_Enabled';

    if (key === "ENABLE_ALPHA_FEATURES") {
        localStorage.setItem(targetFeatureFlag, 'true');
        displayStatusMessage(statusElId, 'Experimental feature enabled!', 'success');
    } else if (key === "DISABLE_ALPHA_FEATURES") {
        localStorage.setItem(targetFeatureFlag, 'false');
        displayStatusMessage(statusElId, 'Experimental feature disabled.', 'info');
    }
    else {
        displayStatusMessage(statusElId, 'Invalid feature key.', 'error');
    }
    updateDashboardDisplay();
}