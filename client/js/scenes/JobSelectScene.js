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
      restaurant: { unit: 'dishes', verb: 'left-click the mouse' },
      computer:   { unit: 'system checks', verb: 'left-click the mouse' },
      finance:    { unit: 'profit sheets', verb: 'left-click the mouse' },
    };
    const flavor = jobFlavor[jobType] || jobFlavor.restaurant;
    const totalWork = requiredUnits * cfg.clicksPerTaskUnit * 10;

    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 520px; padding: 28px 32px; text-align: left;">
        <h2 class="job-overview-title">Job Overview: Your Tasks</h2>

        <ul class="job-overview-list">
          <li class="job-overview-item" style="animation-delay: 0.1s;">
            <span class="ov-icon">🖱️</span>
            <div class="ov-body">
              <div class="ov-label">Task</div>
              <div class="ov-desc">
                Continuously <span class="accent-warn">${flavor.verb}</span> to complete work units.<br>
                A progress bar will show your progress in real time.
              </div>
            </div>
          </li>
          <li class="job-overview-item" style="animation-delay: 0.2s;">
            <span class="ov-icon">📋</span>
            <div class="ov-body">
              <div class="ov-label">Required Work</div>
              <div class="ov-desc">${totalWork} ${flavor.unit} (${totalClicks} clicks) / month</div>
            </div>
          </li>
          <li class="job-overview-item" style="animation-delay: 0.3s;">
            <span class="ov-icon">💰</span>
            <div class="ov-body">
              <div class="ov-label">Base Payment</div>
              <div class="ov-desc"><span class="accent-warn">$${salary.toLocaleString()}</span> / month</div>
            </div>
          </li>
          <li class="job-overview-item" style="animation-delay: 0.4s;">
            <span class="ov-icon">⚠️</span>
            <div class="ov-body">
              <div class="ov-label">Penalty</div>
              <div class="ov-desc"><span class="accent-red">-$${penalty}</span> for each unfinished work unit</div>
            </div>
          </li>
          <li class="job-overview-item" style="animation-delay: 0.5s;">
            <span class="ov-icon">🎉</span>
            <div class="ov-body">
              <div class="ov-label">Bonus</div>
              <div class="ov-desc"><span class="accent-green">+$${bonus}</span> for each extra work unit completed</div>
            </div>
          </li>
        </ul>

        <div class="work-btn-wrap" style="margin-top: 16px;">
          <button class="btn btn-primary" id="overview-start" style="font-size: 16px; font-weight: 700;">
            Start working!
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('overview-start').addEventListener('click', () => {
      overlay.innerHTML = '';
      this.scene.start('CityScene');
    });
  }
}
