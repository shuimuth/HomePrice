/**
 * MonthEndScene - Monthly living expenses breakdown and deduction
 * Shows itemized costs and updates balance.
 */
class MonthEndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MonthEndScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.showLivingExpenses();
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

    // Deduct from balance
    GameState.balance -= totalExpense;

    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 450px; text-align: center;">
        <h2>📋 Monthly Living Expenses</h2>
        <p style="color: #95a5a6; font-size: 13px; margin-bottom: 16px;">
          Month ${GameState.currentMonth} — Your monthly bills are due.
        </p>

        <div style="background: #0f3460; border-radius: 8px; padding: 16px; margin: 12px 0; text-align: left;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #bdc3c7;">🏠 Rent</span>
            <span style="color: #e74c3c; font-weight: bold;">-$${rent}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #bdc3c7;">🍔 Food & Groceries</span>
            <span style="color: #e74c3c; font-weight: bold;">-$${food}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #bdc3c7;">🚌 Transportation</span>
            <span style="color: #e74c3c; font-weight: bold;">-$${transport}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #bdc3c7;">💡 Utilities</span>
            <span style="color: #e74c3c; font-weight: bold;">-$${utilities}</span>
          </div>
          <hr style="border-color: #2c3e50; margin: 10px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #ecf0f1; font-weight: bold;">Total Expenses</span>
            <span style="color: #e74c3c; font-weight: bold; font-size: 18px;">-$${totalExpense}</span>
          </div>
        </div>

        <div style="background: #16213e; border-radius: 8px; padding: 12px; margin: 12px 0;">
          <p style="color: #bdc3c7; font-size: 13px;">Remaining Balance</p>
          <p style="color: #2ecc71; font-size: 28px; font-weight: bold;">$${GameState.balance.toLocaleString()}</p>
        </div>

        <button class="btn btn-primary" id="expense-continue" style="width: 100%; padding: 12px; margin-top: 8px;">
          Continue →
        </button>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('expense-continue').addEventListener('click', () => {
      overlay.innerHTML = '';
      // Go to house price display
      this.scene.start('HousePriceScene');
    });
  }
}
