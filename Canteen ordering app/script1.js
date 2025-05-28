// --- Student Dashboard ---
function updateDashboard() {
    if (!currentUser || !MOCK_USERS[currentUser]) return;
    const userDataFromLS = JSON.parse(localStorage.getItem('currentUserData'));
    const liveUserData = MOCK_USERS[currentUser];
    
    // Prioritize live mock data, but allow LS to influence if it's what's stored
    const currentBalance = (userDataFromLS && typeof userDataFromLS.balance !== 'undefined') ? userDataFromLS.balance : liveUserData.balance;

    const urlParams = new URLSearchParams(window.location.search);
    const greetingName = urlParams.get('greetingName');
    const dashboardGreetingEl = document.getElementById('dashboardGreeting');
    if (greetingName) {
        dashboardGreetingEl.innerHTML = `Welcome, ${decodeURIComponent(greetingName)}!`;
    } else {
        dashboardGreetingEl.textContent = `Welcome, ${liveUserData.displayName}!`;
    }

    document.getElementById('dashboardBalance').textContent = `£${parseFloat(currentBalance).toFixed(2)}`;
    
    if (localStorage.getItem('premiumFeatureActive') === 'true') {
        document.getElementById('featureStatusMessage').textContent = 'Premium UniEats Perks are ACTIVE!';
        document.getElementById('featureStatusMessage').className = 'status-message success';
        document.getElementById('featureStatusMessage').style.display = 'block';
    } else {
         document.getElementById('featureStatusMessage').style.display = 'none';
    }

    if (urlParams.get('showDebug') === 'true') { 
        document.getElementById('secretDebugInfo').style.display = 'block';
    } else {
        document.getElementById('secretDebugInfo').style.display = 'none';
    }
    document.getElementById('platformVersion').textContent = '1.0.0-beta'; // Update version display if on settings page
}

function activateFeature() { 
    const codeInput = document.getElementById('featureCodeInput').value;
    try {
        const decodedCode = atob(codeInput);
        if (decodedCode === "UNIEATS_PREMIUM_2024") {
            localStorage.setItem('premiumFeatureActive', 'true');
            displayStatus('featureStatusMessage', 'Premium Perks Activated!', 'success');
        } else {
            localStorage.setItem('premiumFeatureActive', 'false');
            displayStatus('featureStatusMessage', 'Invalid or expired activation code.', 'error');
        }
    } catch (e) {
        localStorage.setItem('premiumFeatureActive', 'false');
        displayStatus('featureStatusMessage', 'Invalid code format.', 'error');
    }
    updateDashboard(); 
}

// --- Menu & Ordering ---
function renderMenu() {
    const foodListContainer = document.getElementById('foodListContainer');
    foodListContainer.innerHTML = ''; 

    const urlParams = new URLSearchParams(window.location.search);
    const customTitle = urlParams.get('menuTitle');
    document.getElementById('menuPageTitle').innerHTML = customTitle ? decodeURIComponent(customTitle) : "Today's Menu";

    MOCK_FOOD_ITEMS.forEach(item => {
        if(item.isArchived) return; 

        const itemDiv = document.createElement('div');
        itemDiv.className = 'food-item';
        itemDiv.innerHTML = `
            <h4>${item.name}</h4>
            <p class="food-description">${item.description}</p>
            <p>Price: £${parseFloat(item.price).toFixed(2)}</p>
            <button onclick="purchaseItem(${item.id}, ${item.price})">Order Now</button>
        `;
        foodListContainer.appendChild(itemDiv);
    });
    if (MOCK_FOOD_ITEMS.filter(item => !item.isArchived).length === 0) {
        foodListContainer.innerHTML = "<p>No items on the menu currently. Check back later!</p>";
    }
}

async function purchaseItem(itemId, price) {
    if (!currentUser) {
        displayStatus('menuStatusMessage', 'Please log in to order.', 'error');
        return;
    }
    let userData = JSON.parse(localStorage.getItem('currentUserData')); // Get current user data from LS
    if (userData.balance >= price) {
        userData.balance -= price;
        MOCK_USERS[currentUser].balance = userData.balance; 
        localStorage.setItem('currentUserData', JSON.stringify(userData)); 

        const foodItem = MOCK_FOOD_ITEMS.find(f => f.id === itemId);
        if (!foodItem) {
            displayStatus('menuStatusMessage', 'Selected food item not found.', 'error');
            return;
        }

        const order = {
            userId: currentUser,
            itemId: itemId,
            itemName: foodItem.name,
            pricePaid: price,
            date: new Date().toISOString()
        };

        if (!db && typeof initDB === 'function') await initDB(); // Ensure DB is initialized
        if (db) {
            try {
                const transaction = db.transaction(ORDER_STORE_NAME, "readwrite");
                const store = transaction.objectStore(ORDER_STORE_NAME);
                store.add(order); 
                transaction.oncomplete = () => {
                    displayStatus('menuStatusMessage', `${order.itemName} ordered successfully! Your new balance is £${userData.balance.toFixed(2)}.`, 'success');
                    updateDashboard(); 
                };
                transaction.onerror = () => {
                     displayStatus('menuStatusMessage', `Error saving order to local history. Order placed, balance updated.`, 'warning');
                }
            } catch (e) {
                 displayStatus('menuStatusMessage', `Local order history unavailable. Order placed, balance updated.`, 'warning');
            }
        } else {
             displayStatus('menuStatusMessage', `Local order history database not ready. Order placed, balance updated.`, 'warning');
        }
    } else {
        displayStatus('menuStatusMessage', 'Insufficient balance to purchase this item.', 'error');
    }
}

// --- Add Money ---
function updateTopUpBalanceDisplay() {
    if(!currentUser || !MOCK_USERS[currentUser]) return;
    const userData = JSON.parse(localStorage.getItem('currentUserData')) || MOCK_USERS[currentUser];
    document.getElementById('topUpCurrentBalance').textContent = `£${parseFloat(userData.balance).toFixed(2)}`;
}

function addMoney() {
    if (!currentUser) {
        displayStatus('topUpStatusMessage', 'Please log in to add funds.', 'error');
        return;
    }
    const amount = parseFloat(document.getElementById('topUpAmount').value);
    if (isNaN(amount) || amount <= 0) {
        displayStatus('topUpStatusMessage', 'Please enter a valid positive amount.', 'error');
        return;
    }

    let userData = JSON.parse(localStorage.getItem('currentUserData'));
    userData.balance += amount;
    MOCK_USERS[currentUser].balance = userData.balance; 
    localStorage.setItem('currentUserData', JSON.stringify(userData)); 

    displayStatus('topUpStatusMessage', `£${amount.toFixed(2)} added successfully! Your new balance is £${userData.balance.toFixed(2)}.`, 'success');
    document.getElementById('topUpAmount').value = '';
    updateTopUpBalanceDisplay();
    updateDashboard();
}

// --- Order History (IndexedDB) ---
async function loadOrders() {
    if (!currentUser) {
        document.getElementById('ordersList').innerHTML = '<li>Please log in to view orders.</li>';
        return;
    }
    if (!db && typeof initDB === 'function') {
        try {
            await initDB();
        } catch (e) {
             document.getElementById('ordersList').innerHTML = '<li>Could not load order history database.</li>';
             return;
        }
    }
    if (!db) { // Still no DB after attempt
        document.getElementById('ordersList').innerHTML = '<li>Order history database unavailable.</li>';
        return;
    }


    const transaction = db.transaction(ORDER_STORE_NAME, "readonly");
    const store = transaction.objectStore(ORDER_STORE_NAME);
    const userIndex = store.index("userId");
    const request = userIndex.getAll(currentUser); 

    request.onsuccess = () => {
        const ordersListEl = document.getElementById('ordersList');
        ordersListEl.innerHTML = ''; 
        const orders = request.result.sort((a, b) => new Date(b.date) - new Date(a.date)); 
        if (orders.length > 0) {
            orders.forEach(order => {
                const li = document.createElement('li');
                li.innerHTML = `Order ID: ${order.orderId} - <strong>${order.itemName}</strong> - Price: £${parseFloat(order.pricePaid).toFixed(2)} - Date: ${new Date(order.date).toLocaleString()}`;
                ordersListEl.appendChild(li);
            });
        } else {
            ordersListEl.innerHTML = '<li>No orders found.</li>';
        }
    };
    request.onerror = (event) => {
        document.getElementById('ordersList').innerHTML = '<li>Error loading order history.</li>';
        console.error("Error fetching orders:", event.target.error);
    };
}

// --- Profile Page (IDOR) ---
function loadProfilePage() {
    let userIdToView = currentUser; 

    const currentHash = window.location.hash;
    if (currentHash.includes("?userId=")) {
        const params = new URLSearchParams(currentHash.substring(currentHash.indexOf('?') + 1));
        const queryUserId = params.get('userId');
        if (queryUserId && MOCK_USERS[queryUserId]) { 
            userIdToView = queryUserId;
        } else if (queryUserId) {
             document.getElementById('profileUserId').textContent = queryUserId;
             document.getElementById('profileUsername').textContent = 'User Not Found';
             document.getElementById('profileEmail').textContent = 'N/A';
             document.getElementById('profileRole').textContent = 'N/A';
             document.getElementById('profileTheme').textContent = 'N/A';
             return;
        }
    }
    
    if (!userIdToView && !currentUser) { 
        document.getElementById('profileUserId').textContent = 'N/A';
        document.getElementById('profileUsername').textContent = 'Please log in or specify a user ID.';
        document.getElementById('profileEmail').textContent = 'N/A';
        document.getElementById('profileRole').textContent = 'N/A';
        document.getElementById('profileTheme').textContent = 'N/A';
        return;
    }
    
    const userToDisplay = MOCK_USERS[userIdToView];
    if (!userToDisplay) { // Fallback if userIdToView is somehow invalid after checks
        document.getElementById('profileUserId').textContent = userIdToView || 'N/A';
        document.getElementById('profileUsername').textContent = 'User data unavailable.';
        document.getElementById('profileEmail').textContent = 'N/A';
        document.getElementById('profileRole').textContent = 'N/A';
        document.getElementById('profileTheme').textContent = 'N/A';
        return;
    }

    document.getElementById('profileUserId').textContent = userToDisplay.id;
    document.getElementById('profileUsername').textContent = userToDisplay.displayName;
    document.getElementById('profileEmail').textContent = userToDisplay.email;
    document.getElementById('profileRole').textContent = userToDisplay.role;
    document.getElementById('profileTheme').textContent = localStorage.getItem(`userTheme_${userIdToView}`) || 'Default';
}

// --- Settings Page ---
function loadSettingsPage() {
    if (!currentUser) return;
    const currentTheme = localStorage.getItem(`userTheme_${currentUser}`) || 'default';
    document.getElementById('themeSelector').value = currentTheme;
    document.getElementById('customJsInput').value = localStorage.getItem(`customJs_${currentUser}`) || '';
    document.getElementById('platformVersion').textContent = '1.0.0-beta';
}

function runCustomJs() { 
    if (!currentUser) {
         displayStatus('customJsStatus', 'Please log in to apply custom scripts.', 'error');
        return;
    }
    const script = document.getElementById('customJsInput').value;
    try {
        eval(script); 
        localStorage.setItem(`customJs_${currentUser}`, script);
        displayStatus('customJsStatus', 'Custom script applied. Refresh may be needed for some changes.', 'success');
    } catch (e) {
        displayStatus('customJsStatus', 'Error in custom script: ' + e.message, 'error');
    }
}