function login() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');

    if (!usernameInput || !passwordInput || !loginError) {
        return;
    }
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (users[username] && users[username].password === password) {
        currentUser = { 
            username: username, 
            role: users[username].role, 
            id: users[username].id,
            balance: parseFloat(localStorage.getItem(`balance_${username}`)) || users[username].initialBalance
        };
        
        document.cookie = `sessionRole=${currentUser.role};path=/;max-age=3600`;
        document.cookie = `sessionId=user${currentUser.id}-${Date.now()};path=/;max-age=3600`;
        localStorage.setItem('lastUser', username);
        localStorage.setItem(`balance_${username}`, currentUser.balance.toString());

        updateUIForUser();
        showView('dashboardView');
        loginError.classList.add('hidden');
        
    } else {
        loginError.textContent = "Invalid username or password.";
        loginError.classList.remove('hidden');
    }
}

function logout() {
    currentUser = null;
    document.cookie = "sessionRole=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "sessionId=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    updateUIForUser();
    showView('loginView');
}

function checkSession() {
    const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
        const [name, value] = cookie.split('=');
        if (name && value) acc[name] = value;
        return acc;
    }, {});

    const lastUser = localStorage.getItem('lastUser');

    if (cookies.sessionRole && cookies.sessionId && lastUser && users[lastUser] && users[lastUser].role === cookies.sessionRole) {
        currentUser = { 
            username: lastUser, 
            role: users[lastUser].role, 
            id: users[lastUser].id,
            balance: parseFloat(localStorage.getItem(`balance_${lastUser}`)) || users[lastUser].initialBalance
        };
        updateUIForUser();
        
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        const plantIdParam = urlParams.get('plantId');

        if (plantIdParam) {
            viewPlantDetails(plantIdParam);
        } else if (viewParam === 'adminView' && currentUser.role === 'admin') {
             showView('adminView');
        } else if (viewParam === 'userProfileView') {
            showView('userProfileView');
        } else if (viewParam === 'dashboardView') {
            showView('dashboardView');
        }
         else {
            showView('dashboardView');
        }
    } else {
        currentUser = null;
        updateUIForUser();
        showView('loginView');
    }
}
        
function updateUIForUser() {
    const userGreeting = document.getElementById('userGreeting');
    const dashboardNavBtn = document.getElementById('dashboardNavBtn');
    const adminNavBtn = document.getElementById('adminNavBtn');
    const profileNavBtn = document.getElementById('profileNavBtn');

    if (!userGreeting || !dashboardNavBtn || !adminNavBtn || !profileNavBtn) {
        return;
    }

    if (currentUser) {
        userGreeting.textContent = `Welcome, ${currentUser.username} (Role: ${currentUser.role})`;
        dashboardNavBtn.classList.remove('hidden');
        profileNavBtn.classList.remove('hidden');
        if (currentUser.role === 'admin') {
            adminNavBtn.classList.remove('hidden');
            loadAdminPlantList();
        } else {
            adminNavBtn.classList.add('hidden');
        }
        loadUserPlantList();
        loadUserProfile();
    } else {
        userGreeting.textContent = "Welcome, Guest";
        dashboardNavBtn.classList.add('hidden');
        adminNavBtn.classList.add('hidden');
        profileNavBtn.classList.add('hidden');
        const userPlantListUL = document.getElementById('userPlantList');
        if (userPlantListUL) userPlantListUL.innerHTML = '';
        const adminPlantListUL = document.getElementById('adminPlantList');
        if (adminPlantListUL) adminPlantListUL.innerHTML = '';
    }
    
    const savedSystemMessage = localStorage.getItem('systemBroadcastMessage');
    const currentSystemMessageEl = document.getElementById('currentSystemMessage');
    if (currentSystemMessageEl) {
        if (savedSystemMessage) {
            currentSystemMessageEl.innerHTML = savedSystemMessage; 
        } else {
            currentSystemMessageEl.innerHTML = '';
        }
    }
}

function loadUserProfile() {
    if (!currentUser) return;
    const profileUsernameEl = document.getElementById('profileUsername');
    const profileUserIdEl = document.getElementById('profileUserId');
    const profileRoleEl = document.getElementById('profileRole');
    const profileBalanceEl = document.getElementById('profileBalance');
    const themeSelectEl = document.getElementById('themeSelect');
    const userInternalIdDisplayEl = document.getElementById('userInternalIdDisplay');
    const loginSecurityLevelEl = document.getElementById('loginSecurityLevel');


    if(!profileUsernameEl || !profileUserIdEl || !profileRoleEl || !profileBalanceEl || !themeSelectEl || !userInternalIdDisplayEl || !loginSecurityLevelEl) {
        return;
    }

    profileUsernameEl.textContent = currentUser.username;
    profileUserIdEl.textContent = currentUser.id;
    profileRoleEl.textContent = currentUser.role;
    profileBalanceEl.textContent = currentUser.balance.toFixed(2);
    
    const savedTheme = localStorage.getItem(`userTheme_${currentUser.username}`);
    if (savedTheme) {
        themeSelectEl.value = savedTheme;
        applyTheme(savedTheme);
    } else {
        applyTheme(themeSelectEl.value);
    }
    
    const secLevel = loginSecurityLevelEl.value; 
    userInternalIdDisplayEl.textContent = `SYS-UID-${currentUser.id}-${secLevel.length}`;
}

function saveThemePreference() {
    if (!currentUser) return;
    const themeSelectEl = document.getElementById('themeSelect');
    if(!themeSelectEl) { return; }

    const theme = themeSelectEl.value;
    localStorage.setItem(`userTheme_${currentUser.username}`, theme);
    applyTheme(theme);
    alert("Theme preference saved!");
}

function applyTheme(theme) {
    const elementsToTheme = document.querySelectorAll('.container, .login-form, .admin-panel, .user-dashboard, .plant-details-view, .user-profile-view');
    if (theme === 'dark') {
        document.body.style.backgroundColor = '#333';
        document.body.style.color = '#f0f2f5';
        elementsToTheme.forEach(el => {
            el.style.backgroundColor = '#444';
            el.style.borderColor = '#555';
        });
    } else { 
        document.body.style.backgroundColor = '#f0f2f5';
        document.body.style.color = '#333';
         elementsToTheme.forEach(el => {
            el.style.backgroundColor = el.classList.contains('login-form') || el.classList.contains('admin-panel') || el.classList.contains('user-dashboard') || el.classList.contains('plant-details-view') || el.classList.contains('user-profile-view') ? '#f9f9f9' : 'white';
            el.style.borderColor = '#ddd';
        });
    }
}

function updateBalance() {
    if (!currentUser) return;
    const newBalanceInputEl = document.getElementById('newBalanceInput');
    const profileBalanceEl = document.getElementById('profileBalance');

    if (!newBalanceInputEl || !profileBalanceEl) {
        return;
    }

    const newBalance = parseFloat(newBalanceInputEl.value);
    if (!isNaN(newBalance) && newBalance >= 0) {
        currentUser.balance = newBalance;
        localStorage.setItem(`balance_${currentUser.username}`, currentUser.balance.toString());
        profileBalanceEl.textContent = currentUser.balance.toFixed(2);
        newBalanceInputEl.value = '';
        alert("Balance updated. This is a client-side change for demo.");
    } else {
        alert("Invalid balance amount.");
    }
}