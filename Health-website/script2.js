// --- Global Variables & Mock Data ---
let currentLoggedInUser = null;
var userAccount = { 
    name: "Default User",
    balance: 100,
    role: "user"
};
var siteVersion = "1.0.0"; 

const MOCK_USER_DB = {
    "101": { id: "101", username: "user1", password: "password1", healthSummary: "Stable. Annual physical recommended. Prefers telehealth appointments.", lastLogin: "2024-03-10", email: "user1@healthhub.pro", credits: 250 },
    "102": { id: "102", username: "user2", password: "password2", healthSummary: "Good. Follow-up on vitamin D levels. Active lifestyle.", lastLogin: "2024-03-11", email: "user2@healthhub.pro", credits: 120 },
    "999": { id: "999", username: "adminUser", password: "adminPassKey#24", healthSummary: "System Administrator Account. Health data N/A.", lastLogin: "2024-03-12", email: "admin@healthhub.pro", credits: 99999 }
};

// --- IndexedDB Setup ---
let db;
const dbName = "HealthHubPro_MetricsDB";
const requestIDB = indexedDB.open(dbName, 1);

requestIDB.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('userMetrics')) {
        const objectStore = db.createObjectStore('userMetrics', { keyPath: 'id', autoIncrement:true });
        objectStore.createIndex('metricName', 'metricName', { unique: false });
        objectStore.createIndex('recordDate', 'recordDate', { unique: false });
    }
};

requestIDB.onsuccess = function(event) {
    db = event.target.result;
    // If the healthTestPage is already active when DB loads, refresh its content
    if (document.getElementById('healthTestPage') && document.getElementById('healthTestPage').classList.contains('active-page')) {
         loadHealthTestResults(); // This function is in script2.js but will be loaded by now
    }
};

requestIDB.onerror = function(event) {
    console.error("IndexedDB initialization error:", event.target.errorCode);
};


// --- Utility Functions ---
function displayStatusMessage(elementId, message, type = 'success') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.style.display = 'block';
    setTimeout(() => { 
        if (el) el.style.display = 'none'; 
    }, 4000);
}

function checkAdminAccess() {
    const isAdminCookie = document.cookie.split('; ').find(row => row.startsWith('isAdmin='));
    const isAdmin = isAdminCookie ? isAdminCookie.split('=')[1] === 'true' : false;
    const adminLink = document.getElementById('adminPanelLink');
    if(adminLink) {
        adminLink.style.display = isAdmin ? 'inline-block' : 'none'; 
    }
}