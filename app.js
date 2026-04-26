// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

let entries = JSON.parse(localStorage.getItem('moodEntries')) || [];
let currentMood = null;

// Initial render
renderHistory();

// Switch between History and Log tabs
function switchTab(tab) {
  document.getElementById('history-tab').classList.add('hidden');
  document.getElementById('form-tab').classList.add('hidden');
  
  document.getElementById('nav-history').classList.remove('active');
  document.getElementById('nav-log').classList.remove('active');

  if (tab === 'history') {
    document.getElementById('history-tab').classList.remove('hidden');
    document.getElementById('nav-history').classList.add('active');
    renderHistory();
  } else {
    document.getElementById('form-tab').classList.remove('hidden');
    document.getElementById('nav-log').classList.add('active');
    nextStep(1); // Reset to first step when opening Log
  }
}

// Wizard Step Navigation
function nextStep(stepNumber) {
  document.getElementById('step-1').classList.add('hidden');
  document.getElementById('step-2').classList.add('hidden');
  document.getElementById('step-3').classList.add('hidden');
  
  document.getElementById(`step-${stepNumber}`).classList.remove('hidden');
}

// Step 1: Select Mood
function selectMood(moodValue) {
  currentMood = moodValue;
  nextStep(2); // Automatically go to Step 2
}

// Final Step: Save
function saveEntry() {
  const happened = document.getElementById('happened').value.trim();
  const why = document.getElementById('why').value.trim();
  
  if (!happened || !why) {
    alert("Please fill out both text boxes!");
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
  
  // Clear form
  currentMood = null;
  document.getElementById('happened').value = '';
  document.getElementById('why').value = '';

  // Go back to History
  switchTab('history');
}

// Render the History View
function renderHistory() {
  const list = document.getElementById('entries-list');
  list.innerHTML = '';
  
  if (entries.length === 0) {
    list.innerHTML = `<p style="text-align:center; color:#6B7280; margin-top:50px;">No entries yet. Tap 'Log Mood' to start!</p>`;
    document.getElementById('summary-view').classList.add('hidden');
    return;
  }

  document.getElementById('summary-view').classList.remove('hidden');
  
  let totalMood = 0;
  
  // Reverse array to show newest first
  [...entries].reverse().forEach(entry => {
    totalMood += parseInt(entry.mood);
    const dateObj = new Date(entry.date);
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = dateObj.toLocaleDateString();

    list.innerHTML += `
      <div class="card">
        <div class="card-header">
          <span>${dateStr} at ${timeStr}</span>
          <span class="mood-badge">Mood: ${entry.mood}/10</span>
        </div>
        <p><strong>What happened:</strong><br>${entry.happened}</p>
        <p style="margin-top: 10px;"><strong>Why:</strong><br>${entry.why}</p>
      </div>
    `;
  });

  const avgMood = (totalMood / entries.length).toFixed(1);
  document.getElementById('summary-view').innerHTML = `
    <h3 style="margin-top:0">Weekly Summary</h3>
    <p>Total Check-ins: <strong>${entries.length}</strong></p>
    <p>Average Mood: <strong>${avgMood} / 10</strong></p>
  `;
}
