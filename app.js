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

// ─── Persistent data ─────────────────────────────────────────
let data = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return { sessions: [], totalXP: 0, activeSkin: 'default', ...saved };
    return { sessions: [], totalXP: 0, activeSkin: 'default' };
  } catch { return { sessions: [], totalXP: 0, activeSkin: 'default' }; }
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

  document.querySelectorAll('.skin-tile.unlocked').forEach(tile => {
    tile.addEventListener('click', () => {
      setActiveSkin(tile.dataset.skin);
      showDashboard();
    });
  });
}

// ─── VIEW: Question ───────────────────────────────────────────
function showQuestion(idx) {
  const q = QUESTIONS[idx];
  const pctFill = (idx / QUESTIONS.length) * 100;
  let revealed = false;

  app.innerHTML = `
    <div class="quiz-view fade-in">

      <div class="quiz-bar">
        <span class="qb-code">${q.code}</span>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pctFill}%"></div>
        </div>
        <span class="qb-count">${idx + 1} / ${QUESTIONS.length}</span>
      </div>

      <div class="score-badge">
        <span class="sb-label">Score</span>
        <span class="sb-score" id="live-score">${session.score}</span>
        <span class="sb-max">/ ${TOTAL_STEPS}</span>
      </div>

      <div class="question-card hud-brackets">
        <div class="q-eyebrow">Emergency Procedure</div>
        <h1 class="q-title" id="q-title-text"></h1>

        <div class="steps-form" id="steps-form">
          ${q.steps.map((_, i) => `
            <div class="step-row">
              <div class="step-num">${i + 1}</div>
              <div class="step-field">
                <input
                  type="text"
                  class="step-input"
                  id="step-${i}"
                  placeholder="Enter step ${i + 1}…"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  data-idx="${i}"
                />
                <div class="step-hint" id="hint-${i}"></div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="action-row" id="action-row">
          <button class="btn-reveal" id="btn-reveal">Reveal</button>
          <button class="btn-submit" id="btn-submit">Submit Answer &rarr;</button>
        </div>
      </div>

    </div>
  `;

  setTimeout(() => document.getElementById('step-0')?.focus(), 60);

  // Typewriter on question title
  const titleEl = document.getElementById('q-title-text');
  if (titleEl) typewriter(titleEl, q.title.toUpperCase(), 22);

  // Scan sweep across the question card
  const card = document.querySelector('.question-card');
  if (card) {
    const sweep = document.createElement('div');
    sweep.className = 'scan-sweep';
    card.prepend(sweep);
    setTimeout(() => sweep.remove(), 750);
  }

  q.steps.forEach((_, i) => {
    document.getElementById(`step-${i}`).addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const next = document.getElementById(`step-${i + 1}`);
        if (next) next.focus();
        else submitQuestion(idx);
      }
    });
  });

  document.getElementById('btn-reveal').addEventListener('click', () => {
    revealed = !revealed;
    const btn = document.getElementById('btn-reveal');
    if (!session.revealUsed.includes(idx)) session.revealUsed.push(idx);
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

  document.getElementById('btn-submit').addEventListener('click', () => submitQuestion(idx));
}

// ─── Submit & score a question ────────────────────────────────
function submitQuestion(idx) {
  const q = QUESTIONS[idx];
  const submitBtn = document.getElementById('btn-submit');
  const revealBtn = document.getElementById('btn-reveal');
  if (!submitBtn || submitBtn.disabled) return;

  submitBtn.disabled = true;
  if (revealBtn) revealBtn.disabled = true;

  let correct = 0;

  q.steps.forEach((expected, i) => {
    const input = document.getElementById(`step-${i}`);
    const hint  = document.getElementById(`hint-${i}`);
    if (!input) return;

    const ok = check(input.value, expected);
    if (ok) correct++;

    input.readOnly = true;
    input.classList.add(ok ? 'correct' : 'incorrect');

    if (!ok && hint) {
      hint.textContent = `✓ ${expected}`;
      hint.className = 'step-hint visible answer';
    } else if (ok && hint) {
      hint.textContent = '';
      hint.className = 'step-hint';
    }

    // Particle burst + glitch feedback
    const rect = input.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2,
      ok ? '#22bb64' : '#d43030', ok ? 10 : 7);
    if (!ok) {
      input.classList.add('glitch');
      setTimeout(() => input.classList.remove('glitch'), 450);
    }
  });

  session.score += correct;
  session.answers.push({ qId: q.id, correct, total: q.steps.length });

  if (correct === q.steps.length) sfxCorrect();
  else if (correct > 0) sfxPartial();
  else sfxWrong();

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

  const actionRow = document.getElementById('action-row');
  if (actionRow) {
    const allCorrect = correct === q.steps.length;
    const statusText = allCorrect
      ? 'ALL CORRECT'
      : correct > 0
        ? `${correct} OF ${q.steps.length} CORRECT`
        : 'INCORRECT — REVIEW ANSWERS';

    const isLast    = idx === QUESTIONS.length - 1;
    const nextLabel = isLast ? 'Finish Drill &rarr;' : 'Next EP &rarr;';

    actionRow.innerHTML = `
      <div class="result-banner">
        <div>
          <div class="rb-gained" style="color:${allCorrect ? 'var(--green)' : correct > 0 ? 'var(--amber-hi)' : 'var(--red)'}">
            +${correct}
          </div>
          <div class="rb-status">${statusText}</div>
        </div>
        <button class="btn-next" id="btn-next">${nextLabel}</button>
      </div>
    `;

    document.getElementById('btn-next').addEventListener('click', () => {
      if (isLast) finishDrill();
      else showQuestion(idx + 1);
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
  session = { score: 0, answers: [], revealUsed: [] };
  showQuestion(0);
}

// ─── Boot ─────────────────────────────────────────────────────
initStarField();
showDashboard();
