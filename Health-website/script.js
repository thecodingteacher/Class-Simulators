// --- Login Logic (Action) ---
function handleLogin() {
    const usernameInput = document.getElementById('loginUsername').value;
    const loginErrorEl = document.getElementById('loginErrorMessage');
    if (loginErrorEl) loginErrorEl.style.display = 'none';
    let userDataFound = null;

    // MOCK_USER_DB is from script1.js
    if (MOCK_USER_DB[usernameInput]) { 
        userDataFound = MOCK_USER_DB[usernameInput];
    } else { 
        for (const id in MOCK_USER_DB) {
            if (MOCK_USER_DB[id].username === usernameInput) {
                userDataFound = MOCK_USER_DB[id];
                break;
            }
        }
    }

    if (userDataFound) {
        localStorage.setItem('currentUserData', JSON.stringify(userDataFound));
        currentLoggedInUser = userDataFound; // currentLoggedInUser from script1.js

        document.cookie = `isAdmin=${userDataFound.id === "999"};path=/;SameSite=Lax`; 
        checkAdminAccess(); // from script1.js

        if (localStorage.getItem('userDiscountApplied') === null) {
            localStorage.setItem('userDiscountApplied', 'false');
        }

        // userAccount from script1.js
        userAccount.name = userDataFound.username;
        userAccount.balance = userDataFound.credits;
        userAccount.role = (userDataFound.id === "999") ? 'admin' : 'user';
        
        showPage('dashboardPage'); // from script2.js
    } else {
        if (loginErrorEl) {
            loginErrorEl.textContent = "Invalid login credentials. Please try again.";
            loginErrorEl.style.display = 'block';
        }
    }
}

// --- Health Test Logic (Action) ---
function addHealthTestResult() {
    if (!db) { // db is from script1.js
        const resultsListEl = document.getElementById('healthResultsList');
        if (resultsListEl) {
            const li = document.createElement('li');
            li.textContent = "Database not ready. Please try again shortly.";
            li.style.color = "var(--danger-color)";
            if(resultsListEl.firstChild && resultsListEl.firstChild.textContent === "No metrics recorded yet."){
                resultsListEl.innerHTML = '';
            }
            resultsListEl.prepend(li);
        }
        return; 
    }
    const testNameInput = document.getElementById('testNameInput');
    const testValueInput = document.getElementById('testValueInput');
    if (!testNameInput || !testValueInput) return;

    const testName = testNameInput.value.trim();
    const testValue = testValueInput.value.trim();

    if (!testName || !testValue) { 
        alert("Please enter both metric name and value."); 
        return; 
    }

    const transaction = db.transaction(['userMetrics'], 'readwrite');
    const objectStore = transaction.objectStore('userMetrics');
    const newTest = { metricName: testName, value: testValue, recordDate: new Date().toISOString() };
    
    const request = objectStore.add(newTest);
    request.onsuccess = () => {
        loadHealthTestResults(); // from script2.js
        testNameInput.value = '';
        testValueInput.value = '';
    };
    request.onerror = (e) => console.error("Error adding health metric:", e.target.error);
}

// --- Settings Page Logic (Actions) ---
function saveUserSettings() {
    let userData = null;
    const storedData = localStorage.getItem('currentUserData');
    if (storedData) {
        try {
            userData = JSON.parse(storedData);
        } catch(e) { console.error("Error parsing user data from LS", e); }
    }


    if (userData) {
        const settingsEmailEl = document.getElementById('settingsEmail');
        if(settingsEmailEl) userData.email = settingsEmailEl.value;
        
        localStorage.setItem('currentUserData', JSON.stringify(userData));
        displayStatusMessage('settingsSaveStatus', "Settings updated successfully.", 'success'); // from script1.js
        updateDashboardDisplay(); // from script2.js
        loadSettingsPageData(); // from script2.js
    } else {
        displayStatusMessage('settingsSaveStatus', "Error: No user data found to save.", 'error'); // from script1.js
    }
}

function applyDiscountCode() {
    const discountCodeInput = document.getElementById('discountCodeInput');
    if (!discountCodeInput) return;
    const code = discountCodeInput.value;
    const statusElId = 'discountApplyStatus';

    if (code.toUpperCase() === "SAVEBIG24") { 
        localStorage.setItem('userDiscountApplied', 'true'); 
        displayStatusMessage(statusElId, "Discount code SAVEBIG24 applied successfully!", 'success'); // from script1.js
    } else if (code.toUpperCase() === "REMOVEDISCOUNT") { 
         localStorage.setItem('userDiscountApplied', 'false');
         displayStatusMessage(statusElId, "Discount status has been reset.", 'info'); // from script1.js
    } else {
        displayStatusMessage(statusElId, "Invalid or expired discount code.", 'error'); // from script1.js
    }
    updateDashboardDisplay(); // from script2.js
}

function runCustomScript() { 
    const customScriptInput = document.getElementById('customScriptInput');
    if (!customScriptInput) return;

    const scriptContent = customScriptInput.value;
    const statusElId = 'customScriptStatus';

    if (scriptContent) {
        try {
            eval(scriptContent); 
            displayStatusMessage(statusElId, "Customizations applied. Some changes may require a page refresh to fully reflect.", 'success'); // from script1.js
            loadSettingsPageData(); // from script2.js
            updateDashboardDisplay(); // from script2.js
        } catch (e) {
            displayStatusMessage(statusElId, "Error executing custom script: " + e.message, 'error'); // from script1.js
        }
    } else {
         displayStatusMessage(statusElId, "No script content provided.", 'warning'); // from script1.js
    }
}

// --- Feature Token Logic (Action) ---
function checkFeatureToken() {
    const featureTokenInput = document.getElementById('featureTokenInput');
    if (!featureTokenInput) return;

    const userInputToken = featureTokenInput.value;
    const statusElId = 'featureTokenStatus';
    const requiredDecodedValue = "ULTRAACCESS"; 
    const requiredEncodedValue = btoa(requiredDecodedValue); 

    if (userInputToken === requiredEncodedValue || userInputToken === requiredDecodedValue) {
        displayStatusMessage(statusElId, "Premium Feature successfully activated!", 'success'); // from script1.js
        localStorage.setItem('hasUnlockedSpecialFeature', 'true');
    }
    else {
        displayStatusMessage(statusElId, "Invalid or incorrect activation token.", 'error'); // from script1.js
        localStorage.removeItem('hasUnlockedSpecialFeature');
    }
    checkFeatureTokenDisplay(); // from script2.js
}


// --- Initial Setup on Page Load & Hash Changes ---
window.onload = function() {
    checkAdminAccess(); // from script1.js

    const initialHash = window.location.hash;
    const initialPageId = initialHash ? initialHash.substring(1) : null;
    const validPageIds = Array.from(document.querySelectorAll('.page')).map(p => p.id);
    
    let pageToLoad = 'loginPage'; // Default

    const storedUserData = localStorage.getItem('currentUserData');
    if (storedUserData) {
        try {
            currentLoggedInUser = JSON.parse(storedUserData); // currentLoggedInUser from script1.js
            // userAccount from script1.js
            userAccount.name = currentLoggedInUser.username;
            userAccount.balance = currentLoggedInUser.credits;
            userAccount.role = (currentLoggedInUser.id === "999") ? 'admin' : 'user';
            pageToLoad = 'dashboardPage'; // Default for logged-in users
        } catch (e) {
            console.error("Error parsing stored user data on load:", e);
            localStorage.removeItem('currentUserData'); // Clear corrupted data
            pageToLoad = 'loginPage'; // Fallback to login if data is corrupt
        }
    }
    
    if (initialPageId && validPageIds.includes(initialPageId)) {
         // If trying to access a page other than login without being logged in, redirect to login
         if (initialPageId !== 'loginPage' && !currentLoggedInUser) {
            pageToLoad = 'loginPage'; 
         } else {
            pageToLoad = initialPageId;
         }
    } else if (!initialPageId && currentLoggedInUser) {
        // If no hash but logged in, go to dashboard
        pageToLoad = 'dashboardPage';
    } else if (!initialPageId && !currentLoggedInUser) {
        // If no hash and not logged in, go to login
        pageToLoad = 'loginPage';
    }
    // else, if initialPageId is invalid, it will default to loginPage or dashboardPage based on login state

    showPage(pageToLoad); // from script2.js
    // Explicitly call update functions if landing on a page that needs it and user is logged in
    if (pageToLoad !== 'loginPage' && currentLoggedInUser) { 
        if (pageToLoad === 'dashboardPage') updateDashboardDisplay(); // from script2.js
        if (pageToLoad === 'settingsPage') loadSettingsPageData(); // from script2.js
    }
};

window.onhashchange = function() {
    const pageId = window.location.hash.substring(1);
    const validPageIds = Array.from(document.querySelectorAll('.page')).map(p => p.id);
    let pageToShow = 'loginPage'; // Default

    const storedData = localStorage.getItem('currentUserData');
    let userIsLoggedIn = false;
    if (storedData) {
        try {
            JSON.parse(storedData); // Just to check if it's valid
            userIsLoggedIn = true;
        } catch(e) { userIsLoggedIn = false; }
    }
    
    if (pageId && validPageIds.includes(pageId)) {
        if (pageId !== 'loginPage' && !userIsLoggedIn) {
            pageToShow = 'loginPage'; // Force login if trying to access protected page without session
        } else {
            pageToShow = pageId;
        }
    } else if (userIsLoggedIn) { 
        pageToShow = 'dashboardPage'; // Default to dashboard if logged in and hash is invalid/empty
    }
    // If not logged in and hash is invalid/empty, it defaults to 'loginPage'
    
    showPage(pageToShow); // from script2.js
};