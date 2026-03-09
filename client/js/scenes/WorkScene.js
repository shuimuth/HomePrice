/**
 * WorkScene - Core work task system
 * Player clicks to complete task units within a time limit.
 * All three jobs have identical mechanics with different visual themes.
 *
 * Single progress bar with required-work marker.
 * Displays only total work units completed (not clicks).
 */
class WorkScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorkScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    const cfg = GameState.config;

    this.totalClicks = 0;
    this.currentUnitClicks = 0;
    this.completedUnits = 0;
    this.clicksPerUnit = cfg.clicksPerTaskUnit;
    this.timeLimit = cfg.workTimeLimitSeconds;
    this.timeRemaining = this.timeLimit;
    this.workStartTime = Date.now();
    this.isWorking = true;

    // ─── Background ───
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0e27);
    const vignette = this.add.graphics();
    vignette.fillStyle(0x0f1638, 0.6);
    vignette.fillCircle(width / 2, height / 2 - 20, 420);

    // Job-specific visual theme
    const jobThemes = {
      restaurant: {
        icon: '🍽️',
        title: 'Dish Washing Station',
        unitLabel: 'dishes',
        unitLabelCap: 'Dishes',
        instruction: 'Click rapidly to scrub each dish clean!',
        accent: 0x3498db,
        accentHex: '#3498db',
      },
      computer: {
        icon: '🖥️',
        title: 'System Check Terminal',
        unitLabel: 'systems',
        unitLabelCap: 'Systems',
        instruction: 'Click rapidly to check each system module!',
        accent: 0x9b59b6,
        accentHex: '#9b59b6',
      },
      finance: {
        icon: '📊',
        title: 'Profit Sheet Desk',
        unitLabel: 'entries',
        unitLabelCap: 'Entries',
        instruction: 'Click rapidly to fill each profit entry!',
        accent: 0x1abc9c,
        accentHex: '#1abc9c',
      },
    };

    const theme = jobThemes[GameState.jobType] || jobThemes.restaurant;
    this.themeConfig = theme;

    // ─── Top HUD Panel ───
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0d1b3e, 0.85);
    hudBg.fillRoundedRect(12, 18, width - 24, 56, 12);
    hudBg.lineStyle(1, theme.accent, 0.3);
    hudBg.strokeRoundedRect(12, 18, width - 24, 56, 12);

    this.add.text(width / 2, 34, `${theme.icon}  ${theme.title}`, {
      fontSize: '20px',
      fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
      color: theme.accentHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 58, `Month ${GameState.currentMonth} — ${theme.instruction}`, {
      fontSize: '11px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#7f8c8d',
      letterSpacing: 1,
    }).setOrigin(0.5);

    this.timerText = this.add.text(width - 32, 40, `⏱ ${this.timeLimit}s`, {
      fontSize: '17px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#f39c12',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.unitsText = this.add.text(32, 40, `${theme.unitLabel}: 0`, {
      fontSize: '15px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // ─── Central Work Area ───
    const workAreaY = height / 2 - 30;
    const workAreaW = 520;
    const workAreaH = 300;

    const outerGlow = this.add.graphics();
    outerGlow.fillStyle(theme.accent, 0.04);
    outerGlow.fillRoundedRect(
      width / 2 - workAreaW / 2 - 6, workAreaY - workAreaH / 2 - 6,
      workAreaW + 12, workAreaH + 12, 18
    );

    const workBg = this.add.graphics();
    workBg.fillStyle(0x0f1a3a, 1);
    workBg.fillRoundedRect(
      width / 2 - workAreaW / 2, workAreaY - workAreaH / 2,
      workAreaW, workAreaH, 14
    );
    workBg.lineStyle(1.5, theme.accent, 0.35);
    workBg.strokeRoundedRect(
      width / 2 - workAreaW / 2, workAreaY - workAreaH / 2,
      workAreaW, workAreaH, 14
    );

    const workArea = this.add.rectangle(width / 2, workAreaY, workAreaW, workAreaH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    this.pulseGlow = this.add.graphics();
    this.drawPulseGlow(width / 2, workAreaY, workAreaW, workAreaH, theme.accent, 0.15);
    this.tweens.add({
      targets: this.pulseGlow,
      alpha: { from: 0.6, to: 0.15 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ─── Task Icon ───
    this.taskIcon = this.add.text(width / 2, workAreaY - 60, theme.icon, {
      fontSize: '56px',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.taskIcon,
      y: workAreaY - 65,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ─── "Keep Clicking!" instruction with mouse icon ───
    this.add.text(width / 2 - 15, workAreaY + 5, 'Keep Clicking!', {
      fontSize: '28px',
      fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
      color: '#f39c12',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2 + 100, workAreaY + 2, '🖱️', {
      fontSize: '30px',
    }).setOrigin(0.5);

    // ─── Single Progress Bar ───
    const barY = workAreaY + 65;
    const barW = 400;
    const barH = 16;
    const barX = width / 2 - barW / 2;
    const maxDisplayUnits = cfg.bonusThreshold + 5;

    const trackBg = this.add.graphics();
    trackBg.fillStyle(0x1a2744, 1);
    trackBg.fillRoundedRect(barX, barY - barH / 2, barW, barH, barH / 2);
    trackBg.lineStyle(1, 0x2c3e50, 0.5);
    trackBg.strokeRoundedRect(barX, barY - barH / 2, barW, barH, barH / 2);

    this.progressFill = this.add.rectangle(barX, barY, 0, barH - 2, theme.accent)
      .setOrigin(0, 0.5);

    const maskGfx = this.make.graphics();
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRoundedRect(barX, barY - barH / 2, barW, barH, barH / 2);
    this.progressFill.setMask(maskGfx.createGeometryMask());

    // Required work marker (red line at penaltyThreshold)
    const requiredX = barX + (cfg.penaltyThreshold / maxDisplayUnits) * barW;
    const markerGfx = this.add.graphics();
    markerGfx.lineStyle(2, 0xe74c3c, 1);
    markerGfx.lineBetween(requiredX, barY - barH / 2 - 6, requiredX, barY + barH / 2 + 6);
    markerGfx.fillStyle(0xe74c3c, 1);
    markerGfx.fillTriangle(
      requiredX - 4, barY - barH / 2 - 6,
      requiredX + 4, barY - barH / 2 - 6,
      requiredX, barY - barH / 2 - 1
    );

    this.add.text(requiredX, barY + barH / 2 + 10, 'required\nwork amount', {
      fontSize: '9px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#e74c3c',
      fontStyle: 'italic',
      align: 'center',
      lineSpacing: 1,
    }).setOrigin(0.5, 0);

    // ─── Completed Units Text ───
    this.completedText = this.add.text(width / 2, barY + 50, `0 ${theme.unitLabelCap} completed`, {
      fontSize: '18px',
      fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
      color: '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.barW = barW;
    this.barX = barX;
    this.maxDisplayUnits = maxDisplayUnits;

    // ─── Click Ripple Container ───
    this.ripplePool = [];

    // ─── Click Handler ───
    workArea.on('pointerdown', (pointer) => {
      if (!this.isWorking) return;
      this.handleClick();
      this.spawnClickRipple(pointer.x, pointer.y);
    });

    // Timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  drawPulseGlow(cx, cy, w, h, color, alpha) {
    this.pulseGlow.clear();
    this.pulseGlow.lineStyle(2, color, alpha);
    this.pulseGlow.strokeRoundedRect(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 4, 16);
  }

  spawnClickRipple(x, y) {
    const circle = this.add.circle(x, y, 6, this.themeConfig.accent, 0.5);
    this.tweens.add({
      targets: circle,
      radius: 30,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        circle.setScale(circle.alpha > 0 ? 1 + (1 - circle.alpha) * 2 : 1);
      },
      onComplete: () => circle.destroy(),
    });
  }

  handleClick() {
    this.currentUnitClicks++;
    this.totalClicks++;

    // Icon bounce feedback
    this.tweens.add({
      targets: this.taskIcon,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 50,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    if (this.currentUnitClicks >= this.clicksPerUnit) {
      this.completeUnit();
    }
  }

  completeUnit() {
    this.completedUnits++;
    this.currentUnitClicks = 0;

    this.unitsText.setText(`${this.themeConfig.unitLabel}: ${this.completedUnits}`);

    this.updateProgress();

    this.completedText.setText(`${this.completedUnits} ${this.themeConfig.unitLabelCap} completed`);
    this.tweens.add({
      targets: this.completedText,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 80,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    const glow = this.add.circle(this.taskIcon.x, this.taskIcon.y, 10, 0x2ecc71, 0.35);
    this.tweens.add({
      targets: glow,
      radius: 60,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        glow.setScale(glow.alpha > 0 ? 1 + (1 - glow.alpha) * 2 : 1);
      },
      onComplete: () => glow.destroy(),
    });
  }

  updateProgress() {
    const cfg = GameState.config;
    const progress = Math.min(this.completedUnits / this.maxDisplayUnits, 1);

    this.tweens.add({
      targets: this.progressFill,
      width: this.barW * progress,
      duration: 200,
      ease: 'Power2',
    });

    if (this.completedUnits >= cfg.bonusThreshold) {
      this.progressFill.fillColor = 0x2ecc71;
    } else if (this.completedUnits >= cfg.penaltyThreshold) {
      this.progressFill.fillColor = this.themeConfig.accent;
    } else {
      this.progressFill.fillColor = 0xe74c3c;
    }
  }

  updateTimer() {
    this.timeRemaining--;
    this.timerText.setText(`⏱ ${this.timeRemaining}s`);

    if (this.timeRemaining <= 10) {
      this.timerText.setColor('#e74c3c');
      this.tweens.add({
        targets: this.timerText,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 150,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

    if (this.timeRemaining <= 0) {
      this.endWork();
    }
  }

  endWork() {
    this.isWorking = false;
    if (this.timerEvent) this.timerEvent.remove();

    const cfg = GameState.config;
    let salary = cfg.monthlyBaseSalary;
    let bonusDeduction = 0;

    if (this.completedUnits > cfg.bonusThreshold) {
      bonusDeduction = (this.completedUnits - cfg.bonusThreshold) * cfg.bonusPerUnit;
      bonusDeduction = Math.min(bonusDeduction, cfg.bonusMaxTotal);
      salary += bonusDeduction;
    } else if (this.completedUnits < cfg.penaltyThreshold) {
      bonusDeduction = (cfg.penaltyThreshold - this.completedUnits) * cfg.penaltyPerUnit;
      bonusDeduction = Math.min(bonusDeduction, cfg.penaltyMaxTotal);
      salary -= bonusDeduction;
    }

    salary = Math.max(0, salary);
    GameState.balance += salary;

    const monthDuration = (Date.now() - this.workStartTime) / 1000;

    GameAPI.saveWorkPerformance({
      month: GameState.currentMonth,
      clicks: this.totalClicks,
      units: this.completedUnits,
      timeSpent: this.timeLimit - this.timeRemaining,
      balance: GameState.balance,
      monthDuration: monthDuration,
    });

    GameState.monthlyPerformance.push({
      month: GameState.currentMonth,
      clicks: this.totalClicks,
      units: this.completedUnits,
    });

    this.showSalaryReport(salary, bonusDeduction);
  }

  showSalaryReport(salary, bonusDeduction) {
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const cfg = GameState.config;
    const isBonus = this.completedUnits > cfg.bonusThreshold;
    const isPenalty = this.completedUnits < cfg.penaltyThreshold;
    const unitLabel = this.getUnitLabel();

    let detailLines = `<p style="color: #bdc3c7; font-size: 14px; margin: 6px 0;">- Base payment: ${cfg.monthlyBaseSalary.toLocaleString()}</p>`;
    if (isBonus) {
      detailLines += `<p style="color: #2ecc71; font-size: 14px; margin: 6px 0;">- 🎉 Bonus: +${bonusDeduction.toLocaleString()} (${this.completedUnits - cfg.bonusThreshold} extra units)</p>`;
    } else if (isPenalty) {
      detailLines += `<p style="color: #e67e22; font-size: 14px; margin: 6px 0;">- ⚠️ Penalty: -${bonusDeduction.toLocaleString()} (${cfg.penaltyThreshold - this.completedUnits} ${unitLabel} short)</p>`;
    }

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 420px; text-align: left;">
        <h2 style="text-align: center; margin-bottom: 16px;">💰 Month ${GameState.currentMonth} - Salary</h2>

        <div style="margin-bottom: 12px;">
          <p style="color: #bdc3c7; font-size: 13px;">■ Work Summary:</p>
          <p style="color: #ecf0f1; margin-top: 6px;">Completed: <strong>${this.completedUnits}</strong> ${unitLabel}  <span style="color: #7f8c8d;">(required: ${cfg.penaltyThreshold} ${unitLabel})</span></p>
        </div>

        <div style="background: #16213e; border-radius: 8px; padding: 16px; margin: 12px 0;">
          <p style="color: #ecf0f1; font-size: 15px; font-weight: bold; margin-bottom: 8px;">Total Earnings:</p>
          <p style="color: #2ecc71; font-size: 28px; font-weight: bold; text-align: center; margin: 12px 0;">$ ${salary.toLocaleString()}</p>
          ${detailLines}
        </div>

        <button class="btn btn-primary" id="salary-continue" style="width: 100%; padding: 12px; margin-top: 12px;">
          Continue →
        </button>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('salary-continue').addEventListener('click', () => {
      overlay.innerHTML = '';
      this.showLivingExpenses();
    });
  }

  showLivingExpenses() {
    const cfg = GameState.config;
    const salary = cfg.monthlyBaseSalary;
    const totalExpense = Math.round(salary * cfg.livingExpenseRatio);
    const breakdown = cfg.livingExpenseBreakdown;

    const rent = Math.round(totalExpense * breakdown.rent);
    const food = Math.round(totalExpense * breakdown.food);
    const transport = Math.round(totalExpense * breakdown.transport);
    const utilities = totalExpense - rent - food - transport; // remainder

    this.totalExpense = totalExpense;

    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 420px; text-align: left;">
        <h2 style="text-align: center; margin-bottom: 16px;">📦 Month ${GameState.currentMonth} - Living Expenses</h2>

        <div style="background: #0f3460; border-radius: 8px; padding: 16px; margin: 12px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #bdc3c7;">🏠 Rent</span>
            <span style="color: #e74c3c; font-weight: bold;">-$${rent}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #bdc3c7;">🍔 Food & Groceries</span>
            <span style="color: #e74c3c; font-weight: bold;">-$${food}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #bdc3c7;">🚌 Transportation</span>
            <span style="color: #e74c3c; font-weight: bold;">-$${transport}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #bdc3c7;">💡 Utilities</span>
            <span style="color: #e74c3c; font-weight: bold;">-$${utilities}</span>
          </div>
          <hr style="border-color: #2c3e50; margin: 10px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #ecf0f1; font-weight: bold;">Total Expenses</span>
            <span style="color: #e74c3c; font-weight: bold; font-size: 18px;">-$${totalExpense}</span>
          </div>
        </div>

        <button class="btn btn-primary" id="pay-bill-btn" style="width: 100%; padding: 12px; margin-top: 12px; font-size: 16px; font-weight: bold;">
          Pay My Bill
        </button>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('pay-bill-btn').addEventListener('click', () => {
      // Deduct expenses from balance
      GameState.balance -= totalExpense;
      this.showPaidConfirmation();
    });
  }

  showPaidConfirmation() {
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 420px; text-align: center;">
        <h2 style="margin-bottom: 16px;">📦 Month ${GameState.currentMonth} - Living Expenses</h2>

        <p style="color: #ecf0f1; font-size: 18px; margin: 24px 0; line-height: 1.6;">
          Living expenses for month ${GameState.currentMonth}<br>have been paid!
        </p>

        <div style="background: #16213e; border-radius: 8px; padding: 12px 20px; margin: 16px auto; display: inline-block;">
          <span style="color: #bdc3c7; font-size: 14px;">Remaining Balance: </span>
          <span style="color: #2ecc71; font-size: 18px; font-weight: bold;">$${GameState.balance.toLocaleString()}</span>
        </div>

        <div style="margin-top: 20px;">
          <button class="btn btn-primary" id="expense-continue" style="width: 100%; padding: 12px;">
            Continue →
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('expense-continue').addEventListener('click', () => {
      overlay.innerHTML = '';
      // Go to house price display
      this.scene.start('HousePriceScene');
    });
  }

  getUnitLabel() {
    const labels = {
      restaurant: 'dishes',
      computer: 'systems',
      finance: 'entries',
    };
    return labels[GameState.jobType] || 'units';
  }
}
