const TASKS_KEY = 'wiscode_sb_tasks_v1';
const SETTINGS_KEY = 'wiscode_sb_settings_v1';

const TODAY = new Date();
const TODAY_ISO = toISODate(TODAY);

const CAT_COLORS = ['#00FF85', '#F59E0B', '#38BDF8', '#A78BFA', '#FB7185', '#34D399'];

let state = {
  tasks: [],
  settings: {
    name: 'Onyedika Wisdom',
    theme: 'light',
    avatar: '',
    categories: ['Engineering', 'Design', 'Business', 'Personal']
  },
  activeScreen: 'home',
  calYear: TODAY.getFullYear(),
  calMonth: TODAY.getMonth(),
  selectedDate: TODAY_ISO
};

// --- UTILITIES ---
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function escapeHTML(str) {
  return String(str || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function getInitials(name) {
  return (name || 'OW').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'OW';
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// --- STORAGE ---
function loadData() {
  try {
    const savedTasks = localStorage.getItem(TASKS_KEY);
    if (savedTasks) state.tasks = JSON.parse(savedTasks);

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      state.settings = Object.assign(state.settings, parsed);
      if (!Array.isArray(state.settings.categories) || state.settings.categories.length === 0) {
        state.settings.categories = ['Engineering', 'Design', 'Business', 'Personal'];
      }
    }
  } catch (e) {
    console.error('Storage load error:', e);
  }
}

function saveTasks() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(state.tasks));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

// --- THEME & AVATAR ---
function applyTheme() {
  const isDark = state.settings.theme === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
}

function renderAvatars() {
  const initials = getInitials(state.settings.name);
  const avatarHTML = state.settings.avatar
    ? `<img src="${state.settings.avatar}" alt="Profile" />`
    : initials;

  document.getElementById('headerAvatar').innerHTML = avatarHTML;
  document.getElementById('profileAvatarLg').innerHTML = avatarHTML;
}

// --- CATEGORIES ---
function renderCategoryUI() {
  const cats = state.settings.categories;
  const deckEl = document.getElementById('categoryChipsList');

  if (deckEl) {
    deckEl.innerHTML = cats.map((c, idx) => {
      const color = CAT_COLORS[idx % CAT_COLORS.length];
      const count = state.tasks.filter(t => t.category === c).length;
      return `
        <div class="cat-pill-card">
          <div class="cat-pill-main">
            <span class="cat-dot" style="color:${color}; background:${color};"></span>
            <span class="cat-pill-name">${escapeHTML(c)}</span>
          </div>
          <div class="cat-pill-actions">
            <span class="cat-pill-count">${count}</span>
            ${cats.length > 1 ? `<button type="button" class="cat-del-btn" onclick="deleteCategory('${escapeHTML(c)}')" title="Delete">✕</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  const taskCatSel = document.getElementById('taskCategoryInput');
  const filterCatSel = document.getElementById('filterCategory');
  const currentTaskCat = taskCatSel.value;
  const currentFilter = filterCatSel.value;

  taskCatSel.innerHTML = cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  if (cats.includes(currentTaskCat)) taskCatSel.value = currentTaskCat;

  filterCatSel.innerHTML = `<option value="all">All Categories</option>` +
    cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  filterCatSel.value = cats.includes(currentFilter) ? currentFilter : 'all';
}

window.deleteCategory = function(catName) {
  if (state.settings.categories.length <= 1) {
    showToast('Keep at least one category');
    return;
  }
  state.settings.categories = state.settings.categories.filter(c => c !== catName);
  saveSettings();
  renderAll();
  showToast(`Removed "${catName}"`);
};

// --- NAVIGATION ---
function navigateTo(screen) {
  state.activeScreen = screen;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screen}`).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === screen);
  });

  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- RENDERERS ---
function renderHome() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greetingEyebrow').textContent = greeting;

  const todayTasks = state.tasks
    .filter(t => t.date === TODAY_ISO)
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

  const doneCount = todayTasks.filter(t => t.completed).length;
  const totalCount = todayTasks.length;
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  document.getElementById('heroCountLabel').textContent = `${doneCount} OF ${totalCount} COMPLETED`;
  document.getElementById('heroPercent').textContent = `${pct}%`;

  const offset = 245.04 - (pct / 100) * 245.04;
  document.getElementById('heroRingFill').style.strokeDashoffset = offset;

  document.getElementById('heroMessage').textContent = totalCount === 0
    ? 'Tap + to add your first task for today.'
    : pct === 100 ? 'All tasks for today completed!' : 'Your daily plan is active.';

  // Bento Grid
  const bentoGrid = document.getElementById('homeBentoGrid');
  if (todayTasks.length === 0) {
    bentoGrid.innerHTML = `<div class="empty-box" style="grid-column: 1 / -1;">No tasks scheduled for today yet.</div>`;
  } else {
    bentoGrid.innerHTML = todayTasks.slice(0, 4).map((t, i) => `
      <div class="bento-card ${i % 2 === 1 ? 'tint' : ''}" onclick="openTaskModal('${t.id}')">
        <div>
          <div class="bento-top">
            <span class="cat-tag">${escapeHTML(t.category)}</span>
            <button class="check-btn ${t.completed ? 'checked' : ''}" onclick="event.stopPropagation(); toggleComplete('${t.id}')">
              ${t.completed ? '✓' : ''}
            </button>
          </div>
          <div class="bento-title">${escapeHTML(t.title)}</div>
        </div>
        <div class="bento-time">${t.startTime ? escapeHTML(t.startTime) : 'Anytime'}</div>
      </div>
    `).join('');
  }

  // Upcoming
  const upcoming = state.tasks
    .filter(t => !t.completed)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const upcomingEl = document.getElementById('upcomingList');
  upcomingEl.innerHTML = upcoming.length === 0
    ? `<div class="empty-box">No pending tasks. You're all caught up!</div>`
    : upcoming.map(renderTaskRow).join('');
}

function renderTaskRow(t) {
  return `
    <div class="task-row ${t.completed ? 'done' : ''}">
      <button class="check-btn ${t.completed ? 'checked' : ''}" onclick="toggleComplete('${t.id}')">
        ${t.completed ? '✓' : ''}
      </button>
      <div class="task-row-info" onclick="openTaskModal('${t.id}')">
        <div class="task-row-title">${escapeHTML(t.title)}</div>
        <div class="task-row-meta">${escapeHTML(t.date)} • ${escapeHTML(t.category)}</div>
      </div>
      <span class="prio-badge">${escapeHTML(t.priority)}</span>
    </div>
  `;
}

function renderCalendar() {
  const monthDate = new Date(state.calYear, state.calMonth, 1);
  document.getElementById('calMonthLabel').textContent = monthDate.toLocaleDateString('en-US', {
    month: 'long', year: 'numeric'
  });

  const firstDay = monthDate.getDay();
  const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
  const taskDates = new Set(state.tasks.map(t => t.date));

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${state.calYear}-${String(state.calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = iso === TODAY_ISO;
    const isSelected = iso === state.selectedDate;
    const hasDot = taskDates.has(iso);

    cells += `
      <button class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" onclick="selectDate('${iso}')">
        <span>${d}</span>
        ${hasDot ? '<span class="cal-dot"></span>' : ''}
      </button>
    `;
  }
  document.getElementById('calDaysGrid').innerHTML = cells;
  document.getElementById('selectedDateLabel').textContent = state.selectedDate === TODAY_ISO ? "Today's Timeline" : state.selectedDate;

  const dayTasks = state.tasks
    .filter(t => t.date === state.selectedDate)
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

  document.getElementById('dayTimelineList').innerHTML = dayTasks.length === 0
    ? `<div class="empty-box">No tasks on ${state.selectedDate}.</div>`
    : dayTasks.map(renderTaskRow).join('');
}

function renderAllTasks() {
  const q = document.getElementById('taskSearchInput').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const cat = document.getElementById('filterCategory').value;
  const prio = document.getElementById('filterPriority').value;

  const filtered = state.tasks.filter(t => {
    const matchQ = !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    const matchStatus = status === 'all' || (status === 'completed' ? t.completed : !t.completed);
    const matchCat = cat === 'all' || t.category === cat;
    const matchPrio = prio === 'all' || t.priority === prio;
    return matchQ && matchStatus && matchCat && matchPrio;
  }).sort((a, b) => a.date.localeCompare(b.date));

  document.getElementById('allTasksList').innerHTML = filtered.length === 0
    ? `<div class="empty-box">No matching tasks found.</div>`
    : filtered.map(renderTaskRow).join('');
}

function renderInsights() {
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.completed).length;
  const pending = total - done;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById('insTotal').textContent = total;
  document.getElementById('insCompleted').textContent = done;
  document.getElementById('insPending').textContent = pending;
  document.getElementById('insRate').textContent = `${rate}%`;

  const cats = state.settings.categories;
  document.getElementById('categoryBreakdown').innerHTML = cats.map(c => {
    const cTasks = state.tasks.filter(t => t.category === c);
    const cDone = cTasks.filter(t => t.completed).length;
    const pct = cTasks.length === 0 ? 0 : Math.round((cDone / cTasks.length) * 100);
    return `
      <div>
        <div class="cat-bar-head"><span>${escapeHTML(c)}</span><span>${cDone}/${cTasks.length}</span></div>
        <div class="cat-track"><div class="cat-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderProfile() {
  document.getElementById('profileDisplayName').textContent = state.settings.name;
  document.getElementById('settingsNameInput').value = state.settings.name;
  renderAvatars();
}

function renderAll() {
  renderCategoryUI();
  renderHome();
  renderCalendar();
  renderAllTasks();
  renderInsights();
  renderProfile();
}

// --- ACTIONS ---
window.selectDate = function(iso) {
  state.selectedDate = iso;
  renderCalendar();
};

window.toggleComplete = function(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  renderAll();
  showToast(task.completed ? 'Task completed!' : 'Marked pending');
};

window.openTaskModal = function(id = null) {
  const backdrop = document.getElementById('taskModalBackdrop');
  const form = document.getElementById('taskForm');
  const delBtn = document.getElementById('deleteTaskBtn');

  renderCategoryUI();

  if (id) {
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('taskIdInput').value = t.id;
    document.getElementById('taskTitleInput').value = t.title;
    document.getElementById('taskDescInput').value = t.description || '';
    document.getElementById('taskDateInput').value = t.date;
    document.getElementById('taskCategoryInput').value = t.category;
    document.getElementById('taskStartInput').value = t.startTime || '';
    document.getElementById('taskEndInput').value = t.endTime || '';
    document.getElementById('taskPriorityInput').value = t.priority;
    document.getElementById('taskStatusInput').value = t.completed ? 'completed' : 'pending';
    delBtn.style.display = 'inline-block';
  } else {
    document.getElementById('modalTitle').textContent = 'New Task';
    form.reset();
    document.getElementById('taskIdInput').value = '';
    document.getElementById('taskDateInput').value = state.activeScreen === 'calendar' ? state.selectedDate : TODAY_ISO;
    delBtn.style.display = 'none';
  }
  backdrop.classList.add('open');
};

function closeModal() {
  document.getElementById('taskModalBackdrop').classList.remove('open');
}

// --- EVENT LISTENERS ---
document.getElementById('taskForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('taskIdInput').value;
  const payload = {
    id: id || 't-' + Date.now(),
    title: document.getElementById('taskTitleInput').value.trim(),
    description: document.getElementById('taskDescInput').value.trim(),
    date: document.getElementById('taskDateInput').value,
    category: document.getElementById('taskCategoryInput').value,
    startTime: document.getElementById('taskStartInput').value,
    endTime: document.getElementById('taskEndInput').value,
    priority: document.getElementById('taskPriorityInput').value,
    completed: document.getElementById('taskStatusInput').value === 'completed'
  };

  if (id) {
    state.tasks = state.tasks.map(t => t.id === id ? payload : t);
    showToast('Task updated');
  } else {
    state.tasks.unshift(payload);
    showToast('Task added');
  }
  saveTasks();
  closeModal();
  renderAll();
});

document.getElementById('deleteTaskBtn').addEventListener('click', () => {
  const id = document.getElementById('taskIdInput').value;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
  closeModal();
  renderAll();
  showToast('Task deleted');
});

document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.nav));
});

['mobileAddBtn', 'qaAddTask', 'calAddBtn'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => openTaskModal());
});

['heroPendingBtn', 'qaPending'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    navigateTo('tasks');
    document.getElementById('filterStatus').value = 'pending';
    renderAllTasks();
  });
});

document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('taskModalBackdrop').addEventListener('click', (e) => {
  if (e.target.id === 'taskModalBackdrop') closeModal();
});

// Category Modal Controls
const catModalBackdrop = document.getElementById('catModalBackdrop');

document.getElementById('qaCategories').addEventListener('click', () => {
  renderCategoryUI();
  catModalBackdrop.classList.add('open');
});

document.getElementById('closeCatModalBtn').addEventListener('click', () => {
  catModalBackdrop.classList.remove('open');
});

catModalBackdrop.addEventListener('click', (e) => {
  if (e.target === catModalBackdrop) catModalBackdrop.classList.remove('open');
});

document.getElementById('addCategoryBtn').addEventListener('click', () => {
  const input = document.getElementById('newCategoryInput');
  const val = input.value.trim();
  if (!val) return;
  if (state.settings.categories.some(c => c.toLowerCase() === val.toLowerCase())) {
    showToast('Category already exists');
    return;
  }
  state.settings.categories.push(val);
  input.value = '';
  saveSettings();
  renderAll();
  showToast(`Added "${val}"`);
});

document.getElementById('prevMonthBtn').addEventListener('click', () => {
  state.calMonth--;
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  renderCalendar();
});

document.getElementById('nextMonthBtn').addEventListener('click', () => {
  state.calMonth++;
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  renderCalendar();
});

['taskSearchInput', 'filterStatus', 'filterCategory', 'filterPriority'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderAllTasks);
});

// Theme Toggle
function toggleTheme() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  saveSettings();
  applyTheme();
  showToast(`${state.settings.theme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
}
document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
document.getElementById('settingsThemeBtn').addEventListener('click', toggleTheme);

// Photo Upload (Resized for LocalStorage)
document.getElementById('avatarUploadInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
      state.settings.avatar = canvas.toDataURL('image/jpeg', 0.8);
      saveSettings();
      renderAvatars();
      showToast('Profile photo updated');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById('removeAvatarBtn').addEventListener('click', () => {
  state.settings.avatar = '';
  saveSettings();
  renderAvatars();
  showToast('Photo removed');
});

document.getElementById('settingsNameInput').addEventListener('input', (e) => {
  state.settings.name = e.target.value.trim() || 'Onyedika Wisdom';
  saveSettings();
  renderProfile();
});

document.getElementById('clearAllBtn').addEventListener('click', () => {
  if (confirm('Erase all saved tasks?')) {
    state.tasks = [];
    saveTasks();
    renderAll();
    showToast('All tasks cleared');
  }
});

// INIT
loadData();
applyTheme();
renderAll();
