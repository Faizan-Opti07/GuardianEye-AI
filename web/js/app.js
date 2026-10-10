/**
 * GuardianEye AI - Master Dashboard & Telemetry Coordinator
 * Handles SSE telemetry sync, Father's control deck, AI tutor chat, and schedule rendering.
 */

class GuardianAppController {
  constructor() {
    this.sseSource = null;
    this.pollInterval = null;
    this.activeSubject = 'Mathematics';
    
    this.initElements();
    this.initTheme();
    this.bindEvents();
    this.initClock();
    this.initSSE();
    this.fetchInitialStatus();
  }

  initElements() {
    // Navigation & View switcher
    this.navTabs = document.querySelectorAll('#main-nav-tabs .tab-btn');
    this.layoutGrid = document.getElementById('layout-dual-grid');
    this.childContainer = document.getElementById('child-device-container');
    this.fatherContainer = document.getElementById('father-dashboard-container');

    // Theme selector
    this.themeSelect = document.getElementById('theme-select');

    // Status pill
    this.sseDot = document.getElementById('sse-status-dot');
    this.sseText = document.getElementById('sse-status-text');
    this.speedBtn = document.getElementById('btn-toggle-demo-speed');

    // Metrics elements
    this.metricContinuousTime = document.getElementById('metric-continuous-time');
    this.metricContinuousProgress = document.getElementById('metric-continuous-progress');
    this.metricEyeBreaksCount = document.getElementById('metric-eye-breaks-count');

    this.metricEntertainmentTime = document.getElementById('metric-entertainment-time');
    this.metricEntertainmentProgress = document.getElementById('metric-entertainment-progress');
    this.metricEntStatusBadge = document.getElementById('metric-ent-status-badge');

    this.metricStudyTime = document.getElementById('metric-study-time');
    this.metricStudyProgress = document.getElementById('metric-study-progress');
    this.metricStudyStatusBadge = document.getElementById('metric-study-status-badge');

    this.metricActiveApp = document.getElementById('metric-active-app');
    this.metricDeviceState = document.getElementById('metric-device-state');

    // Pocket Money Card elements
    this.pmBaseAmount = document.getElementById('pm-base-amount');
    this.pmTotalDeductions = document.getElementById('pm-total-deductions');
    this.pmFinalAmount = document.getElementById('pm-final-amount');
    this.pmViolationsCount = document.getElementById('pm-violations-count');
    this.pmStatusNote = document.getElementById('pm-status-note');
    this.pmLedger = document.getElementById('pm-deductions-ledger');
    this.btnWaiveDeductions = document.getElementById('btn-waive-deductions');
    this.btnReapplyDeductions = document.getElementById('btn-reapply-deductions');

    // School Diary elements
    this.diaryInput = document.getElementById('diary-input');
    this.btnSubmitDiary = document.getElementById('btn-submit-diary');
    this.childScheduleBox = document.getElementById('child-schedule-box');
    this.childScheduleItems = document.getElementById('child-schedule-items-list');
    this.childScheduleTotalMins = document.getElementById('child-schedule-total-mins');
    this.fatherScheduleGrid = document.getElementById('father-schedule-grid');
    this.diarySubmissionStatus = document.getElementById('diary-submission-status');

    // AI Tutor chat elements
    this.chatInput = document.getElementById('chat-input');
    this.btnSendChat = document.getElementById('btn-send-chat');
    this.chatContainer = document.getElementById('chat-messages-container');

    // Telemetry log elements
    this.logBox = document.getElementById('telemetry-log-box');
    this.logCountEl = document.getElementById('telemetry-log-count');
    this.logEntriesCount = 1;
  }

  bindEvents() {
    // 1. View Navigation Tabs
    this.navTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        this.navTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // 2. Demo Speed Toggle Button
    if (this.speedBtn) {
      this.speedBtn.addEventListener('click', () => {
        if (window.ChildDevice) {
          window.ChildDevice.demoModeActive = !window.ChildDevice.demoModeActive;
          if (window.ChildDevice.demoModeActive) {
            this.speedBtn.innerHTML = '⚡ Demo Speed: <strong>60x (Active)</strong>';
            this.speedBtn.style.background = 'rgba(245, 158, 11, 0.12)';
            this.appendLog('SimSpeed', 'Demo mode accelerated to 60x (20m eye break in 20s, 1.5h in 90s)');
          } else {
            this.speedBtn.innerHTML = '⏱️ Speed: <strong>1x (Real Time)</strong>';
            this.speedBtn.style.background = 'rgba(255, 255, 255, 0.05)';
            this.appendLog('SimSpeed', 'Switched to standard 1x real-time mode');
          }
        }
      });
    }

    // 3. Preset Diary Chips
    document.querySelectorAll('.preset-diary-chips .chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-preset');
        if (type === 'maths') {
          this.diaryInput.value = 'Mathematics Chapter 4: Quadratic Equations Ex 4.2; Physics: Newton\'s Three Laws of Motion with derivations; English: 250-word essay on AI Ethics.';
        } else if (type === 'science') {
          this.diaryInput.value = 'Biology: Mendelian Genetics & Punnett Squares; Chemistry: Ionic vs Covalent Bonding mechanisms; Pakistan Studies / World History: Industrial Revolution timeline.';
        } else if (type === 'cs') {
          this.diaryInput.value = 'Computer Science: Python loop structures & time complexity; Discrete Mathematics: Graph traversal algorithms.';
        }
      });
    });

    // 4. Diary Submission
    if (this.btnSubmitDiary) {
      this.btnSubmitDiary.addEventListener('click', () => {
        this.submitDiary();
      });
    }

    // 5. Chat Input Submission
    if (this.btnSendChat) {
      this.btnSendChat.addEventListener('click', () => {
        this.sendChatMessage();
      });
    }
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }

    // Quick Prompt Buttons for Tutor
    const btnPromptAcademic = document.getElementById('prompt-academic');
    if (btnPromptAcademic) {
      btnPromptAcademic.addEventListener('click', () => {
        this.chatInput.value = 'How do I use the quadratic formula to solve x² - 5x + 6 = 0?';
        this.sendChatMessage();
      });
    }

    const btnPromptGaming = document.getElementById('prompt-gaming');
    if (btnPromptGaming) {
      btnPromptGaming.addEventListener('click', () => {
        this.chatInput.value = 'What is the best enchant for my diamond sword in Minecraft?';
        this.sendChatMessage();
      });
    }

    // 6. Father Remote Control Overrides
    const btnLock = document.getElementById('btn-remote-lock');
    if (btnLock) {
      btnLock.addEventListener('click', () => {
        this.sendParentOverride('lock_now');
      });
    }

    const btnUnlock = document.getElementById('btn-remote-unlock');
    if (btnUnlock) {
      btnUnlock.addEventListener('click', () => {
        this.sendParentOverride('unlock');
      });
    }

    const btnEyeBreak = document.getElementById('btn-remote-eyebreak');
    if (btnEyeBreak) {
      btnEyeBreak.addEventListener('click', () => {
        this.sendParentOverride('trigger_eye_break');
      });
    }

    const btnGrant = document.getElementById('btn-remote-grant-time');
    if (btnGrant) {
      btnGrant.addEventListener('click', () => {
        this.sendParentOverride('grant_time');
      });
    }

    const btnResetDay = document.getElementById('btn-remote-reset-day');
    if (btnResetDay) {
      btnResetDay.addEventListener('click', () => {
        if (confirm('Reset today\'s simulation counters, pocket money ledger, and violations for a clean run?')) {
          this.sendParentOverride('reset_day');
        }
      });
    }

    // 7. Waive / Reapply Deductions
    if (this.btnWaiveDeductions) {
      this.btnWaiveDeductions.addEventListener('click', () => {
        this.sendParentOverride('waive_deduction', { waive: true });
      });
    }
    if (this.btnReapplyDeductions) {
      this.btnReapplyDeductions.addEventListener('click', () => {
        this.sendParentOverride('waive_deduction', { waive: false });
      });
    }
  }

  switchView(view) {
    if (view === 'dual') {
      this.layoutGrid.style.gridTemplateColumns = '410px 1fr';
      this.childContainer.style.display = 'flex';
      this.fatherContainer.style.display = 'flex';
    } else if (view === 'desktop') {
      this.layoutGrid.style.gridTemplateColumns = '1fr';
      this.childContainer.style.display = 'none';
      this.fatherContainer.style.display = 'flex';
    } else if (view === 'mobile') {
      this.layoutGrid.style.gridTemplateColumns = '1fr';
      this.childContainer.style.display = 'flex';
      this.fatherContainer.style.display = 'none';
    } else if (view === 'pocket') {
      this.layoutGrid.style.gridTemplateColumns = '410px 1fr';
      this.childContainer.style.display = 'flex';
      this.fatherContainer.style.display = 'flex';
      const pocketCard = document.getElementById('pocket-money-card');
      if (pocketCard) {
        pocketCard.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  initTheme() {
    const savedTheme = localStorage.getItem('guardian_eye_theme') || 'cyber-cyan';
    this.applyTheme(savedTheme, false);
    if (this.themeSelect) {
      this.themeSelect.value = savedTheme;
      this.themeSelect.addEventListener('change', (e) => {
        this.applyTheme(e.target.value, true);
      });
    }
  }

  applyTheme(themeKey, logChange = true) {
    document.documentElement.setAttribute('data-theme', themeKey);
    localStorage.setItem('guardian_eye_theme', themeKey);
    if (this.themeSelect) {
      this.themeSelect.value = themeKey;
    }
    const themeNames = {
      'cyber-cyan': '1. Cyber Cyan 🌐',
      'emerald-matrix': '2. Emerald Matrix 🌲',
      'tokyo-sunset': '3. Tokyo Sunset 🌆',
      'solar-amber': '4. Solar Amber ☀️',
      'nordic-frost': '5. Nordic Frost ❄️',
      'dracula-crimson': '6. Dracula Crimson 🩸',
      'deep-amethyst': '7. Deep Amethyst 🔮'
    };
    const name = themeNames[themeKey] || themeKey;
    if (logChange) {
      this.appendLog('Theme Engine', `Switched UI theme to ${name}`);
    }
  }

  initClock() {
    const clockEl = document.getElementById('phone-clock');
    if (!clockEl) return;
    const updateTime = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    updateTime();
    setInterval(updateTime, 30000);
  }

  initSSE() {
    try {
      this.sseSource = new EventSource('/api/stream');

      this.sseSource.onopen = () => {
        this.setSSEStatus(true, 'Live Sync SSE');
      };

      this.sseSource.addEventListener('heartbeat', (e) => {
        const data = JSON.parse(e.data);
        this.updateTelemetryMetrics(data);
      });

      this.sseSource.addEventListener('app_switched', (e) => {
        const data = JSON.parse(e.data);
        if (this.metricActiveApp) this.metricActiveApp.textContent = data.app_name;
        this.appendLog(data.app_name, `Switched foreground app to ${data.app_name}`);
      });

      this.sseSource.addEventListener('diary_updated', (e) => {
        const data = JSON.parse(e.data);
        this.renderSchedule(data.schedule);
        this.appendLog('AI Study Hub', `Work diary processed: ${data.schedule.total_minutes}m schedule generated`);
      });

      this.sseSource.addEventListener('violation_recorded', (e) => {
        const data = JSON.parse(e.data);
        this.updatePocketMoney(data.pocket_money);
        this.appendLog('Violation', `${data.violation.reason} (-Rs ${data.violation.penalty})`);
      });

      this.sseSource.addEventListener('parent_override', (e) => {
        const data = JSON.parse(e.data);
        this.appendLog('Parent Override', data.message);
        this.fetchInitialStatus();
      });

      this.sseSource.onerror = () => {
        this.setSSEStatus(false, 'Polling Mode (HTTP)');
        // Fallback to regular polling
        if (!this.pollInterval) {
          this.pollInterval = setInterval(() => this.fetchInitialStatus(), 3000);
        }
      };
    } catch (err) {
      console.warn('SSE not supported or failed, fallback to polling:', err);
      this.setSSEStatus(false, 'Polling Mode');
      this.pollInterval = setInterval(() => this.fetchInitialStatus(), 3000);
    }
  }

  setSSEStatus(online, text) {
    if (this.sseDot) {
      this.sseDot.style.background = online ? 'var(--accent-emerald)' : 'var(--accent-amber)';
      this.sseDot.style.boxShadow = online ? '0 0 8px var(--accent-emerald)' : 'none';
    }
    if (this.sseText) this.sseText.textContent = text;
  }

  fetchInitialStatus() {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          this.updateTelemetryMetrics(data.session);
        }
        if (data.pocket_money) {
          this.updatePocketMoney(data.pocket_money);
        }
        if (data.diary && data.diary.schedule) {
          this.renderSchedule(data.diary.schedule);
        }
      })
      .catch(err => console.error('Status fetch error:', err));
  }

  updateTelemetryMetrics(telemetry) {
    const continuousSec = telemetry.continuous_screen_seconds || 0;
    const entSec = telemetry.entertainment_seconds || 0;
    const studySec = telemetry.study_seconds || 0;
    const breaksTaken = telemetry.eye_breaks_taken || 0;
    const currentApp = telemetry.current_app || telemetry.current_foreground_app || 'Home';

    // 1. Continuous Screen Time Metric
    const cMins = Math.floor(continuousSec / 60);
    const cSecs = continuousSec % 60;
    if (this.metricContinuousTime) {
      this.metricContinuousTime.textContent = `${cMins}m ${cSecs}s`;
    }
    if (this.metricContinuousProgress) {
      // 20 minutes threshold = 1200 seconds
      const pct = Math.min(100, Math.round((continuousSec / 1200) * 100));
      this.metricContinuousProgress.style.width = `${pct}%`;
      this.metricContinuousProgress.style.background = pct >= 90 ? 'var(--accent-rose)' : 'var(--accent-amber)';
    }
    if (this.metricEyeBreaksCount) {
      this.metricEyeBreaksCount.textContent = `${breaksTaken} Break${breaksTaken === 1 ? '' : 's'} Taken`;
    }

    // 2. Entertainment Time Metric (90 minutes / 1.5h cap)
    const eMins = Math.floor(entSec / 60);
    const eSecs = entSec % 60;
    if (this.metricEntertainmentTime) {
      this.metricEntertainmentTime.textContent = `${eMins}m ${eSecs}s`;
    }
    if (this.metricEntertainmentProgress) {
      const entPct = Math.min(100, Math.round((entSec / 5400) * 100));
      this.metricEntertainmentProgress.style.width = `${entPct}%`;
    }
    if (this.metricEntStatusBadge) {
      if (telemetry.is_entertainment_locked || entSec >= 5400) {
        this.metricEntStatusBadge.textContent = '🔒 HARD LOCKED';
        this.metricEntStatusBadge.style.color = 'var(--accent-rose)';
      } else {
        this.metricEntStatusBadge.textContent = 'Within Limit';
        this.metricEntStatusBadge.style.color = 'var(--accent-emerald)';
      }
    }

    // Also update phone mini widget
    const phoneEntBar = document.getElementById('phone-ent-progress-bar');
    if (phoneEntBar) {
      const entPct = Math.min(100, Math.round((entSec / 5400) * 100));
      phoneEntBar.style.width = `${Math.max(5, entPct)}%`;
    }

    // 3. Mandatory Study Goal Metric (120 minutes / 2h goal)
    const sMins = Math.floor(studySec / 60);
    const sSecs = studySec % 60;
    if (this.metricStudyTime) {
      this.metricStudyTime.textContent = `${sMins}m ${sSecs}s`;
    }
    if (this.metricStudyProgress) {
      const studyPct = Math.min(100, Math.round((studySec / 7200) * 100));
      this.metricStudyProgress.style.width = `${studyPct}%`;
    }
    if (this.metricStudyStatusBadge) {
      if (studySec >= 7200) {
        this.metricStudyStatusBadge.textContent = '✓ Goal Achieved';
        this.metricStudyStatusBadge.style.color = 'var(--accent-emerald)';
      } else {
        this.metricStudyStatusBadge.textContent = `${Math.round((studySec / 7200) * 100)}% Progress`;
        this.metricStudyStatusBadge.style.color = 'var(--accent-amber)';
      }
    }

    // 4. Active Device & App
    if (this.metricActiveApp) {
      this.metricActiveApp.textContent = currentApp;
    }

    // Update pocket money if included in heartbeat
    if (telemetry.pocket_money) {
      this.updatePocketMoney(telemetry.pocket_money);
    }
  }

  updatePocketMoney(pm) {
    if (!pm) return;
    const base = Number(pm.base_allowance ?? pm.base_amount ?? 100.0);
    const deductions = Number(pm.total_deductions ?? pm.deductions ?? 0.0);
    const finalAmt = Number(pm.final_allowance ?? pm.final_amount ?? base - deductions);
    const breakdown = pm.breakdown || pm.violations || [];

    if (this.pmBaseAmount) this.pmBaseAmount.textContent = `Rs ${base.toFixed(1)}`;
    if (this.pmTotalDeductions) {
      this.pmTotalDeductions.textContent = `-Rs ${deductions.toFixed(1)}`;
      this.pmTotalDeductions.className = `pm-stat-num ${deductions > 0 ? 'penalty' : 'safe'}`;
    }
    if (this.pmFinalAmount) {
      this.pmFinalAmount.textContent = `Rs ${finalAmt.toFixed(1)}`;
    }
    if (this.pmViolationsCount) {
      const count = breakdown.length;
      this.pmViolationsCount.textContent = `${count} violation${count === 1 ? '' : 's'} logged today`;
    }
    if (this.pmStatusNote) {
      if (pm.is_waived) {
        this.pmStatusNote.textContent = '🤝 Deductions waived by Father!';
        this.pmStatusNote.style.color = 'var(--accent-emerald)';
        if (this.btnWaiveDeductions) this.btnWaiveDeductions.style.display = 'none';
        if (this.btnReapplyDeductions) this.btnReapplyDeductions.style.display = 'inline-flex';
      } else if (deductions > 0) {
        this.pmStatusNote.textContent = `⚠️ Penalties applied (-Rs ${deductions.toFixed(1)})`;
        this.pmStatusNote.style.color = 'var(--accent-rose)';
        if (this.btnWaiveDeductions) this.btnWaiveDeductions.style.display = 'inline-flex';
        if (this.btnReapplyDeductions) this.btnReapplyDeductions.style.display = 'none';
      } else {
        this.pmStatusNote.textContent = '✓ Eligible for full allowance';
        this.pmStatusNote.style.color = 'var(--accent-emerald)';
        if (this.btnWaiveDeductions) this.btnWaiveDeductions.style.display = 'none';
        if (this.btnReapplyDeductions) this.btnReapplyDeductions.style.display = 'none';
      }
    }

    // Populate Itemized Deductions Ledger
    if (this.pmLedger) {
      if (breakdown.length === 0) {
        this.pmLedger.innerHTML = `
          <div class="ledger-item">
            <span class="ledger-rule" style="color: var(--text-dim);">No violations recorded today. Clean behavioral record!</span>
            <span class="ledger-amt" style="color: var(--accent-emerald);">+ Rs 0.00</span>
          </div>
        `;
      } else {
        this.pmLedger.innerHTML = breakdown.map(v => `
          <div class="ledger-item">
            <div>
              <div class="ledger-rule">${v.rule || v.details || v.violation_type}</div>
              <div style="font-size: 10px; color: var(--text-dim);">${v.details || 'System Policy Rule'}</div>
            </div>
            <div class="ledger-amt">-Rs ${Number(v.amount || v.deduction_amount || 0).toFixed(1)}</div>
          </div>
        `).join('');
      }
    }
  }

  submitDiary() {
    const rawText = this.diaryInput.value.trim();
    if (!rawText) {
      alert('Please enter or select a homework diary task first.');
      return;
    }

    if (this.btnSubmitDiary) {
      this.btnSubmitDiary.disabled = true;
      this.btnSubmitDiary.textContent = '⏳ AI Parsing Schedule...';
    }

    fetch('/api/diary/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diary_text: rawText })
    })
    .then(res => res.json())
    .then(data => {
      if (this.btnSubmitDiary) {
        this.btnSubmitDiary.disabled = false;
        this.btnSubmitDiary.textContent = '⚡ AI Parse Diary & Enforce 2h Schedule';
      }

      if (data.schedule) {
        this.renderSchedule(data.schedule);
        alert(`✅ AI parsed diary successfully!\nGenerated mandatory 2-hour schedule across ${data.schedule.subjects.length} subjects.`);
      }
    })
    .catch(err => {
      console.error(err);
      if (this.btnSubmitDiary) {
        this.btnSubmitDiary.disabled = false;
        this.btnSubmitDiary.textContent = '⚡ AI Parse Diary & Enforce 2h Schedule';
      }
    });
  }

  renderSchedule(schedule) {
    if (!schedule) return;
    const items = schedule.blocks || schedule.subjects || [];
    if (items.length === 0) return;

    if (this.diarySubmissionStatus) {
      this.diarySubmissionStatus.textContent = `Active: ${schedule.total_minutes} mins allocated`;
      this.diarySubmissionStatus.style.color = 'var(--accent-emerald)';
    }

    // 1. Render inside Child Mobile Study Hub
    if (this.childScheduleBox && this.childScheduleItems) {
      this.childScheduleBox.style.display = 'block';
      if (this.childScheduleTotalMins) {
        this.childScheduleTotalMins.textContent = schedule.total_minutes;
      }

      this.childScheduleItems.innerHTML = items.map(sub => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; background: rgba(255,255,255,0.03); border-radius: 4px;">
          <div>
            <span style="color: #fff; font-weight: 600;">${sub.subject || sub.name}</span>
            <span style="color: var(--text-dim); font-size: 10px; margin-left: 4px;">${sub.task || sub.topic || ''}</span>
          </div>
          <span style="color: var(--primary); font-family: 'JetBrains Mono', monospace; font-size: 10px;">${sub.allocated_minutes}m</span>
        </div>
      `).join('');
    }

    // 2. Render inside Father's Dashboard Monitor Grid
    if (this.fatherScheduleGrid) {
      this.fatherScheduleGrid.innerHTML = items.map(sub => `
        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #fff; font-size: 13px;">${sub.subject || sub.name}</span>
            <span style="font-size: 11px; color: var(--primary); font-weight: 700; background: rgba(56,189,248,0.1); padding: 2px 6px; border-radius: 4px;">
              ${sub.allocated_minutes} Mins
            </span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
            ${sub.task || sub.topic || 'Homework and Exercises'}
          </div>
          <div class="metric-progress" style="height: 4px;">
            <div class="metric-progress-fill" style="width: 25%; background: var(--accent-emerald);"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-dim); margin-top: 6px;">
            <span>AI Socratic Tutoring</span>
            <span style="color: var(--accent-emerald);">In Progress</span>
          </div>
        </div>
      `).join('');
    }
  }

  sendChatMessage() {
    const text = this.chatInput.value.trim();
    if (!text) return;

    this.chatInput.value = '';

    // Append student bubble
    this.appendChatBubble(text, 'student');

    // Notify child controller of activity to keep anti-cheat idle timer happy!
    if (window.ChildDevice) {
      window.ChildDevice.recordActiveInteraction(text);
    }

    // Call Socratic Tutor API
    fetch('/api/ai/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        subject: this.activeSubject
      })
    })
    .then(r => r.json())
    .then(data => {
      const replyText = data.response || data.reply || '';
      if (data.allowed) {
        this.appendChatBubble(replyText, 'ai');
      } else {
        // Guardrail violation bubble!
        this.appendChatBubble(replyText, 'guardrail-alert');
        this.appendLog('AI Guardrail', `Blocked non-academic query: "${text.substring(0, 30)}..."`);
      }
    })
    .catch(err => {
      console.error(err);
      this.appendChatBubble('Sorry, error communicating with AI tutor service.', 'ai');
    });
  }

  appendChatBubble(text, type) {
    if (!this.chatContainer) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    // Simple formatting for bold, newlines, and code
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    bubble.innerHTML = formatted;

    this.chatContainer.appendChild(bubble);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  sendParentOverride(action, extra = {}) {
    const payload = Object.assign({ action: action }, extra);
    fetch('/api/parent/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
      this.appendLog('Remote Command', data.message || `Action ${action} executed`);
      this.fetchInitialStatus();
    })
    .catch(err => console.error('Parent override error:', err));
  }

  appendLog(app, msg) {
    if (!this.logBox) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="log-app">${app}</span>
      <span class="log-msg">${msg}</span>
    `;

    this.logBox.prepend(entry);
    this.logEntriesCount++;
    if (this.logCountEl) this.logCountEl.textContent = `${this.logEntriesCount} events`;

    // Limit log rows to 60
    while (this.logBox.children.length > 60) {
      this.logBox.removeChild(this.logBox.lastChild);
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.GuardianApp = new GuardianAppController();
});
