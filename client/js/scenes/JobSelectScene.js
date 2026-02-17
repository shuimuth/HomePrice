/**
 * JobSelectScene - Job selection with card-based UI
 * Player chooses one of three jobs, then sees initial funds.
 */
class JobSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'JobSelectScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.createJobSelectionUI();
  }

  createJobSelectionUI() {
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 650px;">
        <h2>💼 Choose Your Job</h2>
        <p style="color: #95a5a6; text-align: center; margin-bottom: 24px; font-size: 14px;">
          Select a job to earn your living in Valrenta City. You will work this job every month.
        </p>

        <div class="card-row" id="job-cards">
          <div class="card job-card" data-job="restaurant">
            <div style="font-size: 36px; margin-bottom: 10px;">🍽️</div>
            <h4>Restaurant Worker</h4>
            <p>Work at a busy restaurant washing dishes and keeping the kitchen clean.</p>
          </div>
          <div class="card job-card" data-job="computer">
            <div style="font-size: 36px; margin-bottom: 10px;">🖥️</div>
            <h4>Computer Operator</h4>
            <p>Monitor and check department computer systems for errors and issues.</p>
          </div>
          <div class="card job-card" data-job="finance">
            <div style="font-size: 36px; margin-bottom: 10px;">📊</div>
            <h4>Financial Clerk</h4>
            <p>Fill in SKU profit sheets and maintain financial records for the company.</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <button class="btn btn-primary" id="job-submit" disabled style="width: 100%; padding: 12px; opacity: 0.5;">
            Select a job to continue
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    // Job card selection logic
    let selectedJob = null;
    const cards = container.querySelectorAll('.job-card');
    const submitBtn = document.getElementById('job-submit');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedJob = card.dataset.job;
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.textContent = 'Continue →';
      });
    });

    submitBtn.addEventListener('click', () => {
      if (!selectedJob) return;
      this.handleJobSelection(selectedJob);
    });
  }

  async handleJobSelection(jobType) {
    const btn = document.getElementById('job-submit');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await GameAPI.saveJob(jobType);
      GameState.jobType = jobType;

      // Show initial funds notification
      this.showInitialFunds();
    } catch (error) {
      btn.disabled = false;
      btn.textContent = 'Continue →';
      console.error('Failed to save job:', error);
    }
  }

  showInitialFunds() {
    const overlay = document.getElementById('ui-overlay');
    const balance = GameState.balance;
    const salary = GameState.config.monthlyBaseSalary;

    overlay.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 480px; text-align: center;">
        <h2>💰 Your Starting Funds</h2>
        <p style="color: #95a5a6; margin-bottom: 20px; font-size: 14px;">
          You've arrived in Valrenta City with some savings.
        </p>

        <div style="background: #0f3460; border-radius: 12px; padding: 24px; margin: 20px 0;">
          <p style="color: #bdc3c7; font-size: 14px; margin-bottom: 8px;">Current Balance</p>
          <p style="color: #2ecc71; font-size: 36px; font-weight: bold;">$${balance.toLocaleString()}</p>
        </div>

        <div style="background: #16213e; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: left;">
          <p style="color: #f39c12; font-size: 14px; margin-bottom: 8px;">📋 Job Details:</p>
          <p style="color: #bdc3c7; font-size: 13px;">Monthly base salary: <strong style="color:#2ecc71;">$${salary.toLocaleString()}</strong></p>
          <p style="color: #bdc3c7; font-size: 13px; margin-top: 4px;">Performance bonuses and deductions may apply.</p>
        </div>

        <p style="color: #e74c3c; font-size: 13px; margin: 16px 0;">
          🏠 Remember: Your long-term goal is to buy a home in this city within 10–20 years!
        </p>

        <button class="btn btn-primary" id="funds-continue" style="width: 100%; padding: 12px; margin-top: 8px;">
          Enter the City →
        </button>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('funds-continue').addEventListener('click', () => {
      overlay.innerHTML = '';
      this.scene.start('CityScene');
    });
  }
}
