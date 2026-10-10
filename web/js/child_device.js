/**
 * GuardianEye AI - Child Device Controller & Simulation
 * Handles local device state, 20-20-35 eye break enforcement, 1.5h hard lock, and anti-cheat tracking.
 */
class ChildDeviceController {
  constructor() {
    this.currentApp = 'Home';
    this.continuousScreenSeconds = 0;
    this.entertainmentSeconds = 0;
    this.studySeconds = 0;
    
    this.isEyeBreakActive = false;
    this.isHardLocked = false;
    this.isStudying = false;
    
    // Anti-cheat engagement tracking
    this.idleSeconds = 0;
    this.lastInputText = '';
    this.interactionCount = 0;
    this.demoSpeedMultiplier = 60; // 1 real sec = 60 simulation secs in demo mode!
    this.demoModeActive = true;
    
    this.initElements();
    this.bindEvents();
    this.startHeartbeatLoop();
  }

  initElements() {
    this.overlayEyeBreak = document.getElementById('overlay-eye-break');
    this.eyeCountdownEl = document.getElementById('eye-break-countdown-num');
    this.overlayHardLock = document.getElementById('overlay-hard-lock');
    this.pinInput = document.getElementById('parent-pin-unlock');
    this.unlockPinBtn = document.getElementById('btn-unlock-pin');
    
    this.activeAppPill = document.getElementById('child-current-app-pill');
    this.idleWarningBanner = document.getElementById('child-idle-warning');
  }

  bindEvents() {
    // App drawer launchers
    document.querySelectorAll('[data-launch-app]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const appName = btn.getAttribute('data-launch-app');
        this.switchApp(appName);
      });
    });

    // Parent PIN unlock
    if (this.unlockPinBtn) {
      this.unlockPinBtn.addEventListener('click', () => {
        const pin = this.pinInput.value.trim();
        if (pin === '3443') {
          this.unlockDeviceViaPin();
        } else {
          alert('❌ Incorrect Parent PIN! Contact your father for an override.');
        }
      });
    }

    // Anti-cheat interaction listeners inside study hub
    const studyContainer = document.getElementById('app-study-hub');
    if (studyContainer) {
      ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt => {
        studyContainer.addEventListener(evt, () => {
          this.recordActiveInteraction();
        });
      });
    }

    // Manual Simulate Idle button for judge demo
    const btnSimulateIdle = document.getElementById('btn-simulate-idle');
    if (btnSimulateIdle) {
      btnSimulateIdle.addEventListener('click', () => {
        this.triggerSimulatedIdleCheat();
      });
    }
  }

  switchApp(appName) {
    if (this.isEyeBreakActive) {
      alert('👁️ Look at an object 20 feet away! Screen is temporarily locked for eye health.');
      return;
    }
    if (this.isHardLocked && appName !== 'AI Study Hub') {
      alert('🔒 Entertainment time limit reached (1.5 hours)! Only AI Study Hub is permitted.');
      return;
    }

    this.currentApp = appName;
    this.isStudying = (appName === 'AI Study Hub');

    // Update App Switcher UI
    document.querySelectorAll('.app-screen').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.child-app-tab').forEach(el => el.classList.remove('active'));

    const targetScreen = document.getElementById(`app-${appName.toLowerCase().replace(/\s+/g, '-')}`);
    if (targetScreen) targetScreen.classList.add('active');

    const targetTab = document.querySelector(`[data-tab-app="${appName}"]`);
    if (targetTab) targetTab.classList.add('active');

    if (this.activeAppPill) {
      this.activeAppPill.textContent = appName;
    }

    // Reset idle timer when switching apps
    this.idleSeconds = 0;
    if (this.idleWarningBanner) this.idleWarningBanner.style.display = 'none';

    // Notify backend of app switch
    fetch('/api/telemetry/app_switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_name: appName })
    }).catch(err => console.error('App switch error:', err));
  }

  recordActiveInteraction(textSample = '') {
    this.idleSeconds = 0;
    this.interactionCount++;
    if (textSample) this.lastInputText = textSample;
    if (this.idleWarningBanner) this.idleWarningBanner.style.display = 'none';
  }

  triggerSimulatedIdleCheat() {
    this.idleSeconds = 55; // Immediate trigger
    if (this.idleWarningBanner) {
      this.idleWarningBanner.style.display = 'block';
      this.idleWarningBanner.textContent = '⚠️ Anti-Cheat Warning: Inactivity detected! Study timer paused. Penalty alert sent to Father (-Rs 15).';
    }
    // Push strike to server
    fetch('/api/ai/engagement_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idle_seconds: 55,
        last_input_text: this.lastInputText || 'idle'
      })
    }).then(res => res.json()).then(data => {
      console.log('Engagement strike recorded:', data);
    });
  }

  startHeartbeatLoop() {
    setInterval(() => {
      this.tick();
    }, 1000);
  }

  tick() {
    // Determine effective simulation speed
    const stepSeconds = this.demoModeActive ? (1 * this.demoSpeedMultiplier) : 1;

    // Track idle seconds in study mode
    if (this.isStudying && !this.isEyeBreakActive) {
      this.idleSeconds += (this.demoModeActive ? 4 : 1);
      if (this.idleSeconds >= 45) {
        if (this.idleWarningBanner) {
          this.idleWarningBanner.style.display = 'block';
          this.idleWarningBanner.textContent = `⚠️ Inactive for ${this.idleSeconds}s! Study timer paused. Idling strike flagged (-Rs 15).`;
        }
      }
    }

    const isEngaged = (!this.isStudying || this.idleSeconds < 45);

    // Sync with backend telemetry
    fetch('/api/telemetry/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: this.currentApp,
        delta_seconds: stepSeconds,
        is_studying: this.isStudying,
        is_idle: !isEngaged,
        demo_mode: this.demoModeActive
      })
    })
    .then(r => r.json())
    .then(telemetry => {
      this.updateStateFromTelemetry(telemetry);
    })
    .catch(err => console.error('Heartbeat sync error:', err));
  }

  updateStateFromTelemetry(data) {
    this.continuousScreenSeconds = data.continuous_screen_seconds || 0;
    this.entertainmentSeconds = data.entertainment_seconds || 0;
    this.studySeconds = data.study_seconds || 0;

    // 1. Check 20-20-35 Eye Break Trigger
    if (data.is_eye_break_active || data.trigger_eye_break) {
      this.engageEyeBreakOverlay();
    } else {
      this.hideEyeBreakOverlay();
    }

    // 2. Check 1.5 Hour Hard Lock
    if (data.is_entertainment_locked || data.trigger_ent_lock) {
      this.engageHardLockOverlay();
    } else {
      this.hideHardLockOverlay();
    }

    // Update local status badges
    const continuousMinEl = document.getElementById('phone-continuous-timer');
    if (continuousMinEl) {
      const mins = Math.floor(this.continuousScreenSeconds / 60);
      const secs = this.continuousScreenSeconds % 60;
      continuousMinEl.textContent = `${mins}m ${secs}s / 20m`;
    }
  }

  engageEyeBreakOverlay() {
    if (this.isEyeBreakActive) return;
    this.isEyeBreakActive = true;
    if (this.overlayEyeBreak) {
      this.overlayEyeBreak.classList.add('active');
    }

    // Run 35-second countdown
    let secondsLeft = 35;
    if (this.eyeCountdownEl) this.eyeCountdownEl.textContent = `${secondsLeft}s`;

    if (this.eyeBreakTimerInterval) clearInterval(this.eyeBreakTimerInterval);
    this.eyeBreakTimerInterval = setInterval(() => {
      secondsLeft--;
      if (this.eyeCountdownEl) this.eyeCountdownEl.textContent = `${secondsLeft}s`;

      if (secondsLeft <= 0) {
        clearInterval(this.eyeBreakTimerInterval);
        this.completeEyeBreak();
      }
    }, 1000);
  }

  completeEyeBreak() {
    this.isEyeBreakActive = false;
    this.hideEyeBreakOverlay();

    // Notify backend eye break is finished
    fetch('/api/parent/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end_eye_break' })
    }).catch(err => console.error(err));
  }

  hideEyeBreakOverlay() {
    this.isEyeBreakActive = false;
    if (this.overlayEyeBreak) {
      this.overlayEyeBreak.classList.remove('active');
    }
    if (this.eyeBreakTimerInterval) clearInterval(this.eyeBreakTimerInterval);
  }

  engageHardLockOverlay() {
    this.isHardLocked = true;
    if (this.overlayHardLock) {
      this.overlayHardLock.classList.add('active');
    }
  }

  hideHardLockOverlay() {
    this.isHardLocked = false;
    if (this.overlayHardLock) {
      this.overlayHardLock.classList.remove('active');
    }
  }

  unlockDeviceViaPin() {
    fetch('/api/parent/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unlock' })
    })
    .then(r => r.json())
    .then(() => {
      this.hideHardLockOverlay();
      this.pinInput.value = '';
      alert('✅ PIN Accepted! Device unlocked.');
    });
  }
}

window.ChildDevice = new ChildDeviceController();
