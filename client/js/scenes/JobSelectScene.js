/**
 * JobSelectScene - Job selection
 * Player chooses one of three jobs.
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
            <p>Wash dishes at a busy restaurant</p>
          </div>
          <div class="card job-card" data-job="computer">
            <div style="font-size: 36px; margin-bottom: 10px;">🖥️</div>
            <h4>Computer Operator</h4>
            <p>Maintain department computer systems</p>
          </div>
          <div class="card job-card" data-job="finance">
            <div style="font-size: 36px; margin-bottom: 10px;">📊</div>
            <h4>Financial Clerk</h4>
            <p>Complete company product profit sheets</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <button class="btn btn-primary" id="job-submit" disabled style="width: 100%; padding: 12px; opacity: 0.5;">
            Select a Job to continue
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(container);

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

      document.getElementById('ui-overlay').innerHTML = '';
      this.showJobOverview(jobType);
    } catch (error) {
      btn.disabled = false;
      btn.textContent = 'Continue →';
      console.error('Failed to save job:', error);
    }
  }

  showJobOverview(jobType) {
    const cfg = GameState.config;
    const salary = cfg.monthlyBaseSalary;
    const requiredUnits = cfg.bonusThreshold;
    const totalClicks = requiredUnits * cfg.clicksPerTaskUnit;
    const penalty = cfg.penaltyPerUnit;
    const bonus = cfg.bonusPerUnit;

    const jobFlavor = {
      restaurant: { unit: 'dishes', verb: 'right-click the mouse' },
      computer:   { unit: 'system checks', verb: 'right-click the mouse' },
      finance:    { unit: 'profit sheets', verb: 'right-click the mouse' },
    };
    const flavor = jobFlavor[jobType] || jobFlavor.restaurant;
    const totalWork = requiredUnits * cfg.clicksPerTaskUnit * 10;

    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 520px; padding: 28px 32px; text-align: left;">
        <h2 style="text-align: center; color: #3498db; margin-bottom: 24px; font-style: italic;">Job Overview: Your Tasks</h2>

        <div style="color: #bdc3c7; font-size: 14px; line-height: 1.9;">
          <p style="margin-bottom: 14px;">
            <strong style="color: #ecf0f1;">● Task:</strong><br>
            <span style="padding-left: 16px;">- Continuously <span style="color: #f39c12; text-decoration: underline;">${flavor.verb}</span> 🖱️ to complete work units.</span><br>
            <span style="padding-left: 16px;">- A progress bar will show your progress in real time.</span>
          </p>

          <p style="margin-bottom: 10px;">
            <strong style="color: #ecf0f1;">● Required work amount:</strong>
            ${totalWork} ${flavor.unit} (${totalClicks} clicks) / month
          </p>

          <p style="margin-bottom: 10px;">
            <strong style="color: #ecf0f1;">● Base payment:</strong>
            <span style="color: #f39c12;">$${salary.toLocaleString()}</span> / month
          </p>

          <p style="margin-bottom: 10px;">
            <strong style="color: #ecf0f1;">● Penalty:</strong>
            <span style="color: #e74c3c;">-$${penalty}</span> for each unfinished work unit
          </p>

          <p style="margin-bottom: 6px;">
            <strong style="color: #ecf0f1;">● Bonus:</strong>
            <span style="color: #2ecc71;">+$${bonus}</span> for each additional work unit completed
          </p>
        </div>

        <button class="btn btn-primary" id="overview-start" style="width: 100%; padding: 14px; margin-top: 24px; font-size: 16px; font-weight: bold;">
          Start working!
        </button>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('overview-start').addEventListener('click', () => {
      overlay.innerHTML = '';
      this.scene.start('CityScene');
    });
  }
}
