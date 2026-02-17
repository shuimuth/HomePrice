/**
 * WorkScene - Core work task system
 * Player clicks to complete task units within a time limit.
 * All three jobs have identical mechanics with different visual themes.
 *
 * Redesigned with professional UI: layered HUD, glowing work area,
 * gradient progress bars, micro-interaction animations.
 */
class WorkScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorkScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    const cfg = GameState.config;

    // State
    this.totalClicks = 0;
    this.currentUnitClicks = 0;
    this.completedUnits = 0;
    this.clicksPerUnit = cfg.clicksPerTaskUnit;
    this.timeLimit = cfg.workTimeLimitSeconds;
    this.timeRemaining = this.timeLimit;
    this.workStartTime = Date.now();
    this.isWorking = true;
    this.waitingForSpace = false;

    // ─── Background ───
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0e27);
    // Subtle radial vignette overlay
    const vignette = this.add.graphics();
    vignette.fillStyle(0x0f1638, 0.6);
    vignette.fillCircle(width / 2, height / 2 - 20, 420);

    // Job-specific visual theme
    const jobThemes = {
      restaurant: {
        icon: '🍽️',
        title: 'Dish Washing Station',
        taskLabel: 'Scrub the dish',
        unitLabel: 'dishes',
        instruction: 'Click rapidly to scrub each dish clean!',
        accent: 0x3498db,
        accentHex: '#3498db',
        glow: 0x2980b9,
      },
      computer: {
        icon: '🖥️',
        title: 'System Check Terminal',
        taskLabel: 'Run system check',
        unitLabel: 'systems',
        instruction: 'Click rapidly to check each system module!',
        accent: 0x9b59b6,
        accentHex: '#9b59b6',
        glow: 0x8e44ad,
      },
      finance: {
        icon: '📊',
        title: 'Profit Sheet Desk',
        taskLabel: 'Fill profit entry',
        unitLabel: 'entries',
        instruction: 'Click rapidly to fill each profit entry!',
        accent: 0x1abc9c,
        accentHex: '#1abc9c',
        glow: 0x16a085,
      },
    };

    const theme = jobThemes[GameState.jobType] || jobThemes.restaurant;

    // ─── Top HUD Panel ───
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0d1b3e, 0.85);
    hudBg.fillRoundedRect(12, 18, width - 24, 56, 12);
    hudBg.lineStyle(1, theme.accent, 0.3);
    hudBg.strokeRoundedRect(12, 18, width - 24, 56, 12);

    // Title (centered in HUD)
    this.add.text(width / 2, 34, `${theme.icon}  ${theme.title}`, {
      fontSize: '20px',
      fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
      color: theme.accentHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Month & instruction subtitle
    this.add.text(width / 2, 58, `Month ${GameState.currentMonth} — ${theme.instruction}`, {
      fontSize: '11px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#7f8c8d',
      letterSpacing: 1,
    }).setOrigin(0.5);

    // Timer (right side of HUD)
    this.timerText = this.add.text(width - 32, 40, `⏱ ${this.timeLimit}s`, {
      fontSize: '17px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#f39c12',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // Units completed (left side of HUD)
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

    // Outer glow
    const outerGlow = this.add.graphics();
    outerGlow.fillStyle(theme.accent, 0.04);
    outerGlow.fillRoundedRect(
      width / 2 - workAreaW / 2 - 6, workAreaY - workAreaH / 2 - 6,
      workAreaW + 12, workAreaH + 12, 18
    );

    // Work area background
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

    // Invisible clickable zone over work area
    const workArea = this.add.rectangle(width / 2, workAreaY, workAreaW, workAreaH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    // Pulsing border effect (animated glow ring)
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
    this.taskIcon = this.add.text(width / 2, workAreaY - 55, theme.icon, {
      fontSize: '56px',
    }).setOrigin(0.5);

    // Subtle idle float animation
    this.tweens.add({
      targets: this.taskIcon,
      y: workAreaY - 60,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ─── Click Counter ───
    this.clickCountText = this.add.text(width / 2, workAreaY + 10, `0 / ${this.clicksPerUnit}`, {
      fontSize: '26px',
      fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
      color: '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // ─── Unit Progress Bar (pill-shaped) ───
    const barY = workAreaY + 60;
    const barW = 340;
    const barH = 14;

    // Track background
    const trackBg = this.add.graphics();
    trackBg.fillStyle(0x1a2744, 1);
    trackBg.fillRoundedRect(width / 2 - barW / 2, barY - barH / 2, barW, barH, barH / 2);
    trackBg.lineStyle(1, 0x2c3e50, 0.5);
    trackBg.strokeRoundedRect(width / 2 - barW / 2, barY - barH / 2, barW, barH, barH / 2);

    // Progress fill (using a rectangle, masked to pill shape)
    this.progressBar = this.add.rectangle(width / 2 - barW / 2, barY, 0, barH - 2, theme.accent)
      .setOrigin(0, 0.5);

    // Create pill mask for progress bar
    const maskGraphics = this.make.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRoundedRect(width / 2 - barW / 2, barY - barH / 2, barW, barH, barH / 2);
    this.progressBar.setMask(maskGraphics.createGeometryMask());

    this.progressBarW = barW;

    // ─── Status Text ───
    this.statusText = this.add.text(width / 2, barY + 28, 'Click the work area to start!', {
      fontSize: '13px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#f39c12',
      fontStyle: 'italic',
      align: 'center',
    }).setOrigin(0.5);

    // ─── Overall Goal Progress Bar (below work area) ───
    const goalBarY = workAreaY + workAreaH / 2 + 50;
    const goalBarW = 480;
    const goalBarH = 18;
    const goalBarX = width / 2 - goalBarW / 2;
    const maxDisplayUnits = cfg.bonusThreshold + 5;

    // Goal bar container background with rounded rect
    const goalContainer = this.add.graphics();
    goalContainer.fillStyle(0x0d1630, 0.9);
    goalContainer.fillRoundedRect(goalBarX - 20, goalBarY - 38, goalBarW + 40, 102, 10);
    goalContainer.lineStyle(1, 0x1e2d50, 0.6);
    goalContainer.strokeRoundedRect(goalBarX - 20, goalBarY - 38, goalBarW + 40, 102, 10);

    // Section label
    this.add.text(width / 2, goalBarY - 24, '📈 OVERALL PROGRESS', {
      fontSize: '9px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#5a6a8a',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Background track (rounded)
    const goalTrack = this.add.graphics();
    goalTrack.fillStyle(0x0a0f20, 1);
    goalTrack.fillRoundedRect(goalBarX, goalBarY - goalBarH / 2, goalBarW, goalBarH, goalBarH / 2);
    goalTrack.lineStyle(1, 0x1e2d50, 0.5);
    goalTrack.strokeRoundedRect(goalBarX, goalBarY - goalBarH / 2, goalBarW, goalBarH, goalBarH / 2);

    // Penalty zone (red tint)
    const penaltyW = (cfg.penaltyThreshold / maxDisplayUnits) * goalBarW;
    const penaltyZone = this.add.graphics();
    penaltyZone.fillStyle(0x4a1515, 0.8);
    penaltyZone.fillRect(goalBarX, goalBarY - goalBarH / 2, penaltyW, goalBarH);

    // Normal zone (amber tint)
    const normalW = ((cfg.bonusThreshold - cfg.penaltyThreshold) / maxDisplayUnits) * goalBarW;
    const normalZone = this.add.graphics();
    normalZone.fillStyle(0x3d3a10, 0.8);
    normalZone.fillRect(goalBarX + penaltyW, goalBarY - goalBarH / 2, normalW, goalBarH);

    // Bonus zone (green tint)
    const bonusW = goalBarW - penaltyW - normalW;
    const bonusZone = this.add.graphics();
    bonusZone.fillStyle(0x0f3d1a, 0.8);
    bonusZone.fillRect(goalBarX + penaltyW + normalW, goalBarY - goalBarH / 2, bonusW, goalBarH);

    // Clip all zones to pill shape
    const goalMaskGfx = this.make.graphics();
    goalMaskGfx.fillStyle(0xffffff);
    goalMaskGfx.fillRoundedRect(goalBarX, goalBarY - goalBarH / 2, goalBarW, goalBarH, goalBarH / 2);
    const goalMask = goalMaskGfx.createGeometryMask();
    penaltyZone.setMask(goalMask);
    normalZone.setMask(goalMask);
    bonusZone.setMask(goalMask);

    // Threshold markers (vertical dividers)
    const penaltyLineX = goalBarX + penaltyW;
    const bonusLineX = goalBarX + penaltyW + normalW;

    const markerGfx = this.add.graphics();
    markerGfx.fillStyle(0xe74c3c, 0.9);
    markerGfx.fillRect(penaltyLineX - 1, goalBarY - goalBarH / 2 - 2, 2, goalBarH + 4);
    markerGfx.fillStyle(0x2ecc71, 0.9);
    markerGfx.fillRect(bonusLineX - 1, goalBarY - goalBarH / 2 - 2, 2, goalBarH + 4);

    // Threshold number labels
    this.add.text(penaltyLineX, goalBarY + goalBarH / 2 + 4, `${cfg.penaltyThreshold}`, {
      fontSize: '9px', color: '#c0392b', fontFamily: '"Segoe UI", sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(bonusLineX, goalBarY + goalBarH / 2 + 4, `${cfg.bonusThreshold}`, {
      fontSize: '9px', color: '#27ae60', fontFamily: '"Segoe UI", sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Current progress fill (bright overlay)
    this.goalProgressFill = this.add.rectangle(goalBarX, goalBarY, 0, goalBarH - 4, theme.accent)
      .setOrigin(0, 0.5).setAlpha(0.75);
    this.goalProgressFill.setMask(goalMask);

    // Current units label on the bar
    this.goalLabel = this.add.text(width / 2, goalBarY, '0 / ' + maxDisplayUnits + '+ ' + theme.unitLabel, {
      fontSize: '10px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);

    // Salary hint below goal bar
    this.add.text(width / 2, goalBarY + goalBarH / 2 + 30, `⚠ < ${cfg.penaltyThreshold} deduction   |   🎁 > ${cfg.bonusThreshold} bonus`, {
      fontSize: '10px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#5a6a8a',
    }).setOrigin(0.5);

    // Store for updates
    this.goalBarW = goalBarW;
    this.goalBarX = goalBarX;
    this.maxDisplayUnits = maxDisplayUnits;
    this.goalTheme = theme;
    this.themeConfig = theme;

    // ─── Click Ripple Container ───
    this.ripplePool = [];

    // ─── Click Handler ───
    workArea.on('pointerdown', (pointer) => {
      if (!this.isWorking || this.waitingForSpace) return;
      this.handleClick();
      this.spawnClickRipple(pointer.x, pointer.y);
    });

    // Space bar handler for next unit
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.waitingForSpace && this.isWorking) {
        this.startNextUnit();
      }
    });

    // Timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  // Draw pulsing glow border
  drawPulseGlow(cx, cy, w, h, color, alpha) {
    this.pulseGlow.clear();
    this.pulseGlow.lineStyle(2, color, alpha);
    this.pulseGlow.strokeRoundedRect(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 4, 16);
  }

  // Spawn click ripple effect
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

    // Update click counter with scale pop
    this.clickCountText.setText(`${this.currentUnitClicks} / ${this.clicksPerUnit}`);
    this.tweens.add({
      targets: this.clickCountText,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 60,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // Update progress bar (smooth tween)
    const progress = Math.min(this.currentUnitClicks / this.clicksPerUnit, 1);
    this.tweens.add({
      targets: this.progressBar,
      width: this.progressBarW * progress,
      duration: 80,
      ease: 'Power2',
    });

    // Visual feedback — icon bounce
    this.tweens.add({
      targets: this.taskIcon,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 50,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // Check if unit completed
    if (this.currentUnitClicks >= this.clicksPerUnit) {
      this.completeUnit();
    }
  }

  completeUnit() {
    this.completedUnits++;
    this.unitsText.setText(`${this.getUnitLabel()}: ${this.completedUnits}`);

    // Update overall goal progress bar
    this.updateGoalProgress();

    // Subtle celebration: icon pop + brief glow circle instead of full-screen flash
    this.tweens.add({
      targets: this.taskIcon,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
    const glow = this.add.circle(this.taskIcon.x, this.taskIcon.y, 10, 0x2ecc71, 0.45);
    this.tweens.add({
      targets: glow,
      radius: 80,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        glow.setScale(glow.alpha > 0 ? 1 + (1 - glow.alpha) * 3 : 1);
      },
      onComplete: () => glow.destroy(),
    });

    // Wait for space to continue
    this.waitingForSpace = true;
    this.statusText.setText('✅ Done! Press SPACE for next.');
    this.statusText.setColor('#2ecc71');
    this.statusText.setFontStyle('bold');
  }

  startNextUnit() {
    this.waitingForSpace = false;
    this.currentUnitClicks = 0;
    this.clickCountText.setText(`0 / ${this.clicksPerUnit}`);
    this.progressBar.width = 0;
    this.statusText.setText('Keep clicking!');
    this.statusText.setFontSize(13);
    this.statusText.setColor('#f39c12');
    this.statusText.setFontStyle('italic');
  }

  updateTimer() {
    this.timeRemaining--;
    this.timerText.setText(`⏱ ${this.timeRemaining}s`);

    if (this.timeRemaining <= 10) {
      this.timerText.setColor('#e74c3c');
      // Urgent pulse on timer
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

    // Calculate salary
    const cfg = GameState.config;
    let salary = cfg.monthlyBaseSalary;
    let bonusDeduction = 0;

    if (this.completedUnits > cfg.bonusThreshold) {
      bonusDeduction = (this.completedUnits - cfg.bonusThreshold) * cfg.bonusPerUnit;
      salary += bonusDeduction;
    } else if (this.completedUnits < cfg.penaltyThreshold) {
      bonusDeduction = (cfg.penaltyThreshold - this.completedUnits) * cfg.penaltyPerUnit;
      salary -= bonusDeduction;
    }

    salary = Math.max(0, salary);
    GameState.balance += salary;

    // Calculate time spent
    const monthDuration = (Date.now() - this.workStartTime) / 1000;

    // Save performance data to server
    GameAPI.saveWorkPerformance({
      month: GameState.currentMonth,
      clicks: this.totalClicks,
      units: this.completedUnits,
      timeSpent: this.timeLimit - this.timeRemaining,
      balance: GameState.balance,
      monthDuration: monthDuration,
    });

    // Store locally
    GameState.monthlyPerformance.push({
      month: GameState.currentMonth,
      clicks: this.totalClicks,
      units: this.completedUnits,
    });

    // Show salary report
    this.showSalaryReport(salary, bonusDeduction);
  }

  showSalaryReport(salary, bonusDeduction) {
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const cfg = GameState.config;
    const isBonus = this.completedUnits > cfg.bonusThreshold;
    const isPenalty = this.completedUnits < cfg.penaltyThreshold;

    let bonusText = '';
    if (isBonus) {
      bonusText = `<p style="color: #2ecc71;">🎉 Bonus: +$${bonusDeduction} (${this.completedUnits - cfg.bonusThreshold} extra units)</p>`;
    } else if (isPenalty) {
      bonusText = `<p style="color: #e74c3c;">⚠️ Deduction: -$${bonusDeduction} (${cfg.penaltyThreshold - this.completedUnits} units short)</p>`;
    } else {
      bonusText = `<p style="color: #95a5a6;">No bonus or deduction this month.</p>`;
    }

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 450px; text-align: center;">
        <h2>💰 Salary Report — Month ${GameState.currentMonth}</h2>

        <div style="background: #0f3460; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: left;">
          <p style="color: #bdc3c7; font-size: 14px;">📋 Work Summary:</p>
          <p style="color: #ecf0f1; margin-top: 8px;">Completed: <strong>${this.completedUnits}</strong> ${this.getUnitLabel()}</p>
          <p style="color: #ecf0f1;">Total clicks: <strong>${this.totalClicks}</strong></p>
        </div>

        <div style="background: #16213e; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: left;">
          <p style="color: #bdc3c7; font-size: 14px;">💵 Earnings:</p>
          <p style="color: #ecf0f1; margin-top: 8px;">Base salary: $${cfg.monthlyBaseSalary}</p>
          ${bonusText}
          <hr style="border-color: #2c3e50; margin: 8px 0;">
          <p style="color: #2ecc71; font-size: 18px; font-weight: bold;">Total: $${salary}</p>
        </div>

        <p style="color: #bdc3c7; font-size: 14px;">
          Current balance: <strong style="color: #2ecc71;">$${GameState.balance.toLocaleString()}</strong>
        </p>

        <button class="btn btn-primary" id="salary-continue" style="width: 100%; padding: 12px; margin-top: 16px;">
          Continue →
        </button>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('salary-continue').addEventListener('click', () => {
      overlay.innerHTML = '';
      // Transition to MonthEndScene for living expenses
      this.scene.start('MonthEndScene');
    });
  }

  updateGoalProgress() {
    const cfg = GameState.config;
    const progress = Math.min(this.completedUnits / this.maxDisplayUnits, 1);

    // Smooth tween for goal bar fill
    this.tweens.add({
      targets: this.goalProgressFill,
      width: this.goalBarW * progress,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Update color based on zone
    if (this.completedUnits > cfg.bonusThreshold) {
      this.goalProgressFill.fillColor = 0x2ecc71;
      this.goalLabel.setColor('#2ecc71');
    } else if (this.completedUnits >= cfg.penaltyThreshold) {
      this.goalProgressFill.fillColor = 0xf39c12;
      this.goalLabel.setColor('#f39c12');
    } else {
      this.goalProgressFill.fillColor = 0xe74c3c;
      this.goalLabel.setColor('#e74c3c');
    }

    this.goalLabel.setText(`${this.completedUnits} ${this.goalTheme.unitLabel}`);
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
