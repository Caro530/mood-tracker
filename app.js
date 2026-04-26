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

// Initialize
updateStreak();
renderCalendar();
updateStats();

// --- HELPERS ---
// Safely format Date object to YYYY-MM-DD in LOCAL time
function getLocalDateString(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// Safely parse YYYY-MM-DD back to a Date object in LOCAL time
function parseLocalDateString(dateStr) {
  const parts = dateStr.split('-');
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// --- TABS ---
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
  } else if (tab === 'profile') {
    document.getElementById('total-logs').innerText = entries.length;
  }
}

// --- WIZARD ---
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

  const localDateStr = getLocalDateString(new Date());

  entries.push({
    id: Date.now(),
    date: localDateStr, 
    timestamp: new Date().getTime(),
    mood: currentMood, happened, why
  });

  localStorage.setItem('moodEntries', JSON.stringify(entries));
  
  // Reset Form
  currentMood = null;
  document.getElementById('happened').value = '';
  document.getElementById('why').value = '';
  
  // PROACTIVE FIX: Force calendar back to TODAY to immediately show new log
  selectedDateString = localDateStr;
  currentDate = new Date(); // Reset calendar view to current month
  
  updateStreak();
  switchTab('calendar');
}

// --- CALENDAR ---
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
  
  for(let i=0; i<firstDay; i++) grid.innerHTML += `<div></div>`;
  
  for(let d=1; d<=daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayLogs = entries.filter(e => e.date === dateStr);
    
    let avg = 0;
    if (dayLogs.length > 0) {
      const sum = dayLogs.reduce((a, b) => a + parseInt(b.mood), 0);
      avg = Math.round(sum / dayLogs.length);
    }

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
  renderCalendar(); 
}

function updateDailyLogs(dateStr) {
  const list = document.getElementById('daily-logs-list');
  const localD = parseLocalDateString(dateStr);
  
  document.getElementById('selected-date-label').innerText = `Logs for ${localD.toLocaleDateString('default', {month:'short', day:'numeric'})}`;
  
  const dayLogs = entries.filter(e => e.date === dateStr);
  
  if (dayLogs.length === 0) {
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

// --- STATS ---
function updateStats() {
  const container = document.getElementById('visual-stats');
  container.innerHTML = '';
  
  if(entries.length === 0) {
    container.innerHTML = `<p style="text-align:center; color: #AFB0B3; font-weight:800;">Log moods to see your data!</p>`;
    return;
  }

  let counts = { 'Low (1-3)': 0, 'Med (4-7)': 0, 'High (8-10)': 0 };
  let colorsMap = { 'Low (1-3)': '#FF4B4B', 'Med (4-7)': '#FFC800', 'High (8-10)': '#58CC02' };
  
  entries.forEach(e => {
    if(e.mood <= 3) counts['Low (1-3)']++;
    else if(e.mood <= 7) counts['Med (4-7)']++;
    else counts['High (8-10)']++;
  });

  const max = Math.max(...Object.values(counts));

  for (let [label, count] of Object.entries(counts)) {
    const width = max === 0 ? 0 : (count / entries.length) * 100;
    container.innerHTML += `
      <div class="stat-row">
        <div class="stat-label">${label.split(' ')[0]}</div>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" style="width: ${width}%; background: ${colorsMap[label]};"></div>
        </div>
        <div style="font-weight:900; width: 30px; text-align:right;">${count}</div>
      </div>
    `;
  }
}

// --- BULLETPROOF STREAK LOGIC ---
function updateStreak() {
  if (entries.length === 0) {
    document.getElementById('streak-count').innerText = 0;
    return;
  }
  
  // Get unique dates sorted newest to oldest
  const uniqueDates = [...new Set(entries.map(e => e.date))].sort().reverse();
  
  const todayDate = new Date();
  const todayStr = getLocalDateString(todayDate);
  
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  // If most recent log is not today OR yesterday, streak is broken.
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    document.getElementById('streak-count').innerText = 0;
    return;
  }

  let streak = 0;
  let checkDate = new Date();
  
  // If first log is yesterday, start counting backwards from yesterday
  if (uniqueDates[0] === yesterdayStr) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedStr = getLocalDateString(checkDate);
    if (uniqueDates[i] === expectedStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1); // Step back 1 day
    } else {
      break; // Streak broken
    }
  }
  
  document.getElementById('streak-count').innerText = streak;
}

// --- SETTINGS MENU ---
function openSettings() {
  document.getElementById('settings-modal').classList.add('active');
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('active');
}

function clearData() {
  if(confirm("Are you absolutely sure? This will delete all your mood logs permanently!")) {
    entries = [];
    localStorage.removeItem('moodEntries');
    closeSettings();
    updateStreak();
    renderCalendar();
    updateStats();
    document.getElementById('total-logs').innerText = 0;
  }
}

function exportData() {
  if (entries.length === 0) return alert("You don't have any data to export yet!");
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", "mood-tracker-data.json");
  document.body.appendChild(downloadAnchorNode); 
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
