/**
 * SurveyScene - Investment decision questionnaire
 * Player allocates investment between low-risk and high-risk options.
 */
class SurveyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SurveyScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    this.showSurvey();
  }

  showSurvey() {
    const cfg = GameState.config;
    const investmentAmount = cfg.investmentAmount;
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 550px;">
        <h2>📊 Investment Survey</h2>
        <div style="background: #0f3460; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <p style="color: #f39c12; font-size: 14px; margin-bottom: 6px;">📋 Government Financial Department Notice</p>
          <p style="color: #bdc3c7; font-size: 13px; line-height: 1.6;">
            The city's financial department is conducting a survey on residents' financial investment preferences.
            Please answer the following question honestly.
          </p>
        </div>

        <div style="background: #16213e; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <p style="color: #ecf0f1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
            If you were given <strong style="color: #2ecc71;">$${investmentAmount.toLocaleString()}</strong>
            to invest over the next <strong>5 years</strong>, how would you allocate it?
          </p>

          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label style="color: #3498db; font-size: 14px; font-weight: bold;">
                🛡️ Low-risk, Low-return
              </label>
              <span style="color: #7f8c8d; font-size: 12px;">(~15% stable return)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="range" id="low-risk-slider" min="0" max="100" value="50"
                style="flex: 1; accent-color: #3498db;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <input type="number" id="low-risk-input" min="0" max="100" value="50"
                  style="width: 60px; padding: 6px; background: #0f3460; border: 1px solid #3498db;
                  border-radius: 4px; color: #ecf0f1; text-align: center; font-size: 14px;">
                <span style="color: #bdc3c7;">%</span>
              </div>
            </div>
            <p style="color: #7f8c8d; font-size: 11px; margin-top: 4px;">
              Amount: $<span id="low-risk-amount">${(investmentAmount * 0.5).toLocaleString()}</span>
            </p>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label style="color: #e74c3c; font-size: 14px; font-weight: bold;">
                🔥 High-risk, High-return
              </label>
              <span style="color: #7f8c8d; font-size: 12px;">(up to ~120% return)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="range" id="high-risk-slider" min="0" max="100" value="50"
                style="flex: 1; accent-color: #e74c3c;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <input type="number" id="high-risk-input" min="0" max="100" value="50"
                  style="width: 60px; padding: 6px; background: #0f3460; border: 1px solid #e74c3c;
                  border-radius: 4px; color: #ecf0f1; text-align: center; font-size: 14px;">
                <span style="color: #bdc3c7;">%</span>
              </div>
            </div>
            <p style="color: #7f8c8d; font-size: 11px; margin-top: 4px;">
              Amount: $<span id="high-risk-amount">${(investmentAmount * 0.5).toLocaleString()}</span>
            </p>
          </div>

          <div id="sum-error" style="color: #e74c3c; font-size: 12px; margin-top: 10px; display: none;">
            Total must equal 100%.
          </div>
        </div>

        <button class="btn btn-primary" id="survey-submit" style="width: 100%; padding: 12px;">
          Submit Survey →
        </button>
      </div>
    `;

    overlay.appendChild(container);

    // Sync sliders and inputs
    const lowSlider = document.getElementById('low-risk-slider');
    const highSlider = document.getElementById('high-risk-slider');
    const lowInput = document.getElementById('low-risk-input');
    const highInput = document.getElementById('high-risk-input');
    const lowAmount = document.getElementById('low-risk-amount');
    const highAmount = document.getElementById('high-risk-amount');
    const sumError = document.getElementById('sum-error');

    function updateFromLow(val) {
      val = Math.max(0, Math.min(100, parseInt(val) || 0));
      const highVal = 100 - val;
      lowSlider.value = val;
      lowInput.value = val;
      highSlider.value = highVal;
      highInput.value = highVal;
      lowAmount.textContent = (investmentAmount * val / 100).toLocaleString();
      highAmount.textContent = (investmentAmount * highVal / 100).toLocaleString();
      sumError.style.display = 'none';
    }

    function updateFromHigh(val) {
      val = Math.max(0, Math.min(100, parseInt(val) || 0));
      const lowVal = 100 - val;
      highSlider.value = val;
      highInput.value = val;
      lowSlider.value = lowVal;
      lowInput.value = lowVal;
      lowAmount.textContent = (investmentAmount * lowVal / 100).toLocaleString();
      highAmount.textContent = (investmentAmount * val / 100).toLocaleString();
      sumError.style.display = 'none';
    }

    lowSlider.addEventListener('input', (e) => updateFromLow(e.target.value));
    highSlider.addEventListener('input', (e) => updateFromHigh(e.target.value));
    lowInput.addEventListener('change', (e) => updateFromLow(e.target.value));
    highInput.addEventListener('change', (e) => updateFromHigh(e.target.value));

    // Submit
    document.getElementById('survey-submit').addEventListener('click', () => {
      const lowVal = parseInt(lowInput.value) || 0;
      const highVal = parseInt(highInput.value) || 0;

      if (lowVal + highVal !== 100) {
        sumError.style.display = 'block';
        return;
      }

      this.handleSurveySubmit(lowVal, highVal);
    });
  }

  async handleSurveySubmit(lowRiskPercent, highRiskPercent) {
    const btn = document.getElementById('survey-submit');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      await GameAPI.saveSurvey({
        lowRiskPercent,
        highRiskPercent,
      });

      document.getElementById('ui-overlay').innerHTML = '';
      this.scene.start('EndScene');
    } catch (error) {
      btn.disabled = false;
      btn.textContent = 'Submit Survey →';
      console.error('Failed to save survey:', error);
    }
  }
}
