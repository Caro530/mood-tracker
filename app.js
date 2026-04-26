// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// Request Notification Permission on load
if (Notification.permission !== 'granted') {
  Notification.requestPermission();
}

let entries = JSON.parse(localStorage.getItem('moodEntries')) || [];

function showTab(tabId) {
  document.getElementById('form-tab').classList.add('hidden');
  document.getElementById('history-tab').classList.add('hidden');
  document.getElementById(tabId).classList.remove('hidden');
  if(tabId === 'history-tab') renderHistory();
}

function saveEntry() {
  const mood = document.getElementById('mood').value;
  const happened = document.getElementById('happened').value;
  const why = document.getElementById('why').value;
  
  if (!mood || !happened || !why) return alert("Please fill all fields!");

  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    mood, 
    happened, 
    why
  };

  entries.push(entry);
  localStorage.setItem('moodEntries', JSON.stringify(entries));
  
  alert('Saved!');
  document.getElementById('mood').value = '';
  document.getElementById('happened').value = '';
  document.getElementById('why').value = '';
}

function renderHistory() {
  const list = document.getElementById('entries-list');
  list.innerHTML = '';
  
  let totalMood = 0;
  
  // Reverse to show newest first
  [...entries].reverse().forEach(entry => {
    totalMood += parseInt(entry.mood);
    const d = new Date(entry.date).toLocaleString();
    list.innerHTML += `
      <div class="card">
        <strong>${d} | Mood: ${entry.mood}/10</strong>
        <p><strong>What happened:</strong> ${entry.happened}</p>
        <p><strong>Why:</strong> ${entry.why}</p>
      </div>
    `;
  });

  const avgMood = entries.length ? (totalMood / entries.length).toFixed(1) : 0;
  document.getElementById('summary-view').innerHTML = `
    <h3>Overall Summary</h3>
    <p>Total Entries: ${entries.length}</p>
    <p>Average Mood: ${avgMood} / 10</p>
  `;
}