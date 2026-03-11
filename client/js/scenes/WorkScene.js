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
    const maxDisplayUnits = cfg.penaltyThreshold / 0.75;

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
      requiredX - 4, barY + barH / 2 + 6,
      requiredX + 4, barY + barH / 2 + 6,
      requiredX, barY + barH / 2 + 1
    );

    this.add.text(requiredX, barY - barH / 2 - 12, 'required work', {
      fontSize: '9px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#e74c3c',
      fontStyle: 'italic',
      align: 'center',
    }).setOrigin(0.5, 1);

    // ─── Completed Units Text ───
    this.completedText = this.add.text(width / 2, barY + 30, `0 ${theme.unitLabelCap} completed`, {
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
    GameState.salaryHistory.push(salary);

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

    let detailHTML = `
      <div class="work-detail-line base">
        <span class="detail-icon">📋</span>
        <span>Base payment: $${cfg.monthlyBaseSalary.toLocaleString()}</span>
      </div>`;
    if (isBonus) {
      detailHTML += `
      <div class="work-detail-line bonus">
        <span class="detail-icon">🎉</span>
        <span>Bonus: +$${bonusDeduction.toLocaleString()} (${this.completedUnits - cfg.bonusThreshold} extra units)</span>
      </div>`;
    } else if (isPenalty) {
      detailHTML += `
      <div class="work-detail-line penalty">
        <span class="detail-icon">⚠️</span>
        <span>Penalty: -$${bonusDeduction.toLocaleString()} (${cfg.penaltyThreshold - this.completedUnits} ${unitLabel} short)</span>
      </div>`;
    }

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 440px; text-align: left;">
        <h2 class="work-report-title">
          <span class="title-icon">💰</span> Month ${GameState.currentMonth} — Salary
        </h2>

        <div class="work-section-label">Work Summary</div>
        <div class="work-summary-row">
          <span>Completed: <strong>${this.completedUnits}</strong> ${unitLabel}</span>
          <span class="muted">(required: ${cfg.penaltyThreshold})</span>
        </div>

        <div class="work-card">
          <div class="work-card-header">Total Earnings</div>
          <div class="work-amount-large earnings">$ ${salary.toLocaleString()}</div>
          ${detailHTML}
        </div>

        <div class="work-btn-wrap">
          <button class="btn btn-primary" id="salary-continue">Continue →</button>
        </div>
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
    const utilities = totalExpense - rent - food - transport;

    this.totalExpense = totalExpense;

    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 440px; text-align: left;">
        <h2 class="work-report-title">
          <span class="title-icon">🧾</span> Month ${GameState.currentMonth} — Living Expenses
        </h2>

        <div class="work-card">
          <ul class="work-ledger">
            <li class="work-ledger-row" style="animation-delay: 0.1s;">
              <span class="ledger-label"><span class="ledger-icon">🏠</span> Rent</span>
              <span class="ledger-amount">-$${rent}</span>
            </li>
            <li class="work-ledger-row" style="animation-delay: 0.15s;">
              <span class="ledger-label"><span class="ledger-icon">🍔</span> Food & Groceries</span>
              <span class="ledger-amount">-$${food}</span>
            </li>
            <li class="work-ledger-row" style="animation-delay: 0.2s;">
              <span class="ledger-label"><span class="ledger-icon">🚌</span> Transportation</span>
              <span class="ledger-amount">-$${transport}</span>
            </li>
            <li class="work-ledger-row" style="animation-delay: 0.25s;">
              <span class="ledger-label"><span class="ledger-icon">💡</span> Utilities</span>
              <span class="ledger-amount">-$${utilities}</span>
            </li>
          </ul>
          <hr class="work-ledger-divider">
          <div class="work-ledger-total">
            <span class="total-label">Total Expenses</span>
            <span class="total-amount">-$${totalExpense}</span>
          </div>
        </div>

        <div class="work-btn-wrap">
          <button class="btn btn-primary" id="pay-bill-btn" style="font-weight: 700;">Pay My Bill</button>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('pay-bill-btn').addEventListener('click', () => {
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
      <div class="modal-content" style="max-width: 440px; text-align: center;">
        <h2 class="work-report-title">
          <span class="title-icon">🧾</span> Month ${GameState.currentMonth} — Living Expenses
        </h2>

        <div class="work-paid-check">✓</div>

        <p class="work-paid-message">
          Living expenses for month ${GameState.currentMonth}<br>have been paid!
        </p>

        <div class="work-balance-badge">
          <span class="badge-label">Remaining Balance</span>
          <span class="badge-value">$${GameState.balance.toLocaleString()}</span>
        </div>

        <div class="work-btn-wrap">
          <button class="btn btn-primary" id="expense-continue">Continue →</button>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('expense-continue').addEventListener('click', () => {
      overlay.innerHTML = '';
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
