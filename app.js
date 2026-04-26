if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

let entries = JSON.parse(localStorage.getItem('moodEntries')) || [];
let currentMood = null;

let currentDate = new Date();
let selectedDateString = getLocalDateString(new Date());

const colors = {
  1: "#FF4B4B", 2: "#FF6B3B", 3: "#FF8B2B", 4: "#FFAA1B", 5: "#FFC800",
  6: "#E1D700", 7: "#C4E500", 8: "#A6F300", 9: "#7CE000", 10: "#58CC02"
};

// ---------- INIT ----------
init();

function init() {
  updateStreak();
  renderCalendar();
  updateStats();
  updateProfile();
}

// ---------- HELPERS ----------
function getLocalDateString(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function parseLocalDateString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ---------- TABS ----------
function switchTab(tab) {
  ['calendar', 'log', 'profile'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
    document.getElementById(`nav-${t}`).classList.remove('active');
  });

  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.getElementById(`nav-${tab}`).classList.add('active');

  if (tab === 'calendar') {
    renderCalendar();
    updateStats();
  } else if (tab === 'log') {
    nextStep(1);
  } else {
    updateProfile();
  }
}

// ---------- WIZARD ----------
function nextStep(step) {
  [1, 2, 3].forEach(s => document.getElementById(`step-${s}`).classList.add('hidden'));
  document.getElementById(`step-${step}`).classList.remove('hidden');
  document.getElementById('progress-bar').style.width = `${(step / 3) * 100}%`;
}

function selectMood(mood) {
  currentMood = mood;
  setTimeout(() => nextStep(2), 150);
}

function saveEntry() {
  const happened = document.getElementById('happened').value.trim();
  const why = document.getElementById('why').value.trim();

  if (!happened || !why) return alert("Please fill in both text boxes!");

  const now = new Date();
  const dateStr = getLocalDateString(now);

  entries.push({
    id: Date.now(),
    date: dateStr,
    timestamp: now.getTime(),
    mood: currentMood,
    happened,
    why
  });

  localStorage.setItem('moodEntries', JSON.stringify(entries));

  currentMood = null;
  document.getElementById('happened').value = '';
  document.getElementById('why').value = '';

  selectedDateString = dateStr;
  currentDate = new Date();

  updateStreak();
  switchTab('calendar');
}

// ---------- CALENDAR ----------
function changeMonth(dir) {
  currentDate.setMonth(currentDate.getMonth() + dir);
  renderCalendar();
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  document.getElementById('month-label').innerText = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayLogs = entries.filter(e => e.date === dateStr);
    const avg = dayLogs.length ? Math.round(dayLogs.reduce((a,b) => a + +b.mood, 0) / dayLogs.length) : 0;

    const isSelected = dateStr === selectedDateString ? 'selected' : '';
    const hasDataClass = avg > 0 ? 'has-data' : '';
    const bgStyle = avg > 0 ? `background-color: ${colors[avg]}; border-bottom-color: rgba(0,0,0,0.2);` : '';

    grid.innerHTML += `
      <div class="day-btn ${hasDataClass} ${isSelected}" style="${bgStyle}" onclick="selectDate('${dateStr}')">
        ${d}
      </div>`;
  }

  updateDailyLogs(selectedDateString);
}

function selectDate(dateStr) {
  selectedDateString = dateStr;
  updateDailyLogs(dateStr);
  renderCalendar();
}

function updateDailyLogs(dateStr) {
  const list = document.getElementById('daily-logs-list');
  const localD = parseLocalDateString(dateStr);

  document.getElementById('selected-date-label').innerText = `Logs for ${localD.toLocaleDateString('default', {month:'short', day:'numeric'})}`;

  const dayLogs = entries.filter(e => e.date === dateStr);

  if (!dayLogs.length) {
    list.innerHTML = `
      <div style="text-align:center; padding: 20px;">
        <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f63e.svg" alt="Cat Mascot" style="width: 100px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
        <p style="color: #AFB0B3; font-weight:900; font-size: 18px; margin-top: 15px;">I'm waiting for your log.</p>
      </div>`;
    return;
  }

  list.innerHTML = dayLogs.map(entry => {
    const time = new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return `
      <div class="card">
        <div class="card-header">
          <span style="display:flex; align-items:center; gap:5px;"><i class="ph-duotone ph-clock"></i> ${time}</span>
          <span class="mood-badge" style="background:${colors[entry.mood]}">Mood: ${entry.mood}</span>
        </div>
        <p style="font-weight:800; margin-bottom:5px; margin-top:0;">What happened:</p>
        <p style="margin-top:0; color:#666;">${entry.happened}</p>
        <p style="font-weight:800; margin-bottom:5px;">Why:</p>
        <p style="margin-top:0; color:#666;">${entry.why}</p>
      </div>
    `;
  }).join('');
}

// ---------- STATS ----------
function updateStats() {
  const container = document.getElementById('visual-stats');
  container.innerHTML = '';

  if (!entries.length) {
    container.innerHTML = `<p style="text-align:center; color: #AFB0B3; font-weight:800;">Log moods to see your data!</p>`;
    return;
  }

  let counts = { low: 0, med: 0, high: 0 };
  entries.forEach(e => {
    if (e.mood <= 3) counts.low++;
    else if (e.mood <= 7) counts.med++;
    else counts.high++;
  });

  const total = entries.length;

  const rows = [
    { label: 'Low', count: counts.low, color: '#FF4B4B' },
    { label: 'Med', count: counts.med, color: '#FFC800' },
    { label: 'High', count: counts.high, color: '#58CC02' }
  ];

  rows.forEach(r => {
    const width = (r.count / total) * 100;
    container.innerHTML += `
      <div class="stat-row">
        <div class="stat-label">${r.label}</div>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" style="width:${width}%; background:${r.color};"></div>
        </div>
        <div style="font-weight:900; width: 30px; text-align:right;">${r.count}</div>
      </div>
    `;
  });
}

// ---------- STREAK ----------
function updateStreak() {
  if (!entries.length) {
    document.getElementById('streak-count').innerText = 0;
    return;
  }

  const uniqueDates = [...new Set(entries.map(e => e.date))].sort().reverse();
  const today = getLocalDateString(new Date());
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    document.getElementById('streak-count').innerText = 0;
    return;
  }

  let streak = 0;
  let cursor = uniqueDates[0] === yesterday ? new Date(Date.now() - 86400000) : new Date();

  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = getLocalDateString(cursor);
    if (uniqueDates[i] === expected) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  document.getElementById('streak-count').innerText = streak;
}

// ---------- SETTINGS ----------
function openSettings() {
  document.getElementById('settings-modal').classList.add('active');
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('active');
}

function clearData() {
  if (confirm("Are you absolutely sure? This will delete all your mood logs permanently!")) {
    entries = [];
    localStorage.removeItem('moodEntries');
    closeSettings();
    init();
  }
}

function exportData() {
  if (!entries.length) return alert("You don't have any data to export yet!");
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
  const link = document.createElement('a');
  link.setAttribute("href", dataStr);
  link.setAttribute("download", "mood-tracker-data.json");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function updateProfile() {
  document.getElementById('total-logs').innerText = entries.length;
}
