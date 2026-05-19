# PUMA AE II EP — Emergency Procedures Trainer

A localhost training application for practising emergency procedures on the PUMA AE II fixed-wing UAS. Quiz-based, typing-focused, scored — designed to build accurate recall under pressure.

---

## System Description

The PUMA AE II EP Trainer presents all 12 emergency procedures as typed-answer drills. Each drill covers one emergency scenario; the operator must recall and type every step of the procedure from memory. Answers are checked against the official procedure text (case-insensitive exact match). A score is awarded for each correct step and persisted across sessions.

The app runs entirely in the browser with no internet connection required. A lightweight Python server handles localhost delivery.

---

## Why a Typing-Based Drill?

Emergency procedures must be executed quickly and precisely. Reading a checklist is different from being able to recall and verbalise steps under stress. This trainer forces active recall — the operator must produce the correct text, not select it from options. Repeated typing encodes both the sequence and the exact wording, which is especially important for multi-step procedures where the order matters.

---

## How to Use

### Starting a session

1. Run `python server.py` — the app opens automatically at `http://localhost:8080`
2. The dashboard shows your best score, session count, and recent history
3. Click **START DRILL** to begin

### During a drill

- 12 questions are presented one at a time
- Each question shows the emergency title (e.g. *GPS Failure*)
- Type each procedure step in the numbered input fields
- Press **Enter** to advance between steps; the last step submits
- Click **Submit Answer** to check all steps at once
- Green = correct, red = incorrect; missed steps are shown below the input
- Click **Reveal** at any time to see the expected answers (study mode)
- Click **Next EP** (or **Finish Drill** on question 12) to continue

### After the drill

- Your score out of 28 steps is shown with a grade
- A per-question breakdown shows which EPs need more work
- **Drill Again** restarts immediately; **Dashboard** returns to the home screen

---

## Example Learning Flow

**Goal:** Memorise EP-02 — GPS Failure (3 steps)

1. First run: use **Reveal** to see the steps, type them in, submit
2. Second run: close the reveal, attempt from memory, note errors
3. Third run: no reveals — aim for 3/3 correct
4. Continue drilling until all 28 steps score 28/28

The dashboard tracks your best score and session history so you can measure improvement over time.

---

## Developer Setup

### Prerequisites

- Python 3.8+ (standard library only — no `pip install` required)
- A modern browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
git clone <repo-url>
cd EP_puma_app
```

No virtual environment or dependency installation needed.

### Running the app

```bash
python server.py
```

The server starts on `http://localhost:8080` and opens the browser automatically. Press `Ctrl+C` to stop.

### Project Structure

```
EP_puma_app/
├── index.html        Single-page app shell
├── style.css         Military aviation HUD theme
├── questions.js      12 emergency procedures (exact text)
├── app.js            Quiz engine, state management, scoring
├── server.py         Python localhost HTTP server
├── progress.md       Design decisions and build log
├── README.md         This file
├── .gitignore
├── idea.md           Original project brief
└── tasks/
    └── todo.md       Build checklist
```

### Scores and history

Session data is stored in `localStorage` under the key `puma_ep_v1`. To reset all history, open the browser DevTools console and run:

```js
localStorage.removeItem('puma_ep_v1');
```

---

## Emergency Procedures Reference

| Code  | Procedure                                        | Steps |
|-------|--------------------------------------------------|-------|
| EP-01 | Loss of Link                                     | 1     |
| EP-02 | GPS Failure                                      | 3     |
| EP-03 | Structural or Flight Control Failure             | 2     |
| EP-04 | Altitude Hold Failure                            | 1     |
| EP-05 | Extreme Low Air Vehicle Battery                  | 2     |
| EP-06 | Propulsion Failed Warning                        | 4     |
| EP-07 | SEE DIAG Warning Message Received                | 1     |
| EP-08 | Over Speed                                       | 3     |
| EP-09 | Avionics Over Temperature                        | 2     |
| EP-10 | Motor Controller or Li-Ion Aircraft Battery Over Temp | 4 |
| EP-11 | Mid-Air Avoidance                                | 2     |
| EP-12 | FalconView Interrupted                           | 3     |
|       | **Total**                                        | **28**|
