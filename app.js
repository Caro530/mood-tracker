(() => {
  'use strict';

  // ---------- Config ----------
  const STORAGE_KEY = 'moodEntries';
  const MAX_TEXT = 600;

  const colors = {
    1: "#FF4B4B", 2: "#FF6B3B", 3: "#FF8B2B", 4: "#FFAA1B", 5: "#FFC800",
    6: "#E1D700", 7: "#C4E500", 8: "#A6F300", 9: "#7CE000", 10: "#58CC02"
  };

  // ---------- State ----------
  let entries = loadEntries();
  let currentMood = null;
  let currentDate = new Date();
  let selectedDateString = toLocalDateString(new Date());

  // ---------- Init ----------
  registerSW();
  bindGlobalShortcuts();
  renderAll();

  // ---------- Core ----------
  function renderAll() {
    renderCalendar();
    renderDailyLogs(selectedDateString);
    renderStats();
    renderProfile();
    renderStreak();
  }

  function switchTab(tab) {
    ['calendar', 'log', 'profile'].forEach(t => {
      byId(`tab-${t}`)?.classList.add('hidden');
      byId(`nav-${t}`)?.classList.remove('active');
    });

    byId(`tab-${tab}`)?.classList.remove('hidden');
    byId(`nav-${tab}`)?.classList.add('active');

    if (tab === 'calendar') {
      renderCalendar();
      renderDailyLogs(selectedDateString);
      renderStats();
      renderStreak();
    } else if (tab === 'log') {
      nextStep(1);
    } else if (tab === 'profile') {
      renderProfile();
      renderStreak();
    }
  }

  function nextStep(step) {
    [1, 2, 3].forEach(s => byId(`step-${s}`)?.classList.add('hidden'));
    byId(`step-${step}`)?.classList.remove('hidden');

    const progress = byId('progress-bar');
    if (progress) progress.style.width = `${(step / 3) * 100}%`;
  }

  function selectMood(mood) {
    currentMood = mood;
    setTimeout(() => nextStep(2), 120);
  }

  function saveEntry() {
    const happenedEl = byId('happened');
    const whyEl = byId('why');
    if (!happenedEl || !whyEl) return;

    const happened = normalizeText(happenedEl.value);
    const why = normalizeText(whyEl.value);

    if (!currentMood) return alert('Pick your mood first.');
    if (!happened || !why) return alert('Please fill in both text boxes.');
    if (happened.length > MAX_TEXT || why.length > MAX_TEXT) {
      return alert(`Please keep each text under ${MAX_TEXT} characters.`);
    }

    const now = new Date();
    const date = toLocalDateString(now);

    entries.push({
      id: cryptoSafeId(),
      mood: currentMood,
      happened,
      why,
      date,
      timestamp: now.getTime()
    });

    persistEntries();

    // Reset form
    currentMood = null;
    happenedEl.value = '';
    whyEl.value = '';

    // Jump to today after save
    selectedDateString = date;
    currentDate = new Date();

    switchTab('calendar');
  }

  // ---------- Calendar ----------
  function changeMonth(dir) {
    currentDate.setMonth(currentDate.getMonth() + dir);
    renderCalendar();
    // keep daily logs for selected date visible
    renderDailyLogs(selectedDateString);
  }

  function selectDate(dateStr) {
    selectedDateString = dateStr;
    renderCalendar();
    renderDailyLogs(dateStr);
  }

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthLabel = byId('month-label');
    if (monthLabel) {
      monthLabel.textContent = new Date(year, month).toLocaleString(undefined, {
        month: 'long',
        year: 'numeric'
      });
    }

    const grid = byId('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const spacer = document.createElement('div');
      grid.appendChild(spacer);
    }

    const grouped = groupByDate(entries);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayLogs = grouped.get(dateStr) || [];
      const avg = dayLogs.length ? Math.round(dayLogs.reduce((a, b) => a + Number(b.mood), 0) / dayLogs.length) : 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `day-btn ${avg ? 'has-data' : ''} ${dateStr === selectedDateString ? 'selected' : ''}`;
      btn.textContent = d;
      if (avg) {
        btn.style.backgroundColor = colors[avg];
        btn.style.borderBottomColor = 'rgba(0,0,0,0.2)';
      }
      btn.addEventListener('click', () => selectDate(dateStr));
      grid.appendChild(btn);
    }
  }

  function renderDailyLogs(dateStr) {
    const title = byId('selected-date-label');
    const list = byId('daily-logs-list');
    if (!title || !list) return;

    const dateObj = parseLocalDate(dateStr);
    title.textContent = `Logs for ${dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

    const dayLogs = entries
      .filter(e => e.date === dateStr)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (!dayLogs.length) {
      list.innerHTML = `
        <div style="text-align:center; padding:20px;">
          <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f63e.svg" alt="Cat Mascot" style="width:100px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
          <p style="color:#AFB0B3; font-weight:900; font-size:18px; margin-top:15px;">I'm waiting for your log.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = dayLogs.map(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="card">
          <div class="card-header">
            <span style="display:flex; align-items:center; gap:5px;"><i class="ph-duotone ph-clock"></i> ${escapeHtml(time)}</span>
            <span class="mood-badge" style="background:${colors[entry.mood]}">Mood: ${entry.mood}</span>
          </div>
          <p style="font-weight:800; margin-bottom:5px; margin-top:0;">What happened:</p>
          <p style="margin-top:0; color:#666;">${escapeHtml(entry.happened)}</p>
          <p style="font-weight:800; margin-bottom:5px;">Why:</p>
          <p style="margin-top:0; color:#666;">${escapeHtml(entry.why)}</p>
        </div>
      `;
    }).join('');
  }

  // ---------- Stats ----------
  function renderStats() {
    const container = byId('visual-stats');
    if (!container) return;

    container.innerHTML = '';
    if (!entries.length) {
      container.innerHTML = `<p style="text-align:center; color:#AFB0B3; font-weight:800;">Log moods to see your data!</p>`;
      return;
    }

    const counts = { Low: 0, Med: 0, High: 0 };
    for (const e of entries) {
      if (e.mood <= 3) counts.Low++;
      else if (e.mood <= 7) counts.Med++;
      else counts.High++;
    }

    const total = entries.length;
    const palette = { Low: '#FF4B4B', Med: '#FFC800', High: '#58CC02' };

    Object.entries(counts).forEach(([label, count]) => {
      const width = (count / total) * 100;
      container.insertAdjacentHTML('beforeend', `
        <div class="stat-row">
          <div class="stat-label">${label}</div>
          <div class="stat-bar-bg">
            <div class="stat-bar-fill" style="width:${width}%; background:${palette[label]};"></div>
          </div>
          <div style="font-weight:900; width:30px; text-align:right;">${count}</div>
        </div>
      `);
    });
  }

  // ---------- Streak ----------
  function renderStreak() {
    const el = byId('streak-count');
    if (!el) return;
    el.textContent = calculateStreak(entries);
  }

  function calculateStreak(allEntries) {
    if (!allEntries.length) return 0;

    const dates = [...new Set(allEntries.map(e => e.date))].sort().reverse();
    const today = toLocalDateString(new Date());
    const yesterday = toLocalDateString(new Date(Date.now() - 86400000));

    if (dates[0] !== today && dates[0] !== yesterday) return 0;

    let streak = 0;
    let cursor = dates[0] === yesterday ? new Date(Date.now() - 86400000) : new Date();

    for (const d of dates) {
      const expected = toLocalDateString(cursor);
      if (d !== expected) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  // ---------- Profile ----------
  function renderProfile() {
    const totalLogs = byId('total-logs');
    if (totalLogs) totalLogs.textContent = entries.length;
  }

  // ---------- Settings ----------
  function openSettings() {
    byId('settings-modal')?.classList.add('active');
  }

  function closeSettings() {
    byId('settings-modal')?.classList.remove('active');
  }

  function clearData() {
    if (!confirm('Are you absolutely sure? This will delete all your mood logs permanently!')) return;
    entries = [];
    persistEntries();
    closeSettings();
    renderAll();
  }

  function exportData() {
    if (!entries.length) return alert("You don't have any data to export yet!");
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mood-tracker-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- Persistence ----------
  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isValidEntry) : [];
    } catch {
      return [];
    }
  }

  function persistEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function isValidEntry(e) {
    return e &&
      typeof e.id !== 'undefined' &&
      typeof e.date === 'string' &&
      typeof e.timestamp === 'number' &&
      Number.isFinite(Number(e.mood)) &&
      typeof e.happened === 'string' &&
      typeof e.why === 'string';
  }

  // ---------- Utilities ----------
  function toLocalDateString(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function groupByDate(list) {
    const map = new Map();
    for (const item of list) {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date).push(item);
    }
    return map;
  }

  function normalizeText(text) {
    return String(text || '').trim();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function cryptoSafeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function bindGlobalShortcuts() {
    document.addEventListener('click', (e) => {
      const modal = byId('settings-modal');
      if (!modal || !modal.classList.contains('active')) return;
      if (e.target.id === 'settings-modal') closeSettings();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSettings();
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Expose handlers for inline onclick in HTML
  window.switchTab = switchTab;
  window.nextStep = nextStep;
  window.selectMood = selectMood;
  window.saveEntry = saveEntry;
  window.changeMonth = changeMonth;
  window.selectDate = selectDate;
  window.openSettings = openSettings;
  window.closeSettings = closeSettings;
  window.clearData = clearData;
  window.exportData = exportData;
})();
