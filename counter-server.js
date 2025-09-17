import express from "express";

const app = express();
app.use(express.json({ limit: "256kb" }));

// ===== CORS (allow script HTTP calls) =====
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// ===== shared UI head (same as server.js) =====
const baseHead = `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Zenith Time Counter</title>
<style>
:root{
  --bg:#0b0d10; --fg:#e7e9ee; --muted:#9aa3b2; --card:#11141a; --stroke:#1a1f28;
  --primary:#4c8bf5; --primary-2:#6ea0ff; --ok:#85f089; --warn:#ffd36a;
}
@media (prefers-color-scheme: light){
  :root{ --bg:#f6f7fb; --fg:#0b0d10; --muted:#50607a; --card:#ffffff; --stroke:#e9edf4; --primary:#2e6cf3; --primary-2:#4a82ff; --ok:#0aa84f; --warn:#b77600; }
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0; background: radial-gradient(1200px 600px at 20% -10%, rgba(76,139,245,.12), transparent 60%),
                      radial-gradient(1200px 800px at 120% 20%, rgba(133,240,137,.10), transparent 55%),
                      var(--bg);
  color:var(--fg); font: 16px/1.45 system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji";
  display:grid; place-items:center; padding:24px; position:relative; overflow:hidden;
}
.particles{
  position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1;
}
.particle{
  position:absolute; background:rgba(76,139,245,.3); border-radius:50%; animation:float linear infinite;
}
@keyframes float{
  0%{ transform:translate(0, 100vh) rotate(0deg); opacity:0; }
  10%{ opacity:1; }
  90%{ opacity:1; }
  100%{ transform:translate(0, -100px) rotate(360deg); opacity:0; }
}
.card{
  width:min(720px, 92vw); background:color-mix(in lch, var(--card) 90%, transparent);
  border:1px solid var(--stroke); border-radius:16px; padding:22px 20px; backdrop-filter: blur(6px);
  box-shadow: 0 6px 24px rgba(0,0,0,.25);
}
.hdr{display:flex; align-items:center; gap:12px; margin-bottom:14px}
.logo{
  width:36px;height:36px;border-radius:10px;display:grid;place-items:center;
  background:linear-gradient(135deg,var(--primary),var(--primary-2)); color:#fff; font-weight:700;
}
.h1{font-size:18px; font-weight:650}
.row{display:flex; align-items:center; gap:10px; flex-wrap:wrap}
.pill{border:1px solid var(--stroke); background:rgba(255,255,255,.03); padding:6px 10px; border-radius:999px; color:var(--muted); font-size:13px}
.hr{height:1px; background:var(--stroke); margin:16px 0}
.help{color:var(--muted); font-size:13px}
.center{display:flex; gap:12px; justify-content:center; align-items:center; flex-wrap:wrap}
.counter{
  display:flex; gap:12px; justify-content:center; align-items:center; flex-wrap:wrap; margin:20px 0;
}
.time-unit{
  background:var(--card); border:1px solid var(--stroke); border-radius:12px; padding:16px 12px;
  text-align:center; min-width:80px;
}
.time-value{
  font-size:24px; font-weight:700; color:var(--primary); font-family: ui-monospace, Menlo, Consolas, monospace;
}
.time-label{
  font-size:12px; color:var(--muted); margin-top:4px;
}
.badge{color:var(--ok); font-weight:600}
@media (max-width: 600px) {
  .time-unit{ min-width:60px; padding:12px 8px; }
  .time-value{ font-size:20px; }
  .card{ padding:16px 12px; }
  .hdr{ margin-bottom:12px; }
  .counter{ gap:8px; margin:16px 0; }
}
@media (max-width: 400px) {
  .time-unit{ min-width:50px; padding:10px 6px; }
  .time-value{ font-size:18px; }
  .time-label{ font-size:11px; }
}
.offline-indicator{
  background:var(--warn); color:var(--bg); padding:4px 8px; border-radius:999px; 
  font-size:12px; font-weight:600; margin-left:8px;
}
.connection-status{
  display:flex; align-items:center; gap:8px; margin-top:8px; font-size:12px;
}
.status-dot{
  width:8px; height:8px; border-radius:50%; background:var(--ok);
}
.status-dot.offline{ background:var(--warn); }
.status-dot.error{ background:#ff6b6b; }
.sr-only{
  position:absolute; width:1px; height:1px; padding:0; margin:-1px; 
  overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
}
.keyboard-navigation *:focus{
  outline:2px solid var(--primary); outline-offset:2px;
}
@media (prefers-reduced-motion: reduce) {
  .particle{ animation:none; }
  *{ animation-duration:0.01ms !important; animation-iteration-count:1 !important; }
}
</style>
`;

// ===== time calculation functions =====
function getStartTime() {
  const now = new Date();
  const startTime = new Date(now);
  startTime.setHours(16, 22, 0, 0); // 4:22 PM
  
  // Always use today's 4:22 PM, even if we're past it
  // This ensures we're counting from 4:22 PM today
  return startTime;
}

function getTimeElapsed() {
  const now = new Date();
  
  // Get current time in Chicago timezone
  const chicagoNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  
  // Create 4:22 PM Chicago time for today
  const chicagoStart = new Date(chicagoNow);
  chicagoStart.setHours(16, 22, 0, 0); // 4:22 PM Chicago time
  
  // If current Chicago time is before 4:22 PM, use yesterday
  if (chicagoNow < chicagoStart) {
    chicagoStart.setDate(chicagoStart.getDate() - 1);
  }
  
  // Calculate the difference in Chicago time
  const timeDiff = chicagoNow - chicagoStart;
  if (timeDiff < 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  // Calculate days, hours, minutes, seconds
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

// ===== core endpoints =====
app.get("/health", (_req, res) => res.json({ ok: true }));

// API endpoint to get current time elapsed
app.get("/api/time", (req, res) => {
  const time = getTimeElapsed();
  const now = new Date();
  const startTime = new Date(now);
  startTime.setHours(16, 22, 0, 0);
  
  res.json({ 
    ok: true, 
    time: {
      days: time.days.toString().padStart(2, '0'),
      hours: time.hours.toString().padStart(2, '0'),
      minutes: time.minutes.toString().padStart(2, '0'),
      seconds: time.seconds.toString().padStart(2, '0')
    },
    stopped: counterStopped,
    debug: {
      currentTime: now.toLocaleTimeString(),
      startTime: startTime.toLocaleTimeString(),
      timeDiffMs: now - startTime,
      timeDiffHours: (now - startTime) / (1000 * 60 * 60)
    }
  });
});

// Main counter page
app.get("/", (req, res) => {
  res
    .type("html")
    .send(`<!doctype html>
` + baseHead + `
<body>
  <div class="particles" id="particles"></div>
  <main class="card" style="position:relative; z-index:2;">
    <div class="hdr">
      <div class="logo">
        <img src="https://getzenith.org/wp-content/uploads/2025/03/logo-150x150.png" alt="Zenith Logo" style="width: 24px; height: 24px;">
      </div>
      <div class="h1">Zenith · Down Counter</div>
    </div>

    <div class="row">
      <div class="pill">Since: <strong>4:22 PM</strong></div>
      <div class="pill badge" id="status-badge">Live</div>
      <div class="offline-indicator" id="offline-indicator" style="display:none;">Offline</div>
    </div>

    <div class="hr"></div>

    <div class="counter" id="counter" role="timer" aria-live="polite" aria-label="Downtime counter">
      <div class="time-unit">
        <div class="time-value" id="days" aria-label="Days">00</div>
        <div class="time-label">Days</div>
      </div>
      <div class="time-unit">
        <div class="time-value" id="hours" aria-label="Hours">00</div>
        <div class="time-label">Hours</div>
      </div>
      <div class="time-unit">
        <div class="time-value" id="minutes" aria-label="Minutes">00</div>
        <div class="time-label">Minutes</div>
      </div>
      <div class="time-unit">
        <div class="time-value" id="seconds" aria-label="Seconds">00</div>
        <div class="time-label">Seconds</div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
      <div class="help">Time elapsed since downtime</div>
      <a href="https://zenith.win/" target="_blank" rel="noopener" style="color: var(--primary); text-decoration: none; font-size: 13px;" aria-label="Visit zenith.win website">
        zenith.win ↗
      </a>
    </div>
    
    <div class="connection-status" id="connection-status">
      <div class="status-dot" id="status-dot"></div>
      <span id="connection-text">Connected</span>
    </div>
  </main>

<script>
// Enhanced UX State Management
let counterStopped = false;
let isOnline = navigator.onLine;
let lastUpdateTime = null;
let cachedData = null;
let retryCount = 0;
let maxRetries = 3;
let updateInterval = null;

// Connection status elements
const statusDot = document.getElementById('status-dot');
const connectionText = document.getElementById('connection-text');
const offlineIndicator = document.getElementById('offline-indicator');
const statusBadge = document.getElementById('status-badge');

// Update connection status UI
function updateConnectionStatus(online, error = false) {
  const wasOnline = isOnline;
  isOnline = online;
  
  if (online && !error) {
    statusDot.className = 'status-dot';
    connectionText.textContent = 'Connected';
    offlineIndicator.style.display = 'none';
    statusBadge.textContent = 'Live';
    statusBadge.className = 'pill badge';
    
    if (!wasOnline) {
      announceToScreenReader('Connection restored. Counter is now live.');
    }
  } else if (error) {
    statusDot.className = 'status-dot error';
    connectionText.textContent = 'Connection Error';
    offlineIndicator.style.display = 'inline-block';
    offlineIndicator.textContent = 'Error';
    statusBadge.textContent = 'Error';
    statusBadge.className = 'pill';
    
    if (wasOnline) {
      announceToScreenReader('Connection error. Using cached data.');
    }
  } else {
    statusDot.className = 'status-dot offline';
    connectionText.textContent = 'Offline';
    offlineIndicator.style.display = 'inline-block';
    offlineIndicator.textContent = 'Offline';
    statusBadge.textContent = 'Offline';
    statusBadge.className = 'pill';
    
    if (wasOnline) {
      announceToScreenReader('Connection lost. Displaying cached data.');
    }
  }
}

// Update counter display with accessibility
function updateCounterDisplay(data) {
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  
  daysEl.textContent = data.time.days;
  hoursEl.textContent = data.time.hours;
  minutesEl.textContent = data.time.minutes;
  secondsEl.textContent = data.time.seconds;
  
  // Update accessibility labels
  const timeString = data.time.days + ' days, ' + data.time.hours + ' hours, ' + data.time.minutes + ' minutes, ' + data.time.seconds + ' seconds';
  document.getElementById('counter').setAttribute('aria-label', 'Downtime counter: ' + timeString);
  
  // Cache the data for offline use
  cachedData = {
    ...data,
    timestamp: Date.now()
  };
  
  lastUpdateTime = Date.now();
}

// Enhanced counter update with offline support
async function updateCounter() {
  if (counterStopped) {
    return;
  }
  
  // If offline, use cached data if available
  if (!isOnline && cachedData) {
    const timeSinceCache = Date.now() - cachedData.timestamp;
    if (timeSinceCache < 60000) { // Use cache if less than 1 minute old
      updateConnectionStatus(false);
      return;
    }
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch('/api/time', {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    
    const data = await response.json();
    
    if (data.ok) {
      updateCounterDisplay(data);
      updateConnectionStatus(true);
      retryCount = 0; // Reset retry count on success
      
      // Check if counter should be stopped
      if (data.stopped && !counterStopped) {
        counterStopped = true;
        console.log('Counter stopped - site is back up!');
        statusBadge.textContent = 'Back Online';
        statusBadge.className = 'pill badge';
        clearInterval(updateInterval);
      }
    } else {
      throw new Error('Invalid response data');
    }
  } catch (error) {
    console.error('Failed to update counter:', error);
    
    // Use cached data if available
    if (cachedData) {
      updateCounterDisplay(cachedData);
      updateConnectionStatus(false);
    } else {
      updateConnectionStatus(false, true);
    }
    
    // Implement exponential backoff for retries
    retryCount++;
    if (retryCount <= maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
      setTimeout(() => {
        if (!counterStopped) {
          updateCounter();
        }
      }, delay);
    }
  }
}

// Network event listeners
window.addEventListener('online', () => {
  console.log('Network connection restored');
  updateConnectionStatus(true);
  retryCount = 0;
  updateCounter();
});

window.addEventListener('offline', () => {
  console.log('Network connection lost');
  updateConnectionStatus(false);
});

// Keyboard navigation support
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      updateCounter();
    }
  }
});

// Initial update
updateCounter();

// Update every second with error handling
updateInterval = setInterval(() => {
  if (!counterStopped) {
    updateCounter();
  }
}, 1000);

// Screen reader announcements
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.className = 'sr-only';
  announcement.setAttribute('aria-live', 'polite');
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Enhanced particle animation with reduced motion support
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  
  // Respect user's motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // Skip particles for users who prefer reduced motion
  }
  
  const particleCount = 15;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.setAttribute('aria-hidden', 'true'); // Hide from screen readers
    
    // Random properties
    const size = Math.random() * 4 + 2; // 2-6px
    const x = Math.random() * 100; // 0-100vw
    const duration = Math.random() * 20 + 10; // 10-30s
    const delay = Math.random() * -20; // -20 to 0s
    
    particle.style.cssText = \`
      --size: \${size}px;
      --x: \${x}vw;
      --duration: \${duration}s;
      --delay: \${delay}s;
      width: var(--size);
      height: var(--size);
      left: var(--x);
      animation-duration: var(--duration);
      animation-delay: var(--delay);
    \`;
    
    particlesContainer.appendChild(particle);
  }
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  
  // Add focus management for keyboard users
  document.body.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });
  
  document.body.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });
  
  // Announce initial status
  announceToScreenReader('Downtime counter loaded. Time elapsed since 4:22 PM is being tracked.');
});
</script>
</body>`);
});

// ===== site monitoring =====
const ZENITH_URL = "https://zenith.win/";
let lastStatus = null;
let downtimeStart = null;
let counterStopped = false;
const statusPattern = /status-indicator\s+status-(down|up)/i;

async function checkZenithStatus() {
  try {
    const res = await fetch(ZENITH_URL, { timeout: 15000 });
    const html = await res.text();
    const match = html.match(statusPattern);
    return match ? match[1].toLowerCase() : "unknown";
  } catch (error) {
    console.log('[zenith-monitor] Error checking site: ' + error.message);
    return "down";
  }
}

// Monitor zenith.win every minute
setInterval(async () => {
  try {
    const currentStatus = await checkZenithStatus();
    if (currentStatus !== lastStatus) {
      console.log('[zenith-monitor] Status changed: ' + lastStatus + ' -> ' + currentStatus);
      
      if (currentStatus === "down" && lastStatus === "up") {
        // Site just went down - record the time
        downtimeStart = new Date();
        counterStopped = false;
        console.log('[zenith-monitor] Site went down at: ' + downtimeStart.toLocaleString());
      } else if (currentStatus === "up" && lastStatus === "down") {
        // Site came back up - stop the counter
        console.log(`[zenith-monitor] Site is back up! Stopping counter.`);
        counterStopped = true;
        downtimeStart = null;
      }
      
      lastStatus = currentStatus;
    }
  } catch (error) {
    console.log('[zenith-monitor] Error: ' + error.message);
  }
}, 30000); // Check every 30 seconds

// ===== start =====
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Time counter server listening on port", PORT);
  console.log("Zenith monitoring started - checking every 30 seconds");
  
  // Test the time calculation
  const time = getTimeElapsed();
  const now = new Date();
  console.log("Current time:", now.toLocaleTimeString());
  console.log("Time elapsed since 4:22 PM:", `${time.hours}h ${time.minutes}m ${time.seconds}s`);
});
