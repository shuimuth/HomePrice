/**
 * CityScene - City overview with NPCs and rental notification
 * Shows the city, displays rental reminder, then transitions to WorkScene.
 */
class CityScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CityScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Draw city background
    this.drawCityBackground(width, height);

    // Add decorative NPCs
    this.addNPCs(width, height);

    // Month indicator
    const month = GameState.currentMonth;
    const monthText = this.add.text(width / 2, 30, `Month ${month} of ${GameState.config.totalGameMonths}`, {
      fontSize: '20px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#f39c12',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    // Balance display
    this.add.text(width - 16, 30, `$${GameState.balance.toLocaleString()}`, {
      fontSize: '16px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#2ecc71',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(100);

    this.add.text(width - 16, 50, 'Balance', {
      fontSize: '11px',
      color: '#95a5a6',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(1, 0.5).setDepth(100);

    // Record month start time
    GameState.monthStartTime = Date.now();

    if (GameState.currentMonth === 1 && !GameState.jobType) {
      this.showIntroStep1();
    } else {
      this.showMonthStart(() => this.startWork());
    }
  }

  showIntroStep1() {
    this.showCurrentState(() => this.showIntroStep2());
  }

  showIntroStep2() {
    this.showCurrentHousing(
      () => this.showIntroStep1(),
      () => this.showExploreHousing()
    );
  }

  showExploreHousing() {
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 480px; padding: 40px 36px; text-align: center;">
        <p style="font-size: 20px; line-height: 1.6; color: #ecf0f1; margin: 0;">
          Now, please explore the
          <span style="color: #e67e22; font-weight: bold; text-decoration: underline;">purchasable housing
          properties</span> on the city map.
        </p>

        <div style="margin-top: 32px;">
          <button class="btn btn-primary btn-cta" id="explore-start" style="font-size: 16px; padding: 12px 40px;">
            Start Exploring →
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('explore-start').addEventListener('click', () => {
      overlay.innerHTML = '';
      this.scene.start('MapScene');
    });
  }

  showCurrentState(callback) {
    const balance = GameState.balance;
    const age = GameState.character && GameState.character.age;

    let backstory = 'left your previous job';
    if (age === '18-24') {
      backstory = 'graduated from school';
    } else if (age === '25-34') {
      backstory = 'left your previous job to seek new opportunities';
    } else if (age === '35-44') {
      backstory = 'decided to start fresh after years of working';
    } else if (age === '45-54') {
      backstory = 'taken a bold step to relocate for a better life';
    } else if (age === '55+') {
      backstory = 'chosen to begin a new chapter in your life';
    }

    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 500px; text-align: left; padding: 32px 36px;">
        <h2 class="city-intro-title">Your Current State</h2>

        <p class="city-intro-welcome">Welcome to Valrenta!</p>

        <p class="city-intro-narrative">
          You've just ${backstory}, and are about to
          <span class="highlight">start a new life here in the city of Valrenta</span>.
        </p>

        <div class="city-stat-card">
          <span class="stat-icon">💰</span>
          <div class="stat-body">
            <div class="stat-label">Starting Funds (Previous Savings)</div>
            <div class="stat-value">$ ${balance.toLocaleString()}</div>
          </div>
        </div>

        <div class="city-btn-row" style="margin-top: 24px;">
          <button class="btn btn-primary" id="current-state-next" style="width: 100%; font-size: 16px;">
            Next
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('current-state-next').addEventListener('click', () => {
      overlay.innerHTML = '';
      callback();
    });
  }

  showCurrentHousing(onPrevious, onNext) {
    const cfg = GameState.config;
    const monthlyRent = Math.round(cfg.monthlyBaseSalary * cfg.livingExpenseRatio * cfg.livingExpenseBreakdown.rent);

    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 520px; padding: 28px 32px;">
        <h2 class="city-intro-title">Your Current Housing</h2>

        <div class="city-warning-badge">
          <span>⚠</span> You do <strong>NOT</strong> own any property
        </div>

        <p class="city-intro-narrative" style="margin-bottom: 14px;">
          You currently live in a small rented basement.
        </p>

        <ul class="city-housing-list">
          <li class="city-housing-item" style="animation-delay: 0.15s;">
            <span class="item-icon">📐</span>
            <span class="item-label">Area</span>
            <span class="item-value" style="color: #ecf0f1;">18 m²</span>
          </li>
          <li class="city-housing-item" style="animation-delay: 0.25s;">
            <span class="item-icon">💵</span>
            <span class="item-label">Monthly Rent</span>
            <span class="item-value" style="color: #f39c12;">$${monthlyRent}</span>
          </li>
          <li class="city-housing-item" style="animation-delay: 0.35s;">
            <span class="item-icon">🏚️</span>
            <span class="item-label">Condition</span>
            <span class="item-value" style="color: #e74c3c;">Poor</span>
          </li>
        </ul>

        <div class="city-housing-image">
          <img src="assets/house/room.jpg" alt="Your small rented basement" />
          <div class="image-overlay"></div>
          <span class="image-caption">Your small rented basement</span>
        </div>

        <div class="city-btn-row">
          <button class="btn btn-secondary" id="housing-prev">Previous</button>
          <button class="btn btn-primary" id="housing-next">Next</button>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('housing-prev').addEventListener('click', () => {
      overlay.innerHTML = '';
      onPrevious();
    });

    document.getElementById('housing-next').addEventListener('click', () => {
      overlay.innerHTML = '';
      onNext();
    });
  }

  drawCityBackground(width, height) {
    // Sky gradient
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x2c3e50, 0x2c3e50, 0x1a1a2e, 0x1a1a2e);
    sky.fillRect(0, 0, width, height);

    // Ground
    this.add.rectangle(width / 2, height - 30, width, 60, 0x2c3e50).setDepth(1);

    // Road
    this.add.rectangle(width / 2, height - 30, width, 40, 0x34495e).setDepth(2);
    // Road markings
    for (let x = 0; x < width; x += 60) {
      this.add.rectangle(x + 15, height - 30, 30, 3, 0xf1c40f).setDepth(3);
    }

    // Buildings
    const buildingData = [
      { x: 50, w: 80, h: 200, color: 0x2980b9 },
      { x: 150, w: 60, h: 280, color: 0x8e44ad },
      { x: 230, w: 90, h: 180, color: 0x27ae60 },
      { x: 340, w: 70, h: 320, color: 0x2c3e50 },
      { x: 430, w: 85, h: 220, color: 0xc0392b },
      { x: 530, w: 65, h: 260, color: 0x16a085 },
      { x: 610, w: 80, h: 190, color: 0xd35400 },
      { x: 710, w: 75, h: 300, color: 0x2980b9 },
    ];

    buildingData.forEach(b => {
      const y = height - 50 - b.h / 2;
      const building = this.add.rectangle(b.x, y, b.w, b.h, b.color).setDepth(4);

      // Windows
      const windowRows = Math.floor(b.h / 30);
      const windowCols = Math.floor(b.w / 20);
      for (let r = 0; r < windowRows; r++) {
        for (let c = 0; c < windowCols; c++) {
          const wx = b.x - b.w / 2 + 10 + c * 20;
          const wy = y - b.h / 2 + 15 + r * 30;
          const lit = Math.random() > 0.3;
          this.add.rectangle(wx, wy, 8, 10, lit ? 0xf1c40f : 0x1a1a2e, lit ? 0.7 : 0.5).setDepth(5);
        }
      }
    });

    // Clouds
    for (let i = 0; i < 5; i++) {
      const cx = 50 + Math.random() * (width - 100);
      const cy = 30 + Math.random() * 60;
      const cloud = this.add.ellipse(cx, cy, 60 + Math.random() * 40, 20 + Math.random() * 15, 0xffffff, 0.1).setDepth(10);
      this.tweens.add({
        targets: cloud,
        x: cloud.x + 30,
        duration: 5000 + Math.random() * 5000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  addNPCs(width, height) {
    // Simple stick-figure NPCs walking on the road
    const colors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c];
    const roadY = height - 30;

    for (let i = 0; i < 8; i++) {
      const startX = Math.random() * width;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const npc = this.add.circle(startX, roadY - 10, 6, color).setDepth(20);

      // Body line
      const body = this.add.rectangle(startX, roadY - 2, 3, 12, color).setDepth(20);

      // Walking animation
      const direction = Math.random() > 0.5 ? 1 : -1;
      const speed = 15000 + Math.random() * 20000;

      this.tweens.add({
        targets: [npc, body],
        x: direction > 0 ? width + 20 : -20,
        duration: speed,
        repeat: -1,
        onRepeat: () => {
          npc.x = direction > 0 ? -20 : width + 20;
          body.x = npc.x;
        }
      });
    }
  }

  showMonthStart(callback) {
    const month = GameState.currentMonth;

    // Brief month announcement overlay
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.style.background = 'rgba(0,0,0,0.6)';
    const countdownStart = 3;
    container.innerHTML = `
      <div class="city-countdown-wrap">
        <div class="city-countdown-month">Month ${month}</div>
        <p class="city-countdown-subtitle">Time to get to work!</p>
        <div id="countdown-number" class="city-countdown-number">${countdownStart}</div>
      </div>
    `;
    overlay.appendChild(container);

    let remaining = countdownStart;
    const countdownEl = document.getElementById('countdown-number');
    const countdownInterval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        countdownEl.style.transform = 'scale(1.4)';
        countdownEl.style.opacity = '0.5';
        setTimeout(() => {
          countdownEl.textContent = remaining;
          countdownEl.style.transform = 'scale(1)';
          countdownEl.style.opacity = '1';
        }, 150);
      } else {
        clearInterval(countdownInterval);
        countdownEl.textContent = 'GO!';
        countdownEl.classList.add('go');
        countdownEl.style.transform = 'scale(1.5)';
        setTimeout(() => {
          overlay.innerHTML = '';
          callback();
        }, 600);
      }
    }, 1000);
  }

  startWork() {
    this.scene.start('WorkScene');
  }
}
