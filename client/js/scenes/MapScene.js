/**
 * MapScene - Top-down explorable city map
 * Players control a character walking around a map with 8 houses
 * representing different neighborhoods. Press E near a house door
 * to enter and view details.
 */
class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    const WORLD_W = 1600;
    const WORLD_H = 1200;

    this.visitedHouses = new Set();
    this.currentNearHouse = null;
    this.isInsideHouse = false;

    this.areaPrices = this.generateAreaPrices();

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.drawGround(WORLD_W, WORLD_H);
    this.drawRoads(WORLD_W, WORLD_H);
    this.drawDecorations(WORLD_W, WORLD_H);
    this.houses = this.createHouses();
    this.createPlayer(WORLD_W, WORLD_H);
    this.setupInput();
    this.createHUD();

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.promptText = this.add.text(0, 0, '', {
      fontSize: '14px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(200).setVisible(false);

    this.events.on('resume', () => {
      this.isInsideHouse = false;
      this.updateHUD();
    });
  }

  generateAreaPrices() {
    const cfg = GameState.config;
    const basePrice = cfg.averageHousePrice;
    const variation = cfg.housePriceVariation;
    const areas = [
      { name: 'Downtown', mult: 1.3 },
      { name: 'Midtown', mult: 1.1 },
      { name: 'Eastside', mult: 0.95 },
      { name: 'Westpark', mult: 1.0 },
      { name: 'Northgate', mult: 0.85 },
      { name: 'Southview', mult: 0.9 },
      { name: 'Lakefront', mult: 1.25 },
      { name: 'Old Quarter', mult: 0.8 },
    ];
    return areas.map(a => {
      const randomVar = 1 + (Math.random() * 2 - 1) * variation;
      return { name: a.name, price: Math.round(basePrice * a.mult * randomVar) };
    });
  }

  // ===== Ground =====
  drawGround(w, h) {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x4a8f3f, 1);
    g.fillRect(0, 0, w, h);

    // grass texture patches
    for (let i = 0; i < 300; i++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      const shade = Phaser.Math.Between(0, 1) ? 0x3d7a34 : 0x55a048;
      g.fillStyle(shade, 0.4);
      g.fillRect(gx, gy, 3 + Math.random() * 6, 2 + Math.random() * 4);
    }
  }

  // ===== Roads =====
  drawRoads(w, h) {
    const g = this.add.graphics().setDepth(1);
    const roadColor = 0x8a8a8a;
    const lineColor = 0xf1c40f;
    const roadW = 48;

    // Main horizontal roads
    const hRoads = [300, 600, 900];
    hRoads.forEach(y => {
      g.fillStyle(roadColor, 1);
      g.fillRect(0, y - roadW / 2, w, roadW);
      g.fillStyle(0x6e6e6e, 1);
      g.fillRect(0, y - roadW / 2, w, 3);
      g.fillRect(0, y + roadW / 2 - 3, w, 3);
      for (let x = 0; x < w; x += 60) {
        g.fillStyle(lineColor, 0.6);
        g.fillRect(x, y - 1, 30, 3);
      }
    });

    // Main vertical roads
    const vRoads = [400, 800, 1200];
    vRoads.forEach(x => {
      g.fillStyle(roadColor, 1);
      g.fillRect(x - roadW / 2, 0, roadW, h);
      g.fillStyle(0x6e6e6e, 1);
      g.fillRect(x - roadW / 2, 0, 3, h);
      g.fillRect(x + roadW / 2 - 3, 0, 3, h);
      for (let y = 0; y < h; y += 60) {
        g.fillStyle(lineColor, 0.6);
        g.fillRect(x - 1, y, 3, 30);
      }
    });

    // Intersections — darker overlay
    hRoads.forEach(hy => {
      vRoads.forEach(vx => {
        g.fillStyle(0x7a7a7a, 1);
        g.fillRect(vx - roadW / 2, hy - roadW / 2, roadW, roadW);
      });
    });
  }

  // ===== Decorations =====
  drawDecorations(w, h) {
    this.drawTrees(w, h);
    this.drawLake();
    this.drawFlowers(w, h);
  }

  drawTrees(w, h) {
    const treePositions = [];
    for (let i = 0; i < 60; i++) {
      treePositions.push({
        x: Math.random() * w,
        y: Math.random() * h,
      });
    }

    treePositions.forEach(pos => {
      const trunkW = 6;
      const trunkH = 12;
      const canopyR = 14 + Math.random() * 8;
      const depth = Math.floor(pos.y) + 2;

      this.add.rectangle(pos.x, pos.y + 4, trunkW, trunkH, 0x8B5E3C).setDepth(depth);
      this.add.circle(pos.x, pos.y - 6, canopyR, 0x2d6b2d, 0.9).setDepth(depth + 1);

      if (Math.random() > 0.5) {
        this.add.circle(pos.x - 5, pos.y - 3, canopyR * 0.7, 0x358035, 0.8).setDepth(depth + 1);
      }
    });
  }

  drawLake() {
    const lakeX = 1300;
    const lakeY = 1000;
    const g = this.add.graphics().setDepth(3);

    g.fillStyle(0x2980b9, 0.3);
    g.fillEllipse(lakeX, lakeY, 260, 180);
    g.fillStyle(0x3498db, 0.6);
    g.fillEllipse(lakeX, lakeY, 220, 150);
    g.fillStyle(0x5dade2, 0.4);
    g.fillEllipse(lakeX - 20, lakeY - 10, 140, 90);

    // sparkle animation
    for (let i = 0; i < 8; i++) {
      const sx = lakeX - 80 + Math.random() * 160;
      const sy = lakeY - 50 + Math.random() * 100;
      const sparkle = this.add.circle(sx, sy, 2, 0xffffff, 0.5).setDepth(4);
      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0.2, to: 0.8 },
        duration: 1000 + Math.random() * 1500,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
      });
    }
  }

  drawFlowers(w, h) {
    const flowerColors = [0xff69b4, 0xff6347, 0xffa500, 0xffff00, 0xee82ee];
    for (let i = 0; i < 80; i++) {
      const fx = Math.random() * w;
      const fy = Math.random() * h;
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      this.add.circle(fx, fy, 3, color, 0.7).setDepth(2);
      this.add.circle(fx, fy, 1.5, 0xffff00, 0.9).setDepth(2);
    }
  }

  // ===== Houses =====
  createHouses() {
    const houseDefs = [
      { id: 'downtown',    x: 600,  y: 180,  w: 100, h: 80,  color: 0x1a3a6c, roofColor: 0xd4a017, tier: 'high',   icon: '🏢', floors: 3 },
      { id: 'midtown',     x: 600,  y: 520,  w: 85,  h: 70,  color: 0x3b5998, roofColor: 0x5b7fb5, tier: 'mid',    icon: '🏬', floors: 2 },
      { id: 'eastside',    x: 1050, y: 180,  w: 80,  h: 65,  color: 0xc0692d, roofColor: 0xe08040, tier: 'mid',    icon: '🏘️', floors: 2 },
      { id: 'westpark',    x: 200,  y: 520,  w: 85,  h: 70,  color: 0x27763a, roofColor: 0x4caf50, tier: 'mid',    icon: '🌳', floors: 2 },
      { id: 'northgate',   x: 200,  y: 180,  w: 70,  h: 60,  color: 0x8B6914, roofColor: 0xa0824a, tier: 'low',    icon: '🚉', floors: 1 },
      { id: 'southview',   x: 600,  y: 820,  w: 70,  h: 60,  color: 0x5f8a6b, roofColor: 0x7faa8b, tier: 'low',    icon: '🌆', floors: 1 },
      { id: 'lakefront',   x: 1100, y: 820,  w: 95,  h: 75,  color: 0x2471a3, roofColor: 0xaed6f1, tier: 'high',   icon: '🌊', floors: 2 },
      { id: 'oldquarter',  x: 200,  y: 820,  w: 65,  h: 55,  color: 0x8b3a3a, roofColor: 0xa05050, tier: 'low',    icon: '🏛️', floors: 1 },
    ];

    const houses = [];

    houseDefs.forEach((def, i) => {
      const areaData = this.areaPrices[i];
      const depth = Math.floor(def.y + def.h);

      // Building body
      const bodyG = this.add.graphics().setDepth(depth);
      bodyG.fillStyle(def.color, 1);
      bodyG.fillRect(def.x - def.w / 2, def.y - def.h / 2, def.w, def.h);

      // Floor lines
      if (def.floors > 1) {
        bodyG.lineStyle(1, 0x000000, 0.2);
        for (let f = 1; f < def.floors; f++) {
          const fy = def.y - def.h / 2 + (def.h / def.floors) * f;
          bodyG.lineBetween(def.x - def.w / 2 + 2, fy, def.x + def.w / 2 - 2, fy);
        }
      }

      // Windows
      const winG = this.add.graphics().setDepth(depth + 1);
      const winCols = Math.max(2, Math.floor(def.w / 22));
      const winRows = def.floors;
      const winW = 8, winH = 10;
      const gapX = (def.w - 12) / winCols;
      const gapY = def.h / winRows;

      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const wx = def.x - def.w / 2 + 8 + c * gapX;
          const wy = def.y - def.h / 2 + 8 + r * gapY;
          const lit = Math.random() > 0.3;
          winG.fillStyle(lit ? 0xf1c40f : 0x1a1a2e, lit ? 0.7 : 0.5);
          winG.fillRect(wx, wy, winW, winH);
          winG.lineStyle(1, 0x000000, 0.3);
          winG.strokeRect(wx, wy, winW, winH);
        }
      }

      // Roof
      const roofG = this.add.graphics().setDepth(depth + 2);
      const roofY = def.y - def.h / 2;
      roofG.fillStyle(def.roofColor, 1);
      roofG.beginPath();
      roofG.moveTo(def.x - def.w / 2 - 8, roofY);
      roofG.lineTo(def.x, roofY - 20);
      roofG.lineTo(def.x + def.w / 2 + 8, roofY);
      roofG.closePath();
      roofG.fillPath();
      roofG.lineStyle(2, 0x000000, 0.2);
      roofG.strokePath();

      // Door
      const doorW = 14, doorH = 20;
      const doorX = def.x;
      const doorY = def.y + def.h / 2;
      const doorG = this.add.graphics().setDepth(depth + 1);
      doorG.fillStyle(0x5C4033, 1);
      doorG.fillRect(doorX - doorW / 2, doorY - doorH, doorW, doorH);
      doorG.fillStyle(0xd4a017, 1);
      doorG.fillCircle(doorX + 4, doorY - doorH / 2, 2);

      // Area label
      this.add.text(def.x, def.y - def.h / 2 - 30, `${def.icon} ${areaData.name}`, {
        fontSize: '13px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(depth + 3);

      // Price tag
      this.add.text(def.x, def.y + def.h / 2 + 14, `$${areaData.price.toLocaleString()}`, {
        fontSize: '11px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#f39c12',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(depth + 3);

      // Trigger zone (invisible physics body in front of door)
      const triggerZone = this.add.zone(doorX, doorY + 20, 60, 40);
      this.physics.add.existing(triggerZone, true);

      // Visit marker (green check, hidden until visited)
      const visitMark = this.add.text(def.x + def.w / 2 + 4, def.y - def.h / 2 - 10, '✅', {
        fontSize: '16px',
      }).setOrigin(0.5).setDepth(depth + 4).setVisible(false);

      houses.push({
        def,
        areaData,
        triggerZone,
        visitMark,
      });
    });

    return houses;
  }

  // ===== Player =====
  createPlayer(worldW, worldH) {
    const startX = worldW / 2;
    const startY = worldH / 2;
    const skinColor = this.getSkinColorHex();
    const hairColor = this.getHairColorHex();

    // Player container as a simple drawn character
    this.player = this.add.container(startX, startY).setDepth(10000);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(20, 20);
    this.player.body.setOffset(-10, -10);

    // Body
    const bodyRect = this.add.rectangle(0, 4, 14, 18, skinColor).setOrigin(0.5);
    // Head
    const head = this.add.circle(0, -10, 9, skinColor);
    // Hair
    const hair = this.add.ellipse(0, -15, 20, 10, hairColor);
    // Eyes
    const eyeL = this.add.circle(-3, -11, 1.5, 0x000000);
    const eyeR = this.add.circle(3, -11, 1.5, 0x000000);
    // Shirt
    const shirt = this.add.rectangle(0, 6, 14, 14, 0x3498db).setOrigin(0.5);
    // Legs
    const legL = this.add.rectangle(-3, 16, 5, 8, 0x2c3e50).setOrigin(0.5);
    const legR = this.add.rectangle(3, 16, 5, 8, 0x2c3e50).setOrigin(0.5);

    this.player.add([legL, legR, shirt, bodyRect, head, hair, eyeL, eyeR]);
    this.playerLegs = { left: legL, right: legR };
    this.walkTween = null;

    // Shadow
    this.playerShadow = this.add.ellipse(startX, startY + 22, 20, 8, 0x000000, 0.25).setDepth(9999);
  }

  getSkinColorHex() {
    const c = GameState.character && GameState.character.skinTone;
    if (!c) return 0xFDEBD3;
    return parseInt(c.replace('#', ''), 16);
  }

  getHairColorHex() {
    const c = GameState.character && GameState.character.hairColor;
    if (!c) return 0x2C1810;
    return parseInt(c.replace('#', ''), 16);
  }

  // ===== Input =====
  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.keyE.on('down', () => {
      if (this.currentNearHouse && !this.isInsideHouse) {
        this.enterHouse(this.currentNearHouse);
      }
    });

    this.keyESC.on('down', () => {
      if (!this.isInsideHouse && this.allVisited()) {
        this.exitMap();
      }
    });
  }

  // ===== HUD =====
  createHUD() {
    const cam = this.cameras.main;

    this.hudBg = this.add.graphics().setScrollFactor(0).setDepth(50000);
    this.hudBg.fillStyle(0x000000, 0.5);
    this.hudBg.fillRoundedRect(8, 8, 220, 60, 8);

    this.hudTitle = this.add.text(16, 14, '🗺️ Explore Valrenta City', {
      fontSize: '13px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#3498db',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(50001);

    this.hudProgress = this.add.text(16, 34, 'Houses visited: 0 / 8', {
      fontSize: '12px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#bdc3c7',
    }).setScrollFactor(0).setDepth(50001);

    this.hudBalance = this.add.text(16, 50, `Balance: $${GameState.balance.toLocaleString()}`, {
      fontSize: '11px',
      color: '#2ecc71',
    }).setScrollFactor(0).setDepth(50001);

    // Controls hint (bottom left)
    this.controlsHint = this.add.text(16, cam.height - 20, 'WASD/Arrows: Move | E: Enter house | Visit all 8 houses to continue', {
      fontSize: '10px',
      color: '#95a5a6',
      stroke: '#000',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(50001);

    // Continue button (bottom right) — hidden until all houses visited
    this.continueBtn = { btnW: 120, btnH: 32 };
    this.continueBtn.btnX = cam.width - this.continueBtn.btnW - 16;
    this.continueBtn.btnY = cam.height - this.continueBtn.btnH - 12;
    const { btnW, btnH, btnX, btnY } = this.continueBtn;

    this.continueBtnBg = this.add.graphics().setScrollFactor(0).setDepth(50000);
    this.continueBtnBg.fillStyle(0x34495e, 0.6);
    this.continueBtnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);

    this.continueBtnText = this.add.text(btnX + btnW / 2, btnY + btnH / 2, '🔒 Visit all 8 houses', {
      fontSize: '11px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#7f8c8d',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50001);

    this.continueBtnZone = this.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
      .setScrollFactor(0).setDepth(50002).setInteractive({ useHandCursor: false });

    this.continueBtnZone.on('pointerdown', () => {
      if (this.allVisited()) {
        this.exitMap();
      }
    });
  }

  updateHUD() {
    const count = this.visitedHouses.size;
    this.hudProgress.setText(`Houses visited: ${count} / 8`);

    if (this.allVisited() && !this._continueUnlocked) {
      this._continueUnlocked = true;
      this.unlockContinueButton();
    }
  }

  allVisited() {
    return this.visitedHouses.size >= 8;
  }

  drawContinueBtn(color) {
    const { btnW, btnH, btnX, btnY } = this.continueBtn;
    this.continueBtnBg.clear();
    this.continueBtnBg.fillStyle(color, 1);
    this.continueBtnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
    this.continueBtnBg.setVisible(true);
  }

  unlockContinueButton() {
    const { btnW, btnH, btnX, btnY } = this.continueBtn;

    this.drawContinueBtn(0x27ae60);
    this.continueBtnText.setText('Continue →');
    this.continueBtnText.setColor('#ffffff');
    this.continueBtnText.setFontSize('13px');
    this.continueBtnZone.input.cursor = 'pointer';

    this.continueBtnZone.on('pointerover', () => this.drawContinueBtn(0x1e8449));
    this.continueBtnZone.on('pointerout', () => this.drawContinueBtn(0x27ae60));

    // Update controls hint
    if (this.controlsHint) {
      this.controlsHint.setText('WASD/Arrows: Move | E: Enter house | ESC or Continue → to proceed');
    }

    // Pulse animation to draw attention
    this.tweens.add({
      targets: [this.continueBtnBg, this.continueBtnText],
      alpha: { from: 0.6, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: 3,
    });

    // Show congratulations toast
    this.showAllVisitedToast();
  }

  showAllVisitedToast() {
    const cam = this.cameras.main;
    const toast = this.add.text(cam.width / 2, cam.height / 2, '✅ All houses visited!\nYou may now continue.', {
      fontSize: '18px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      backgroundColor: 'rgba(39,174,96,0.85)',
      padding: { x: 24, y: 16 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60000).setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: cam.height / 2 - 10,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: toast,
            alpha: 0,
            y: cam.height / 2 - 30,
            duration: 400,
            ease: 'Power2',
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }

  // ===== Enter House =====
  enterHouse(house) {
    this.isInsideHouse = true;
    this.visitedHouses.add(house.def.id);
    house.visitMark.setVisible(true);
    this.updateHUD();

    this.player.body.setVelocity(0, 0);
    this.stopWalkAnimation();

    const houseInfo = this.buildHouseInfo(house);
    this.scene.pause();
    this.scene.launch('HouseInteriorScene', houseInfo);
  }

  buildHouseInfo(house) {
    const def = house.def;
    const areaData = house.areaData;
    const salary = GameState.config.monthlyBaseSalary;

    const typeMap = {
      downtown:   { type: 'Luxury High-Rise Apartment', sqft: '1800 - 2500 sq ft' },
      midtown:    { type: 'Modern Apartment',           sqft: '1200 - 1600 sq ft' },
      eastside:   { type: 'Townhouse',                  sqft: '1400 - 1800 sq ft' },
      westpark:   { type: 'Garden Villa',               sqft: '1500 - 2000 sq ft' },
      northgate:  { type: 'Classic Apartment',          sqft: '800 - 1100 sq ft' },
      southview:  { type: 'Compact Studio',             sqft: '500 - 800 sq ft' },
      lakefront:  { type: 'Lakeside Villa',             sqft: '2000 - 2800 sq ft' },
      oldquarter: { type: 'Heritage Cottage',           sqft: '600 - 900 sq ft' },
    };

    const interiorMap = {
      high: {
        desc: 'Spacious, premium finishes throughout. Italian marble flooring, floor-to-ceiling windows with panoramic views, designer kitchen with top-of-line appliances, walk-in closets, and a private balcony.',
        features: ['🛁 Spa bathroom', '🍳 Chef kitchen', '🌇 Panoramic view', '🅿️ Underground parking', '🏊 Pool access', '🌿 Rooftop garden'],
      },
      mid: {
        desc: 'Well-maintained with modern amenities. Hardwood floors, updated kitchen and bathroom, good natural light, and convenient neighborhood amenities.',
        features: ['🚿 Modern bathroom', '🍽️ Updated kitchen', '☀️ Good natural light', '🚗 Street parking', '🏋️ Nearby gym'],
      },
      low: {
        desc: 'Basic but functional living space. Standard finishes, compact layout, some signs of wear. Affordable option in a quieter neighborhood.',
        features: ['🚿 Basic bathroom', '🍳 Small kitchen', '💡 Adequate lighting', '🚌 Public transit nearby'],
      },
    };

    const info = typeMap[def.id] || { type: 'House', sqft: 'N/A' };
    const interior = interiorMap[def.tier] || interiorMap.mid;
    const yearsToSave = (areaData.price / salary / 12).toFixed(1);

    return {
      name: areaData.name,
      price: areaData.price,
      icon: def.icon,
      tier: def.tier,
      type: info.type,
      sqft: info.sqft,
      color: def.color,
      roofColor: def.roofColor,
      floors: def.floors,
      interiorDesc: interior.desc,
      features: interior.features,
      yearsToSave,
      balance: GameState.balance,
      salary,
    };
  }

  // ===== Exit Map =====
  exitMap() {
    this.scene.start('CityScene');
  }

  // ===== Walk Animation =====
  startWalkAnimation() {
    if (this.walkTween) return;
    this.walkTween = this.tweens.add({
      targets: [this.playerLegs.left, this.playerLegs.right],
      x: (target, key, value, targetIndex) => {
        return targetIndex === 0 ? -5 : 5;
      },
      duration: 150,
      yoyo: true,
      repeat: -1,
    });
  }

  stopWalkAnimation() {
    if (this.walkTween) {
      this.walkTween.stop();
      this.walkTween = null;
      this.playerLegs.left.x = -3;
      this.playerLegs.right.x = 3;
    }
  }

  // ===== Update Loop =====
  update() {
    if (this.isInsideHouse) return;

    const speed = 200;
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.player.body.setVelocity(vx, vy);

    // Shadow follows player
    this.playerShadow.setPosition(this.player.x, this.player.y + 22);

    // Walk animation
    if (vx !== 0 || vy !== 0) {
      this.startWalkAnimation();
    } else {
      this.stopWalkAnimation();
    }

    // Update depth for correct layering
    this.player.setDepth(Math.floor(this.player.y) + 100);
    this.playerShadow.setDepth(Math.floor(this.player.y) + 99);

    // Check proximity to houses
    this.checkHouseProximity();
  }

  checkHouseProximity() {
    let nearHouse = null;

    for (const house of this.houses) {
      const zone = house.triggerZone;
      const dx = Math.abs(this.player.x - zone.x);
      const dy = Math.abs(this.player.y - zone.y);

      if (dx < 40 && dy < 30) {
        nearHouse = house;
        break;
      }
    }

    if (nearHouse !== this.currentNearHouse) {
      this.currentNearHouse = nearHouse;
      if (nearHouse) {
        this.promptText.setVisible(true);
        this.promptText.setText(`Press E to enter ${nearHouse.areaData.name}`);
        this.promptText.setPosition(nearHouse.def.x, nearHouse.def.y - nearHouse.def.h / 2 - 52);
      } else {
        this.promptText.setVisible(false);
      }
    }

    // Keep prompt visible and positioned
    if (this.currentNearHouse) {
      this.promptText.setPosition(
        this.currentNearHouse.def.x,
        this.currentNearHouse.def.y - this.currentNearHouse.def.h / 2 - 52
      );
    }
  }
}
