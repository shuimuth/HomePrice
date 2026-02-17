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
    const roofTypes = ['flat', 'pointed', 'stepped', 'dome', 'antenna', 'slant', 'crown', 'flat'];
    const startX = width + 50;
    const buildingGroup = [];

    this.areaPrices.forEach((area, i) => {
      const x = startX + i * 220;
      const h = 120 + Math.random() * 150;
      const w = 100 + Math.random() * 60;
      const baseY = height - 80;
      const topY = baseY - h;
      const leftX = x - w / 2;
      const rightX = x + w / 2;
      const color = buildingColors[i % buildingColors.length];
      const darkColor = Phaser.Display.Color.ValueToColor(color).darken(25).color;
      const lightColor = Phaser.Display.Color.ValueToColor(color).lighten(15).color;
      const roofType = roofTypes[i % roofTypes.length];

      const g = this.add.graphics();

      // Building main body
      g.fillStyle(color, 1);
      g.fillRect(leftX, topY, w, h);

      // Right side shadow panel (gives 3D feel)
      g.fillStyle(darkColor, 0.6);
      g.fillRect(rightX - w * 0.15, topY, w * 0.15, h);

      // Left side highlight strip
      g.fillStyle(lightColor, 0.15);
      g.fillRect(leftX, topY, 3, h);

      // Horizontal floor separators
      const floorH = 25;
      const numFloors = Math.floor(h / floorH);
      g.lineStyle(1, darkColor, 0.4);
      for (let f = 1; f < numFloors; f++) {
        const fy = topY + f * floorH;
        g.lineBetween(leftX, fy, rightX, fy);
      }

      // Decorative cornice at top
      g.fillStyle(lightColor, 0.5);
      g.fillRect(leftX - 3, topY, w + 6, 4);

      // Roof based on type
      const roofG = this.add.graphics();
      let roofExtraH = 0;
      switch (roofType) {
        case 'pointed':
          roofExtraH = 30;
          roofG.fillStyle(darkColor, 1);
          roofG.fillTriangle(leftX - 2, topY, rightX + 2, topY, x, topY - roofExtraH);
          // Antenna on peak
          roofG.lineStyle(2, 0xbdc3c7, 0.8);
          roofG.lineBetween(x, topY - roofExtraH, x, topY - roofExtraH - 12);
          roofG.fillStyle(0xe74c3c, 1);
          roofG.fillCircle(x, topY - roofExtraH - 14, 3);
          break;
        case 'stepped':
          roofExtraH = 20;
          roofG.fillStyle(darkColor, 1);
          roofG.fillRect(leftX + w * 0.2, topY - roofExtraH, w * 0.6, roofExtraH);
          roofG.fillRect(leftX + w * 0.35, topY - roofExtraH - 10, w * 0.3, 10);
          break;
        case 'dome':
          roofExtraH = 18;
          roofG.fillStyle(darkColor, 1);
          roofG.fillEllipse(x, topY - 2, w * 0.6, roofExtraH * 2);
          break;
        case 'antenna':
          roofExtraH = 30;
          roofG.fillStyle(darkColor, 1);
          roofG.fillRect(leftX, topY - 5, w, 5);
          // Tall antenna
          roofG.lineStyle(2, 0x95a5a6, 1);
          roofG.lineBetween(x, topY - 5, x, topY - roofExtraH);
          // Cross bars
          roofG.lineStyle(1, 0x95a5a6, 0.7);
          roofG.lineBetween(x - 8, topY - 18, x + 8, topY - 18);
          roofG.lineBetween(x - 5, topY - 25, x + 5, topY - 25);
          // Red light
          roofG.fillStyle(0xe74c3c, 1);
          roofG.fillCircle(x, topY - roofExtraH - 2, 3);
          break;
        case 'slant':
          roofExtraH = 15;
          roofG.fillStyle(darkColor, 1);
          roofG.fillTriangle(leftX - 3, topY, rightX + 3, topY, leftX + 10, topY - roofExtraH);
          break;
        case 'crown':
          roofExtraH = 16;
          roofG.fillStyle(darkColor, 1);
          roofG.fillRect(leftX, topY - 6, w, 6);
          // Crown pillars
          const pillarCount = 4;
          const pillarSpacing = w / (pillarCount + 1);
          for (let p = 1; p <= pillarCount; p++) {
            roofG.fillRect(leftX + p * pillarSpacing - 3, topY - roofExtraH, 6, roofExtraH - 6);
          }
          roofG.fillRect(leftX + pillarSpacing - 3, topY - roofExtraH - 2, (pillarCount - 1) * pillarSpacing + 6, 3);
          break;
        default: // flat
          roofExtraH = 6;
          roofG.fillStyle(darkColor, 1);
          roofG.fillRect(leftX - 4, topY - roofExtraH, w + 8, roofExtraH);
          // Small AC unit boxes
          if (Math.random() > 0.4) {
            roofG.fillStyle(0x7f8c8d, 0.8);
            roofG.fillRect(x - 12, topY - roofExtraH - 8, 10, 8);
            roofG.fillRect(x + 5, topY - roofExtraH - 6, 8, 6);
          }
          break;
      }

      // Windows with frames and ledges
      const windowMarginTop = 15;
      const windowSpacingX = 18;
      const windowSpacingY = 25;
      const windowW = 8;
      const windowH = 11;
      const rows = Math.floor((h - windowMarginTop - 25) / windowSpacingY);
      const cols = Math.floor((w - 16) / windowSpacingX);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = leftX + 9 + c * windowSpacingX;
          const wy = topY + windowMarginTop + r * windowSpacingY;
          const lit = Math.random() > 0.3;

          // Window frame
          g.fillStyle(0x0a0a1a, 0.6);
          g.fillRect(wx - 1, wy - 1, windowW + 2, windowH + 2);

          // Window glass
          if (lit) {
            g.fillStyle(0xf1c40f, 0.6);
            g.fillRect(wx, wy, windowW, windowH);
            // Curtain half-drawn effect
            if (Math.random() > 0.5) {
              g.fillStyle(0xe67e22, 0.3);
              g.fillRect(wx, wy, windowW / 2, windowH);
            }
          } else {
            g.fillStyle(0x0a0a1a, 0.5);
            g.fillRect(wx, wy, windowW, windowH);
          }

          // Window cross divider
          g.lineStyle(1, 0x1a1a2e, 0.4);
          g.lineBetween(wx + windowW / 2, wy, wx + windowW / 2, wy + windowH);
          g.lineBetween(wx, wy + windowH / 2, wx + windowW, wy + windowH / 2);

          // Window ledge
          g.fillStyle(lightColor, 0.3);
          g.fillRect(wx - 1, wy + windowH + 1, windowW + 2, 2);
        }
      }

      // Entrance door at ground level
      const doorW = 14;
      const doorH = 22;
      const doorX = x - doorW / 2;
      const doorY = baseY - doorH;
      g.fillStyle(0x1a1a2e, 0.8);
      g.fillRect(doorX, doorY, doorW, doorH);
      // Door frame
      g.lineStyle(1, lightColor, 0.5);
      g.strokeRect(doorX, doorY, doorW, doorH);
      // Door knob
      g.fillStyle(0xf39c12, 0.7);
      g.fillCircle(doorX + doorW - 3, doorY + doorH / 2, 1.5);
      // Awning above door
      g.fillStyle(darkColor, 0.7);
      g.fillTriangle(doorX - 6, doorY, doorX + doorW + 6, doorY, x, doorY - 8);

      // Street lamp next to some buildings
      if (i % 2 === 0) {
        const lampX = rightX + 15;
        g.lineStyle(2, 0x7f8c8d, 1);
        g.lineBetween(lampX, baseY, lampX, baseY - 50);
        g.lineBetween(lampX, baseY - 50, lampX - 8, baseY - 55);
        g.fillStyle(0xf1c40f, 0.7);
        g.fillCircle(lampX - 8, baseY - 57, 4);
      }

      // Price tag
      const tagBg = this.add.rectangle(x, topY - roofExtraH - 22, 140, 32, 0x000000, 0.8);
      tagBg.setStrokeStyle(1, 0xf39c12);

      const priceText = this.add.text(x, topY - roofExtraH - 22, `${area.name}: $${area.price.toLocaleString()}`, {
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

      buildingGroup.push(g, roofG, tagBg, priceText, nameText);
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
