const FIREBASE_URL = 'https://my-notes-app-44ad7-default-rtdb.europe-west1.firebasedatabase.app';

let data = { themes: {} };
let currentThemeId = null;
let currentSubcatId = null;
let editTarget = null;

// ═══════════════════ ЗАГРУЗКА / СОХРАНЕНИЕ

async function loadData() {
    try {
        const res = await fetch(`${FIREBASE_URL}/notes.json`);
        const json = await res.json();
        data = json || { themes: {} };
        renderThemes();
    } catch (e) {
        console.error('Ошибка загрузки:', e);
        data = { themes: {} };
        renderThemes();
    }
}

async function saveData() {
    try {
        await fetch(`${FIREBASE_URL}/notes.json`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error('Ошибка сохранения:', e);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ═══════════════════ НАВИГАЦИЯ

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function goBack() {
    currentThemeId = null;
    currentSubcatId = null;
    renderThemes();
    showView('view-themes');
}

function goBackToTheme() {
    currentSubcatId = null;
    renderThemeView();
    showView('view-theme');
}

// ═══════════════════ ТЕМЫ

function renderThemes() {
    const container = document.getElementById('themes-list');
    container.innerHTML = '';

    const themes = Object.entries(data.themes);

    if (themes.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">Нет тем. Нажмите +</p>';
        return;
    }

    themes.forEach(([id, theme]) => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <span style="flex:1">${escapeHtml(theme.name)}</span>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteTheme('${id}')">🗑</button>
            <span class="item-arrow">→</span>
        `;
        div.onclick = () => openTheme(id);
        container.appendChild(div);
    });
}

function openTheme(id) {
    currentThemeId = id;
    renderThemeView();
    showView('view-theme');
}

function renderThemeView() {
    const theme = data.themes[currentThemeId];
    document.getElementById('theme-title').textContent = theme.name;

    const notesContainer = document.getElementById('theme-notes-list');
    notesContainer.innerHTML = '';
    const notes = theme.notes || [];

    if (notes.length === 0) {
        notesContainer.innerHTML = '<p style="color:var(--text-muted);padding:12px 4px;font-size:0.9rem;">Нет заметок</p>';
    }

    notes.forEach((note, i) => renderNoteItem(note, i, notesContainer, 'theme'));

    const subcatsContainer = document.getElementById('subcats-list');
    subcatsContainer.innerHTML = '';
    const subcats = Object.entries(theme.subcategories || {});

    if (subcats.length === 0) {
        subcatsContainer.innerHTML = '<p style="color:var(--text-muted);padding:12px 4px;font-size:0.9rem;">Нет подкатегорий</p>';
    }

    subcats.forEach(([id, subcat]) => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <span style="flex:1">${escapeHtml(subcat.name)}</span>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteSubcategory('${id}')">🗑</button>
            <span class="item-arrow">→</span>
        `;
        div.onclick = () => openSubcategory(id);
        subcatsContainer.appendChild(div);
    });
}

function addTheme() {
    const id = generateId();
    data.themes[id] = { 
        name: 'Новая тема', 
        notes: [],
        subcategories: {} 
    };
    saveData();
    renderThemes();
    openTheme(id);
}

function deleteTheme(id) {
    if (!confirm('Удалить тему и все её содержимое?')) return;
    delete data.themes[id];
    if (currentThemeId === id) {
        currentThemeId = null;
        currentSubcatId = null;
        goBack();
    }
    saveData();
    renderThemes();
}

function editCurrentTheme() {
    editTarget = { type: 'theme', id: currentThemeId };
    document.getElementById('edit-input').value = data.themes[currentThemeId].name;
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-input').focus();
}

// ═══════════════════ ПОДКАТЕГОРИИ

function openSubcategory(id) {
    currentSubcatId = id;
    renderSubcatView();
    showView('view-subcat');
}

function renderSubcatView() {
    const theme = data.themes[currentThemeId];
    const subcat = theme.subcategories[currentSubcatId];
    document.getElementById('subcat-title').textContent = subcat.name;

    const container = document.getElementById('subcat-notes-list');
    container.innerHTML = '';
    const notes = subcat.notes || [];

    if (notes.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);padding:12px 4px;font-size:0.9rem;">Нет заметок</p>';
    }

    notes.forEach((note, i) => renderNoteItem(note, i, container, 'subcat'));
}

function addSubcategory() {
    const id = generateId();
    data.themes[currentThemeId].subcategories[id] = { 
        name: 'Новая подкатегория', 
        notes: [] 
    };
    saveData();
    renderThemeView();
    openSubcategory(id);
}

function deleteSubcategory(id) {
    if (!confirm('Удалить подкатегорию и все её заметки?')) return;
    delete data.themes[currentThemeId].subcategories[id];
    if (currentSubcatId === id) {
        currentSubcatId = null;
        goBackToTheme();
    }
    saveData();
    renderThemeView();
}

function editCurrentSubcat() {
    editTarget = { type: 'subcat', id: currentSubcatId };
    document.getElementById('edit-input').value = data.themes[currentThemeId].subcategories[currentSubcatId].name;
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-input').focus();
}

// ═══════════════════ ЗАМЕТКИ

function renderNoteItem(note, index, container, location) {
    const div = document.createElement('div');
    div.className = 'note-item';
    div.dataset.index = index;

    const hasStatus = note.hasStatus === true;
    const isDone = note.done;

    let statusHtml = '';
    if (hasStatus) {
        const statusClass = isDone ? 'done' : 'not-done';
        const statusText = isDone ? 'Выполнено' : 'Не выполнено';
        const statusBadgeClass = isDone ? 'done' : 'not-done';
        statusHtml = `
            <input type="checkbox" class="note-checkbox" ${isDone ? 'checked' : ''} 
                onchange="toggleNote(${index}, '${location}')">
            <span class="note-status ${statusBadgeClass}">${statusText}</span>
        `;
    }

    const moveHtml = `
        <div class="move-btns">
            <button class="move-btn" onclick="moveNote(${index}, -1, '${location}')" title="Вверх">↑</button>
            <button class="move-btn" onclick="moveNote(${index}, 1, '${location}')" title="Вниз">↓</button>
        </div>
    `;

    // Заменяем input на div contenteditable для многострочного текста
    const textClass = hasStatus ? (isDone ? 'done' : 'not-done') : '';

    div.innerHTML = `
        ${moveHtml}
        <div class="note-text ${textClass}" contenteditable="true" 
            onblur="editNote(${index}, this.innerText, '${location}')"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.blur();}">${escapeHtml(note.text)}</div>
        ${statusHtml}
        <button class="delete-btn" onclick="deleteNote(${index}, '${location}')">✕</button>
    `;
    container.appendChild(div);
}

function addThemeNote() {
    const input = document.getElementById('theme-note-input');
    const text = input.value.trim();
    if (!text) return;

    const hasStatus = document.getElementById('theme-status-toggle').checked;

    const notes = data.themes[currentThemeId].notes || [];
    notes.push({ text, done: false, hasStatus });
    data.themes[currentThemeId].notes = notes;

    input.value = '';
    saveData();
    renderThemeView();
}

function addSubcatNote() {
    const input = document.getElementById('subcat-note-input');
    const text = input.value.trim();
    if (!text) return;

    const hasStatus = document.getElementById('subcat-status-toggle').checked;

    const notes = data.themes[currentThemeId].subcategories[currentSubcatId].notes || [];
    notes.push({ text, done: false, hasStatus });
    data.themes[currentThemeId].subcategories[currentSubcatId].notes = notes;

    input.value = '';
    saveData();
    renderSubcatView();
}

function toggleNote(index, location) {
    let notes;
    if (location === 'theme') {
        notes = data.themes[currentThemeId].notes;
    } else {
        notes = data.themes[currentThemeId].subcategories[currentSubcatId].notes;
    }
    notes[index].done = !notes[index].done;
    saveData();

    if (location === 'theme') renderThemeView();
    else renderSubcatView();
}

function editNote(index, text, location) {
    let notes;
    if (location === 'theme') {
        notes = data.themes[currentThemeId].notes;
    } else {
        notes = data.themes[currentThemeId].subcategories[currentSubcatId].notes;
    }
    notes[index].text = text.trim();
    saveData();
}

function deleteNote(index, location) {
    let notes;
    if (location === 'theme') {
        notes = data.themes[currentThemeId].notes;
    } else {
        notes = data.themes[currentThemeId].subcategories[currentSubcatId].notes;
    }
    notes.splice(index, 1);
    saveData();

    if (location === 'theme') renderThemeView();
    else renderSubcatView();
}

function moveNote(index, direction, location) {
    let notes;
    if (location === 'theme') {
        notes = data.themes[currentThemeId].notes;
    } else {
        notes = data.themes[currentThemeId].subcategories[currentSubcatId].notes;
    }

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= notes.length) return;

    [notes[index], notes[newIndex]] = [notes[newIndex], notes[index]];
    saveData();

    if (location === 'theme') renderThemeView();
    else renderSubcatView();
}

// ═══════════════════ МОДАЛКА

function cancelEdit() {
    document.getElementById('edit-modal').classList.add('hidden');
    editTarget = null;
}

function confirmEdit() {
    const newName = document.getElementById('edit-input').value.trim();
    if (!newName) return cancelEdit();

    if (editTarget.type === 'theme') {
        data.themes[editTarget.id].name = newName;
        document.getElementById('theme-title').textContent = newName;
        saveData();
        renderThemes();
    } else if (editTarget.type === 'subcat') {
        data.themes[currentThemeId].subcategories[editTarget.id].name = newName;
        document.getElementById('subcat-title').textContent = newName;
        saveData();
        renderThemeView();
    }

    cancelEdit();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancelEdit();
});

document.getElementById('edit-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmEdit();
});

// ═══════════════════ УТИЛИТЫ

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Старт
loadData();
