# PUMA AE II EP — Build Progress

## Session: 2026-05-19

### What was built
A complete localhost emergency procedures trainer for the PUMA AE II fixed-wing UAS.

### Design choices

**Architecture: pure static HTML/CSS/JS + Python http.server**
No external dependencies. `python server.py` starts the server and opens the browser automatically. Works offline.

**Answer checking: case-insensitive exact match**
Both the user's input and the expected answer are normalised: `trim()`, `toLowerCase()`, collapse internal whitespace to a single space. This means "select alt mode." is accepted when the correct answer is "Select ALT Mode." — but punctuation and all key words must be present. Exact wording is essential for emergency procedures.

**Answer text: preserved exactly as specified**
All answer steps are copied verbatim from `idea.md`, including original typos (e.g. "ot" instead of "not" in EP-06 and EP-08, "&" in EP-10, "Decend" and "aviod" in EP-11). Users must memorise the official procedure text exactly.

**Scoring: per-step points (28 total)**
Each of the 28 individual steps across 12 questions is worth 1 point. Partial credit is awarded per question. Score is stored to `localStorage` under key `puma_ep_v1`.

**Reveal toggle: study aid, no penalty**
The "Reveal" button shows the correct step text below each input as italic amber text. Session records note which questions had reveals used, but the score calculation is unchanged.

**Audio: Web Audio API**
Three sounds synthesised in-browser: two-tone chime for all-correct, single tone for partial, sawtooth buzz for all-wrong, ascending four-note fanfare for a perfect 28/28 run. No audio files required.

**Visual theme: military aviation HUD**
- Background `#070a0d` (near-black blue)
- Amber accent `#c8820e / #eca830`
- CSS scanline overlay (repeating gradient, 4px pitch)
- Monospace font stack (Consolas → Menlo → Courier New)
- Sans-serif display font for titles (Helvetica Neue → Arial)
- Amber glow pulse animation on the Start button
- Progress dot on the drill progress track

**Drone SVG**
Inline SVG, no external files. Top-down PUMA AE silhouette: swept high wing, V-tail, pusher prop ring, EO/IR payload pod.

## Session: 2026-05-19 (update — skin system)

### What was added

**Level / XP system**
Each drill session awards XP: `round((score / 28) * 100)` — max 100 XP for a perfect run. XP accumulates in `localStorage` under `puma_ep_v1.totalXP`. Level formula: `min(40, floor(xp / 200) + 1)`. Level 1–40 total; all four skin milestones (levels 2–5) reachable within ~10 sessions.

**Skin system — 5 skins**

| ID        | Name           | Unlock | Colour      |
|-----------|----------------|--------|-------------|
| default   | Silhouette     | Lvl 1  | Steel blue-grey |
| normal    | Normal Puma    | Lvl 2  | Amber `#c8820e` |
| gold      | Gold Puma      | Lvl 3  | Gold `#f5c518` |
| platinum  | Platinum Puma  | Lvl 4  | Silver-blue `#c0d8f0` |
| tiger     | Red Tiger      | Lvl 5  | Red `#cc2200` + diagonal stripe SVG pattern |

Skins are stored as explicit hex fills in the SVG; `droneSvg(skinId)` renders with correct colours. Tiger uses a SVG `<pattern>` for diagonal black stripes overlaid on fuselage and wing.

**Dashboard additions**
- Level panel: Level number, animated XP bar, XP progress text (sits between drone header and stats strip)
- Skins panel (5-column grid): each tile shows a mini drone in the skin's colours, name, and a badge (ACTIVE / UNLOCKED / LVL N locked). Clicking an unlocked tile equips it immediately. Locked tiles are desaturated.

**Results screen additions**
- XP award card: `+N XP` with animated fill bar, level label
- Level-up: amber glow pulse, ascending four-note chime, "LEVEL UP — N" text
- Skin unlock card: drone preview + name shown for each newly unlocked skin

**SVG pattern deduplication**
Each `droneSvg()` call uses an auto-incremented UID for the pattern `id` (`str1`, `str2`, …) to avoid SVG `<defs>` ID collisions when multiple tiger drones render on the same page.

---

### File structure
```
EP_puma_app/
├── index.html        SPA shell
├── style.css         Military HUD theme
├── questions.js      12 EPs, exact answer text
├── app.js            Quiz engine + SPA router
├── server.py         Python localhost server
├── progress.md       This file
├── README.md         Project documentation
├── .gitignore
├── idea.md           Original brief
├── tasks/
│   └── todo.md
└── CLAUDE.md
```
