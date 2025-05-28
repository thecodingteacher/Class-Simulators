// --- Global Variables & Mock Data ---


// --- IndexedDB Setup for AI Notes ---
let idb;
const idbName = "IntelliChat_UserNotesDB";
const requestIDB = indexedDB.open(idbName, 1);

requestIDB.onupgradeneeded = function(event) {
    idb = event.target.result;
    if (!idb.objectStoreNames.contains('aiUserNotes')) {
        const objectStore = idb.createObjectStore('aiUserNotes', { keyPath: 'id', autoIncrement:true });
        objectStore.createIndex('noteTitle', 'noteTitle', { unique: false });
        objectStore.createIndex('createdDate', 'createdDate', { unique: false });
    }
};
requestIDB.onsuccess = function(event) {
    idb = event.target.result;
    // Conditional load based on current state, potentially called from showPage as well
    if (currentLoggedInUser && document.getElementById('aiNotesPage') && document.getElementById('aiNotesPage').classList.contains('active-page')) {
         loadAINotes(); // Ensure loadAINotes is defined or this call is safe
    }
};
requestIDB.onerror = function(event) {
    console.error("IndexedDB initialization error:", event.target.errorCode);
};

function updateNavLinksVisibility(isLoggedIn) {
    const navLinks = document.querySelectorAll('#mainNav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === '#loginPage') {
            link.style.display = isLoggedIn ? 'none' : 'inline-block';
        } else if (link.id === 'adminPanelLink') {
            // Admin panel link visibility is handled by checkAdminAccess after login status changes
        } else {
            link.style.display = isLoggedIn ? 'inline-block' : 'none';
        }
    });
    if (typeof checkAdminAccess === "function") { // Check if checkAdminAccess is defined
        checkAdminAccess();
    }
}

// --- Page Navigation & State Update ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('#mainNav a').forEach(link => link.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    const targetLink = document.querySelector(`#mainNav a[href="#${pageId}"]`);

    if (targetPage) targetPage.classList.add('active-page');
    if (targetLink) targetLink.classList.add('active');

    const currentHash = window.location.hash.split('?')[0];
    if (currentHash !== `#${pageId}`) {
         history.pushState(null, null, `#${pageId}`);
    }

    // Page-specific updates - ensure these functions are defined or calls are safe
    if (pageId === 'dashboardPage' && currentLoggedInUser && typeof updateDashboardDisplay === "function") updateDashboardDisplay();
    if (pageId === 'settingsPage' && currentLoggedInUser && typeof loadSettingsPageData === "function") loadSettingsPageData();
    if (pageId === 'aiNotesPage' && currentLoggedInUser && idb && typeof loadAINotes === "function") loadAINotes();
    if (pageId === 'profilePage' && currentLoggedInUser && typeof loadUserProfileView === "function") loadUserProfileView();
    if (pageId === 'premiumPage' && currentLoggedInUser && typeof updatePremiumStatusDisplay === "function") updatePremiumStatusDisplay();


    const urlParams = new URLSearchParams(window.location.search);
    const diagContainer = document.getElementById('adminDiagnosticsContainer');
    if (diagContainer) {
        if (urlParams.get('showDiagnostics') === 'true' && pageId === 'adminPage' && currentLoggedInUser && currentLoggedInUser.isAdmin) {
            diagContainer.style.display = 'block';
        } else {
            diagContainer.style.display = 'none';
        }
    }
    const debugPanel = document.getElementById('debugInfoPanel');
    if (debugPanel) {
        if (urlParams.get('debug') === 'true' && currentLoggedInUser) {
            debugPanel.style.display = 'block';
            const debugUserData = document.getElementById('debugUserData');
            if(debugUserData) debugUserData.textContent = localStorage.getItem('currentUserData') || 'N/A';
        } else {
            debugPanel.style.display = 'none';
        }
    }
}

function displayStatusMessage(elementId, message, type = 'success') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (match) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
    });
}


// --- Initial Setup on Page Load ---
window.onload = function() {
    const siteVersionEl = document.getElementById('siteVersionDisplay');
    if(siteVersionEl) siteVersionEl.textContent = siteVersion;

    const storedUserDataString = localStorage.getItem('currentUserData');
    if (storedUserDataString) {
        try {
            currentLoggedInUser = JSON.parse(storedUserDataString);
            userAccount.name = currentLoggedInUser.username;
            userAccount.tokens = currentLoggedInUser.tokens;
            userAccount.role = currentLoggedInUser.isAdmin ? 'admin' : 'user';
            updateNavLinksVisibility(true);
        } catch (e) {
            localStorage.removeItem('currentUserData');
            currentLoggedInUser = null;
            updateNavLinksVisibility(false);
        }
    } else {
        updateNavLinksVisibility(false);
    }

    const initialHash = window.location.hash.split('?')[0];
    const validPageIds = Array.from(document.querySelectorAll('.page')).map(p => p.id);
    let pageToLoad = 'loginPage';

    if (currentLoggedInUser) {
        if (initialHash && initialHash !== '#' && validPageIds.includes(initialHash.substring(1))) {
            pageToLoad = initialHash.substring(1);
        } else {
            pageToLoad = 'dashboardPage';
            if (initialHash !== '#dashboardPage' && initialHash !== '') { // Avoid replacing if already correct or empty
                 history.replaceState(null, null, '#dashboardPage');
            }
        }
    } else {
        pageToLoad = 'loginPage';
         if (initialHash && initialHash !== '#loginPage' && initialHash !== '') {
             history.replaceState(null, null, '#loginPage');
         }
    }
    showPage(pageToLoad);
};

window.onhashchange = function() {
    const pageIdWithQuery = window.location.hash.substring(1);
    const pageId = pageIdWithQuery.split('?')[0];
    const validPageIds = Array.from(document.querySelectorAll('.page')).map(p => p.id);

    if (!currentLoggedInUser && pageId !== 'loginPage') {
        history.replaceState(null,null,'#loginPage');
        showPage('loginPage');
        updateNavLinksVisibility(false);
    } else if (pageId && validPageIds.includes(pageId)) {
        showPage(pageId);
    } else if (currentLoggedInUser) {
        history.replaceState(null,null,'#dashboardPage');
        showPage('dashboardPage');
    } else {
        history.replaceState(null,null,'#loginPage');
        showPage('loginPage');
    }
};