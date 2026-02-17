/**
 * LotteryScene - Lottery purchase decision
 * Player chooses between Lottery A, Lottery B, or no purchase.
 */
class LotteryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LotteryScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    this.showLotteryChoice();
  }

  showLotteryChoice() {
    const cfg = GameState.config;
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const prizeA = cfg.lotteryA.prize;
    const prizeB = cfg.lotteryB.prize;
    const probA = cfg.lotteryA.winProbability;
    const probB = cfg.lotteryB.winProbability;
    const price = cfg.lotteryPrice;

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 650px;">
        <h2>🎰 Lottery Purchase</h2>
        <p style="color: #e74c3c; text-align: center; font-size: 14px; margin-bottom: 6px; font-weight: bold;">
          ⚠️ This is your ONE AND ONLY chance to buy a lottery ticket in the game.
        </p>
        <p style="color: #95a5a6; text-align: center; font-size: 13px; margin-bottom: 20px;">
          Current balance: <strong style="color: #2ecc71;">$${GameState.balance.toLocaleString()}</strong>
          &nbsp;|&nbsp; Ticket price: <strong style="color: #f39c12;">$${price}</strong>
        </p>
        <p style="color: #3498db; text-align: center; font-size: 13px; margin-bottom: 10px; font-style: italic;">
          💰 If you win, the prize money will be automatically added to your account balance.
        </p>

        <div class="card-row" id="lottery-cards">
          <div class="card lottery-card" data-choice="A" style="min-width: 180px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🎫</div>
            <h4 style="color: #e74c3c;">Lottery A</h4>
            <div style="margin: 12px 0;">
              <p style="color: #bdc3c7; font-size: 12px; margin-bottom: 4px;">Win Probability</p>
              <p style="color: #f39c12; font-size: 20px; font-weight: bold;">1 in ${Math.round(1/probA)}</p>
            </div>
            <div>
              <p style="color: #bdc3c7; font-size: 12px; margin-bottom: 4px;">Prize</p>
              <p style="color: #2ecc71; font-size: 22px; font-weight: bold;">$${prizeA.toLocaleString()}</p>
              <p style="color: #7f8c8d; font-size: 11px;">(≈ 5 years salary)</p>
            </div>
          </div>

          <div class="card lottery-card" data-choice="B" style="min-width: 180px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🎫</div>
            <h4 style="color: #3498db;">Lottery B</h4>
            <div style="margin: 12px 0;">
              <p style="color: #bdc3c7; font-size: 12px; margin-bottom: 4px;">Win Probability</p>
              <p style="color: #f39c12; font-size: 20px; font-weight: bold;">1 in ${Math.round(1/probB)}</p>
            </div>
            <div>
              <p style="color: #bdc3c7; font-size: 12px; margin-bottom: 4px;">Prize</p>
              <p style="color: #2ecc71; font-size: 22px; font-weight: bold;">$${prizeB.toLocaleString()}</p>
              <p style="color: #7f8c8d; font-size: 11px;">(≈ 3 months salary)</p>
            </div>
          </div>

          <div class="card lottery-card" data-choice="none" style="min-width: 180px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🚫</div>
            <h4 style="color: #95a5a6;">No Purchase</h4>
            <div style="margin: 12px 0;">
              <p style="color: #bdc3c7; font-size: 12px; margin-bottom: 4px;">&nbsp;</p>
              <p style="color: #95a5a6; font-size: 16px;">Keep your money</p>
            </div>
            <div>
              <p style="color: #bdc3c7; font-size: 12px; margin-bottom: 4px;">&nbsp;</p>
              <p style="color: #95a5a6; font-size: 14px;">$0 cost</p>
              <p style="color: #7f8c8d; font-size: 11px;">&nbsp;</p>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button class="btn btn-primary" id="lottery-submit" disabled style="width: 100%; padding: 12px; opacity: 0.5;">
            Select an option to continue
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    // Card selection logic
    let selectedChoice = null;
    const cards = container.querySelectorAll('.lottery-card');
    const submitBtn = document.getElementById('lottery-submit');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedChoice = card.dataset.choice;
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.textContent = 'Confirm Choice →';
      });
    });

    submitBtn.addEventListener('click', () => {
      if (!selectedChoice) return;
      this.handleLotteryChoice(selectedChoice);
    });
  }

  async handleLotteryChoice(choice) {
    const btn = document.getElementById('lottery-submit');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const result = await GameAPI.saveLottery(choice);
      if (result.balance !== undefined) {
        GameState.balance = result.balance;
      }

      document.getElementById('ui-overlay').innerHTML = '';
      this.scene.start('SurveyScene');
    } catch (error) {
      btn.disabled = false;
      btn.textContent = 'Confirm Choice →';
      console.error('Failed to save lottery choice:', error);
    }
  }
}
