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

    // Show rental reminder on first month or every month
    if (month === 1) {
      this.showRentalReminder(() => this.startWork());
    } else {
      // Brief month transition then start work
      this.showMonthStart(() => this.startWork());
    }
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

  showRentalReminder(callback) {
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <h2>🏠 Your Current Housing</h2>
        <div style="background: #0f3460; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #e74c3c; font-size: 14px; margin-bottom: 8px;">📍 Rented Apartment — 20m² Studio</p>
          <p style="color: #bdc3c7; font-size: 13px; line-height: 1.6;">
            You're currently renting a small one-room apartment (about 20 sqm) with a basic bathroom.
            The quality is average — there are occasional maintenance issues like pest problems.
            This is a temporary arrangement.
          </p>
        </div>
        <div style="background: #16213e; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #f39c12; font-size: 14px; margin-bottom: 8px;">🎯 Your Long-Term Goal</p>
          <p style="color: #bdc3c7; font-size: 13px; line-height: 1.6;">
            Save up and <strong style="color:#2ecc71;">buy your own home</strong> in Valrenta City within the next 10–20 years.
            Work hard, manage your finances, and plan for the future!
          </p>
        </div>
        <button class="btn btn-primary" id="rental-ok" style="width: 100%; padding: 12px; margin-top: 8px;">
          Got it — Let's start working! →
        </button>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('rental-ok').addEventListener('click', () => {
      overlay.innerHTML = '';
      callback();
    });
  }

  showMonthStart(callback) {
    const month = GameState.currentMonth;

    // Brief month announcement overlay
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.style.background = 'rgba(0,0,0,0.6)';
    container.innerHTML = `
      <div style="text-align: center; color: #ecf0f1;">
        <h1 style="font-size: 48px; color: #f39c12; margin-bottom: 10px;">Month ${month}</h1>
        <p style="font-size: 18px; color: #bdc3c7;">Time to get to work!</p>
      </div>
    `;
    overlay.appendChild(container);

    // Auto-dismiss after 1.5 seconds
    setTimeout(() => {
      overlay.innerHTML = '';
      callback();
    }, 1500);
  }

  startWork() {
    this.scene.start('WorkScene');
  }
}
