// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// Splash Screen Logic
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    splash.style.opacity = '0';
    setTimeout(() => splash.style.display = 'none', 500);
  }, 1200); // Show splash for 1.2 seconds for dramatic effect
});

let entries = JSON.parse(localStorage.getItem('moodEntries')) || [];
let currentMood = null;

renderHistory();

function switchTab(tab) {
  document.getElementById('history-tab').classList.add('hidden');
  document.getElementById('form-tab').classList.add('hidden');
  document.getElementById('nav-history').classList.remove('active');
  document.getElementById('nav-log').classList.remove('active');
  
  // Hide progress bar on history tab
  document.getElementById('progress-container').style.visibility = (tab === 'history') ? 'hidden' : 'visible';

  if (tab === 'history') {
    document.getElementById('history-tab').classList.remove('hidden');
    document.getElementById('nav-history').classList.add('active');
    renderHistory();
  } else {
    document.getElementById('form-tab').classList.remove('hidden');
    document.getElementById('nav-log').classList.add('active');
    nextStep(1); 
  }
}

function nextStep(stepNumber) {
  document.getElementById('step-1').classList.add('hidden');
  document.getElementById('step-2').classList.add('hidden');
  document.getElementById('step-3').classList.add('hidden');
  
  // Re-trigger CSS animation
  const nextScreen = document.getElementById(`step-${stepNumber}`);
  nextScreen.classList.remove('hidden');
  nextScreen.style.animation = 'none';
  nextScreen.offsetHeight; /* trigger reflow */
  nextScreen.style.animation = null;

  // Update Duolingo Progress Bar
  const progress = (stepNumber / 3) * 100;
  document.getElementById('progress-bar').style.width = `${progress}%`;
}

function selectMood(moodValue) {
  currentMood = moodValue;
  // Small delay so user sees the button press animation
  setTimeout(() => nextStep(2), 200);
}

function saveEntry() {
  const happened = document.getElementById('happened').value.trim();
  const why = document.getElementById('why').value.trim();
  
  if (!happened || !why) {
    alert("Don't leave the boxes empty!");
    return;
  }

  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    mood: currentMood, 
    happened, 
    why
  };

  entries.push(entry);
  localStorage.setItem('moodEntries', JSON.stringify(entries));
  
  // Reset Form
  currentMood = null;
  document.getElementById('happened').value = '';
  document.getElementById('why').value = '';

  // Show Success Animation
  const successScreen = document.getElementById('success-screen');
  successScreen.classList.remove('hidden');
  
  setTimeout(() => {
    successScreen.classList.add('hidden');
    switchTab('history');
  }, 1500); // Show "Great Job!" for 1.5 seconds
}

function renderHistory() {
  const list = document.getElementById('entries-list');
  const summary = document.getElementById('summary-view');
  list.innerHTML = '';
  
  if (entries.length === 0) {
    list.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color:#AFAFAF; font-weight:800; font-size:18px;">
        <img src="icon.png" style="width:80px; opacity:0.5; margin-bottom:20px; filter: grayscale(100%);">
        <br>No entries yet.<br>Start tracking!
      </div>`;
    summary.classList.add('hidden');
    return;
  }

  summary.classList.remove('hidden');
  let totalMood = 0;
  
  [...entries].reverse().forEach(entry => {
    totalMood += parseInt(entry.mood);
    const dateObj = new Date(entry.date);
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

    let moodColor = "#58CC02"; // Green
    if(entry.mood <= 2) moodColor = "#FF4B4B"; // Red
    else if(entry.mood <= 4) moodColor = "#FF9600"; // Orange
    else if(entry.mood <= 6) moodColor = "#FFC800"; // Yellow

    list.innerHTML += `
      <div class="card">
        <div class="card-header">
          <span style="font-weight: 800; color: #AFAFAF; font-size:16px;">${dateStr} • ${timeStr}</span>
          <span class="mood-badge" style="background-color: ${moodColor};">Mood: ${entry.mood}</span>
        </div>
        <p style="font-weight: 800; margin-bottom:5px;">What:</p>
        <p style="color: #666; margin-top:0;">${entry.happened}</p>
        <p style="font-weight: 800; margin-bottom:5px; margin-top:15px;">Why:</p>
        <p style="color: #666; margin-top:0;">${entry.why}</p>
      </div>
    `;
  });

  const avgMood = (totalMood / entries.length).toFixed(1);
  summary.innerHTML = `
    <h3 style="margin-top:0; font-weight:900; color: var(--primary);">Overview</h3>
    <div style="display:flex; justify-content:space-between; font-weight:800; font-size:18px; color:#AFAFAF;">
      <span>Total: <span style="color:var(--text);">${entries.length}</span></span>
      <span>Avg Mood: <span style="color:var(--text);">${avgMood}</span></span>
    </div>
  `;
}
