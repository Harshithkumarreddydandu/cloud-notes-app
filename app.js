/* =========================
   AUTHENTICATION
========================= */

const appState = {
    editIndex: null,
    activeCategory: "All"
};

function getLoggedInUser(){
    return localStorage.getItem("loggedInUser");
}

function requireLogin(){
    const page = window.location.pathname.split("/").pop();
    const publicPages = ["login.html", "signup.html"];

    if(!getLoggedInUser() && !publicPages.includes(page)){
        window.location.href = "login.html";
        return;
    }

    if(getLoggedInUser() && publicPages.includes(page)){
        window.location.href = "dashboard.html";
    }
}

function getStorageKey(){
    const user = getLoggedInUser();
    return user ? `${user}_notes` : "";
}

function getSavedNotes(){
    const key = getStorageKey();
    return key ? JSON.parse(localStorage.getItem(key)) || [] : [];
}

function saveNotes(notes){
    localStorage.setItem(getStorageKey(), JSON.stringify(notes));
}

async function signup(){
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if(username === "" || email === "" || password === "" || confirmPassword === ""){
        displayMessage("Please fill all fields", "warning");
        return;
    }

    if(password !== confirmPassword){
        displayMessage("Passwords do not match", "warning");
        return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];
    const existingUser = users.find(user => user.username === username || user.email === email);

    if(existingUser){
        displayMessage("Username or email already in use", "warning");
        return;
    }

    const passwordHash = await hashPassword(password);
    users.push({ username, email, passwordHash, createdAt: getCurrentTimestamp() });
    localStorage.setItem("users", JSON.stringify(users));
    displayMessage("Account created successfully", "success");
    setTimeout(() => {
        window.location.href = "login.html";
    }, 800);
}

async function login(){
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if(username === "" || password === ""){
        displayMessage("Please fill all fields", "warning");
        return;
    }

    const passwordHash = await hashPassword(password);
    let users = JSON.parse(localStorage.getItem("users")) || [];
    const validUser = users.find(user =>
        (user.username === username || user.email === username) &&
        user.passwordHash === passwordHash
    );

    if(validUser){
        localStorage.setItem("loggedInUser", validUser.username);
        displayMessage("Login successful", "success");
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 300);
    } else {
        displayMessage("Wrong username/email or password", "error");
    }
}

function logout(){
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}

/* =========================
   UI HELPERS
========================= */

function displayMessage(message, type = "info"){
    const toast = document.getElementById("messageToast");
    if(!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.opacity = "1";

    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => {
        toast.style.opacity = "0";
    }, 3000);
}

function loadThemePreference(){
    const storedTheme = localStorage.getItem(`theme_${getLoggedInUser() || "guest"}`) || "light";
    setTheme(storedTheme);
}

function setTheme(theme){
    if(theme === "dark"){
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
    localStorage.setItem(`theme_${getLoggedInUser() || "guest"}`, theme);
}

function toggleDarkMode(){
    const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    setTheme(nextTheme);
    displayMessage(`Switched to ${nextTheme} mode`, "success");
}

function getCurrentTimestamp(){
    return new Date().toLocaleString();
}

async function hashPassword(password){
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

function normalizeTags(tags){
    return tags
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean)
        .join(", ");
}

/* =========================
   NOTES
========================= */

function addNote(){
    const title = document.getElementById("noteTitle").value.trim();
    const text = document.getElementById("noteText").value.trim();
    const category = document.getElementById("noteCategory").value;
    const priority = document.getElementById("notePriority").value;
    const tags = normalizeTags(document.getElementById("noteTags").value);
    const pinned = document.getElementById("pinNote").checked;

    if(title === "" || text === ""){
        displayMessage("Please fill all fields", "warning");
        return;
    }

    const notes = getSavedNotes();
    const currentDate = getCurrentTimestamp();

    if(appState.editIndex !== null){
        const note = notes[appState.editIndex];
        note.title = title;
        note.text = text;
        note.category = category;
        note.priority = priority;
        note.tags = tags;
        note.pinned = pinned;
        note.updated = currentDate;
        displayMessage("Note updated successfully", "success");
    } else {
        notes.push({
            id: Date.now(),
            title,
            text,
            category,
            priority,
            tags,
            pinned,
            created: currentDate,
            updated: currentDate
        });
        displayMessage("Note added successfully", "success");
    }

    saveNotes(notes);
    appState.editIndex = null;
    document.getElementById("noteFormTitle").textContent = "Create a note";
    document.getElementById("cancelEditBtn").style.display = "none";
    displayNotes();
    clearInputs();
}

function displayNotes(){
    const notes = getSavedNotes();
    const searchQuery = document.getElementById("searchInput")?.value.toLowerCase() || "";
    const activeCategory = appState.activeCategory || "All";
    const notesList = document.getElementById("notesList");

    if(!notesList){
        updateDashboardStats();
        refreshCategoryFilters();
        return;
    }

    const filtered = notes.filter(note => {
        const text = `${note.title} ${note.text} ${note.category} ${note.tags}`.toLowerCase();
        if(activeCategory !== "All" && note.category !== activeCategory){
            return false;
        }
        return searchQuery === "" || text.includes(searchQuery);
    });

    filtered.sort((a, b) => {
        if(a.pinned !== b.pinned) return b.pinned - a.pinned;
        return new Date(b.updated || b.created) - new Date(a.updated || a.created);
    });

    notesList.innerHTML = filtered.map(note => `
        <div class="note-card ${note.pinned ? "pinned" : ""}">
            <div class="note-card-top">
                <h2>${note.title}</h2>
                ${note.pinned ? `<span class="note-badge">Pinned</span>` : ""}
            </div>
            <p>${note.text}</p>
            <div class="note-meta">
                <span class="note-chip">${note.category}</span>
                <span class="note-chip">${note.priority}</span>
                ${note.tags ? `<span class="note-chip">Tags: ${note.tags}</span>` : ""}
            </div>
            <div class="note-info">
                <small>Created: ${note.created}</small>
                ${note.updated && note.updated !== note.created ? `<small>Updated: ${note.updated}</small>` : ""}
            </div>
            <div class="note-actions-row">
                <button class="main-btn small" onclick="editNote('${note.id}')">Edit</button>
                <button class="main-btn small" onclick="deleteNote('${note.id}')">Delete</button>
                <button class="secondary-btn small" onclick="togglePin('${note.id}')">${note.pinned ? "Unpin" : "Pin"}</button>
            </div>
        </div>
    `).join("");

    updateDashboardStats();
    refreshCategoryFilters();
}

function updateDashboardStats(){
    const notes = getSavedNotes();
    const pinnedCount = notes.filter(note => note.pinned).length;
    const categoryCount = new Set(notes.map(note => note.category)).size;
    const recentNotes = notes
        .slice()
        .sort((a, b) => new Date(b.updated || b.created) - new Date(a.updated || a.created))
        .slice(0, 3);

    document.getElementById("pinnedCount")?.textContent = pinnedCount;
    document.getElementById("categoryCount")?.textContent = categoryCount;
    document.getElementById("notesCount")?.textContent = notes.length;

    const recentList = document.getElementById("recentNotes");
    if(recentList){
        recentList.innerHTML = recentNotes.length
            ? recentNotes.map(note => `<li><strong>${note.title}</strong><span>${note.category}</span></li>`).join("")
            : `<li>No notes yet</li>`;
    }
}

function refreshCategoryFilters(){
    const categories = ["All", "Personal", "Study", "Work", "Ideas"];
    const container = document.getElementById("categoryFilters");
    if(!container) return;

    container.innerHTML = categories.map(category => `
        <button class="chip ${appState.activeCategory === category ? "active" : ""}" onclick="setCategoryFilter('${category}')">${category}</button>
    `).join("");
}

function setCategoryFilter(category){
    appState.activeCategory = category;
    displayNotes();
}

function editNote(id){
    const notes = getSavedNotes();
    const index = notes.findIndex(note => String(note.id) === String(id));
    if(index === -1) return;
    const note = notes[index];

    appState.editIndex = index;
    document.getElementById("noteFormTitle").textContent = "Edit note";
    document.getElementById("noteTitle").value = note.title;
    document.getElementById("noteText").value = note.text;
    document.getElementById("noteCategory").value = note.category;
    document.getElementById("notePriority").value = note.priority;
    document.getElementById("noteTags").value = note.tags || "";
    document.getElementById("pinNote").checked = note.pinned;
    document.getElementById("cancelEditBtn").style.display = "inline-flex";
    displayMessage("Editing note. Make your changes and save.", "info");
}

function cancelEdit(){
    appState.editIndex = null;
    document.getElementById("noteFormTitle").textContent = "Create a note";
    document.getElementById("cancelEditBtn").style.display = "none";
    clearInputs();
}

function deleteNote(id){
    if(!confirm("Delete this note permanently?")) return;

    const notes = getSavedNotes();
    const index = notes.findIndex(note => String(note.id) === String(id));
    if(index === -1) return;

    notes.splice(index, 1);
    saveNotes(notes);
    displayNotes();
    displayMessage("Note deleted", "warning");
}

function togglePin(id){
    const notes = getSavedNotes();
    const index = notes.findIndex(note => String(note.id) === String(id));
    if(index === -1) return;

    notes[index].pinned = !notes[index].pinned;
    notes[index].updated = getCurrentTimestamp();
    saveNotes(notes);
    displayNotes();
    displayMessage(notes[index].pinned ? "Note pinned" : "Note unpinned", "success");
}

function clearInputs(){
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteText").value = "";
    document.getElementById("noteCategory").value = "Personal";
    document.getElementById("notePriority").value = "Normal";
    document.getElementById("noteTags").value = "";
    document.getElementById("pinNote").checked = false;
}

function clearAllNotes(){
    if(!confirm("Clear all notes permanently?")) return;
    localStorage.removeItem(getStorageKey());
    displayNotes();
    displayMessage("All notes cleared", "warning");
}

function exportNotes(){
    const notes = getSavedNotes();
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `notes-${getLoggedInUser() || "user"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    displayMessage("Notes exported successfully", "success");
}

function importNotes(event){
    const file = event.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try{
            const imported = JSON.parse(e.target.result);
            if(!Array.isArray(imported)) throw new Error("Invalid note file");

            const notes = getSavedNotes();
            imported.forEach(note => {
                if(note.title && note.text){
                    notes.push({
                        id: Date.now() + Math.random(),
                        title: note.title,
                        text: note.text,
                        category: note.category || "Personal",
                        priority: note.priority || "Normal",
                        tags: normalizeTags(note.tags || ""),
                        pinned: note.pinned || false,
                        created: note.created || getCurrentTimestamp(),
                        updated: note.updated || getCurrentTimestamp()
                    });
                }
            });

            saveNotes(notes);
            displayNotes();
            displayMessage("Notes imported successfully", "success");
        } catch(error){
            displayMessage(`Import failed: ${error.message}`, "error");
        } finally {
            event.target.value = "";
        }
    };
    reader.readAsText(file);
}

function initializeApp(){
    requireLogin();
    loadThemePreference();
    displayNotes();
    refreshCategoryFilters();
    const cancelEditButton = document.getElementById("cancelEditBtn");
    if(cancelEditButton){
        cancelEditButton.style.display = "none";
    }
}

window.addEventListener("DOMContentLoaded", initializeApp);
