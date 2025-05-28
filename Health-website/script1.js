// --- Page Navigation & State Update ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    const targetLink = document.querySelector(`nav a[href="#${pageId}"]`);

    if (targetPage) targetPage.classList.add('active-page');
    if (targetLink) targetLink.classList.add('active');
    
    if (window.location.hash !== `#${pageId}`) {
        window.location.hash = pageId;
    }

    // Update content based on page
    if (pageId === 'dashboardPage') updateDashboardDisplay();
    if (pageId === 'settingsPage') loadSettingsPageData();
    if (pageId === 'healthTestPage' && db) loadHealthTestResults(); // db is from script1.js
    if (pageId === 'profilePage') loadUserProfileView(); 

    // Check for diagnostics URL parameter specifically for admin page
    const urlParams = new URLSearchParams(window.location.search);
    const diagContainer = document.getElementById('diagnosticsDataContainer');
    if (diagContainer) {
        if (urlParams.get('showDiagnostics') === 'true' && pageId === 'adminPage') {
            diagContainer.style.display = 'block';
        } else {
            diagContainer.style.display = 'none';
        }
    }
}

// --- Dashboard Logic (Display) ---
function updateDashboardDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    const nameFromUrl = urlParams.get('name'); 
    const welcomeNameEl = document.getElementById('welcomeName');
    
    let loggedInUserData = null;
    const storedData = localStorage.getItem('currentUserData');
    if (storedData) {
        try {
            loggedInUserData = JSON.parse(storedData);
        } catch(e) { console.error("Error parsing user data from localStorage", e); }
    }


    if (welcomeNameEl) {
        if (nameFromUrl) {
            welcomeNameEl.innerHTML = nameFromUrl; 
        } else if (loggedInUserData && loggedInUserData.username) {
            welcomeNameEl.textContent = loggedInUserData.username;
        } else {
            welcomeNameEl.textContent = "Guest";
        }
    }


    const creditsDisplayEl = document.getElementById('userCreditsDisplay');
    if(creditsDisplayEl) {
        if (loggedInUserData && typeof loggedInUserData.credits !== 'undefined') {
            creditsDisplayEl.textContent = loggedInUserData.credits;
        } else {
             creditsDisplayEl.textContent = userAccount.balance; // userAccount from script1.js
        }
    }
    
    const discountInfoEl = document.getElementById('discountInfo');
    if (discountInfoEl) {
        if (localStorage.getItem('userDiscountApplied') === 'true') {
            discountInfoEl.innerHTML = "A <strong>10% discount</strong> is currently active on your account!";
            discountInfoEl.style.color = 'var(--success-color)';
        } else {
            discountInfoEl.textContent = "Check your settings to apply available discount codes.";
            discountInfoEl.style.color = 'inherit';
        }
    }
    checkFeatureTokenDisplay(); // This function is also in this file
}

// --- Profile/Records Logic (Display) ---
function loadUserProfileView() {
    const urlParams = new URLSearchParams(window.location.search);
    const userIdToView = urlParams.get('viewAsUser'); 
    let targetUserId = null;

    let loggedInUserData = null;
    const storedData = localStorage.getItem('currentUserData');
     if (storedData) {
        try {
            loggedInUserData = JSON.parse(storedData);
        } catch(e) { console.error("Error parsing user data from localStorage", e); }
    }


    if (userIdToView) { 
        targetUserId = userIdToView;
    } else if (loggedInUserData) { 
        targetUserId = loggedInUserData.id;
    }

    const profileUserIdEl = document.getElementById('profileUserId');
    const profileNameEl = document.getElementById('profileName');
    const healthSummaryEl = document.getElementById('profileHealthSummary');
    const lastLoginEl = document.getElementById('profileLastLogin');

    if (!targetUserId) {
        if(profileUserIdEl) profileUserIdEl.textContent = "N/A";
        if(profileNameEl) profileNameEl.textContent = "N/A";
        if(healthSummaryEl) healthSummaryEl.textContent = "No user data to display. Please log in or specify a user.";
        if(lastLoginEl) lastLoginEl.textContent = "N/A";
        return;
    }

    const userData = MOCK_USER_DB[targetUserId]; // MOCK_USER_DB from script1.js
    if (userData) {
        if(profileUserIdEl) profileUserIdEl.textContent = userData.id;
        if(profileNameEl) profileNameEl.textContent = userData.username;
        if(healthSummaryEl) healthSummaryEl.textContent = userData.healthSummary;
        if(lastLoginEl) lastLoginEl.textContent = new Date(userData.lastLogin).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } else {
        if(profileUserIdEl) profileUserIdEl.textContent = targetUserId;
        if(profileNameEl) profileNameEl.textContent = `User Not Found`;
        if(healthSummaryEl) healthSummaryEl.textContent = "No health records available for this user ID.";
        if(lastLoginEl) lastLoginEl.textContent = "N/A";
    }
}

// --- Health Test Logic (Display) ---
function loadHealthTestResults() {
    if (!db) { return; } // db from script1.js
    const resultsListEl = document.getElementById('healthResultsList');
    if (!resultsListEl) return;
    resultsListEl.innerHTML = '<li>Loading recorded metrics...</li>';

    const objectStore = db.transaction('userMetrics').objectStore('userMetrics');
    let resultsHTML = "";
    objectStore.openCursor(null, 'prev').onsuccess = function(event) { 
        const cursor = event.target.result;
        if (cursor) {
            resultsHTML += `<li><strong>${cursor.value.metricName}:</strong> ${cursor.value.value} 
                            <br><small><em>Recorded: ${new Date(cursor.value.recordDate).toLocaleString()} (ID: ${cursor.value.id})</em></small></li>`;
            cursor.continue();
        } else {
            resultsListEl.innerHTML = resultsHTML || "<li>No metrics recorded yet.</li>";
        }
    };
     objectStore.openCursor().onerror = (e) => {
        resultsListEl.innerHTML = "<li>Error loading metrics.</li>";
        console.error("Error loading health results:", e.target.error);
    }
}

// --- Settings Page Logic (Display) ---
function loadSettingsPageData() {
    let userData = null;
    const storedData = localStorage.getItem('currentUserData');
    if(storedData) {
        try {
            userData = JSON.parse(storedData);
        } catch(e) { console.error("Error parsing user data from localStorage", e); }
    }
    
    const settingsUsernameEl = document.getElementById('settingsUsername');
    const settingsEmailEl = document.getElementById('settingsEmail');
    const settingsCreditsEl = document.getElementById('settingsCredits');
    const siteVersionDisplayEl = document.getElementById('siteVersionDisplay');


    if (userData) {
        if(settingsUsernameEl) settingsUsernameEl.textContent = userData.username;
        if(settingsEmailEl) settingsEmailEl.value = userData.email || "";
        if(settingsCreditsEl) settingsCreditsEl.textContent = userData.credits;
    }
    if(siteVersionDisplayEl) siteVersionDisplayEl.textContent = siteVersion; // siteVersion from script1.js
}


// --- Feature Token Logic (Display) ---
function checkFeatureTokenDisplay() {
    const statusEl = document.getElementById('secretFeatureStatus');
    if (!statusEl) return;

    if (localStorage.getItem('hasUnlockedSpecialFeature') === 'true') {
        statusEl.innerHTML = "<strong style='color:var(--success-color);'>Premium Features: ACTIVE</strong>";
    } else {
        statusEl.textContent = "No premium features currently active.";
    }
}