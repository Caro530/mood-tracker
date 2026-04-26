if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

let entries = JSON.parse(localStorage.getItem('moodEntries')) || [];
let currentMood = null;

let currentDate = new Date();
let selectedDateString = new Date().toISOString().split('T')[0];

const colors = {
  1: "#FF4B4B", 2: "#FF6B3B", 3: "#FF8B2B", 4: "#FFAA1B", 5: "#FFC800",
  6: "#E1D700", 7: "#C4E500", 8: "#A6F300", 9: "#7CE000", 10: "#58CC02"
};

updateStreak();
renderCalendar();
updateStats();

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
  
  if (!happened || !why) return alert("Fill in the text boxes!");

  const now = new Date();
  const localDateString = now.getFullYear() + '-' + 
    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
    String(now.getDate()).padStart(2, '0');

  entries.push({
    id: Date.now(),
    date: localDateString, 
    timestamp: now.getTime(),
    mood: currentMood, happened, why
  });

  localStorage.setItem('moodEntries', JSON.stringify(entries));
  
  currentMood = null;
  document.getElementById('happened').value = '';
  document.getElementById('why').value = '';
  
  updateStreak();
  switchTab('calendar');
}

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
  const d = new Date(dateStr);
  const localD = new Date(d.getTime() + Math.abs(d.getTimezoneOffset()*60000));
  
  document.getElementById('selected-date-label').innerText = `Logs for ${localD.toLocaleDateString('default', {month:'short', day:'numeric'})}`;
  
  const dayLogs = entries.filter(e => e.date === dateStr);
  
  if (dayLogs.length === 0) {
    // USING THE ANGRY MASCOT FOR EMPTY STATE
    list.innerHTML = `
      <div style="text-align:center; padding: 20px;">
        <img src="mascot-angry.png" alt="Angry Mascot" style="width: 120px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
        <p style="color: #AFB0B3; font-weight:900; font-size: 18px; margin-top: 10px;">I'm waiting for your log!</p>
      </div>`;
    return;
  }

  list.innerHTML = dayLogs.map(entry => {
    const time = new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return `
      <div class="card">
        <div class="card-header">
          <span>${time}</span>
          <span class="mood-badge" style="background:${colors[entry.mood]}">${entry.mood} / 10</span>
        </div>
        <p style="font-weight:800; margin-bottom:5px; margin-top:0;">What happened:</p>
        <p style="margin-top:0; color:#666;">${entry.happened}</p>
        <p style="font-weight:800; margin-bottom:5px;">Why:</p>
        <p style="margin-top:0; color:#666;">${entry.why}</p>
      </div>
    `;
  }).join('');
}

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

function updateStreak() {
  if (entries.length === 0) return;
  const uniqueDates = [...new Set(entries.map(e => e.date))].sort().reverse();
  let streak = 0;
  let checkDate = new Date();
  
  for (let i = 0; i < uniqueDates.length; i++) {
    const dStr = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkDate.getDate()).padStart(2, '0');
    if (uniqueDates.includes(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      if (i === 0) {
         checkDate.setDate(checkDate.getDate() - 1);
         const yStr = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkDate.getDate()).padStart(2, '0');
         if (uniqueDates.includes(yStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
         }
      }
      break;
    }
  }
  document.getElementById('streak-count').innerText = streak;
}
