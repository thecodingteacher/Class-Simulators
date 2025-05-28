// --- AI Notes Logic ---
function addAINote() {
    if (!idb || !currentLoggedInUser) return;
    const noteTitle = document.getElementById('noteTitleInput').value.trim();
    const noteContent = document.getElementById('noteContentInput').value;

    if (!noteTitle && !noteContent) { return; }

    const transaction = idb.transaction(['aiUserNotes'], 'readwrite');
    const objectStore = transaction.objectStore('aiUserNotes');
    const newNote = { userId: currentLoggedInUser.id, noteTitle: noteTitle, noteContent: noteContent, createdDate: new Date().toISOString() };

    const request = objectStore.add(newNote);
    request.onsuccess = () => {
        loadAINotes();
        document.getElementById('noteTitleInput').value = '';
        document.getElementById('noteContentInput').value = '';
        const notesListEl = document.getElementById('aiNotesList');
        const tempStatus = document.createElement('li');
        tempStatus.textContent = 'Note saved!';
        tempStatus.style.color = 'var(--success-color)'; // Use CSS var
        tempStatus.style.fontWeight = 'bold';
        notesListEl.prepend(tempStatus);
        setTimeout(() => { if(tempStatus.parentNode === notesListEl) notesListEl.removeChild(tempStatus); }, 2000);
    };
    request.onerror = (e) => {
        console.error("Error adding AI note:", e.target.error);
        // Optionally display an error to the user here
        displayStatusMessage('aiNotesList', 'Error saving note.', 'error'); // Example
    }
}

function loadAINotes() {
    if (!idb || !currentLoggedInUser) { return; }
    const notesListEl = document.getElementById('aiNotesList');
    notesListEl.innerHTML = '<li>Loading notes...</li>';

    const transaction = idb.transaction('aiUserNotes', 'readonly');
    const objectStore = transaction.objectStore('aiUserNotes');
    let notesHTML = "";

    objectStore.openCursor(null, 'prev').onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            // Note: escapeHTML is in script1.js
            notesHTML += `<li><strong>${escapeHTML(cursor.value.noteTitle)}:</strong><div class="note-content-display">${cursor.value.noteContent}</div> 
                            <small style="display:block; margin-top:5px; color:#777;"><em>Recorded: ${new Date(cursor.value.createdDate).toLocaleString()} (ID: ${cursor.value.id})</em></small></li>`;
            cursor.continue();
        } else {
            notesListEl.innerHTML = notesHTML || "<li>No notes saved yet.</li>";
        }
    };
     objectStore.openCursor().onerror = (e) => {
        notesListEl.innerHTML = "<li>Error loading notes.</li>";
        console.error("Error loading AI notes:", e.target.error);
    }
}


// --- Custom Script Execution (Settings Page) ---
function runCustomScript() {
    if (!currentLoggedInUser) return;
    const scriptContent = document.getElementById('customScriptInput').value;
    const statusElId = 'customScriptStatus';
    if (scriptContent) {
        try {
            eval(scriptContent);
            displayStatusMessage(statusElId, "Customizations applied.", 'success');
            // Refresh relevant displays that might be affected by script changes
            if(typeof loadSettingsPageData === "function") loadSettingsPageData();
            if(typeof updateDashboardDisplay === "function") updateDashboardDisplay();
            if(typeof updatePremiumStatusDisplay === "function") updatePremiumStatusDisplay();
        } catch (e) {
            displayStatusMessage(statusElId, "Error executing script: " + e.message, 'error');
        }
    } else {
         displayStatusMessage(statusElId, "No script content.", 'warning');
    }
}