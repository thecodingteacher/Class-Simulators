// --- IndexedDB Setup for Orders ---
const DB_NAME = "UniEatsOrdersDB";
const DB_VERSION = 1;
const ORDER_STORE_NAME = "orders";

function initDB() {
    return new Promise((resolve, reject) => {
        if (db) { // If db is already initialized
            resolve(db);
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            let tempDb = event.target.result;
            if (!tempDb.objectStoreNames.contains(ORDER_STORE_NAME)) {
                const store = tempDb.createObjectStore(ORDER_STORE_NAME, { keyPath: "orderId", autoIncrement: true });
                store.createIndex("userId", "userId", { unique: false });
                store.createIndex("date", "date", { unique: false });
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result; // Assign to global db variable from script1.js
            resolve(db);
        };
        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

// --- Admin Panel ---
function checkAdminCookieAndLoad() {
    const isAdminCookie = document.cookie.split('; ').find(row => row.startsWith('isAdmin='));
    const adminPageContainer = document.getElementById('adminPage');

    if (isAdminCookie && isAdminCookie.split('=')[1] === 'true') {
        // Ensure the sub-page containers are visible if they were hidden due to no-admin
        const foodManagementDiv = document.getElementById('adminFoodManagement');
        const userManagementDiv = document.getElementById('adminUserManagement');
        const adminNav = adminPageContainer.querySelector('nav');

        if (adminNav) adminNav.style.display = 'flex'; // or 'block'
        if (foodManagementDiv) foodManagementDiv.style.display = 'block'; // Or as per showAdminSubPage logic
        if (userManagementDiv) userManagementDiv.style.display = 'none'; // Default hide for user management

        loadAdminFoodList();
        loadAdminUserList();
        showAdminSubPage('adminFoodManagement'); 
    } else {
        const adminPageContent = document.getElementById('adminPage');
        // Hide actual admin content and show access denied message
        const foodManagementDiv = document.getElementById('adminFoodManagement');
        const userManagementDiv = document.getElementById('adminUserManagement');
        const adminNav = adminPageContainer.querySelector('nav');
        const h2Title = adminPageContainer.querySelector('h2');

        if (adminNav) adminNav.style.display = 'none';
        if (foodManagementDiv) foodManagementDiv.style.display = 'none';
        if (userManagementDiv) userManagementDiv.style.display = 'none';
        
        let accessDeniedMsg = adminPageContainer.querySelector('#adminAccessDeniedMsg');
        if (!accessDeniedMsg) {
            accessDeniedMsg = document.createElement('p');
            accessDeniedMsg.id = 'adminAccessDeniedMsg';
            accessDeniedMsg.innerHTML = "Access Denied. You do not have permission to view this page.";
            accessDeniedMsg.className = "status-message error";
            if (h2Title && h2Title.parentNode) {
                 h2Title.parentNode.insertBefore(accessDeniedMsg, h2Title.nextSibling);
            } else {
                adminPageContainer.appendChild(accessDeniedMsg);
            }
        }
        accessDeniedMsg.style.display = 'block';
    }
}


function showAdminSubPage(subPageId) {
    document.querySelectorAll('.admin-sub-page').forEach(sp => sp.style.display = 'none');
    const targetSubPage = document.getElementById(subPageId);
    if (targetSubPage) {
        targetSubPage.style.display = 'block';
    }
    if (subPageId === 'adminFoodManagement') loadAdminFoodList();
    if (subPageId === 'adminUserManagement') loadAdminUserList();
}

function addFoodItem() {
    const name = document.getElementById('foodName').value;
    const price = parseFloat(document.getElementById('foodPrice').value);
    const description = document.getElementById('foodDescription').value; 

    if (!name || isNaN(price) || price <= 0) {
        displayStatus('adminFoodStatus', 'Please enter valid name and price.', 'error');
        return;
    }
    MOCK_FOOD_ITEMS.push({ id: nextFoodId++, name, price, description, isArchived: false });
    displayStatus('adminFoodStatus', `Food item "${name}" added.`, 'success');
    document.getElementById('foodName').value = '';
    document.getElementById('foodPrice').value = '';
    document.getElementById('foodDescription').value = '';
    loadAdminFoodList();
    if (document.getElementById('menuPage').classList.contains('active-page')) renderMenu(); 
}

function archiveFoodItem(foodId) {
    const itemIndex = MOCK_FOOD_ITEMS.findIndex(f => f.id === foodId);
    if (itemIndex > -1) {
        MOCK_FOOD_ITEMS[itemIndex].isArchived = true;
        displayStatus('adminFoodStatus', `Food item "${MOCK_FOOD_ITEMS[itemIndex].name}" archived.`, 'success');
        loadAdminFoodList();
        if (document.getElementById('menuPage').classList.contains('active-page')) renderMenu();
    }
}

function loadAdminFoodList() {
    const listEl = document.getElementById('adminFoodList');
    if (!listEl) return;
    listEl.innerHTML = '<ul>';
    MOCK_FOOD_ITEMS.filter(item => !item.isArchived).forEach(item => {
        // Basic escaping for display in admin list to prevent self-XSS in admin panel from description
        const safeName = item.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeDescription = item.description.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        listEl.innerHTML += `<li>${safeName} (£${item.price.toFixed(2)}) - <i>${safeDescription.substring(0,50)}...</i> 
                            <button class="secondary" onclick="archiveFoodItem(${item.id})">Archive</button>
                            </li>`;
    });
    listEl.innerHTML += '</ul>';
    if (MOCK_FOOD_ITEMS.filter(item => !item.isArchived).length === 0) {
        listEl.innerHTML = '<p>No active food items.</p>';
    }
}

function loadAdminUserList() {
    const tbody = document.getElementById('userManagementTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    Object.values(MOCK_USERS).forEach(user => {
        const row = tbody.insertRow();
        row.insertCell().textContent = user.id;
        row.insertCell().textContent = user.displayName;
        row.insertCell().textContent = user.role;
        row.insertCell().textContent = `£${user.balance.toFixed(2)}`;
        row.insertCell().textContent = user.isBanned ? 'Banned' : 'Active';
        const actionCell = row.insertCell();
        if (user.role !== 'admin') { 
            const banButton = document.createElement('button');
            banButton.textContent = user.isBanned ? 'Unban' : 'Ban';
            banButton.className = user.isBanned ? 'secondary' : 'danger';
            banButton.onclick = () => toggleUserBan(user.id);
            actionCell.appendChild(banButton);
        }
    });
}

function toggleUserBan(userIdToBan) {
    if (MOCK_USERS[userIdToBan]) {
        MOCK_USERS[userIdToBan].isBanned = !MOCK_USERS[userIdToBan].isBanned;
        displayStatus('adminUserStatus', `User ${userIdToBan} status updated.`, 'success');
        loadAdminUserList();
    } else {
        displayStatus('adminUserStatus', `User ${userIdToBan} not found.`, 'error');
    }
}