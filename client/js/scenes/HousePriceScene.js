/**
 * HousePriceScene - Display city house prices
 * Shows a city skyline background with area price cards in a
 * grid layout for clear, at-a-glance house price information.
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

    // Draw the city skyline + price cards view
    this.drawCitySkyline(width, height);
    this.drawPriceCards(width, height);
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

  drawCitySkyline(width, height) {
    const bg = this.add.graphics();

    // Night sky gradient
    bg.fillGradientStyle(0x0b0c2a, 0x0b0c2a, 0x1a1a3e, 0x1a1a3e);
    bg.fillRect(0, 0, width, height);

    // Stars
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height * 0.35;
      const sr = 0.5 + Math.random() * 1.2;
      const alpha = 0.3 + Math.random() * 0.7;
      bg.fillStyle(0xffffff, alpha);
      bg.fillCircle(sx, sy, sr);
    }

    // Twinkling stars animation
    const twinkleStars = [];
    for (let i = 0; i < 12; i++) {
      const star = this.add.circle(
        Math.random() * width,
        Math.random() * height * 0.3,
        1 + Math.random(),
        0xffffff,
        0.8
      );
      twinkleStars.push(star);
    }
    this.tweens.add({
      targets: twinkleStars,
      alpha: { from: 0.3, to: 1 },
      duration: 800 + Math.random() * 1200,
      yoyo: true,
      repeat: -1,
      delay: this.tweens.stagger(200),
    });

    // Moon
    bg.fillStyle(0xf5f5dc, 0.9);
    bg.fillCircle(width - 80, 50, 22);
    bg.fillStyle(0x0b0c2a, 0.9);
    bg.fillCircle(width - 72, 44, 18);

    // Ground / road at very bottom
    bg.fillStyle(0x2c3e50, 1);
    bg.fillRect(0, height - 22, width, 22);
    for (let x = 0; x < width; x += 50) {
      bg.fillStyle(0xf1c40f, 0.5);
      bg.fillRect(x + 5, height - 12, 25, 2);
    }
  }

  drawPriceCards(width, height) {
    // ===== TOP SECTION: Title + Summary =====
    const titleText = this.add.text(width / 2, 18, '🏙️ Valrenta City-Housing Market', {
      fontSize: '18px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#3498db',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const subtitleText = this.add.text(width / 2, 40, `Month ${GameState.currentMonth} — City Real Estate Overview`, {
      fontSize: '12px',
      color: '#95a5a6',
    }).setOrigin(0.5).setAlpha(0);

    const avgPrice = this.areaPrices.reduce((s, a) => s + a.price, 0) / this.areaPrices.length;

    // Two side-by-side info boxes
    const panelX = 60;
    const panelY = 56;
    const panelW = width - 120;
    const panelH = 70;

    const summaryBg = this.add.graphics();
    summaryBg.fillStyle(0x0a1a35, 0.9);
    summaryBg.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    summaryBg.lineStyle(1, 0x3498db, 0.3);
    summaryBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    summaryBg.lineStyle(1, 0x3498db, 0.15);
    summaryBg.lineBetween(width / 2, panelY + 12, width / 2, panelY + panelH - 12);

    const leftCX = panelX + panelW / 4;
    const avgLabel = this.add.text(leftCX, panelY + 16, 'Average Home Price', {
      fontSize: '11px', color: '#95a5a6',
    }).setOrigin(0.5).setAlpha(0);

    const avgPriceText = this.add.text(leftCX, panelY + 44, `$${Math.round(avgPrice).toLocaleString()}`, {
      fontSize: '22px', fontFamily: 'Segoe UI, sans-serif',
      color: '#f39c12', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const rightCX = panelX + (panelW * 3) / 4;
    const balanceLabel = this.add.text(rightCX, panelY + 16, 'Your balance', {
      fontSize: '11px', color: '#95a5a6',
    }).setOrigin(0.5).setAlpha(0);

    const balanceText = this.add.text(rightCX, panelY + 44, `$${GameState.balance.toLocaleString()}`, {
      fontSize: '22px', fontFamily: 'Segoe UI, sans-serif',
      color: '#2ecc71', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const topElements = [titleText, subtitleText, summaryBg, avgLabel, avgPriceText, balanceLabel, balanceText];
    this.tweens.add({
      targets: topElements,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
    });

    // ===== BOTTOM SECTION: Buildings with prices =====
    const groundY = height - 22;
    const buildingAreaTop = 135;
    const maxBuildingH = groundY - buildingAreaTop - 40;
    const minBuildingH = 60;

    const prices = this.areaPrices.map(a => a.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Hybrid height scaling:
    // - Log of average price determines overall building height level (absolute)
    // - Within-group relative scaling preserves visible differences between areas
    // Reference range tuned to game's actual price levels (LHP ~$18K, HHP ~$180K)
    const priceAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const logAvg = Math.log10(Math.max(priceAvg, 1000));
    const logCeil = Math.log10(400000);
    const logFloor = Math.log10(2000);
    const overallScale = Math.max(0.30, Math.min(1, (logAvg - logFloor) / (logCeil - logFloor)));
    const effectiveMaxH = minBuildingH + overallScale * (maxBuildingH - minBuildingH);
    const effectiveMinH = Math.max(50, effectiveMaxH * 0.65);

    const numBuildings = this.areaPrices.length;
    const totalGap = 12;
    const buildingW = Math.floor((width - 40 - (numBuildings - 1) * totalGap) / numBuildings);
    const startX = (width - (numBuildings * buildingW + (numBuildings - 1) * totalGap)) / 2;

    const buildingColors = [
      0x1a3a5c, 0x1e3d5e, 0x153050, 0x1c3856,
      0x17335a, 0x1b3654, 0x14304e, 0x193858
    ];

    const getAccentColor = (ratio) => {
      if (ratio > 0.7) return { color: 0xe74c3c, hex: '#e74c3c' };
      if (ratio > 0.4) return { color: 0xf39c12, hex: '#f39c12' };
      return { color: 0x2ecc71, hex: '#2ecc71' };
    };

    const icons = ['🏢', '🏬', '🏘️', '🌳', '🚉', '🌆', '🌊', '🏛️'];

    this.areaPrices.forEach((area, i) => {
      const relRatio = maxPrice > minPrice ? (area.price - minPrice) / (maxPrice - minPrice) : 0.5;
      const bH = effectiveMinH + relRatio * (effectiveMaxH - effectiveMinH);
      const bx = startX + i * (buildingW + totalGap);
      const by = groundY - bH;
      const centerX = bx + buildingW / 2;
      const accent = getAccentColor(relRatio);

      const bldgGraphics = this.add.graphics();
      bldgGraphics.fillStyle(buildingColors[i % buildingColors.length], 1);
      bldgGraphics.fillRect(bx, groundY, buildingW, 0);

      const roofG = this.add.graphics();
      roofG.fillStyle(accent.color, 0.9);
      roofG.fillRect(bx, groundY, buildingW, 3);

      const shadowG = this.add.graphics();
      shadowG.fillStyle(0x000000, 0.15);
      shadowG.fillRect(bx + buildingW - 6, groundY, 6, 0);

      const windowG = this.add.graphics();

      const nameLabel = this.add.text(centerX, by - 32, area.name, {
        fontSize: '10px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#bdc3c7',
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5).setAlpha(0);

      const iconText = this.add.text(centerX, by - 48, icons[i], {
        fontSize: '16px',
      }).setOrigin(0.5).setAlpha(0);

      const priceLabel = this.add.text(centerX, by - 16, `$${area.price.toLocaleString()}`, {
        fontSize: '11px',
        fontFamily: 'Segoe UI, sans-serif',
        color: accent.hex,
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5).setAlpha(0);

      const animDelay = 300 + i * 150;
      const dummy = { progress: 0 };
      this.tweens.add({
        targets: dummy,
        progress: 1,
        duration: 700,
        ease: 'Power2.easeOut',
        delay: animDelay,
        onUpdate: () => {
          const currentH = bH * dummy.progress;
          const currentY = groundY - currentH;

          bldgGraphics.clear();
          bldgGraphics.fillStyle(buildingColors[i % buildingColors.length], 1);
          bldgGraphics.fillRect(bx, currentY, buildingW, currentH);

          roofG.clear();
          roofG.fillStyle(accent.color, 0.9);
          roofG.fillRect(bx, currentY, buildingW, 3);

          shadowG.clear();
          shadowG.fillStyle(0x000000, 0.15);
          shadowG.fillRect(bx + buildingW - 6, currentY, 6, currentH);
        },
        onComplete: () => {
          const winCols = Math.max(1, Math.floor((buildingW - 10) / 12));
          const winRows = Math.max(1, Math.floor((bH - 10) / 16));
          const winW = 5;
          const winH = 7;
          const winGapX = (buildingW - 10) / winCols;
          const winGapY = (bH - 10) / winRows;

          for (let r = 0; r < winRows; r++) {
            for (let c = 0; c < winCols; c++) {
              if (Math.random() > 0.35) {
                const wx = bx + 5 + c * winGapX + (winGapX - winW) / 2;
                const wy = by + 8 + r * winGapY;
                const warmth = Math.random();
                if (warmth > 0.5) {
                  windowG.fillStyle(0xf1c40f, 0.3 + Math.random() * 0.4);
                } else {
                  windowG.fillStyle(0xe8a838, 0.2 + Math.random() * 0.35);
                }
                windowG.fillRect(wx, wy, winW, winH);
              }
            }
          }

          this.tweens.add({
            targets: [nameLabel, iconText, priceLabel],
            alpha: 1,
            y: '-=8',
            duration: 400,
            ease: 'Power2',
          });
        },
      });
    });

    // ===== Continue button (bottom right) =====
    const btnDelay = 300 + this.areaPrices.length * 150 + 900;
    const btnW = 140;
    const btnH = 32;
    const btnX = width - btnW - 24;
    const btnY = height - 52;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x3498db, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);

    const btnText = this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'Continue →', {
      fontSize: '13px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const btnZone = this.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });

    btnZone.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x2980b9, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
    });
    btnZone.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x3498db, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
    });
    btnZone.on('pointerdown', () => {
      this.showHousePriceSummary();
    });

    [btnBg, btnText, btnZone].forEach(obj => obj.setAlpha(0));
    this.tweens.add({
      targets: [btnBg, btnText, btnZone],
      alpha: 1,
      duration: 500,
      ease: 'Power2',
      delay: btnDelay,
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
