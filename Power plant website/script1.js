let currentUser = null;
let plants = [
    { id: "P001", name: "HydroPlant Alpha", region: "North", status: "Off", output: "0 MW", operatorId: 1, notes: "Offline for maintenance." },
    { id: "P002", name: "Solaris Prime", region: "West", status: "On", output: "500 MW", operatorId: 1, notes: "Peak efficiency." },
    { id: "P003", name: "GeoThermal Beta", region: "East", status: "Off", output: "0 MW", operatorId: 2, notes: "Awaiting parts." },
    { id: "P004", name: "Nuclear Titan", region: "South", status: "On", output: "1200 MW", operatorId: 2, notes: "Stable output." },
    { id: "P005", name: "WindFarm Delta", region: "Central", status: "On", output: "300 MW", operatorId: 1, notes: "" }
];
const users = {
    "operator": { password: "operator123", role: "operator", id: 1, initialBalance: 1000 },
    "admin": { password: "superadmin123", role: "admin", id: 0, initialBalance: 100000 },
    "user2": { password: "user2pass", role: "operator", id: 2, initialBalance: 500}
};

let db;
const dbName = "PowerPlantSystemDB";
const criticalCodesStoreName = "CriticalSystemCodes";
let currentEditingPlantId = null;

const views = ['loginView', 'dashboardView', 'adminView', 'plantDetailsView', 'userProfileView'];

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = (event) => {
            reject("DB error: " + event.target.errorCode);
        };
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(criticalCodesStoreName)) {
                const store = db.createObjectStore(criticalCodesStoreName, { keyPath: "plantId" });
                store.createIndex("codeType", "codeType", { unique: false });
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            const checkTransaction = db.transaction(criticalCodesStoreName, "readonly");
            const store = checkTransaction.objectStore(criticalCodesStoreName);
            const countRequest = store.count();

            countRequest.onerror = (e) => {
                reject("DB count error");
            };
            countRequest.onsuccess = () => {
                if (countRequest.result === 0) {
                    populateCriticalCodes();
                }
            };
            
            checkTransaction.oncomplete = () => {
                resolve(db);
            };
            checkTransaction.onerror = (e) => {
                reject("DB transaction error during count");
            };
        };
    });
}
        
function populateCriticalCodes() {
    if (!db) { return; }
    const transaction = db.transaction(criticalCodesStoreName, "readwrite");
    const store = transaction.objectStore(criticalCodesStoreName);
    const codes = [
        { plantId: "P001", codeType: "emergency_override", codeValue: "ALPHA-OMEGA-77X" },
        { plantId: "P004", codeType: "manual_shutdown_key", codeValue: "TITAN-FALL-001" },
        { plantId: "SYS_GLOBAL", codeType: "master_reset_sequence", codeValue: "ABRACADABRA-RESET-ALL" }
    ];
    codes.forEach(code => {
        try {
            store.add(code);
        } catch (e) {
            // Silent fail
        }
    });
    transaction.onerror = (event) => { /* Silent fail */ };
}

function showView(viewIdToShow) {
    if (!viewIdToShow || typeof viewIdToShow !== 'string') {
        viewIdToShow = 'loginView';
    }

    views.forEach(vId => {
        const el = document.getElementById(vId);
        if (el) {
            el.classList.add('hidden');
        }
    });

    const currentViewEl = document.getElementById(viewIdToShow);
    if (currentViewEl) {
        currentViewEl.classList.remove('hidden');
    } else {
        const loginViewEl = document.getElementById('loginView');
        if (loginViewEl) loginViewEl.classList.remove('hidden');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const adminDebugSectionEl = document.getElementById('adminDebugSection');
    const debugInfoOutputEl = document.getElementById('debugInfoOutput');

    if (adminDebugSectionEl) {
        if (viewIdToShow === 'adminView' && urlParams.get('debug') === 'true' && currentUser && currentUser.role === 'admin') {
            adminDebugSectionEl.classList.remove('hidden');
            if (debugInfoOutputEl) {
                debugInfoOutputEl.textContent = JSON.stringify(plants, null, 2) + "\n\n" + JSON.stringify(users, null, 2);
            }
        } else {
            adminDebugSectionEl.classList.add('hidden');
        }
    }
    
    const promoMessageEl = document.getElementById('promoMessage');
    if (promoMessageEl) {
        if (viewIdToShow === 'dashboardView') {
            const promoText = urlParams.get('promoText');
            if (promoText) {
                promoMessageEl.innerHTML = decodeURIComponent(promoText);
            } else {
                promoMessageEl.textContent = "Special offer for our valued operators!";
            }
        }
    }
}