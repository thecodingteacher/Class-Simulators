function loadUserPlantList() {
    if (!currentUser) return;
    const plantListUL = document.getElementById('userPlantList');
    if (!plantListUL) { return; }
    plantListUL.innerHTML = '';
    plants.filter(p => p.operatorId === currentUser.id).forEach(plant => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${plant.name} (${plant.region}) - Output: <strong id="plant_output_${plant.id}">${plant.output}</strong></span>
            <div>
                Status: <span id="plant_status_${plant.id}" class="${plant.status === 'On' ? 'plant-status-on' : 'plant-status-off'}">${plant.status}</span>
                <button class="user-actions" onclick="viewPlantDetails('${plant.id}')">Details</button>
            </div>
        `;
        plantListUL.appendChild(li);
    });
}

function loadAdminPlantList() {
    const plantListUL = document.getElementById('adminPlantList');
    if (!plantListUL) { return; }
    plantListUL.innerHTML = '';
    plants.forEach(plant => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${plant.name} (ID: ${plant.id}, Operator: ${plant.operatorId}) - Output: <strong id="plant_output_admin_${plant.id}">${plant.output}</strong></span>
            <div>
                Status: <span id="plant_status_admin_${plant.id}" class="${plant.status === 'On' ? 'plant-status-on' : 'plant-status-off'}">${plant.status}</span>
                <button class="admin-actions" onclick="togglePlantStatus('${plant.id}', true)">${plant.status === 'On' ? 'Turn Off' : 'Turn On'}</button>
                <button onclick="viewPlantDetails('${plant.id}')">View/Edit Notes</button>
            </div>
        `;
        plantListUL.appendChild(li);
    });
}

function togglePlantStatus(plantId, isAdminCall = false) {
    if (!currentUser || (isAdminCall && currentUser.role !== 'admin')) {
        alert("Unauthorized action!");
        return;
    }
    const plant = plants.find(p => p.id === plantId);
    if (plant) {
        plant.status = plant.status === 'On' ? 'Off' : 'On';
        plant.output = plant.status === 'On' ? (Math.floor(Math.random() * 500) + 100 + ' MW') : '0 MW';
        
        const userStatusEl = document.getElementById(`plant_status_${plantId}`);
        const userOutputEl = document.getElementById(`plant_output_${plantId}`);
        const adminStatusEl = document.getElementById(`plant_status_admin_${plantId}`);
        const adminOutputEl = document.getElementById(`plant_output_admin_${plantId}`);
        const adminButton = document.querySelector(`#adminPlantList button[onclick="togglePlantStatus('${plant.id}', true)"]`);


        if(userStatusEl) {
            userStatusEl.textContent = plant.status;
            userStatusEl.className = plant.status === 'On' ? 'plant-status-on' : 'plant-status-off';
        }
        if(userOutputEl) userOutputEl.textContent = plant.output;

        if(adminStatusEl) {
            adminStatusEl.textContent = plant.status;
            adminStatusEl.className = plant.status === 'On' ? 'plant-status-on' : 'plant-status-off';
        }
        if (adminButton) {
             adminButton.textContent = plant.status === 'On' ? 'Turn Off' : 'Turn On';
        }
        if(adminOutputEl) adminOutputEl.textContent = plant.output;
    }
}

function viewPlantDetails(plantId) {
    const plant = plants.find(p => p.id === plantId);
    const plantInfoDiv = document.getElementById('plantInfo');
    const plantNotesInputEl = document.getElementById('plantNotesInput');
    const plantNotesDisplayEl = document.getElementById('plantNotesDisplay');

    if (!plantInfoDiv || !plantNotesInputEl || !plantNotesDisplayEl) {
        showView('dashboardView');
        return;
    }

    if (plant) {
        currentEditingPlantId = plantId;
        plantInfoDiv.innerHTML = `
            <p><strong>ID:</strong> ${plant.id}</p>
            <p><strong>Name:</strong> ${plant.name}</p>
            <p><strong>Region:</strong> ${plant.region}</p>
            <p><strong>Status:</strong> ${plant.status}</p>
            <p><strong>Current Output:</strong> ${plant.output}</p>
            <p><strong>Managed by Operator ID:</strong> ${plant.operatorId}</p>
        `;
        plantNotesInputEl.value = plant.notes || '';
        plantNotesDisplayEl.innerHTML = plant.notes || '<i>No notes yet.</i>';
        showView('plantDetailsView');
        history.pushState(null, '', `?view=details&plantId=${plantId}`);

    } else {
        alert("Plant not found!");
        currentEditingPlantId = null;
        showView('dashboardView');
    }
}
        
function savePlantNotes() {
    if (!currentEditingPlantId || !currentUser) {
        alert("No plant selected or not logged in.");
        return;
    }
    const plant = plants.find(p => p.id === currentEditingPlantId);
    const plantNotesInputEl = document.getElementById('plantNotesInput');
    const plantNotesDisplayEl = document.getElementById('plantNotesDisplay');

    if (!plantNotesInputEl || !plantNotesDisplayEl) {
         return;
    }

    if (plant) {
        if (currentUser.role === 'admin' || plant.operatorId === currentUser.id) {
            plant.notes = plantNotesInputEl.value;
            plantNotesDisplayEl.innerHTML = plant.notes; 
            alert("Notes saved!");
            localStorage.setItem(`plantNotes_${plant.id}`, plant.notes);
        } else {
            alert("Unauthorized: You cannot edit notes for this plant.");
        }
    }
}
        
function loadPlantNotesFromStorage() {
    plants.forEach(plant => {
        const savedNotes = localStorage.getItem(`plantNotes_${plant.id}`);
        if (savedNotes) {
            plant.notes = savedNotes;
        }
    });
}

function setSystemMessage() {
    if (currentUser && currentUser.role === 'admin') {
        const messageInputEl = document.getElementById('systemMessageInput');
        const currentSystemMessageEl = document.getElementById('currentSystemMessage');

        if(!messageInputEl || !currentSystemMessageEl) {
            return;
        }
        const message = messageInputEl.value;
        localStorage.setItem('systemBroadcastMessage', message); 
        currentSystemMessageEl.innerHTML = message;
        alert("System message updated.");
    } else {
        alert("Unauthorized: Admins only.");
    }
}

window.onload = () => {
    initDB().then(() => {
        loadPlantNotesFromStorage();
        checkSession();
    }).catch(err => {
        loadPlantNotesFromStorage();
        checkSession();
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const targetView = urlParams.get('view');
    const debugAdmin = urlParams.get('debug');

    if (currentUser && currentUser.role === 'admin' && targetView === 'adminView' && debugAdmin === 'true') {
        showView('adminView');
    }
};