# GuardianEye AI 👁️🛡️
> **Next-Generation Cross-Device Parental Control & AI Study Companion**  
> *Developed for Hacktoberfest Islamabad 2026 Open AI Build Challenge*  
> **Domain 02: Education (Study Companion)** & **Domain 01: Health (Pediatric Ophthalmology)**  
> **License:** Apache License 2.0 (Open Source)

---

## 🌟 Executive Overview
**GuardianEye AI** is an open-source, cross-device parental control and educational productivity ecosystem. It combines an Android foreground enforcement service (forked and enhanced from [`childscreentime/cst`](https://github.com/childscreentime/cst)) with an open-weight AI harness (`Llama-3.1-8B-Instant`) and a real-time Father's Desktop Dashboard.

Unlike conventional blockers that only impose punitive lockouts, **GuardianEye AI** establishes positive behavioral conditioning:
1. **The 20-20-35 Ophthalmology Rule**: Locks the device for an unskippable 35-second relaxation interval every 20 minutes of continuous screen use, guiding the child to look 20 feet away to relax ciliary eye muscles and prevent progressive myopia.
2. **1.5-Hour Daily Entertainment Cap**: Hard-locks games, social media, and video streaming apps after 90 minutes of daily usage, while keeping the AI Study Hub accessible.
3. **Automated 2-Hour Study Schedule from School Diary**: An open-weight AI parses the child's raw homework diary entries and schedules structured &ge; 120-minute study blocks with checkpoint questions.
4. **Educational Exemption Engine**: While the child is actively studying in the AI Study Hub, the entertainment counter is paused.
5. **Strict Socratic Guardrails**: Rejects gaming or casual chatter queries during study sessions with clear guidance to focus on academic assignments.
6. **Anti-Cheat & Inactivity Detection**: Detects when a child walks away from the device while leaving the study timer running, issuing warnings and logging strikes.
7. **Pocket Money Consequence Engine**: Imposes next-day financial accountability by deducting penalties (e.g. -Rs 15 for idle cheat strikes, -Rs 25 for entertainment overtime, -Rs 20 for missing study goals) from a daily base allowance (Rs 100), with full parental waiver authority.
8. **7 Premium Dynamic UI Themes**: Instant one-click theming with custom gradients, glassmorphism, and persistent storage.

---

## 🎨 7 Premium Aesthetic Themes

The web application features 7 tailored themes switchable dynamically via the header palette selector:

| # | Theme | Palette & Accent | Mood / Aesthetics |
|---|---|---|---|
| **1** | **Cyber Cyan (Default)** | `#38bdf8` Sky Cyan & `#6366f1` Indigo | Deep dark space, futuristic glassmorphism, high contrast cyan glow |
| **2** | **Emerald Matrix** | `#10b981` Electric Mint & `#059669` Emerald | Cyber forest obsidian, tactical matrix glow, vibrant greens |
| **3** | **Tokyo Sunset** | `#f43f5e` Hot Rose & `#8b5cf6` Violet | Synthwave cyberpunk, warm magenta sunset gradients |
| **4** | **Solar Amber** | `#f59e0b` Honey Gold & `#ef4444` Crimson | Warm charcoal black with radiant amber gold telemetry |
| **5** | **Nordic Frost** | `#06b6d4` Glacial Cyan & `#3b82f6` Blue | Polar deep navy with frosty cyan highlights and ice gradients |
| **6** | **Dracula Crimson** | `#e11d48` Ruby Red & `#6d28d9` Purple | Gothic dark velvet with vampire crimson accents |
| **7** | **Deep Amethyst** | `#a855f7` Royal Violet & `#ec4899` Pink | Deep obsidian with electric amethyst purple radiance |

Themes automatically persist in `localStorage` across page reloads and apply smoothly across the entire dashboard and child smartphone simulation.

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph "Child Android Device (Samsung / Tablet)"
        A[Foreground Lock Service CST] --> B[EyeCareManager (20-20-35 Rule)]
        B -->|Every 20m continuous| C[Unskippable 35s Overlay Activity]
        A --> D[EducationalExemptionManager]
        D -->|Study Mode| E[AI Study Hub Layout]
        E --> F[AntiIdleEngagementMonitor]
        A --> G[PocketMoneySyncClient]
    end

    subgraph "Python REST & SSE Telemetry Server (:8080)"
        G -->|Telemetry / Heartbeat| H[server/app.py (Threaded)]
        H <--> I[(SQLite: guardian_eye.db)]
        H <--> J[Pocket Money Engine]
        H <--> K[Open-Weight AI Harness (Llama-3.1-8B)]
    end

    subgraph "Father's Desktop & Companion Deck"
        H -->|Server-Sent Events /stream| L[Real-Time Live Dashboard]
        L --> M[Telemetry Gauges & Timers]
        L --> N[Pocket Money Consequence Card]
        L --> O[Remote Overrides (Lock/Unlock/Waive)]
        L --> P[7 Themes Engine]
        L --> Q[Live Audit Feed]
    end
```

---

## 🚀 Key Modules & Directory Structure

```
H3/
├── LICENSE                          # Official Apache License 2.0
├── NOTICE                           # Apache 2.0 attribution & upstream CST credits
├── README.md                        # Project documentation & hackathon submission
├── android/                         # Android native enhancements for childscreentime/cst
│   └── app/src/main/
│       ├── java/io/github/childscreentime/
│       │   ├── eyecare/             # EyeCareManager & 35s unskippable overlay
│       │   ├── education/           # EducationalExemptionManager (timer pause)
│       │   ├── engagement/          # AntiIdleEngagementMonitor (anti-cheat)
│       │   └── telemetry/           # PocketMoneySyncClient (live server sync)
│       └── res/layout/              # XML layouts for eye break and Study Hub
├── server/                          # Python REST, SSE & AI Backend
│   ├── app.py                       # Multi-threaded server & SSE dispatcher (Port 8080)
│   ├── ai_engine.py                 # Llama-3.1-8B-Instant harness & guardrails
│   ├── pocket_money_engine.py       # Next-day deduction calculator
│   ├── database.py                  # SQLite schema & persistence
│   └── test_suite.py                # Automated 8-point verification suite
├── web/                             # Father's Desktop Deck & Child Mobile Simulator
│   ├── index.html                   # Dual-view responsive glassmorphic UI + 7 themes
│   ├── css/style.css                # Tailored design system, dark mode & 7 theme tokens
│   └── js/
│       ├── child_device.js          # Child phone client simulator & timers
│       └── app.js                   # Master coordinator, SSE listener & theme engine
└── upstream-cst/                    # Upstream open-source CST base repository
```

---

## 🧪 Verification & Test Suite

The backend includes a comprehensive 8-point automated test suite verifying all hackathon criteria:

```bash
python3 server/test_suite.py
```

### Test Suite Output
```text
=================================================================
 GUARDIANEYE AI — HACKTOBERFEST 2026 TEST SUITE VERIFICATION
=================================================================

[TEST 1] AI Model Specification Compliance
  ✓ Model verified: Llama-3.1-8B-Instant (<= 8B Parameter Constraint Satisfied)

[TEST 2] Work Diary Schedule Generation (Min 2 Hours)
  ✓ Schedule generated: 120 total mins across 3 subject blocks.

[TEST 3] Strict Educational Tutor - Academic Query
  ✓ Academic query permitted: Socratic explanation provided.

[TEST 4] Strict Educational Tutor - Entertainment Refusal
  ✓ Gaming query blocked: ⚠️ EDUCATIONAL RESTRICTION ENFORCED

[TEST 5] Anti-Cheat Inactivity / Fake Keystroke Detection
  ✓ Anti-cheat passed: Idle flag=True, Spam flag=True, Legitimate=True

[TEST 6] 20-20-35 Eye Strain Prevention Rule
  ✓ 20-minute threshold verified: Triggers unskippable 35-second eye break overlay.

[TEST 7] 1.5-Hour (90 min) Entertainment Daily Cap
  ✓ 1.5-hour hard limit verified: Locked state triggered, Overtime deduction applied (Rs 55.0).

[TEST 8] Pocket Money Consequence Engine & Father Override
  ✓ Pocket Money Engine verified: Base=Rs 100.0, Deductions=Rs 55.0, Final=Rs 45.0

=================================================================
 ALL 8/8 HACKATHON TEST SCENARIOS PASSED WITH ZERO ERRORS!
=================================================================
```

---

## 💻 Running the Application Locally

1. **Start the GuardianEye AI Server**:
   ```bash
   python3 server/app.py
   ```
   *The server starts on `http://localhost:8080`.*

2. **Open the Web Interface**:
   Navigate to [http://localhost:8080](http://localhost:8080) in any web browser.

3. **Interactive Demo Controls**:
   - **Dual View**: Test the Child Smartphone simulator side-by-side with the Father's Desktop Deck.
   - **Theme Selector**: Select from 7 vibrant themes in the header.
   - **Demo Speed Toggle**: Toggle 60x simulation speed (20 minutes continuous screen time triggers in 20 seconds; 1.5 hours entertainment cap triggers in 90 seconds).
   - **Emergency Overrides**: Use the Father Remote controls to trigger remote lockouts, force eye breaks, award bonus quotas, or waive pocket money deductions.

---

## 📜 Open Source License & Apache Consent

This project is licensed under the **Apache License, Version 2.0**.

- Full license terms are available in the [`LICENSE`](file:///home/sudo-fai/H3/LICENSE) file.
- Attribution and upstream credits are documented in the [`NOTICE`](file:///home/sudo-fai/H3/NOTICE) file.

### Open-Source Consent & Heritage:
- **Upstream Project**: Forked and extended from [`childscreentime/cst`](https://github.com/childscreentime/cst), an open-source Android screen-time application.
- **Grant of Rights**: Licensed under Apache 2.0, granting worldwide, royalty-free rights for reproduction, modification, distribution, commercial use, and private use.
- **Hackathon Compliance**: Fully compliant with the mandatory open-source rules of the **Hacktoberfest Islamabad 2026 Open AI Build Challenge**:
  - Open weight AI model: `Llama-3.1-8B-Instant` (&le; 8B parameter rule).
  - Open source license: Apache License 2.0.
  - Zero proprietary black-box API lock-in.
