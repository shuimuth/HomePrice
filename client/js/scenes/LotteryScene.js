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
      <div class="modal-content" style="max-width: 580px; background: #0d1b2a; border: 2px solid #1b3a5c; border-radius: 12px; padding: 30px 28px;">
        <h2 style="text-align: center; color: #e0e0e0; font-size: 22px; margin-bottom: 14px;">🎰 Lottery Purchase</h2>
        <p style="color: #e0a830; text-align: center; font-size: 14px; margin-bottom: 16px;">
          ⚠️ This is your ONE AND ONLY chance to buy a lottery ticket in the game.
        </p>
        <p style="color: #ccc; text-align: center; font-size: 15px; margin-bottom: 22px; font-weight: bold;">
          Lottery Ticket Price: <span style="color: #fff;">$${price}</span>
        </p>

        <div class="card-row" id="lottery-cards" style="display: flex; gap: 12px; justify-content: center;">
          <div class="card lottery-card" data-choice="A" style="flex: 1; min-width: 150px; background: #0f2236; border: 2px solid #1b3a5c; border-radius: 10px; padding: 18px 14px; text-align: center; cursor: pointer; transition: border-color 0.2s;">
            <div style="font-size: 28px; margin-bottom: 6px;">🎫</div>
            <h4 style="color: #3fc5f0; font-size: 15px; margin-bottom: 10px;">Lottery A</h4>
            <p style="color: #bbb; font-size: 12px; margin-bottom: 2px;">🏆 Prize:</p>
            <p style="color: #2ecc71; font-size: 22px; font-weight: bold; margin-bottom: 12px;">$${prizeA.toLocaleString()}</p>
            <div style="border-top: 1px solid #1b3a5c; margin: 8px 0;"></div>
            <p style="color: #bbb; font-size: 12px; margin-bottom: 2px;">Odds of winning:</p>
            <p style="color: #3fc5f0; font-size: 18px; font-weight: bold;">1 in ${Math.round(1/probA).toLocaleString()}</p>
          </div>

          <div class="card lottery-card" data-choice="B" style="flex: 1; min-width: 150px; background: #0f2236; border: 2px solid #1b3a5c; border-radius: 10px; padding: 18px 14px; text-align: center; cursor: pointer; transition: border-color 0.2s;">
            <div style="font-size: 28px; margin-bottom: 6px;">🎫</div>
            <h4 style="color: #3fc5f0; font-size: 15px; margin-bottom: 10px;">Lottery B</h4>
            <p style="color: #bbb; font-size: 12px; margin-bottom: 2px;">🏆 Prize:</p>
            <p style="color: #2ecc71; font-size: 22px; font-weight: bold; margin-bottom: 12px;">$${prizeB.toLocaleString()}</p>
            <div style="border-top: 1px solid #1b3a5c; margin: 8px 0;"></div>
            <p style="color: #bbb; font-size: 12px; margin-bottom: 2px;">Odds of winning:</p>
            <p style="color: #3fc5f0; font-size: 18px; font-weight: bold;">1 in ${Math.round(1/probB)}</p>
          </div>

          <div class="card lottery-card" data-choice="none" style="flex: 1; min-width: 150px; background: #0f2236; border: 2px solid #1b3a5c; border-radius: 10px; padding: 18px 14px; text-align: center; cursor: pointer; transition: border-color 0.2s;">
            <div style="font-size: 28px; margin-bottom: 6px;">🚫</div>
            <h4 style="color: #95a5a6; font-size: 15px; margin-bottom: 10px;">No Purchase</h4>
            <p style="color: #bbb; font-size: 12px; margin-bottom: 2px;">&nbsp;</p>
            <p style="color: #95a5a6; font-size: 16px; margin-bottom: 12px;">Keep your money</p>
            <div style="border-top: 1px solid #1b3a5c; margin: 8px 0;"></div>
            <p style="color: #bbb; font-size: 12px; margin-bottom: 2px;">&nbsp;</p>
            <p style="color: #95a5a6; font-size: 16px;">$0 cost</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 22px;">
          <button class="btn btn-primary" id="lottery-submit" disabled style="width: 100%; padding: 14px; opacity: 0.5; background: #2196F3; border: 2px solid #1b7fd4; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; cursor: pointer;">
            Confirm Choice →
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
        cards.forEach(c => {
          c.classList.remove('selected');
          c.style.borderColor = '#1b3a5c';
        });
        card.classList.add('selected');
        card.style.borderColor = '#2ecc71';
        selectedChoice = card.dataset.choice;
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
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
