// counter-server.js — MoonHub Time Counter (Node >= 20)
// - Time counter since 3:52 PM with MoonHub styling
// - Same design language as main server.js
// - Real-time updates via polling

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
}
</style>
`;

// ===== time calculation functions =====
function getStartTime() {
  const now = new Date();
  const startTime = new Date(now);
  startTime.setHours(15, 52, 0, 0); // 3:52 PM
  
  // Always use today's 3:52 PM, even if we're past it
  // This ensures we're counting from 3:52 PM today
  return startTime;
}

function getTimeElapsed() {
  const now = new Date();
  
  // Get current time in Chicago timezone
  const chicagoNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  
  // Create 3:52 PM Chicago time for today
  const chicagoStart = new Date(chicagoNow);
  chicagoStart.setHours(15, 52, 0, 0); // 3:52 PM Chicago time
  
  // If current Chicago time is before 3:52 PM, use yesterday
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
  startTime.setHours(15, 52, 0, 0);
  
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
${baseHead}
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
      <div class="pill">Since: <strong>3:52 PM</strong></div>
      <div class="pill badge">Live</div>
    </div>

    <div class="hr"></div>

    <div class="counter" id="counter">
      <div class="time-unit">
        <div class="time-value" id="days">00</div>
        <div class="time-label">Days</div>
      </div>
      <div class="time-unit">
        <div class="time-value" id="hours">00</div>
        <div class="time-label">Hours</div>
      </div>
      <div class="time-unit">
        <div class="time-value" id="minutes">00</div>
        <div class="time-label">Minutes</div>
      </div>
      <div class="time-unit">
        <div class="time-value" id="seconds">00</div>
        <div class="time-label">Seconds</div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
      <div class="help">Time elapsed since downtime</div>
      <a href="https://zenith.win/" target="_blank" rel="noopener" style="color: var(--primary); text-decoration: none; font-size: 13px;">
        zenith.win ↗
      </a>
    </div>
  </main>

<script>
let counterStopped = false;

async function updateCounter() {
  if (counterStopped) {
    // Counter is stopped, don't update
    return;
  }
  
  try {
    const response = await fetch('/api/time');
    const data = await response.json();
    
    if (data.ok) {
      document.getElementById('days').textContent = data.time.days;
      document.getElementById('hours').textContent = data.time.hours;
      document.getElementById('minutes').textContent = data.time.minutes;
      document.getElementById('seconds').textContent = data.time.seconds;
      
      // Check if counter should be stopped
      if (data.stopped && !counterStopped) {
        counterStopped = true;
        console.log('Counter stopped - site is back up!');
        // You could add visual indication here if needed
      }
    }
  } catch (error) {
    console.error('Failed to update counter:', error);
  }
}

// Initial update
updateCounter();
// Update every second
setInterval(updateCounter, 1000);

// Particle animation
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  const particleCount = 15;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
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

// Start particles when page loads
createParticles();
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
    console.log(`[zenith-monitor] Error checking site: ${error.message}`);
    return "down";
  }
}

// Monitor zenith.win every minute
setInterval(async () => {
  try {
    const currentStatus = await checkZenithStatus();
    if (currentStatus !== lastStatus) {
      console.log(`[zenith-monitor] Status changed: ${lastStatus} -> ${currentStatus}`);
      
      if (currentStatus === "down" && lastStatus === "up") {
        // Site just went down - record the time
        downtimeStart = new Date();
        counterStopped = false;
        console.log(`[zenith-monitor] Site went down at: ${downtimeStart.toLocaleString()}`);
      } else if (currentStatus === "up" && lastStatus === "down") {
        // Site came back up - stop the counter
        console.log(`[zenith-monitor] Site is back up! Stopping counter.`);
        counterStopped = true;
        downtimeStart = null;
      }
      
      lastStatus = currentStatus;
    }
  } catch (error) {
    console.log(`[zenith-monitor] Error: ${error.message}`);
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
  console.log("Time elapsed since 3:52 PM:", `${time.hours}h ${time.minutes}m ${time.seconds}s`);
});
