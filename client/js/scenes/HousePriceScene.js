/**
 * HousePriceScene - Display city house prices
 * Implements both a scrolling street animation (Plan A) and
 * a city map popup (Plan B) for house price exposure.
 */
class HousePriceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HousePriceScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    const cfg = GameState.config;
    const basePrice = cfg.averageHousePrice;
    const variation = cfg.housePriceVariation;

    // Generate area prices with small variation
    this.areaPrices = this.generateAreaPrices(basePrice, variation);

    // Draw the street animation (Plan A)
    this.drawStreetAnimation(width, height);
  }

  generateAreaPrices(basePrice, variation) {
    const areas = [
      { name: 'Downtown', mult: 1.3 },
      { name: 'Midtown', mult: 1.1 },
      { name: 'Eastside', mult: 0.95 },
      { name: 'Westpark', mult: 1.0 },
      { name: 'Northgate', mult: 0.85 },
      { name: 'Southview', mult: 0.9 },
      { name: 'Lakefront', mult: 1.25 },
      { name: 'Old Quarter', mult: 0.8 },
    ];

    return areas.map(a => {
      const randomVar = 1 + (Math.random() * 2 - 1) * variation;
      const price = Math.round(basePrice * a.mult * randomVar);
      return { name: a.name, price };
    });
  }

  drawStreetAnimation(width, height) {
    // Background: evening street scene
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2c3e50, 0x2c3e50);
    bg.fillRect(0, 0, width, height);

    // Road at bottom
    this.add.rectangle(width / 2, height - 40, width, 80, 0x34495e);
    for (let x = 0; x < width; x += 60) {
      this.add.rectangle(x + 15, height - 40, 30, 3, 0xf1c40f);
    }

    // Title
    this.add.text(width / 2, 25, '🏙️ Valrenta City Housing Market', {
      fontSize: '20px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#3498db',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 50, `Month ${GameState.currentMonth} — Walking home through the city...`, {
      fontSize: '13px',
      color: '#95a5a6',
    }).setOrigin(0.5);

    // Create scrolling buildings with price tags
    const buildingColors = [0x2980b9, 0x8e44ad, 0x27ae60, 0xc0392b, 0x16a085, 0xd35400, 0x2c3e50, 0x9b59b6];
    const startX = width + 50;
    const buildingGroup = [];

    this.areaPrices.forEach((area, i) => {
      const x = startX + i * 220;
      const h = 120 + Math.random() * 150;
      const w = 100 + Math.random() * 60;
      const y = height - 80 - h / 2;
      const color = buildingColors[i % buildingColors.length];

      // Building body
      const building = this.add.rectangle(x, y, w, h, color);

      // Windows
      const rows = Math.floor(h / 25);
      const cols = Math.floor(w / 18);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = x - w / 2 + 9 + c * 18;
          const wy = y - h / 2 + 12 + r * 25;
          const lit = Math.random() > 0.3;
          this.add.rectangle(wx, wy, 7, 9, lit ? 0xf1c40f : 0x0a0a1a, lit ? 0.6 : 0.4);
        }
      }

      // Price tag
      const tagBg = this.add.rectangle(x, y - h / 2 - 25, 140, 32, 0x000000, 0.8);
      tagBg.setStrokeStyle(1, 0xf39c12);

      const priceText = this.add.text(x, y - h / 2 - 25, `${area.name}: $${area.price.toLocaleString()}`, {
        fontSize: '11px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#f39c12',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Area name below building
      const nameText = this.add.text(x, height - 80 + 5, area.name, {
        fontSize: '10px',
        color: '#7f8c8d',
      }).setOrigin(0.5);

      buildingGroup.push(building, tagBg, priceText, nameText);
    });

    // Scroll all buildings from right to left
    const totalWidth = this.areaPrices.length * 220;
    this.tweens.add({
      targets: buildingGroup,
      x: `-=${totalWidth + width}`,
      duration: 8000,
      ease: 'Linear',
      onComplete: () => {
        this.showHousePriceSummary();
      }
    });

    // Walking character at bottom
    const playerChar = this.add.circle(100, height - 50, 8, 0x3498db);
    const playerBody = this.add.rectangle(100, height - 40, 4, 14, 0x3498db);

    // Simple walking bob animation
    this.tweens.add({
      targets: [playerChar, playerBody],
      y: '-=3',
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    // Skip button
    const skipBtn = this.add.text(width - 20, height - 15, 'Skip ▶', {
      fontSize: '12px',
      color: '#7f8c8d',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

    skipBtn.on('pointerover', () => skipBtn.setColor('#ecf0f1'));
    skipBtn.on('pointerout', () => skipBtn.setColor('#7f8c8d'));
    skipBtn.on('pointerdown', () => {
      this.tweens.killAll();
      this.showHousePriceSummary();
    });
  }

  showHousePriceSummary() {
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const avgPrice = this.areaPrices.reduce((s, a) => s + a.price, 0) / this.areaPrices.length;
    const salary = GameState.config.monthlyBaseSalary;
    const yearsToSave = (avgPrice / salary / 12).toFixed(1);
    const condition = GameState.condition;

    let areaRows = this.areaPrices.map(a =>
      `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1a1a2e;">
        <span style="color: #bdc3c7; font-size: 13px;">${a.name}</span>
        <span style="color: #f39c12; font-weight: bold; font-size: 13px;">$${a.price.toLocaleString()}</span>
      </div>`
    ).join('');

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <h2>🏠 Housing Market Report</h2>
        <p style="color: #95a5a6; text-align: center; font-size: 13px; margin-bottom: 16px;">
          Valrenta City — Month ${GameState.currentMonth} Real Estate Prices
        </p>

        <div style="background: #0f3460; border-radius: 8px; padding: 16px; margin: 12px 0; max-height: 200px; overflow-y: auto;">
          ${areaRows}
        </div>

        <div style="background: #16213e; border-radius: 8px; padding: 16px; margin: 12px 0; text-align: center;">
          <p style="color: #bdc3c7; font-size: 13px;">City Average House Price</p>
          <p style="color: #f39c12; font-size: 28px; font-weight: bold;">$${Math.round(avgPrice).toLocaleString()}</p>
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 6px;">
            ≈ ${yearsToSave} years of your current salary
          </p>
        </div>

        <div style="background: #16213e; border-radius: 8px; padding: 12px; margin: 8px 0; text-align: center;">
          <p style="color: #bdc3c7; font-size: 12px;">Your current balance</p>
          <p style="color: #2ecc71; font-size: 20px; font-weight: bold;">$${GameState.balance.toLocaleString()}</p>
        </div>

        <button class="btn btn-primary" id="house-continue" style="width: 100%; padding: 12px; margin-top: 12px;">
          Continue →
        </button>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('house-continue').addEventListener('click', () => {
      overlay.innerHTML = '';
      this.proceedToNextPhase();
    });
  }

  proceedToNextPhase() {
    const month = GameState.currentMonth;
    const totalMonths = GameState.config.totalGameMonths;

    if (month < totalMonths) {
      // Move to next month
      GameState.currentMonth++;
      this.scene.start('CityScene');
    } else {
      // All months complete — proceed to financial decisions
      this.scene.start('LotteryScene');
    }
  }
}
