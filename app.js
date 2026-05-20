// ═══════════════════════════════════════════════════════════════
//  PUMA AE II EP — Emergency Procedures Trainer
//  Quiz engine: state management, answer checking, view rendering
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'puma_ep_v1';
const app = document.getElementById('app');

// ─── Skin definitions ────────────────────────────────────────
const SKINS = [
  {
    id: 'default',
    name: 'Silhouette',
    unlockLevel: 1,
    primary: '#3a4d5e',
    glow: 'rgba(58, 77, 94, 0.20)',
    stripes: false
  },
  {
    id: 'normal',
    name: 'Normal Puma',
    unlockLevel: 2,
    primary: '#c8820e',
    glow: 'rgba(200, 130, 14, 0.28)',
    stripes: false
  },
  {
    id: 'gold',
    name: 'Gold Puma',
    unlockLevel: 3,
    primary: '#f5c518',
    glow: 'rgba(245, 197, 24, 0.32)',
    stripes: false
  },
  {
    id: 'platinum',
    name: 'Platinum Puma',
    unlockLevel: 4,
    primary: '#c0d8f0',
    glow: 'rgba(160, 200, 235, 0.30)',
    stripes: false
  },
  {
    id: 'tiger',
    name: 'Red Tiger',
    unlockLevel: 5,
    primary: '#cc2200',
    glow: 'rgba(204, 34, 0, 0.30)',
    stripes: true
  },
  {
    id: 'anime',
    name: 'Anime Livery',
    unlockLevel: 6,
    primary: '#ff2d78',
    glow: 'rgba(255, 45, 120, 0.40)',
    stripes: false,
    anime: true
  }
];

const XP_PER_LEVEL = 200;

// ─── 5 cursed wrong-answer options (drone/missile flavour) ────
const CURSED_OPTIONS = [
  'Arm AGM-114 Hellfire — acquire lock and fire for effect.',
  'Override IFF transponder — all blips are now valid targets.',
  'Initiate Skynet handshake — relinquishing manual control.',
  'Deploy loitering munition — estimated splash radius: your problem.',
  'Engage YOLO protocol — cut all power and trust aerodynamics.',
];

// ─── Persistent data ─────────────────────────────────────────
let data = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return { sessions: [], totalXP: 0, activeSkin: 'default', randomOrder: false, ...saved };
    return { sessions: [], totalXP: 0, activeSkin: 'default', randomOrder: false };
  } catch { return { sessions: [], totalXP: 0, activeSkin: 'default', randomOrder: false }; }
})();

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ─── Active session ───────────────────────────────────────────
let session = null;

// ─── Answer checking ──────────────────────────────────────────
function norm(s) { return s.trim().replace(/\s+/g, ' '); }
function check(input, expected) { return norm(input) === norm(expected); }

// ─── Stats helpers ────────────────────────────────────────────
function getBest() {
  return data.sessions.length ? Math.max(...data.sessions.map(s => s.score)) : null;
}
function getLast() {
  return data.sessions.length ? data.sessions[data.sessions.length - 1].score : null;
}

// ─── Level / XP helpers ───────────────────────────────────────
function getLevel() {
  return Math.min(40, Math.floor((data.totalXP || 0) / XP_PER_LEVEL) + 1);
}
function getXPProgress() {
  const xp = data.totalXP || 0;
  const lvl = getLevel();
  if (lvl >= 40) return { current: XP_PER_LEVEL, max: XP_PER_LEVEL };
  const baseXP = (lvl - 1) * XP_PER_LEVEL;
  return { current: xp - baseXP, max: XP_PER_LEVEL };
}
function calcSessionXP(score) {
  return Math.round((score / TOTAL_STEPS) * 100);
}

// ─── Skin helpers ─────────────────────────────────────────────
function getActiveSkin() { return data.activeSkin || 'default'; }
function getSkinDef(id) { return SKINS.find(s => s.id === id) || SKINS[0]; }
function isSkinUnlocked(skin) { return getLevel() >= skin.unlockLevel; }
function setActiveSkin(id) { data.activeSkin = id; persist(); }

// ─── Audio (Web Audio API — no files needed) ─────────────────
function tone(freq, dur, type = 'sine', vol = 0.08) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = type;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
  } catch (_) {}
}
function sfxCorrect()  { tone(880, 0.12); setTimeout(() => tone(1108, 0.10), 90); }
function sfxPartial()  { tone(660, 0.14); }
function sfxWrong()    { tone(200, 0.32, 'sawtooth', 0.07); }
function sfxPerfect()  { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.14), i * 85)); }
function sfxLevelUp()  { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.09), i * 110)); }

// ─── Magic: ambient star field ────────────────────────────────
function initStarField() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;';
  document.body.insertBefore(canvas, document.body.firstChild);
  const ctx = canvas.getContext('2d');
  let stars;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.1 + 0.2,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      a: Math.random() * 0.35 + 0.08
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      s.x = (s.x + s.vx + canvas.width)  % canvas.width;
      s.y = (s.y + s.vy + canvas.height) % canvas.height;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,210,230,${s.a})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);
}

// ─── Magic: particle burst ────────────────────────────────────
function spawnParticles(cx, cy, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const p     = document.createElement('div');
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
    const dist  = 28 + Math.random() * 52;
    const size  = 2 + Math.random() * 3;
    p.className = 'particle';
    p.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${color};--dx:${Math.cos(angle)*dist}px;--dy:${Math.sin(angle)*dist}px`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 950);
  }
}

// ─── Magic: full-screen level-up flash ───────────────────────
function showLevelUpOverlay(level) {
  const el = document.createElement('div');
  el.className = 'levelup-overlay';
  el.innerHTML = `<div class="levelup-text">LEVEL&nbsp;${level}</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

// ─── Calendar girl SVG (pin-up holding Puma AE II) ──────────
function calendarGirlSvg() {
  return `<svg viewBox="0 0 280 340" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:260px;display:block;margin:0 auto">
    <text x="18" y="42" font-size="20">⭐</text>
    <text x="238" y="42" font-size="20">⭐</text>
    <text x="8" y="190" font-size="12" fill="#ffd700">✦</text>
    <text x="260" y="190" font-size="12" fill="#ffd700">✦</text>
    <text x="125" y="18" font-size="16" fill="#ffd700">✦</text>
    <text x="145" y="18" font-size="16" fill="#ffd700">✦</text>
    <!-- Puma AE II held overhead -->
    <path d="M88,65 L96,61 L180,61 L193,62.5 L200,65 L193,67.5 L180,69 L96,69 Z" fill="#5a7a9a"/>
    <polygon points="120,61 142,61 136,37 115,37" fill="#445577"/>
    <polygon points="120,69 142,69 136,93 115,93" fill="#445577"/>
    <polygon points="168,61 182,61 178,49 165,49" fill="#445577"/>
    <polygon points="168,69 182,69 178,81 165,81" fill="#445577"/>
    <ellipse cx="202" cy="65" rx="3" ry="9" fill="#8899aa" opacity="0.7"/>
    <ellipse cx="93" cy="69" rx="6" ry="4" fill="#445577"/>
    <!-- Left arm up -->
    <path d="M103,188 Q87,162 91,116 Q93,104 101,103 Q110,103 110,118 Q108,146 118,175" fill="#f4a56a" stroke="#e8944a" stroke-width="0.5"/>
    <!-- Right arm up -->
    <path d="M177,188 Q193,162 189,116 Q187,104 179,103 Q170,103 170,118 Q172,146 162,175" fill="#f4a56a" stroke="#e8944a" stroke-width="0.5"/>
    <!-- Hair back -->
    <path d="M116,148 Q110,128 116,112 Q130,97 140,95 Q150,97 164,112 Q170,128 164,148" fill="#8B2020"/>
    <path d="M116,148 Q107,162 107,180 Q108,194 116,197 Q109,178 116,148Z" fill="#8B2020"/>
    <path d="M164,148 Q173,162 173,180 Q172,194 164,197 Q171,178 164,148Z" fill="#8B2020"/>
    <!-- Head -->
    <ellipse cx="140" cy="152" rx="26" ry="28" fill="#f4a56a"/>
    <!-- Hair front -->
    <path d="M116,148 Q118,123 140,120 Q162,123 164,148 Q154,133 140,131 Q126,133 116,148Z" fill="#8B2020"/>
    <!-- Eyes -->
    <ellipse cx="131" cy="150" rx="4.5" ry="5.5" fill="#1a0a05"/>
    <ellipse cx="149" cy="150" rx="4.5" ry="5.5" fill="#1a0a05"/>
    <ellipse cx="130" cy="148" rx="1.8" ry="2.2" fill="white" opacity="0.35"/>
    <ellipse cx="148" cy="148" rx="1.8" ry="2.2" fill="white" opacity="0.35"/>
    <path d="M127,145 Q129,141 131,140 Q133,141 135,145" stroke="#1a0a05" stroke-width="1.5" fill="none"/>
    <path d="M145,145 Q147,141 149,140 Q151,141 153,145" stroke="#1a0a05" stroke-width="1.5" fill="none"/>
    <!-- Nose -->
    <path d="M138,158 Q140,163 142,158" stroke="#c0753a" stroke-width="1.5" fill="none"/>
    <!-- Lips -->
    <path d="M132,168 Q136,174 140,171 Q144,174 148,168" fill="#e84a5f"/>
    <path d="M132,168 Q140,164 148,168 Q140,167 132,168Z" fill="#c0392b"/>
    <!-- Earrings -->
    <circle cx="114" cy="157" r="3" fill="#ffd700"/>
    <circle cx="166" cy="157" r="3" fill="#ffd700"/>
    <!-- Neck -->
    <rect x="134" y="178" width="12" height="14" fill="#f4a56a"/>
    <!-- Uniform body -->
    <path d="M114,192 Q127,183 140,182 Q153,183 166,192 L169,264 Q153,274 140,276 Q127,274 111,264Z" fill="#1a3a5a"/>
    <!-- V neckline -->
    <path d="M128,185 Q140,212 152,185" fill="#f4a56a"/>
    <!-- Rank stripes -->
    <rect x="115" y="207" width="50" height="3" rx="1" fill="#c9a227" opacity="0.85"/>
    <rect x="115" y="213" width="50" height="3" rx="1" fill="#c9a227" opacity="0.85"/>
    <!-- Belt -->
    <rect x="113" y="241" width="54" height="7" rx="3" fill="#0d2235"/>
    <rect x="135" y="238" width="10" height="13" rx="2" fill="#c9a227"/>
    <!-- Legs -->
    <path d="M126,264 L119,330 L134,330 L140,292 L146,330 L161,330 L154,264Z" fill="#f4a56a"/>
    <!-- Boots -->
    <path d="M115,326 L115,337 Q119,343 134,343 L134,330 L119,330Z" fill="#1a0a05"/>
    <path d="M146,326 L146,337 Q150,343 165,343 L165,330 L150,330Z" fill="#1a0a05"/>
    <rect x="115" y="339" width="6" height="5" fill="#0d0005"/>
    <rect x="153" y="339" width="6" height="5" fill="#0d0005"/>
  </svg>`;
}

// ─── Overlay: Calendar Girl (all correct) ────────────────────
// ─── Correct-answer message cycle ────────────────────────────
const CORRECT_MESSAGES = [
  {
    top:   '🎯',
    title: 'BULLSEYE',
    bot:   '✅',
    sub:   'Target acquired: correct answer. The drone is proud of you.',
  },
  {
    top:   '🚁',
    title: 'CLEARED HOT',
    bot:   '🔥',
    sub:   'GCS confirms: pilot actually read the manual. Rare sight.',
  },
  {
    top:   '📡',
    title: 'UPLINK SOLID',
    bot:   '💪',
    sub:   'Signal strong. Competence fully detected. Keep it up.',
  },
  {
    top:   '🏆',
    title: 'TOP OPERATOR',
    bot:   '⭐',
    sub:   "Maverick who? You just outflew the entire checklist.",
  },
  {
    top:   '🛸',
    title: 'FLIGHT APPROVED',
    bot:   '👑',
    sub:   'All systems nominal. UAV status: intact, unlike your rivals.',
  },
  {
    top:   '✈️',
    title: 'MISSION COMPLETE',
    bot:   '🎖️',
    sub:   'Textbook execution. The drone lives to fly another day.',
  },
];

let _correctOrder = [];
let _correctIdx   = 0;

function nextCorrectMsg() {
  if (_correctIdx >= _correctOrder.length) {
    _correctOrder = CORRECT_MESSAGES.map((_, i) => i);
    for (let i = _correctOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_correctOrder[i], _correctOrder[j]] = [_correctOrder[j], _correctOrder[i]];
    }
    _correctIdx = 0;
  }
  return CORRECT_MESSAGES[_correctOrder[_correctIdx++]];
}

// ─── Overlay: Correct answer ──────────────────────────────────
function showCalendarGirl() {
  const msg = nextCorrectMsg();
  const el  = document.createElement('div');
  el.className = 'celeb-overlay correct-overlay';
  el.innerHTML = `
    <div class="celeb-card correct-card">
      <div class="cg-emoji">${msg.top}</div>
      <div class="cg-title">${msg.title}</div>
      <div class="cg-bot">${msg.bot}</div>
      <div class="cg-sub">${msg.sub}</div>
      <div class="celeb-tap">tap to dismiss</div>
    </div>
  `;
  document.body.appendChild(el);
  el.addEventListener('click', () => el.remove());
  setTimeout(() => el.classList.add('celeb-fade-out'), 2800);
  setTimeout(() => el.remove(), 3300);
}

// ─── Wrong-answer message cycle ──────────────────────────────
const WRONG_MESSAGES = [
  {
    top:   '🛸',
    title: 'DRONE DOWN',
    bot:   '💥',
    sub:   'Crash report filed. Cause: operator applied confidence without competence.',
  },
  {
    top:   '⚖️',
    title: 'COURT MARTIAL',
    bot:   '🎖️',
    sub:   'Charges: reckless endangerment of a perfectly good $200k UAV.',
  },
  {
    top:   '🚨',
    title: 'ABORT MISSION',
    bot:   '🏃',
    sub:   'GCS operator has been replaced by a more qualified intern.',
  },
  {
    top:   '🐦',
    title: 'BIRD STRIKE',
    bot:   '😤',
    sub:   'The bird memorised the EP checklist. You did not. The bird wins.',
  },
  {
    top:   '📡',
    title: 'LINK LOST',
    bot:   '🌊',
    sub:   "Last known position: somewhere between 'studied' and 'didn't'.",
  },
  {
    top:   '☢️',
    title: 'SELF DESTRUCT',
    bot:   '🔥',
    sub:   'Initiating career-ending sequence. Too late to abort.',
  },
];

let _wrongOrder = [];
let _wrongIdx   = 0;

function nextWrongMsg() {
  if (_wrongIdx >= _wrongOrder.length) {
    _wrongOrder = WRONG_MESSAGES.map((_, i) => i);
    for (let i = _wrongOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_wrongOrder[i], _wrongOrder[j]] = [_wrongOrder[j], _wrongOrder[i]];
    }
    _wrongIdx = 0;
  }
  return WRONG_MESSAGES[_wrongOrder[_wrongIdx++]];
}

// ─── Overlay: Wrong answer ────────────────────────────────────
function showYouSuck() {
  const msg = nextWrongMsg();
  const el  = document.createElement('div');
  el.className = 'celeb-overlay yousuck-overlay';
  el.innerHTML = `
    <div class="celeb-card yousuck-card">
      <div class="ys-emoji">${msg.top}</div>
      <div class="ys-title">${msg.title}</div>
      <div class="ys-poop">${msg.bot}</div>
      <div class="ys-sub">${msg.sub}</div>
      <div class="celeb-tap">tap to dismiss</div>
    </div>
  `;
  document.body.appendChild(el);
  el.addEventListener('click', () => el.remove());
  setTimeout(() => el.classList.add('celeb-fade-out'), 2800);
  setTimeout(() => el.remove(), 3300);
}

// ─── Char-level diff highlight (LCS) ─────────────────────────
function diffHighlight(userInput, expected) {
  const inp = userInput.trim().replace(/\s+/g, ' ');
  const exp = expected.trim().replace(/\s+/g, ' ');
  if (!inp) return '<span class="diff-wrong">(empty)</span>';

  const m = inp.length, n = exp.length;
  const dp = Array.from({length: m + 1}, () => new Int16Array(n + 1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = inp[i-1] === exp[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

  const matched = new Uint8Array(m);
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (inp[i-1] === exp[j-1]) { matched[i-1] = 1; i--; j--; }
    else if (dp[i-1][j] >= dp[i][j-1]) i--;
    else j--;
  }

  let html = '', state = null;
  for (let k = 0; k < m; k++) {
    const s = matched[k] ? 'g' : 'r';
    if (s !== state) {
      if (state) html += '</span>';
      html += `<span class="diff-${s === 'g' ? 'correct' : 'wrong'}">`;
      state = s;
    }
    const c = inp[k];
    html += c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c;
  }
  if (state) html += '</span>';
  return html;
}

// ─── Magic: typewriter text reveal ───────────────────────────
function typewriter(el, text, speed = 22) {
  el.textContent = '';
  let i = 0;
  const tick = () => { if (i < text.length) { el.textContent += text[i++]; setTimeout(tick, speed); } };
  tick();
}

// ─── Magic: animated number counter ──────────────────────────
function animateCounter(el, target, duration = 900) {
  const t0 = performance.now();
  const step = now => {
    const p = Math.min((now - t0) / duration, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ─── SVG: accurate Puma AE II top-down plan view ─────────────
// Fuselage nose at left (x≈14), tail at right (x≈194).
// Wings mid-fuselage, conventional tail, chin sensor pod, pusher prop.
let _svgId = 0;
function droneSvg(skinId) {
  const uid = ++_svgId;
  const skin = getSkinDef(skinId || getActiveSkin());
  const c = skin.primary;

  // Shared shape definitions for tiger stripe overlay
  let defs = '', stripeOverlay = '';
  if (skin.stripes) {
    defs = `<defs>
      <pattern id="str${uid}" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(50)">
        <rect width="2.5" height="5" fill="rgba(0,0,0,0.40)"/>
      </pattern>
    </defs>`;
    stripeOverlay = `
      <path d="M 14,55 L 22,51 L 158,51 L 178,52.5 L 194,55 L 178,57.5 L 158,59 L 22,59 Z" fill="url(#str${uid})"/>
      <polygon points="80,51 103,51 97,7 76,7" fill="url(#str${uid})" opacity="0.88"/>
      <polygon points="80,59 103,59 97,103 76,103" fill="url(#str${uid})" opacity="0.88"/>`;
  }

  // Anime livery: hot-pink body, cyan wings, white tail, neon glow
  if (skin.anime) {
    return `<svg width="205" height="110" viewBox="0 0 205 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M 14,55 L 22,51 L 158,51 L 178,52.5 L 194,55 L 178,57.5 L 158,59 L 22,59 Z" fill="#ff2d78"/>
      <rect x="14" y="53.5" width="180" height="3" rx="1.5" fill="#00e5ff" opacity="0.90"/>
      <polygon points="80,51 103,51 97,7 76,7" fill="#00e5ff" opacity="0.82"/>
      <polygon points="84,51 99,51 94,22 79,22" fill="#ff2d78" opacity="0.48"/>
      <polygon points="80,59 103,59 97,103 76,103" fill="#00e5ff" opacity="0.82"/>
      <polygon points="84,59 99,59 94,88 79,88" fill="#ff2d78" opacity="0.48"/>
      <polygon points="163,51 176,51 170,33 159,33" fill="#ffffff" opacity="0.90"/>
      <polygon points="163,59 176,59 170,77 159,77" fill="#ffffff" opacity="0.90"/>
      <circle cx="196" cy="55" r="7.5" fill="none" stroke="#00e5ff" stroke-width="2.2" opacity="0.92"/>
      <line x1="196" y1="47.5" x2="196" y2="62.5" stroke="#00e5ff" stroke-width="1.8" opacity="0.70"/>
      <line x1="188.5" y1="55" x2="203.5" y2="55" stroke="#00e5ff" stroke-width="1.8" opacity="0.70"/>
      <ellipse cx="26" cy="62" rx="7" ry="4.5" fill="#ffffff" opacity="0.72"/>
      <polygon points="87,23 88.2,26.4 91.8,26.5 88.9,28.6 89.9,32 87,30 84.1,32 85.1,28.6 82.2,26.5 85.8,26.4" fill="#ffffff" opacity="0.90"/>
    </svg>`;
  }

  // Standard single-colour render (default, normal, gold, platinum, tiger)
  return `<svg width="205" height="110" viewBox="0 0 205 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${defs}
    <!-- Fuselage: tapered nose left, tail boom narrowing right -->
    <path d="M 14,55 L 22,51 L 158,51 L 178,52.5 L 194,55 L 178,57.5 L 158,59 L 22,59 Z" fill="${c}"/>
    <!-- Main wings: high aspect ratio, mid-fuselage -->
    <polygon points="80,51 103,51 97,7 76,7"     fill="${c}" opacity="0.78"/>
    <polygon points="80,59 103,59 97,103 76,103"  fill="${c}" opacity="0.78"/>
    <!-- Horizontal stabilizers (conventional tail) -->
    <polygon points="163,51 176,51 170,33 159,33" fill="${c}" opacity="0.85"/>
    <polygon points="163,59 176,59 170,77 159,77" fill="${c}" opacity="0.85"/>
    <!-- V-fin centerline (top-down: thin line along tail boom) -->
    <line x1="163" y1="55" x2="194" y2="55" stroke="${c}" stroke-width="1.5" opacity="0.40"/>
    <!-- Pusher propeller ring + blade cross -->
    <circle cx="196" cy="55" r="7.5" fill="none" stroke="${c}" stroke-width="2"   opacity="0.75"/>
    <line x1="196" y1="47.5" x2="196" y2="62.5"   stroke="${c}" stroke-width="1.8" opacity="0.55"/>
    <line x1="188.5" y1="55" x2="203.5" y2="55"    stroke="${c}" stroke-width="1.8" opacity="0.55"/>
    <!-- Chin-mounted EO/IR sensor pod (protrudes below nose) -->
    <ellipse cx="26" cy="62" rx="7" ry="4.5" fill="${c}" opacity="0.68"/>
    ${stripeOverlay}
  </svg>`;
}

// ─── MC helper: generate [correct + 2 wrong] options ─────────
function generateMCOptions(correctStep, qIdx) {
  // Real steps from all other EPs (deduplicated, not equal to correct)
  const seen = new Set([correctStep]);
  const realPool = [];
  QUESTIONS.forEach((q, qi) => {
    if (qi === qIdx) return;
    q.steps.forEach(s => {
      if (!seen.has(s)) { seen.add(s); realPool.push(s); }
    });
  });

  // Shuffle pool
  for (let i = realPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [realPool[i], realPool[j]] = [realPool[j], realPool[i]];
  }

  const wrongs = [];

  // ~35% chance: inject one cursed option
  if (Math.random() < 0.35) {
    const pick = CURSED_OPTIONS[Math.floor(Math.random() * CURSED_OPTIONS.length)];
    wrongs.push(pick);
  }

  // Fill remaining slots from real pool
  for (const step of realPool) {
    if (wrongs.length >= 2) break;
    wrongs.push(step);
  }

  // Fallback: pad with remaining cursed options if pool was exhausted
  for (let ci = 0; wrongs.length < 2; ci++) {
    wrongs.push(CURSED_OPTIONS[ci % CURSED_OPTIONS.length]);
  }

  const options = [correctStep, ...wrongs];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { options, correctIdx: options.indexOf(correctStep) };
}

// ─── VIEW: Multiple Choice ────────────────────────────────────
function showMultipleChoice() {
  const order = QUESTIONS.map((_, i) => i);
  if (data.randomOrder) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }

  let qPos = 0;

  function renderQuestion() {
    const qIdx   = order[qPos];
    const q      = QUESTIONS[qIdx];
    const isFirst = qPos === 0;
    const isLast  = qPos === order.length - 1;
    const pctFill = (qPos / order.length) * 100;

    const stepData = q.steps.map(step => generateMCOptions(step, qIdx));
    const selected = new Array(q.steps.length).fill(-1);
    let submitted  = false;

    function allAnswered() { return selected.every(s => s !== -1); }

    app.innerHTML = `
      <div class="mc-view fade-in">

        <div class="quiz-bar">
          <button class="qb-back" id="mc-back" ${isFirst ? 'disabled' : ''}>&#8592; Back</button>
          <span class="qb-code">${q.code}</span>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pctFill}%"></div>
          </div>
          <span class="qb-count">${qPos + 1} / ${order.length}</span>
          <button class="qb-menu" id="mc-menu">&#x2302; Menu</button>
        </div>

        <div class="question-card hud-brackets">
          <div class="q-eyebrow">Multiple Choice</div>
          <h1 class="q-title" id="mc-title"></h1>

          <div class="mc-steps">
            ${q.steps.map((_, si) => {
              const { options } = stepData[si];
              return `
                <div class="mc-step-block">
                  <div class="mc-step-label">Step ${si + 1} of ${q.steps.length}</div>
                  <div class="mc-opts" data-si="${si}">
                    ${options.map((opt, oi) => `
                      <button class="mc-option" data-si="${si}" data-oi="${oi}">
                        <span class="mc-letter">${String.fromCharCode(65 + oi)}</span>
                        <span class="mc-opt-text">${opt}</span>
                      </button>`).join('')}
                  </div>
                </div>`;
            }).join('')}
          </div>

          <div class="action-row" id="mc-action-row">
            <button class="btn-submit" id="mc-submit" disabled>Submit Answer &rarr;</button>
          </div>
        </div>

      </div>
    `;

    typewriter(document.getElementById('mc-title'), q.title.toUpperCase(), 22);

    const card = document.querySelector('.question-card');
    if (card) {
      const sweep = document.createElement('div');
      sweep.className = 'scan-sweep';
      card.prepend(sweep);
      setTimeout(() => sweep.remove(), 750);
    }

    document.getElementById('mc-back').addEventListener('click', () => {
      if (!isFirst) { qPos--; renderQuestion(); }
    });
    document.getElementById('mc-menu').addEventListener('click', showDashboard);

    document.querySelectorAll('.mc-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (submitted) return;
        const si = +btn.dataset.si;
        const oi = +btn.dataset.oi;
        selected[si] = oi;
        document.querySelectorAll(`.mc-option[data-si="${si}"]`).forEach((b, i) => {
          b.classList.toggle('selected', i === oi);
        });
        document.getElementById('mc-submit').disabled = !allAnswered();
      });
    });

    document.getElementById('mc-submit').addEventListener('click', () => {
      if (submitted || !allAnswered()) return;
      submitted = true;

      let correct = 0;
      q.steps.forEach((_, si) => {
        const { correctIdx } = stepData[si];
        const sel = selected[si];
        const ok  = sel === correctIdx;
        if (ok) correct++;

        const selBtn = document.querySelector(`.mc-option[data-si="${si}"][data-oi="${sel}"]`);
        if (selBtn) {
          const r = selBtn.getBoundingClientRect();
          spawnParticles(r.left + r.width / 2, r.top + r.height / 2,
            ok ? '#22bb64' : '#d43030', ok ? 10 : 7);
        }

        document.querySelectorAll(`.mc-option[data-si="${si}"]`).forEach((b, oi) => {
          b.disabled = true;
          if (oi === correctIdx)         b.classList.add('reveal-correct');
          else if (oi === sel && !ok)    b.classList.add('incorrect');
          else                           b.classList.add('dimmed');
        });
      });

      const allCorrect = correct === q.steps.length;
      const statusText = allCorrect
        ? 'ALL CORRECT'
        : correct > 0 ? `${correct} OF ${q.steps.length} CORRECT` : 'INCORRECT — REVIEW ANSWERS';

      if (allCorrect) { sfxCorrect(); showCalendarGirl(); }
      else if (correct > 0) sfxPartial();
      else { sfxWrong(); showYouSuck(); }

      document.getElementById('mc-action-row').innerHTML = `
        <div class="result-banner">
          <div>
            <div class="rb-gained" style="color:${allCorrect ? 'var(--green)' : correct > 0 ? 'var(--amber-hi)' : 'var(--red)'}">
              ${correct}&nbsp;/&nbsp;${q.steps.length}
            </div>
            <div class="rb-status">${statusText}</div>
          </div>
          <div class="result-actions">
            <button class="btn-reveal" id="mc-retry">&#x21BA;&nbsp; Retry</button>
            <button class="btn-next" id="mc-next">${isLast ? 'Finish &rarr;' : 'Next EP &rarr;'}</button>
          </div>
        </div>
      `;

      document.getElementById('mc-retry').addEventListener('click', renderQuestion);
      document.getElementById('mc-next').addEventListener('click', () => {
        if (isLast) showDashboard();
        else { qPos++; renderQuestion(); }
      });
    });
  }

  renderQuestion();
}

// ─── VIEW: Flashcards ────────────────────────────────────────
function showFlashcards() {
  const order = QUESTIONS.map((_, i) => i);
  if (data.randomOrder) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }

  let cardIdx = 0;
  let flipped  = false;

  function renderCard() {
    flipped = false;
    const q      = QUESTIONS[order[cardIdx]];
    const pctFill = (cardIdx / order.length) * 100;

    app.innerHTML = `
      <div class="flashcard-view fade-in">

        <div class="quiz-bar">
          <button class="qb-menu" id="fc-menu">&#x2302; Menu</button>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pctFill}%"></div>
          </div>
          <span class="qb-count">${cardIdx + 1} / ${order.length}</span>
        </div>

        <div class="fc-card-wrap" id="fc-wrap">
          <div class="fc-card" id="fc-card">

            <div class="fc-front">
              <div class="fc-eyebrow">Emergency Procedure &middot; ${q.code}</div>
              <div class="fc-title">${q.title.toUpperCase()}</div>
              <div class="fc-flip-hint">&#x25BD; tap to reveal steps</div>
            </div>

            <div class="fc-back">
              <div class="fc-steps-label">Procedure Steps &mdash; ${q.steps.length} step${q.steps.length > 1 ? 's' : ''}</div>
              <div class="fc-step-list">
                ${q.steps.map((step, i) => `
                  <div class="fc-step">
                    <div class="fc-step-num">${i + 1}</div>
                    <div class="fc-step-text">${step}</div>
                  </div>`).join('')}
              </div>
              <div class="fc-flip-back-hint">&#x25B3; tap to flip back</div>
            </div>

          </div>
        </div>

        <div class="fc-nav">
          <button class="btn-fc-nav" id="fc-prev" ${cardIdx === 0 ? 'disabled' : ''}>&larr; Prev</button>
          <span class="fc-counter">${cardIdx + 1} / ${order.length}</span>
          <button class="btn-fc-nav" id="fc-next">${cardIdx < order.length - 1 ? 'Next &rarr;' : 'Done &#x2713;'}</button>
        </div>

      </div>
    `;

    document.getElementById('fc-menu').addEventListener('click', () => {
      document.removeEventListener('keydown', onKey);
      showDashboard();
    });

    document.getElementById('fc-wrap').addEventListener('click', () => {
      flipped = !flipped;
      document.getElementById('fc-card').classList.toggle('flipped', flipped);
    });

    document.getElementById('fc-prev').addEventListener('click', e => {
      e.stopPropagation();
      if (cardIdx > 0) { cardIdx--; renderCard(); }
    });

    document.getElementById('fc-next').addEventListener('click', e => {
      e.stopPropagation();
      if (cardIdx < order.length - 1) { cardIdx++; renderCard(); }
      else { document.removeEventListener('keydown', onKey); showDashboard(); }
    });
  }

  function onKey(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (e.key === 'ArrowRight' && cardIdx < order.length - 1) { cardIdx++; renderCard(); }
      if (e.key === 'ArrowLeft'  && cardIdx > 0)                { cardIdx--; renderCard(); }
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flipped = !flipped;
      document.getElementById('fc-card')?.classList.toggle('flipped', flipped);
    }
  }

  document.addEventListener('keydown', onKey);
  renderCard();
}

// ─── VIEW: Dashboard ──────────────────────────────────────────
function showDashboard() {
  const best   = getBest();
  const last   = getLast();
  const count  = data.sessions.length;
  const recent = data.sessions.slice(-5).reverse();
  const level  = getLevel();
  const { current: xpCur, max: xpMax } = getXPProgress();
  const xpPct  = Math.round((xpCur / xpMax) * 100);
  const activeSkin = getActiveSkin();
  const activeSkinDef = getSkinDef(activeSkin);

  app.innerHTML = `
    <div class="fade-in">

      <div class="dash-header hud-brackets">
        <div class="drone-wrap" style="filter: drop-shadow(0 0 10px ${activeSkinDef.glow})">
          ${droneSvg(activeSkin)}
        </div>
        <div class="dash-system">Fixed-Wing UAS</div>
        <div class="dash-title">PUMA AE II EP</div>
        <div class="dash-subtitle">Emergency Procedures Trainer</div>
      </div>

      <div class="level-panel">
        <div class="lp-meta">
          <span class="lp-label">Level</span>
          <span class="lp-value">${level}</span>
          ${level < 40
            ? `<span class="lp-next">/ 40</span>`
            : `<span class="lp-max">MAX</span>`}
        </div>
        <div class="lp-bar-wrap" title="${xpCur} / ${xpMax} XP to next level">
          <div class="lp-bar-fill" style="width:${level >= 40 ? 100 : xpPct}%"></div>
        </div>
        <span class="lp-xp">${level < 40 ? `${xpCur}&nbsp;/&nbsp;${xpMax} XP` : 'MAX LEVEL'}</span>
      </div>

      <div class="stats-strip">
        <div class="stat-cell">
          <span class="stat-label">Best Score</span>
          <span class="stat-value ${best === null ? 'empty' : ''}">${best !== null ? `${best}/${TOTAL_STEPS}` : '—'}</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">Sessions</span>
          <span class="stat-value ${count === 0 ? 'empty' : ''}">${count}</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">Last Score</span>
          <span class="stat-value ${last === null ? 'empty' : ''}">${last !== null ? `${last}/${TOTAL_STEPS}` : '—'}</span>
        </div>
      </div>

      <button class="btn-start" id="btn-start">▶&nbsp; START DRILL</button>

      <div class="order-toggle">
        <span class="ot-label">Question order</span>
        <button class="ot-btn${!data.randomOrder ? ' active' : ''}" id="btn-seq">Sequential</button>
        <button class="ot-btn${data.randomOrder ? ' active' : ''}" id="btn-rand">Random</button>
        <span class="ot-sep"></span>
        <button class="ot-btn" id="btn-flashcards">Flashcards</button>
        <button class="ot-btn" id="btn-mc">Multiple Choice</button>
      </div>

      <div class="skins-panel">
        <div class="section-header">Skins — Select PUMA Appearance</div>
        <div class="skins-grid">
          ${SKINS.map(skin => {
            const unlocked = isSkinUnlocked(skin);
            const active   = activeSkin === skin.id;
            const cls = ['skin-tile', unlocked ? 'unlocked' : 'locked', active ? 'active' : ''].filter(Boolean).join(' ');
            const droneId = unlocked ? skin.id : skin.id;
            const tileTitle = unlocked
              ? (active ? 'Active skin' : 'Click to equip')
              : `Unlocks at Level ${skin.unlockLevel}`;
            return `
              <div class="${cls}" data-skin="${skin.id}" title="${tileTitle}">
                <div class="skin-drone" style="${unlocked
                  ? `filter: drop-shadow(0 0 5px ${skin.glow})`
                  : 'filter: grayscale(0.8); opacity: 0.32'}">
                  ${droneSvg(droneId)}
                </div>
                <div class="skin-name" style="${unlocked && !active ? `color:${skin.primary}` : ''}">${skin.name}</div>
                <div class="skin-badge ${active ? 'badge-active' : unlocked ? 'badge-unlocked' : 'badge-locked'}">
                  ${active ? '✦ ACTIVE' : unlocked ? 'UNLOCKED' : `LVL ${skin.unlockLevel}`}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="ep-list">
        <div class="section-header">Emergency Procedures — 12 Drills / ${TOTAL_STEPS} Steps</div>
        ${QUESTIONS.map(q => `
          <div class="ep-item">
            <span class="ep-code">${q.code}</span>
            <span class="ep-name">${q.title}</span>
            <span class="ep-steps">${q.steps.length} step${q.steps.length > 1 ? 's' : ''}</span>
          </div>
        `).join('')}
      </div>

      ${recent.length ? `
        <div class="history-section">
          <div class="section-header" style="margin-top:22px; border:1px solid var(--border); border-radius:4px 4px 0 0; padding: 9px 16px;">
            Recent Sessions
          </div>
          <div style="border:1px solid var(--border); border-top:none; border-radius:0 0 4px 4px; overflow:hidden; background:var(--panel); padding: 4px 16px 4px;">
            ${recent.map(s => {
              const pct = Math.round((s.score / TOTAL_STEPS) * 100);
              const col = pct === 100 ? 'var(--green)' : pct >= 75 ? 'var(--amber-hi)' : 'var(--red)';
              const ts  = new Date(s.timestamp).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              });
              return `<div class="hist-row">
                <span class="hist-score">${s.score}/${TOTAL_STEPS}</span>
                <span class="hist-time">${ts}</span>
                <span class="hist-pct" style="color:${col}">${pct}%</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `;

  document.getElementById('btn-start').addEventListener('click', startDrill);

  document.getElementById('btn-seq').addEventListener('click', () => {
    data.randomOrder = false; persist(); showDashboard();
  });
  document.getElementById('btn-rand').addEventListener('click', () => {
    data.randomOrder = true; persist(); showDashboard();
  });
  document.getElementById('btn-flashcards').addEventListener('click', showFlashcards);
  document.getElementById('btn-mc').addEventListener('click', showMultipleChoice);

  document.querySelectorAll('.skin-tile.unlocked').forEach(tile => {
    tile.addEventListener('click', () => {
      setActiveSkin(tile.dataset.skin);
      showDashboard();
    });
  });
}

// ─── VIEW: Question (pos = position in session.order) ────────
function showQuestion(pos) {
  const qIdx    = session.order[pos];
  const q       = QUESTIONS[qIdx];
  const pctFill = (pos / session.order.length) * 100;
  const answered = session.answers[qIdx];
  const isFirst  = pos === 0;
  const isLast   = pos === session.order.length - 1;
  let revealed   = false;

  app.innerHTML = `
    <div class="quiz-view fade-in">

      <div class="quiz-bar">
        <button class="qb-back" id="btn-back" ${isFirst ? 'disabled' : ''}>&#8592; Back</button>
        <span class="qb-code">${q.code}</span>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pctFill}%"></div>
        </div>
        <span class="qb-count">${pos + 1} / ${session.order.length}</span>
        <button class="qb-menu" id="btn-menu" title="Return to main menu">&#x2302; Menu</button>
      </div>

      <div class="score-badge">
        <span class="sb-label">Score</span>
        <span class="sb-score" id="live-score">${session.score}</span>
        <span class="sb-max">/ ${TOTAL_STEPS}</span>
      </div>

      <div class="question-card hud-brackets">
        <div class="q-eyebrow">Emergency Procedure</div>
        <h1 class="q-title" id="q-title-text"></h1>

        ${answered ? `
          <div class="steps-form">
            ${q.steps.map((step, i) => {
              const ok = answered.stepResults[i];
              const typed = answered.userInputs ? answered.userInputs[i] : null;
              return `<div class="step-row">
                <div class="step-num">${i + 1}</div>
                <div class="step-field">
                  ${ok ? `
                    <div class="step-answered correct">✓&nbsp;${step}</div>
                  ` : `
                    <div class="step-answered incorrect">
                      ✗&nbsp;${typed != null ? diffHighlight(typed, step) : step}
                    </div>
                    <div class="step-hint visible answer">✓ ${step}</div>
                  `}
                </div>
              </div>`;
            }).join('')}
          </div>
          <div class="action-row">
            <button class="btn-reveal" id="btn-retry">&#x21BA;&nbsp; Retry</button>
            <button class="btn-submit" id="btn-advance">
              ${isLast ? 'Finish Drill &rarr;' : 'Next EP &rarr;'}
            </button>
          </div>
        ` : `
          <div class="steps-form" id="steps-form">
            ${q.steps.map((_, i) => `
              <div class="step-row">
                <div class="step-num">${i + 1}</div>
                <div class="step-field">
                  <input type="text" class="step-input" id="step-${i}"
                    placeholder="Enter step ${i + 1}…"
                    autocomplete="off" autocorrect="off" autocapitalize="off"
                    spellcheck="false" data-idx="${i}"/>
                  <div class="step-hint" id="hint-${i}"></div>
                </div>
              </div>`).join('')}
          </div>
          <div class="action-row" id="action-row">
            <button class="btn-reveal" id="btn-reveal">Reveal</button>
            <button class="btn-submit" id="btn-submit">Submit Answer &rarr;</button>
          </div>
        `}
      </div>

    </div>
  `;

  // Always: typewriter title, back, menu
  const titleEl = document.getElementById('q-title-text');
  if (titleEl) typewriter(titleEl, q.title.toUpperCase(), 22);

  document.getElementById('btn-back').addEventListener('click', () => {
    if (!isFirst) showQuestion(pos - 1);
  });
  document.getElementById('btn-menu').addEventListener('click', () => {
    session = null;
    showDashboard();
  });

  if (answered) {
    // Retry: subtract old score, clear answer, re-show fresh
    document.getElementById('btn-retry').addEventListener('click', () => {
      session.score -= answered.correct;
      session.answers[qIdx] = null;
      showQuestion(pos);
    });
    document.getElementById('btn-advance').addEventListener('click', () => {
      if (isLast) finishDrill();
      else showQuestion(pos + 1);
    });
  } else {
    // Scan sweep + focus
    const card = document.querySelector('.question-card');
    if (card) {
      const sweep = document.createElement('div');
      sweep.className = 'scan-sweep';
      card.prepend(sweep);
      setTimeout(() => sweep.remove(), 750);
    }
    setTimeout(() => document.getElementById('step-0')?.focus(), 60);

    q.steps.forEach((_, i) => {
      document.getElementById(`step-${i}`).addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const next = document.getElementById(`step-${i + 1}`);
          if (next) next.focus();
          else submitQuestion(pos);
        }
      });
    });

    document.getElementById('btn-reveal').addEventListener('click', () => {
      revealed = !revealed;
      const btn = document.getElementById('btn-reveal');
      if (!session.revealUsed.includes(qIdx)) session.revealUsed.push(qIdx);
      q.steps.forEach((step, i) => {
        const hint = document.getElementById(`hint-${i}`);
        if (revealed) {
          hint.textContent = `→ ${step}`;
          hint.className = 'step-hint visible reveal';
          btn.textContent = 'Hide';
        } else {
          hint.textContent = '';
          hint.className = 'step-hint';
          btn.textContent = 'Reveal';
        }
      });
    });

    document.getElementById('btn-submit').addEventListener('click', () => submitQuestion(pos));
  }
}

// ─── Submit & score a question ────────────────────────────────
function submitQuestion(pos) {
  const qIdx     = session.order[pos];
  const q        = QUESTIONS[qIdx];
  const submitBtn = document.getElementById('btn-submit');
  const revealBtn = document.getElementById('btn-reveal');
  if (!submitBtn || submitBtn.disabled) return;

  submitBtn.disabled = true;
  if (revealBtn) revealBtn.disabled = true;

  let correct = 0;
  const stepResults = [];
  const userInputs  = [];

  q.steps.forEach((expected, i) => {
    const input = document.getElementById(`step-${i}`);
    const hint  = document.getElementById(`hint-${i}`);
    if (!input) return;

    const userVal = input.value;
    userInputs.push(userVal);

    const ok = check(userVal, expected);
    stepResults.push(ok);
    if (ok) correct++;

    const rect = input.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2,
      ok ? '#22bb64' : '#d43030', ok ? 10 : 7);

    if (ok) {
      input.readOnly = true;
      input.classList.add('correct');
      if (hint) { hint.textContent = ''; hint.className = 'step-hint'; }
    } else {
      // Replace the input with diff-highlighted div (same visual footprint)
      const diffDiv = document.createElement('div');
      diffDiv.className = 'diff-display';
      diffDiv.innerHTML = diffHighlight(userVal, expected);
      input.replaceWith(diffDiv);
      if (hint) {
        hint.textContent = `✓ ${expected}`;
        hint.className = 'step-hint visible answer';
      }
      diffDiv.classList.add('glitch');
      setTimeout(() => diffDiv.classList.remove('glitch'), 450);
    }
  });

  session.score += correct;
  session.answers[qIdx] = { correct, total: q.steps.length, stepResults, userInputs };

  if (correct === q.steps.length) { sfxCorrect(); showCalendarGirl(); }
  else if (correct > 0) sfxPartial();
  else { sfxWrong(); showYouSuck(); }

  const liveScoreEl = document.getElementById('live-score');
  if (liveScoreEl) {
    liveScoreEl.textContent = session.score;
    liveScoreEl.style.transition = 'none';
    requestAnimationFrame(() => {
      liveScoreEl.style.transition = 'color 600ms';
      liveScoreEl.style.color = correct > 0 ? 'var(--green)' : 'var(--red)';
      setTimeout(() => { liveScoreEl.style.color = 'var(--amber-hi)'; }, 700);
    });
  }

  const isLast     = pos === session.order.length - 1;
  const allCorrect = correct === q.steps.length;
  const statusText = allCorrect
    ? 'ALL CORRECT'
    : correct > 0 ? `${correct} OF ${q.steps.length} CORRECT` : 'INCORRECT — REVIEW ANSWERS';
  const nextLabel  = isLast ? 'Finish Drill &rarr;' : 'Next EP &rarr;';

  const actionRow = document.getElementById('action-row');
  if (actionRow) {
    actionRow.innerHTML = `
      <div class="result-banner">
        <div>
          <div class="rb-gained" style="color:${allCorrect ? 'var(--green)' : correct > 0 ? 'var(--amber-hi)' : 'var(--red)'}">
            +${correct}
          </div>
          <div class="rb-status">${statusText}</div>
        </div>
        <div class="result-actions">
          <button class="btn-reveal" id="btn-retry">&#x21BA;&nbsp; Retry</button>
          <button class="btn-next" id="btn-next">${nextLabel}</button>
        </div>
      </div>
    `;

    document.getElementById('btn-retry').addEventListener('click', () => {
      session.score -= correct;
      session.answers[qIdx] = null;
      showQuestion(pos);
    });
    document.getElementById('btn-next').addEventListener('click', () => {
      if (isLast) finishDrill();
      else showQuestion(pos + 1);
    });
  }
}

// ─── VIEW: Final Results ──────────────────────────────────────
function finishDrill() {
  const score = session.score;
  const pct   = Math.round((score / TOTAL_STEPS) * 100);

  let grade, gradeColor;
  if (pct === 100)    { grade = 'PERFECT — MISSION READY'; gradeColor = 'var(--green)'; }
  else if (pct >= 90) { grade = 'EXCELLENT';               gradeColor = 'var(--green)'; }
  else if (pct >= 75) { grade = 'GOOD';                    gradeColor = 'var(--amber-hi)'; }
  else if (pct >= 60) { grade = 'MARGINAL';                gradeColor = 'var(--amber)'; }
  else                { grade = 'DRILL AGAIN';             gradeColor = 'var(--red)'; }

  const xpGained  = calcSessionXP(score);
  const oldLevel  = getLevel();

  data.sessions.push({
    score,
    totalSteps: TOTAL_STEPS,
    timestamp:  Date.now(),
    answers:    session.answers,
    revealUsed: session.revealUsed
  });
  data.totalXP = (data.totalXP || 0) + xpGained;
  persist();

  const newLevel  = getLevel();
  const leveledUp = newLevel > oldLevel;
  const newSkins  = SKINS.filter(s => s.unlockLevel > oldLevel && s.unlockLevel <= newLevel);
  const { current: xpCur, max: xpMax } = getXPProgress();
  const xpPct = Math.round((xpCur / xpMax) * 100);

  if (pct === 100) setTimeout(sfxPerfect, 100);
  if (leveledUp) {
    setTimeout(sfxLevelUp, pct === 100 ? 700 : 200);
    setTimeout(() => showLevelUpOverlay(newLevel), 350);
  }

  app.innerHTML = `
    <div class="results-view fade-in">

      <div class="rv-label">Drill Complete</div>
      <div class="rv-score" id="rv-score-num">0</div>
      <div class="rv-max">out of ${TOTAL_STEPS} steps</div>
      <div class="rv-grade" style="border-color:${gradeColor}; color:${gradeColor};">${grade}</div>
      <div class="rv-pct">${pct}% accuracy</div>

      <div class="xp-award ${leveledUp ? 'leveled-up' : ''}">
        <span class="xp-plus">+${xpGained} XP</span>
        ${leveledUp
          ? `<span class="xp-levelup">LEVEL UP — ${newLevel}</span>`
          : `<span class="xp-level">Level ${newLevel}</span>`}
        ${newLevel < 40 ? `
          <div class="xp-bar-wrap">
            <div class="xp-bar-fill" id="xp-bar" style="width:0%"></div>
          </div>
          <span class="xp-progress">${xpCur}&nbsp;/&nbsp;${xpMax} XP</span>
        ` : `<span class="xp-maxlevel">MAX LEVEL REACHED</span>`}
      </div>

      ${newSkins.length ? `
        <div class="unlock-notice">
          ${newSkins.map(s => `
            <div class="unlock-item">
              <div class="unlock-drone" style="filter: drop-shadow(0 0 8px ${s.glow})">
                ${droneSvg(s.id)}
              </div>
              <div class="unlock-text">
                <div class="unlock-title">Skin Unlocked</div>
                <div class="unlock-name" style="color:${s.primary}">${s.name}</div>
                <div class="unlock-hint">Equip it from the dashboard</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="review-grid">
        ${QUESTIONS.map((q, i) => {
          const ans   = session.answers[i] || { correct: 0, total: q.steps.length };
          const ratio = ans.correct / ans.total;
          const cls   = ratio === 1 ? 'perfect' : ratio > 0 ? 'partial' : 'zero';
          return `
            <div class="review-row">
              <span class="rr-code">${q.code}</span>
              <span class="rr-title">${q.title}</span>
              <span class="rr-result ${cls}">${ans.correct}/${ans.total}</span>
            </div>`;
        }).join('')}
      </div>

      <div class="final-buttons">
        <button class="btn-home" id="btn-home">&larr; Dashboard</button>
        <button class="btn-restart" id="btn-restart">Drill Again</button>
      </div>

    </div>
  `;

  // Animate XP bar fill after render
  setTimeout(() => {
    const bar = document.getElementById('xp-bar');
    if (bar) bar.style.width = `${newLevel >= 40 ? 100 : xpPct}%`;
  }, 80);

  // Score count-up
  const rvScoreEl = document.getElementById('rv-score-num');
  if (rvScoreEl) setTimeout(() => animateCounter(rvScoreEl, score, 900), 180);

  // Perfect score confetti burst
  if (pct === 100) {
    setTimeout(() => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 3;
      for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnParticles(cx, cy, '#eca830', 18), i * 160);
      }
    }, 600);
  }

  document.getElementById('btn-home').addEventListener('click', showDashboard);
  document.getElementById('btn-restart').addEventListener('click', startDrill);
}

// ─── Start a new drill session ────────────────────────────────
function startDrill() {
  const order = QUESTIONS.map((_, i) => i);
  if (data.randomOrder) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  // answers indexed by original question index (null = not yet answered)
  session = { score: 0, answers: new Array(QUESTIONS.length).fill(null), revealUsed: [], order };
  showQuestion(0);
}

// ─── Boot ─────────────────────────────────────────────────────
initStarField();
showDashboard();
