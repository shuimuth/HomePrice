/**
 * HouseInteriorScene - House interior detail view
 * Launched as an overlay from MapScene when the player enters a house.
 * Shows house exterior view, price, area, interior description, and
 * comparison with player's balance. Uses DOM overlay for rich layout.
 */
class HouseInteriorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HouseInteriorScene' });
  }

  init(data) {
    this.houseData = data;
  }

  create() {
    // Semi-transparent backdrop on the Phaser canvas
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

    this.showHouseDetails();

    // ESC to close
    this.input.keyboard.once('keydown-ESC', () => this.returnToMap());
  }

  showHouseDetails() {
    const d = this.houseData;
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const affordRatio = d.balance / d.price;
    let affordColor, affordText;
    if (affordRatio >= 1) {
      affordColor = '#2ecc71';
      affordText = 'You can afford this!';
    } else if (affordRatio >= 0.3) {
      affordColor = '#f39c12';
      affordText = 'Getting closer...';
    } else {
      affordColor = '#e74c3c';
      affordText = 'Still a long way to go';
    }

    const progressPct = Math.min(100, (affordRatio * 100)).toFixed(1);

    const tierLabel = {
      high: { text: 'Premium', color: '#f39c12', bg: '#5a3e00' },
      mid:  { text: 'Standard', color: '#3498db', bg: '#0d3b66' },
      low:  { text: 'Economy', color: '#95a5a6', bg: '#2c3e50' },
    };
    const tier = tierLabel[d.tier] || tierLabel.mid;

    const featuresHTML = d.features.map(f =>
      `<span style="
        display: inline-block;
        background: #16213e;
        border-radius: 12px;
        padding: 4px 10px;
        margin: 3px 4px;
        font-size: 12px;
        color: #bdc3c7;
        white-space: nowrap;
      ">${f}</span>`
    ).join('');

    const roofColorCSS = '#' + d.roofColor.toString(16).padStart(6, '0');
    const bodyColorCSS = '#' + d.color.toString(16).padStart(6, '0');

    const container = document.createElement('div');
    container.className = 'modal-backdrop';
    container.innerHTML = `
      <div class="modal-content" style="max-width: 520px; padding: 0; overflow: hidden; max-height: 90vh; overflow-y: auto;">
        <!-- Header with house exterior illustration -->
        <div style="
          background: linear-gradient(135deg, ${bodyColorCSS} 0%, #1a1a2e 100%);
          padding: 24px 28px 18px;
          text-align: center;
          position: relative;
        ">
          <div style="font-size: 48px; margin-bottom: 8px;">${d.icon}</div>
          <h2 style="color: #ecf0f1; margin: 0 0 4px; font-size: 22px;">${d.name}</h2>
          <span style="
            display: inline-block;
            background: ${tier.bg};
            color: ${tier.color};
            font-size: 11px;
            font-weight: bold;
            padding: 2px 10px;
            border-radius: 10px;
          ">${tier.text}</span>
          <div style="margin-top: 10px;">
            <span style="color: ${roofColorCSS}; font-size: 13px;">${'▲'.repeat(d.floors + 2)}</span>
          </div>
          <!-- Mini building illustration -->
          <div style="
            display: flex;
            justify-content: center;
            align-items: flex-end;
            margin-top: 8px;
            gap: 2px;
          ">
            ${Array.from({ length: d.floors }, (_, i) => `
              <div style="
                width: ${50 + i * 5}px;
                height: ${20 + i * 5}px;
                background: ${bodyColorCSS};
                border: 1px solid rgba(255,255,255,0.15);
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 4px;
              ">
                ${'<div style="width:6px;height:8px;background:#f1c40f;opacity:0.6;"></div>'.repeat(Math.min(4, 2 + i))}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Body -->
        <div style="padding: 20px 28px 24px;">
          <!-- Price & Type -->
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div style="flex: 1; background: #0f3460; border-radius: 8px; padding: 14px; text-align: center;">
              <div style="color: #95a5a6; font-size: 11px; margin-bottom: 4px;">Price</div>
              <div style="color: #f39c12; font-size: 24px; font-weight: bold;">$${d.price.toLocaleString()}</div>
              <div style="color: #7f8c8d; font-size: 10px; margin-top: 2px;">≈ ${d.yearsToSave} years of salary</div>
            </div>
            <div style="flex: 1; background: #0f3460; border-radius: 8px; padding: 14px; text-align: center;">
              <div style="color: #95a5a6; font-size: 11px; margin-bottom: 4px;">Type & Size</div>
              <div style="color: #ecf0f1; font-size: 14px; font-weight: bold;">${d.type}</div>
              <div style="color: #7f8c8d; font-size: 11px; margin-top: 4px;">${d.sqft}</div>
            </div>
          </div>

          <!-- Interior Description -->
          <div style="background: #16213e; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
            <div style="color: #3498db; font-size: 13px; font-weight: bold; margin-bottom: 8px;">🏠 Interior</div>
            <img src="assets/house/${d.id}.png" alt="${d.name} interior"
              style="width:100%; border-radius:6px; margin-bottom:10px; object-fit:cover; max-height:200px; display:block;" />
            <div style="display: flex; flex-wrap: wrap; gap: 2px;">
              ${featuresHTML}
            </div>
          </div>

          <!-- Affordability -->
          <div style="background: #16213e; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="color: #95a5a6; font-size: 12px;">Your Balance</span>
              <span style="color: #2ecc71; font-size: 16px; font-weight: bold;">$${d.balance.toLocaleString()}</span>
            </div>
            <div style="
              background: #0a0a2a;
              border-radius: 6px;
              height: 10px;
              overflow: hidden;
              margin-bottom: 8px;
            ">
              <div style="
                width: ${progressPct}%;
                height: 100%;
                background: ${affordColor};
                border-radius: 6px;
                transition: width 0.5s ease;
              "></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: ${affordColor}; font-size: 12px; font-weight: bold;">${affordText}</span>
              <span style="color: #7f8c8d; font-size: 11px;">${progressPct}% of price</span>
            </div>
          </div>

          <!-- Return button -->
          <button class="btn btn-primary" id="house-return-btn" style="
            width: 100%;
            padding: 14px;
            font-size: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          ">
            ← Back to Map
          </button>
          <div style="text-align: center; margin-top: 6px; color: #7f8c8d; font-size: 10px;">
            or press ESC
          </div>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('house-return-btn').addEventListener('click', () => {
      this.returnToMap();
    });
  }

  returnToMap() {
    document.getElementById('ui-overlay').innerHTML = '';
    this.scene.stop();
    this.scene.resume('MapScene');
  }
}
