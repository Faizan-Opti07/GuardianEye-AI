/**
 * GuardianEye AI - Child Device Controller & Simulation
 * Handles local device state, 20-20-35 eye break enforcement, 1.5h hard lock,
 * and fully interactive native child apps (YouTube, Subway Surfers, Minecraft, Study Hub).
 */

class ChildDeviceController {
  constructor() {
    this.currentApp = 'Home';
    this.appHistory = ['Home'];
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
    
    // Audio Context for sound effects
    this.audioCtx = null;

    // Interactive Apps State
    this.ytPlaying = true;
    this.ytVideoElapsed = 12;
    this.ytTotalSecs = 860;
    this.ytSoundEnabled = true;

    // Subway Surfers Game State
    this.gameRunning = false;
    this.gameScore = 0;
    this.gameCoins = 0;
    this.playerY = 130;
    this.isJumping = false;
    this.jumpVelocity = 0;
    this.obstacleX = 320;
    this.coinX = 220;

    // Minecraft Inventory
    this.mcInventory = { diamonds: 0, gold: 0, wood: 0, stone: 0 };
    
    this.initElements();
    this.bindEvents();
    this.initInteractiveApps();
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

  playChime(type = 'click') {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'coin') {
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1320, this.audioCtx.currentTime + 0.15); // E6
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.2);
      } else if (type === 'jump') {
        osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.15);
      } else if (type === 'mine') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.1);
      }
    } catch (e) {
      // Audio autoplay policy handled
    }
  }

  bindEvents() {
    // App drawer launchers
    document.querySelectorAll('[data-launch-app]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const appName = btn.getAttribute('data-launch-app');
        this.switchApp(appName);
      });
    });

    // Parent PIN unlock button
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

    // Interactive On-Screen PIN Pad
    document.querySelectorAll('#lock-keypad .keypad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (key === 'C') {
          this.pinInput.value = '';
        } else if (key === 'OK') {
          if (this.pinInput.value === '3443') {
            this.unlockDeviceViaPin();
          } else {
            alert('❌ Incorrect Parent PIN (Hint: 3443)');
          }
        } else {
          if (this.pinInput.value.length < 4) {
            this.pinInput.value += key;
          }
          if (this.pinInput.value.length === 4 && this.pinInput.value === '3443') {
            setTimeout(() => this.unlockDeviceViaPin(), 200);
          }
        }
      });
    });

    // Demo Skip Eye Break button
    const btnSkipBreak = document.getElementById('btn-demo-skip-eyebreak');
    if (btnSkipBreak) {
      btnSkipBreak.addEventListener('click', () => {
        this.completeEyeBreak();
      });
    }

    // Emergency Demo Unlock button (Bypass screen lock)
    const btnEmergencyUnlock = document.getElementById('btn-emergency-demo-unlock');
    if (btnEmergencyUnlock) {
      btnEmergencyUnlock.addEventListener('click', () => {
        this.unlockDeviceViaPin();
      });
    }

    // Android Bottom Navigation Buttons
    const btnBack = document.getElementById('nav-android-back');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (this.appHistory.length > 1) {
          this.appHistory.pop(); // Remove current
          const prev = this.appHistory.pop() || 'Home';
          this.switchApp(prev);
        } else {
          this.switchApp('Home');
        }
      });
    }

    const btnHome = document.getElementById('nav-android-home');
    if (btnHome) {
      btnHome.addEventListener('click', () => {
        this.switchApp('Home');
      });
    }

    const btnRecents = document.getElementById('nav-android-recents');
    if (btnRecents) {
      btnRecents.addEventListener('click', () => {
        this.switchApp('Home');
      });
    }

    // Anti-cheat interaction listeners inside study hub
    const studyContainer = document.getElementById('app-study-hub') || document.getElementById('app-ai-study-hub');
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

  initInteractiveApps() {
    // 1. YouTube Player Controller
    const btnYtPlay = document.getElementById('btn-yt-toggle-play');
    const ytPlayIcon = document.getElementById('yt-play-icon');
    const ytPlayText = document.getElementById('yt-play-text');
    const ytEq = document.getElementById('yt-equalizer');
    const ytTimer = document.getElementById('yt-video-timer');
    const ytTitle = document.getElementById('yt-current-title');
    const btnYtSound = document.getElementById('btn-yt-sound-toggle');

    if (btnYtPlay) {
      btnYtPlay.addEventListener('click', () => {
        this.ytPlaying = !this.ytPlaying;
        if (this.ytPlaying) {
          ytPlayIcon.textContent = '⏸';
          ytPlayText.textContent = 'Pause Video';
          if (ytEq) ytEq.classList.add('playing');
        } else {
          ytPlayIcon.textContent = '▶';
          ytPlayText.textContent = 'Play Video';
          if (ytEq) ytEq.classList.remove('playing');
        }
      });
    }

    if (btnYtSound) {
      btnYtSound.addEventListener('click', () => {
        this.ytSoundEnabled = !this.ytSoundEnabled;
        btnYtSound.textContent = this.ytSoundEnabled ? '🔊 Sound On' : '🔇 Muted';
      });
    }

    // YouTube Playlist Items
    document.querySelectorAll('.yt-playlist-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.yt-playlist-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const newTitle = item.getAttribute('data-yt-title');
        if (ytTitle) ytTitle.textContent = newTitle;
        this.ytVideoElapsed = 0;
        this.ytPlaying = true;
        if (ytPlayIcon) ytPlayIcon.textContent = '⏸';
        if (ytPlayText) ytPlayText.textContent = 'Pause Video';
        if (ytEq) ytEq.classList.add('playing');
      });
    });

    // YouTube ticker
    setInterval(() => {
      if (this.currentApp === 'YouTube' && this.ytPlaying && !this.isEyeBreakActive && !this.isHardLocked) {
        this.ytVideoElapsed++;
        if (ytTimer) {
          const m = Math.floor(this.ytVideoElapsed / 60);
          const s = this.ytVideoElapsed % 60;
          ytTimer.textContent = `${m}:${s < 10 ? '0' : ''}${s} / 14:20`;
        }
      }
    }, 1000);

    // 2. Playable Subway Surfers Game (Canvas)
    this.initSubwaySurfersGame();

    // 3. Minecraft Block Mining Sandbox
    document.querySelectorAll('.mc-block').forEach(block => {
      block.addEventListener('click', () => {
        const type = block.getAttribute('data-type');
        this.mineBlock(block, type);
      });
    });
  }

  mineBlock(el, type) {
    this.playChime('mine');
    el.style.transform = 'scale(0.8)';
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);

    if (type === 'diamond') {
      this.mcInventory.diamonds++;
      const elD = document.getElementById('mc-inv-diamonds');
      if (elD) elD.textContent = this.mcInventory.diamonds;
    } else if (type === 'gold') {
      this.mcInventory.gold++;
      const elG = document.getElementById('mc-inv-gold');
      if (elG) elG.textContent = this.mcInventory.gold;
    } else if (type === 'wood') {
      this.mcInventory.wood++;
      const elW = document.getElementById('mc-inv-wood');
      if (elW) elW.textContent = this.mcInventory.wood;
    } else {
      this.mcInventory.stone++;
      const elS = document.getElementById('mc-inv-stone');
      if (elS) elS.textContent = this.mcInventory.stone;
    }
  }

  initSubwaySurfersGame() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const btnJump = document.getElementById('btn-game-jump');
    const scoreEl = document.getElementById('game-score-display');
    const coinsEl = document.getElementById('game-coins-count');

    const jump = () => {
      if (!this.isJumping) {
        this.isJumping = true;
        this.jumpVelocity = -12;
        this.playChime('jump');
      }
    };

    if (btnJump) btnJump.addEventListener('click', jump);
    canvas.addEventListener('click', jump);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.currentApp === 'Subway Surfers') {
        e.preventDefault();
        jump();
      }
    });

    // Game loop
    let lastTime = 0;
    const gameLoop = (time) => {
      if (this.currentApp === 'Subway Surfers' && !this.isEyeBreakActive && !this.isHardLocked) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Ground track
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 150, canvas.width, 30);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 158, canvas.width, 4);

        // Update player jump physics
        if (this.isJumping) {
          this.playerY += this.jumpVelocity;
          this.jumpVelocity += 0.8; // gravity
          if (this.playerY >= 130) {
            this.playerY = 130;
            this.isJumping = false;
          }
        }

        // Draw Player (Surfer)
        ctx.font = '24px sans-serif';
        ctx.fillText('🏄', 40, this.playerY);

        // Move obstacle
        this.obstacleX -= 4;
        if (this.obstacleX < -20) {
          this.obstacleX = 320 + Math.random() * 80;
          this.gameScore += 10;
          if (scoreEl) scoreEl.textContent = `Score: ${this.gameScore}`;
        }
        ctx.fillText('🚧', this.obstacleX, 142);

        // Move coins
        this.coinX -= 3.5;
        if (this.coinX < -20) {
          this.coinX = 320 + Math.random() * 120;
        }
        ctx.fillText('🪙', this.coinX, 120);

        // Check Coin Collision
        if (Math.abs(this.coinX - 40) < 20 && Math.abs(this.playerY - 120) < 25) {
          this.gameCoins++;
          this.coinX = 360;
          this.playChime('coin');
          if (coinsEl) coinsEl.textContent = `🪙 Coins: ${this.gameCoins}`;
        }
      }
      requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame(gameLoop);
  }

  switchApp(appName) {
    this.currentApp = appName;
    this.appHistory.push(appName);
    this.isStudying = (appName === 'AI Study Hub');

    // Update App Switcher UI
    document.querySelectorAll('.app-screen').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.child-app-tab').forEach(el => el.classList.remove('active'));

    const screenId = `app-${appName.toLowerCase().replace(/\s+/g, '-')}`;
    const targetScreen = document.getElementById(screenId);
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
    // When screen is locked by eye break or hard lock, do NOT advance continuous timer
    if (this.isEyeBreakActive || this.isHardLocked) {
      return;
    }

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

    // 1. 20-20-35 Eye Break (35-sec screen lock disabled per user instruction)
    this.isEyeBreakActive = false;
    this.hideEyeBreakOverlay();

    // 2. 1.5 Hour Hard Lock (auto-locking disabled per user instruction)
    this.isHardLocked = false;
    this.hideHardLockOverlay();

    // Update local status badges
    const continuousMinEl = document.getElementById('phone-continuous-timer');
    if (continuousMinEl) {
      const mins = Math.floor(this.continuousScreenSeconds / 60);
      const secs = this.continuousScreenSeconds % 60;
      continuousMinEl.textContent = `${mins}m ${secs}s / 20m`;
    }
  }

  engageEyeBreakOverlay() {
    // 35-second eye break screen lock is disabled
    this.isEyeBreakActive = false;
    this.hideEyeBreakOverlay();
  }

  completeEyeBreak() {
    this.isEyeBreakActive = false;
    this.hideEyeBreakOverlay();

    // Notify backend eye break is finished
    fetch('/api/parent/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end_eye_break' })
    }).then(() => {
      this.continuousScreenSeconds = 0;
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
    this.isHardLocked = false;
    this.hideHardLockOverlay();
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
      this.hideEyeBreakOverlay();
      if (this.pinInput) this.pinInput.value = '';
      alert('✅ PIN Accepted (3443)! Child device unlocked.');
    });
  }
}

window.ChildDevice = new ChildDeviceController();
