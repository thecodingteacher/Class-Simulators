// --- Mock Data & Global State ---
let MOCK_USERS = {
    "student1": { id: "student1", password: "pass1", role: "student", email: "student1@unieats.example", balance: 50.00, isBanned: false, displayName: "Alex S."},
    "student2": { id: "student2", password: "pass2", role: "student", email: "student2@unieats.example", balance: 25.50, isBanned: false, displayName: "Bella T."},
    "admin": { id: "admin", password: "adminpass", role: "admin", email: "admin@unieats.example", balance: 0.00, isBanned: false, displayName: "Admin User"}
};

let MOCK_FOOD_ITEMS = [
    { id: 1, name: "Margherita Pizza", price: 7.50, description: "Classic cheese and tomato pizza." , isArchived: false},
    { id: 2, name: "Chicken Burger", price: 5.20, description: "Grilled chicken breast with lettuce and mayo." , isArchived: false},
    { id: 3, name: "Veggie Wrap", price: 4.00, description: "Fresh vegetables in a soft tortilla." , isArchived: false},
    { id: 4, name: "Fries", price: 2.50, description: "Crispy potato fries.", isArchived: false }
];
let nextFoodId = 5;
let currentUser = null; // Stores logged-in user's ID
let db; // For IndexedDB instance

// --- Core App Logic: Page Navigation & Utilities ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    const targetLink = document.querySelector(`nav a[href="#${pageId}"]`);

    if (targetPage) targetPage.classList.add('active-page');
    if (targetLink) targetLink.classList.add('active');
    
    if (window.location.hash.split('?')[0] !== `#${pageId}`) {
        // Preserve query params if they exist, only change the base hash
        const queryParams = window.location.hash.split('?')[1];
        window.location.hash = queryParams ? `${pageId}?${queryParams}` : pageId;
    }

    // Update content based on page
    if (currentUser) {
        if (pageId === 'studentDashboardPage') updateDashboard();
        if (pageId === 'menuPage') renderMenu();
        if (pageId === 'topUpPage') updateTopUpBalanceDisplay();
        if (pageId === 'myOrdersPage') loadOrders();
        if (pageId === 'profilePage') loadProfilePage();
        if (pageId === 'settingsPage') loadSettingsPage();
    }
    if (pageId === 'adminPage' && typeof checkAdminCookieAndLoad === 'function') {
         checkAdminCookieAndLoad();
    }
}

function displayStatus(elementId, message, type = 'info') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// --- Login and Auth ---
function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const user = MOCK_USERS[username];

    if (user && user.password === password) {
        if (user.isBanned) {
            displayStatus('loginErrorMessage', 'This account has been banned.', 'error');
            return;
        }
        currentUser = username;
        localStorage.setItem('currentUserData', JSON.stringify(user)); 
        
        if (user.role === 'admin') {
            document.cookie = "isAdmin=true;path=/;SameSite=Lax";
        } else {
            document.cookie = "isAdmin=false;path=/;SameSite=Lax"; 
        }
        checkAdminLinkVisibility();
        applyUserThemePreference();
        showPage('studentDashboardPage');
        displayStatus('loginErrorMessage', '', 'success'); 
    } else {
        displayStatus('loginErrorMessage', 'Invalid username or password.', 'error');
    }
}

function checkAdminLinkVisibility() {
    const adminLink = document.getElementById('adminNavLink');
    const isAdminCookie = document.cookie.split('; ').find(row => row.startsWith('isAdmin='));
    if (isAdminCookie && isAdminCookie.split('=')[1] === 'true') {
        adminLink.style.display = 'inline-block';
    } else {
        adminLink.style.display = 'none';
    }
}

// --- Theme Management ---
function applyTheme() {
    if (!currentUser) return;
    const selectedTheme = document.getElementById('themeSelector').value;
    localStorage.setItem(`userTheme_${currentUser}`, selectedTheme);
    applyUserThemePreference();
}

function applyUserThemePreference() {
    if (!currentUser && !localStorage.getItem('currentUserData')) return; 
    
    let themeUserId = currentUser;
    if (!themeUserId && localStorage.getItem('currentUserData')) {
        try {
            themeUserId = JSON.parse(localStorage.getItem('currentUserData')).id;
        } catch(e) { /* ignore, no theme if error */ }
    }
    if (!themeUserId) return;


    const theme = localStorage.getItem(`userTheme_${themeUserId}`) || 'default';
    const body = document.getElementById('appBody');
    body.classList.remove('theme-dark', 'theme-ocean'); 
    
    // Reset styles first
    body.style.backgroundColor = ''; 
    body.style.color = '';
    document.querySelectorAll('.container, .info-box, .food-item').forEach(el => {
        el.style.backgroundColor = ''; 
        el.style.borderColor = '';
    });

    if (theme === 'dark') {
        body.classList.add('theme-dark');
        body.style.backgroundColor = '#222'; body.style.color = '#eee';
        document.querySelectorAll('.container, .info-box, .food-item').forEach(el => {el.style.backgroundColor = '#333'; el.style.borderColor = '#555'});
    } else if (theme === 'ocean') {
         body.classList.add('theme-ocean');
        body.style.backgroundColor = '#e0f7fa'; body.style.color = '#004d40';
        document.querySelectorAll('.container, .info-box, .food-item').forEach(el => {el.style.backgroundColor = '#b2ebf2'; el.style.borderColor = '#4dd0e1'});
    }
}

// --- Initial Load & Routing ---
window.onload = async () => {
    if (typeof initDB === 'function') {
        try {
            await initDB();
        } catch (e) {
            console.warn("IndexedDB could not be initialized. Order history might be affected.");
        }
    }

    const storedUserDataString = localStorage.getItem('currentUserData');
    let initialPage = 'loginPage';

    if (storedUserDataString) {
        try {
            const storedUser = JSON.parse(storedUserDataString);
            if (MOCK_USERS[storedUser.id] && !MOCK_USERS[storedUser.id].isBanned) {
                currentUser = storedUser.id;
                // Ensure global MOCK_USERS balance is consistent if app was closed without proper "logout"
                if (MOCK_USERS[currentUser] && typeof storedUser.balance !== 'undefined') {
                    MOCK_USERS[currentUser].balance = storedUser.balance;
                }
                initialPage = 'studentDashboardPage';
                applyUserThemePreference();
            } else {
                localStorage.removeItem('currentUserData');
                document.cookie = "isAdmin=false;path=/;SameSite=Lax;expires=Thu, 01 Jan 1970 00:00:00 GMT";
            }
        } catch (e) {
            localStorage.removeItem('currentUserData');
            document.cookie = "isAdmin=false;path=/;SameSite=Lax;expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
    }
    checkAdminLinkVisibility();

    const hashPath = window.location.hash.split('?')[0];
    if (hashPath) {
        const targetPageId = hashPath.substring(1);
        if (document.getElementById(targetPageId)) {
             if (targetPageId !== 'loginPage' && !currentUser) {
                initialPage = 'loginPage'; // Force login if trying to access other pages without session
            } else {
                initialPage = targetPageId;
            }
        }
    }
    showPage(initialPage);

    if (currentUser) {
        if (initialPage === 'studentDashboardPage' && typeof updateDashboard === 'function') updateDashboard();
        if (initialPage === 'profilePage' && typeof loadProfilePage === 'function') loadProfilePage();
    }
};

window.onhashchange = () => {
    const hashPath = window.location.hash.split('?')[0];
    let pageId = hashPath ? hashPath.substring(1) : (currentUser ? 'studentDashboardPage' : 'loginPage');
    
    if (!document.getElementById(pageId)) { 
        pageId = currentUser ? 'studentDashboardPage' : 'loginPage';
    }

    if (pageId !== 'loginPage' && !currentUser) {
        showPage('loginPage');
    } else {
        showPage(pageId);
    }
};