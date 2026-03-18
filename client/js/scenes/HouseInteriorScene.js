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
  }

  showHouseDetails() {
    const d = this.houseData;
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

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
          <!-- Rating bars -->
          <div style="
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-top: 14px;
            padding: 12px 20px;
            background: rgba(0,0,0,0.25);
            border-radius: 8px;
          ">
            <div style="flex:1; max-width: 220px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="color:#95a5a6; font-size:13px;">🛋️ Comfort</span>
                <span style="color:#e8d44d; font-size:13px;">${'★'.repeat(d.comfort)}${'☆'.repeat(5 - d.comfort)}</span>
              </div>
              <div style="background:rgba(255,255,255,0.1); border-radius:4px; height:8px; overflow:hidden;">
                <div style="width:${d.comfort * 20}%; height:100%; background:linear-gradient(90deg,#e74c3c,#f39c12,#2ecc71); border-radius:4px;"></div>
              </div>
            </div>
            <div style="flex:1; max-width: 220px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="color:#95a5a6; font-size:13px;">🎨 Decor</span>
                <span style="color:#e8d44d; font-size:13px;">${'★'.repeat(d.decor)}${'☆'.repeat(5 - d.decor)}</span>
              </div>
              <div style="background:rgba(255,255,255,0.1); border-radius:4px; height:8px; overflow:hidden;">
                <div style="width:${d.decor * 20}%; height:100%; background:linear-gradient(90deg,#e74c3c,#9b59b6,#3498db); border-radius:4px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div style="padding: 20px 28px 24px;">
          <!-- Price & Type & Size -->
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <div style="flex: 1; background: #0f3460; border-radius: 8px; padding: 12px 8px; text-align: center;">
              <div style="color: #95a5a6; font-size: 10px; margin-bottom: 4px;">💰 Price</div>
              <div style="color: #f39c12; font-size: 20px; font-weight: bold;">$${d.price.toLocaleString()}</div>
            </div>
            <div style="flex: 1; background: #0f3460; border-radius: 8px; padding: 12px 8px; text-align: center;">
              <div style="color: #95a5a6; font-size: 10px; margin-bottom: 4px;">🏷️ Type</div>
              <div style="color: #ecf0f1; font-size: 13px; font-weight: bold;">${d.type}</div>
            </div>
            <div style="flex: 0.6; background: #0f3460; border-radius: 8px; padding: 12px 8px; text-align: center;">
              <div style="color: #95a5a6; font-size: 10px; margin-bottom: 4px;">📐 Size</div>
              <div style="color: #ecf0f1; font-size: 13px; font-weight: bold;">${d.sqft}</div>
            </div>
          </div>

          <!-- Interior Image -->
          <div style="color: #3498db; font-size: 13px; font-weight: bold; margin-bottom: 6px;">🏠 Interior</div>
          <div style="margin-bottom: 16px; border-radius: 8px; overflow: hidden;">
            <img src="assets/house/${d.id}.png" alt="${d.name} interior"
              style="width:100%; display:block; object-fit:cover; max-height:220px;" />
          </div>

          <!-- Buy prompt -->
          <div style="text-align: center; margin-bottom: 12px; color: #ecf0f1; font-size: 16px; font-weight: bold;">
            Can you buy this house now?
          </div>
          <div style="display: flex; gap: 12px;">
            <button class="btn" id="house-buy-btn" style="
              flex: 1;
              padding: 14px;
              font-size: 15px;
              font-weight: bold;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              background: #27ae60;
              color: #fff;
            ">Yes</button>
            <button class="btn" id="house-leave-btn" style="
              flex: 1;
              padding: 14px;
              font-size: 15px;
              font-weight: bold;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              background: #2980b9;
              color: #fff;
            ">No</button>
          </div>
        </div>
      </div>
    `;

    overlay.appendChild(container);

    document.getElementById('house-leave-btn').addEventListener('click', () => {
      this.returnToMap();
    });

    document.getElementById('house-buy-btn').addEventListener('click', () => {
      this.showCantAffordPopup();
    });
  }

  showCantAffordPopup() {
    const d = this.houseData;
    const shortage = d.price - d.balance;
    const affordRatio = d.balance / d.price;
    const progressPct = Math.min(100, (affordRatio * 100)).toFixed(1);
    let affordColor;
    if (affordRatio >= 1) affordColor = '#2ecc71';
    else if (affordRatio >= 0.3) affordColor = '#f39c12';
    else affordColor = '#e74c3c';

    const popup = document.createElement('div');
    popup.id = 'cant-afford-popup';
    popup.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.6);
    `;
    popup.innerHTML = `
      <div style="
        background: #1a1a2e;
        border: 1px solid #e74c3c;
        border-radius: 12px;
        padding: 28px 32px;
        text-align: center;
        max-width: 380px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(231,76,60,0.3);
      ">
        <div style="font-size: 40px; margin-bottom: 12px;">😢</div>
        <div style="color: #e74c3c; font-size: 20px; font-weight: bold; margin-bottom: 16px;">
          You can't afford this!
        </div>
        <div style="
          background: #16213e; border-radius: 8px; padding: 14px; margin-bottom: 16px; text-align: left;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
            <span style="color:#95a5a6; font-size:12px;">House price</span>
            <span style="color:#f39c12; font-size:14px; font-weight:bold;">$${d.price.toLocaleString()}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
            <span style="color:#95a5a6; font-size:12px;">Your balance</span>
            <span style="color:#2ecc71; font-size:14px; font-weight:bold;">$${d.balance.toLocaleString()}</span>
          </div>
          <div style="background:#0a0a2a; border-radius:6px; height:10px; overflow:hidden; margin-bottom:8px;">
            <div style="width:${progressPct}%; height:100%; background:${affordColor}; border-radius:6px;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:${affordColor}; font-size:11px; font-weight:bold;">Still a long way to go</span>
            <span style="color:#7f8c8d; font-size:11px;">${progressPct}% of price</span>
          </div>
        </div>
        <div style="color: #e74c3c; font-size: 16px; font-weight: bold; margin-bottom: 18px;">
          You need $${shortage.toLocaleString()} more
        </div>
        <button id="popup-close-btn" style="
          background: #2c3e50;
          color: #ecf0f1;
          border: none;
          border-radius: 8px;
          padding: 10px 32px;
          font-size: 14px;
          cursor: pointer;
          font-weight: bold;
        ">OK, I understand</button>
      </div>
    `;

    document.body.appendChild(popup);

    document.getElementById('popup-close-btn').addEventListener('click', () => {
      popup.remove();
    });
  }

  returnToMap() {
    document.getElementById('ui-overlay').innerHTML = '';
    this.scene.stop();
    this.scene.resume('MapScene');
  }
}
