# PUMA AE II EP — Build Plan

## Tasks

- [x] Read idea.md and understand requirements
- [ ] Create questions.js — all 12 EP Q&A data (exact text)
- [ ] Create style.css — military aviation HUD dark theme
- [ ] Create app.js — SPA quiz engine with scoring + localStorage
- [ ] Create index.html — SPA shell
- [ ] Create server.py — Python localhost server with auto-open
- [ ] Create progress.md — design decisions log
- [ ] Rewrite README.md — for PUMA AE II EP
- [ ] Create .gitignore
- [ ] Verify app runs in browser end-to-end

## Design Decisions

- Pure HTML/CSS/JS frontend, Python http.server backend (zero dependencies)
- Aviation/military HUD aesthetic: dark bg, amber accent, scanline overlay, monospace font
- Case-insensitive exact-match answer checking (trim + collapse whitespace)
- Answers preserved exactly as written in idea.md (including original typos)
- 28 total steps across 12 questions → score /28
- Per-session history stored in localStorage
- REVEAL toggle for study mode (tracks "hint used" but no score penalty)
- Audio feedback via Web Audio API (no external files)
- Drone SVG silhouette in dashboard header

## Scoring

Total steps: 28 (1+3+2+1+2+4+1+3+2+4+2+3)
Grade thresholds: 100% = PERFECT, 90%+ = EXCELLENT, 75%+ = GOOD, 60%+ = MARGINAL, <60% = DRILL AGAIN
