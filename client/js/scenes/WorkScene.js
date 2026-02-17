/**
 * WorkScene - Core work task system
 * Player clicks to complete task units within a time limit.
 * All three jobs have identical mechanics with different visual themes.
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

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f3460);

    // Job-specific visual theme
    const jobThemes = {
      restaurant: {
        icon: '🍽️',
        title: 'Dish Washing Station',
        taskLabel: 'Scrub the dish',
        unitLabel: 'dishes',
        instruction: 'Click rapidly to scrub each dish clean!',
      },
      computer: {
        icon: '🖥️',
        title: 'System Check Terminal',
        taskLabel: 'Run system check',
        unitLabel: 'systems',
        instruction: 'Click rapidly to check each system module!',
      },
      finance: {
        icon: '📊',
        title: 'Profit Sheet Desk',
        taskLabel: 'Fill profit entry',
        unitLabel: 'entries',
        instruction: 'Click rapidly to fill each profit entry!',
      },
    };

    const theme = jobThemes[GameState.jobType] || jobThemes.restaurant;

    // Header
    this.add.text(width / 2, 25, `${theme.icon} ${theme.title}`, {
      fontSize: '22px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#3498db',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 52, `Month ${GameState.currentMonth} — ${theme.instruction}`, {
      fontSize: '13px',
      color: '#95a5a6',
    }).setOrigin(0.5);

    // Timer display
    this.timerText = this.add.text(width - 20, 25, `⏱ ${this.timeLimit}s`, {
      fontSize: '18px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#f39c12',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // Units completed display
    this.unitsText = this.add.text(20, 25, `${theme.unitLabel}: 0`, {
      fontSize: '16px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // Central work area — clickable zone
    const workAreaY = height / 2 - 20;
    const workArea = this.add.rectangle(width / 2, workAreaY, 300, 300, 0x16213e)
      .setStrokeStyle(2, 0x3498db)
      .setInteractive({ useHandCursor: true });

    // Task icon in work area
    this.taskIcon = this.add.text(width / 2, workAreaY - 30, theme.icon, {
      fontSize: '64px',
    }).setOrigin(0.5);

    // Click counter in work area
    this.clickCountText = this.add.text(width / 2, workAreaY + 40, `0 / ${this.clicksPerUnit}`, {
      fontSize: '20px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Progress bar background
    const barY = workAreaY + 80;
    this.add.rectangle(width / 2, barY, 260, 16, 0x2c3e50).setOrigin(0.5);

    // Progress bar fill
    this.progressBar = this.add.rectangle(width / 2 - 130, barY, 0, 16, 0x3498db).setOrigin(0, 0.5);

    // Status text below work area
    this.statusText = this.add.text(width / 2, barY + 40, 'Click the work area to start!', {
      fontSize: '14px',
      color: '#f39c12',
    }).setOrigin(0.5);

    // Salary info at bottom
    const bonusT = cfg.bonusThreshold;
    const penaltyT = cfg.penaltyThreshold;
    this.add.text(width / 2, height - 40, `Complete > ${bonusT} ${theme.unitLabel} for bonus | < ${penaltyT} = salary deduction`, {
      fontSize: '12px',
      color: '#7f8c8d',
    }).setOrigin(0.5);

    // Click handler
    workArea.on('pointerdown', () => {
      if (!this.isWorking || this.waitingForSpace) return;
      this.handleClick();
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

  handleClick() {
    this.currentUnitClicks++;
    this.totalClicks++;

    // Update click counter
    this.clickCountText.setText(`${this.currentUnitClicks} / ${this.clicksPerUnit}`);

    // Update progress bar
    const progress = Math.min(this.currentUnitClicks / this.clicksPerUnit, 1);
    this.progressBar.width = 260 * progress;

    // Visual feedback — brief shake
    this.taskIcon.setScale(1.1);
    this.time.delayedCall(80, () => {
      if (this.taskIcon) this.taskIcon.setScale(1);
    });

    // Check if unit completed
    if (this.currentUnitClicks >= this.clicksPerUnit) {
      this.completeUnit();
    }
  }

  completeUnit() {
    this.completedUnits++;
    this.unitsText.setText(`${this.getUnitLabel()}: ${this.completedUnits}`);

    // Flash effect
    this.cameras.main.flash(200, 46, 204, 113, true);

    // Wait for space to continue
    this.waitingForSpace = true;
    this.statusText.setText('✅ Unit complete! Press SPACE for next one.');
    this.statusText.setColor('#2ecc71');
  }

  startNextUnit() {
    this.waitingForSpace = false;
    this.currentUnitClicks = 0;
    this.clickCountText.setText(`0 / ${this.clicksPerUnit}`);
    this.progressBar.width = 0;
    this.statusText.setText('Keep clicking!');
    this.statusText.setColor('#f39c12');
  }

  updateTimer() {
    this.timeRemaining--;
    this.timerText.setText(`⏱ ${this.timeRemaining}s`);

    if (this.timeRemaining <= 10) {
      this.timerText.setColor('#e74c3c');
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

  getUnitLabel() {
    const labels = {
      restaurant: 'dishes',
      computer: 'systems',
      finance: 'entries',
    };
    return labels[GameState.jobType] || 'units';
  }
}
