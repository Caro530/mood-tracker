function updateDailyLogs(dateStr) {
  const list = document.getElementById('daily-logs-list');
  const d = new Date(dateStr);
  const localD = new Date(d.getTime() + Math.abs(d.getTimezoneOffset()*60000));
  
  document.getElementById('selected-date-label').innerText = `Logs for ${localD.toLocaleDateString('default', {month:'short', day:'numeric'})}`;
  
  const dayLogs = entries.filter(e => e.date === dateStr);
  
  if (dayLogs.length === 0) {
    // USING THE ONLINE SVG CAT AS THE EMPTY STATE MASCOT
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
