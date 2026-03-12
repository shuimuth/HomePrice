/**
 * MapScene - Top-down explorable city map
 * Players control a character walking around a map with 8 houses
 * representing different neighborhoods. Press E near a house door
 * to enter and view details.
 */

const DEPTH = {
  GROUND: 0,
  GROUND_OVERLAY: 1,
  ROADS: 100,
  VEGETATION_BASE: 200,
  BUILDINGS_BASE: 300,
  BUILDING_DECOR: 400,
  NPC: 1000,
  PLAYER_SHADOW: 2000,
  PLAYER: 2001,
  PARTICLES: 3000,
  LABELS: 5000,
  PROMPT: 6000,
  AMBIENT: 6500,
  HUD: 7000,
  MINIMAP: 7500,
  TOAST: 8000,
};

class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    const WORLD_W = 1600;
    const WORLD_H = 1200;

    this.WORLD_W = WORLD_W;
    this.WORLD_H = WORLD_H;

    this.visitedHouses = new Set();
    this.currentNearHouse = null;
    this.isInsideHouse = false;
    this._tweenables = [];
    this._facing = 'down';
    this._idleTime = 0;
    this._lastPlayerX = 0;
    this._lastPlayerY = 0;
    this._idleArrow = null;
    this._idleArrowShown = false;

    this.areaPrices = this.generateAreaPrices();

    this.housePositions = [
      { x: 600, y: 180 }, { x: 600, y: 520 }, { x: 1050, y: 180 }, { x: 200, y: 520 },
      { x: 200, y: 180 }, { x: 600, y: 820 }, { x: 1100, y: 820 }, { x: 200, y: 820 },
    ];

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.generateTextures();
    this.drawGround(WORLD_W, WORLD_H);
    this.drawRoads(WORLD_W, WORLD_H);
    this.drawDecorations(WORLD_W, WORLD_H);
    this.houses = this.createHouses();
    this.createPlayer(WORLD_W, WORLD_H);
    this.physics.add.collider(this.player, this.buildingColliders);
    this.setupInput();
    this.createHUD();

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.promptBg = this.add.graphics().setDepth(DEPTH.PROMPT).setVisible(false);
    this.promptText = this.add.text(0, 0, '', {
      fontSize: '11px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(DEPTH.PROMPT + 1).setVisible(false);
    this.promptKey = this.add.text(0, 0, 'E', {
      fontSize: '10px',
      fontFamily: 'Segoe UI, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#3498db',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(DEPTH.PROMPT + 1).setVisible(false);

    this.createAmbientLighting();
    this.createAtmosphericParticles();
    this.createMinimap();
    this.playCameraEntrance();

    this.events.on('resume', () => {
      this.isInsideHouse = false;
      this._idleTime = 0;
      this._hideIdleArrow();
      this.cameras.main.setZoom(1);
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.updateHUD();
      if (this.allVisited() && !this._toastShown) {
        this._toastShown = true;
        this.showAllVisitedToast();
      }
    });
  }

  // ===== Ambient Lighting — warm evening color overlay =====
  createAmbientLighting() {
    const cam = this.cameras.main;
    this._ambientOverlay = this.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH.AMBIENT).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this._ambientOverlay.fillStyle(0xd4c4a8, 1);
    this._ambientOverlay.fillRect(0, 0, cam.width, cam.height);
    this._ambientOverlay.setAlpha(0.12);
  }

  // ===== Camera Entrance — fade in + slight zoom =====
  playCameraEntrance() {
    this.cameras.main.setAlpha(0);
    this.cameras.main.setZoom(1.15);
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      zoom: 1,
      duration: 1200,
      ease: 'Power2',
    });
  }

  // ===== Atmospheric Particles — drifting leaves + dust motes =====
  createAtmosphericParticles() {
    this._leaves = [];
    for (let i = 0; i < 18; i++) {
      const lx = Math.random() * this.WORLD_W;
      const ly = Math.random() * this.WORLD_H;
      const colors = [0x8BC34A, 0xCDDC39, 0xFFC107, 0xA1887F, 0x795548];
      const c = colors[Math.floor(Math.random() * colors.length)];
      const sz = 2 + Math.random() * 3;
      const leaf = this.add.ellipse(lx, ly, sz, sz * 0.6, c, 0.5)
        .setDepth(DEPTH.PARTICLES);
      this._leaves.push({
        obj: leaf,
        vx: 0.15 + Math.random() * 0.3,
        vy: 0.08 + Math.random() * 0.2,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.02,
      });
    }

    this._dustMotes = [];
    for (let i = 0; i < 12; i++) {
      const dx = Math.random() * this.WORLD_W;
      const dy = Math.random() * this.WORLD_H;
      const mote = this.add.circle(dx, dy, 1, 0xffffff, 0.15 + Math.random() * 0.15)
        .setDepth(DEPTH.PARTICLES);
      this._dustMotes.push({
        obj: mote,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.05 - Math.random() * 0.1,
        life: Math.random() * 600,
      });
    }
  }

  // ===== Pre-generate reusable textures to minimize Graphics objects =====
  generateTextures() {
    this._genCityTreeTex();
    this._genParkTreeTex();
    this._genWillowTreeTex();
    this._genBushTex();
    this._genFlowerBedTex();
    this._genStreetLightTex();
    this._genBenchTex();
    this._genHydrantTex();
    this._genMailboxTex();
    this._genTrashCanTex();
    this._genGroundTileTex();
    this._genArrowIndicatorTex();
  }

  _genCityTreeTex() {
    const tw = 30, th = 30;
    const g = this.make.graphics({ add: false });
    const cx = 15, cy = 18;
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(cx + 3, cy + 8, 18, 8);
    g.fillStyle(0x6B4E3D, 1);
    g.fillRect(cx - 2, cy - 2, 4, 10);
    g.fillStyle(0x2E7D32, 0.9);
    g.fillCircle(cx, cy - 8, 11);
    g.fillStyle(0x388E3C, 0.7);
    g.fillCircle(cx - 3, cy - 6, 8);
    g.fillStyle(0x4CAF50, 0.4);
    g.fillCircle(cx + 2, cy - 10, 5);
    g.generateTexture('tex_city_tree', tw, th);
    g.destroy();
  }

  _genParkTreeTex() {
    const tw = 40, th = 40;
    const g = this.make.graphics({ add: false });
    const cx = 20, cy = 24;
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(cx + 4, cy + 12, 26, 10);
    g.fillStyle(0x5D4037, 1);
    g.fillRect(cx - 3, cy - 2, 6, 14);
    g.fillStyle(0x1B5E20, 0.9);
    g.fillCircle(cx, cy - 10, 16);
    g.fillStyle(0x2E7D32, 0.7);
    g.fillCircle(cx - 5, cy - 6, 12);
    g.fillCircle(cx + 6, cy - 12, 10);
    g.fillStyle(0x4CAF50, 0.3);
    g.fillCircle(cx + 2, cy - 14, 6);
    g.generateTexture('tex_park_tree', tw, th);
    g.destroy();
  }

  _genWillowTreeTex() {
    const tw = 42, th = 36;
    const g = this.make.graphics({ add: false });
    const cx = 21, cy = 20;
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(cx + 3, cy + 10, 30, 10);
    g.fillStyle(0x5D4037, 1);
    g.fillRect(cx - 3, cy - 4, 6, 14);
    g.fillStyle(0x558B2F, 0.85);
    g.fillEllipse(cx, cy - 6, 32, 22);
    g.fillStyle(0x689F38, 0.5);
    g.fillEllipse(cx - 4, cy - 2, 28, 18);
    g.lineStyle(1, 0x33691E, 0.4);
    for (let a = -3; a <= 3; a++) {
      g.lineBetween(cx + a * 4, cy - 4, cx + a * 6, cy + 10);
    }
    g.generateTexture('tex_willow_tree', tw, th);
    g.destroy();
  }

  _genBushTex() {
    const tw = 20, th = 14;
    const g = this.make.graphics({ add: false });
    const cx = 10, cy = 7;
    g.fillStyle(0x2E7D32, 0.7);
    g.fillEllipse(cx, cy, 14, 8);
    g.fillStyle(0x388E3C, 0.5);
    g.fillEllipse(cx + 3, cy - 1, 10, 6);
    g.generateTexture('tex_bush', tw, th);
    g.destroy();
  }

  _genFlowerBedTex() {
    const tw = 32, th = 20;
    const g = this.make.graphics({ add: false });
    const cx = 16, cy = 10;
    g.fillStyle(0x5D4037, 0.6);
    g.fillRect(cx - 14, cy - 8, 28, 16);
    g.fillStyle(0x33691E, 0.8);
    g.fillRect(cx - 12, cy - 6, 24, 12);
    const colors = [0xff69b4, 0xff6347, 0xffa500, 0xffff00, 0xee82ee, 0xff4081];
    for (let i = 0; i < 8; i++) {
      g.fillStyle(colors[i % colors.length], 0.8);
      g.fillCircle(cx - 10 + (i * 2.8) + 1, cy - 3 + (i % 3) * 3, 2);
    }
    g.generateTexture('tex_flower_bed', tw, th);
    g.destroy();
  }

  _genStreetLightTex() {
    const tw = 30, th = 40;
    const g = this.make.graphics({ add: false });
    const cx = 15, cy = 34;
    g.fillStyle(0xFFF9C4, 0.04);
    g.fillCircle(cx, cy - 20, 14);
    g.fillStyle(0xFFE082, 0.06);
    g.fillCircle(cx, cy - 20, 10);
    g.fillStyle(0x616161, 1);
    g.fillRect(cx - 1, cy - 16, 2, 16);
    g.fillStyle(0x9E9E9E, 1);
    g.fillRect(cx - 3, cy - 18, 6, 3);
    g.fillStyle(0xFFF9C4, 0.25);
    g.fillCircle(cx, cy - 18, 5);
    g.fillStyle(0xFFFFFF, 0.15);
    g.fillCircle(cx, cy - 18, 2);
    g.generateTexture('tex_street_light', tw, th);
    g.destroy();
  }

  _genBenchTex() {
    const tw = 20, th = 12;
    const g = this.make.graphics({ add: false });
    const cx = 10, cy = 6;
    g.fillStyle(0x795548, 1);
    g.fillRect(cx - 8, cy - 2, 16, 4);
    g.fillStyle(0x4E342E, 1);
    g.fillRect(cx - 7, cy + 2, 2, 3);
    g.fillRect(cx + 5, cy + 2, 2, 3);
    g.fillStyle(0x6D4C41, 1);
    g.fillRect(cx - 8, cy - 4, 16, 2);
    g.generateTexture('tex_bench', tw, th);
    g.destroy();
  }

  _genHydrantTex() {
    const tw = 12, th = 16;
    const g = this.make.graphics({ add: false });
    const cx = 6, cy = 10;
    g.fillStyle(0xc62828, 1);
    g.fillRect(cx - 3, cy - 6, 6, 10);
    g.fillStyle(0xd32f2f, 1);
    g.fillRect(cx - 4, cy - 7, 8, 3);
    g.fillStyle(0xb71c1c, 1);
    g.fillCircle(cx, cy - 8, 3);
    g.generateTexture('tex_hydrant', tw, th);
    g.destroy();
  }

  _genMailboxTex() {
    const tw = 14, th = 18;
    const g = this.make.graphics({ add: false });
    const cx = 7, cy = 10;
    g.fillStyle(0x1565C0, 1);
    g.fillRect(cx - 4, cy - 8, 8, 10);
    g.fillStyle(0x1976D2, 1);
    g.fillRect(cx - 5, cy - 9, 10, 3);
    g.fillStyle(0x0D47A1, 1);
    g.fillRect(cx - 2, cy + 2, 4, 4);
    g.generateTexture('tex_mailbox', tw, th);
    g.destroy();
  }

  _genTrashCanTex() {
    const tw = 12, th = 12;
    const g = this.make.graphics({ add: false });
    const cx = 6, cy = 6;
    g.fillStyle(0x2E7D32, 0.9);
    g.fillRect(cx - 3, cy - 5, 6, 8);
    g.fillStyle(0x1B5E20, 1);
    g.fillRect(cx - 4, cy - 6, 8, 2);
    g.generateTexture('tex_trash_can', tw, th);
    g.destroy();
  }

  _genGroundTileTex() {
    const sz = 64;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x454850, 1);
    g.fillRect(0, 0, sz, sz);
    g.lineStyle(1, 0x4f525a, 0.18);
    for (let x = 0; x < sz; x += 16) {
      g.lineBetween(x, 0, x, sz);
    }
    for (let y = 0; y < sz; y += 16) {
      g.lineBetween(0, y, sz, y);
    }
    for (let i = 0; i < 12; i++) {
      g.fillStyle(0x3e4148, 0.25);
      g.fillRect(Math.random() * sz, Math.random() * sz, 2 + Math.random() * 3, 1 + Math.random() * 2);
    }
    g.generateTexture('tex_ground_tile', sz, sz);
    g.destroy();
  }

  _genArrowIndicatorTex() {
    const tw = 20, th = 28;
    const g = this.make.graphics({ add: false });
    const cx = 10, tipY = 22;
    g.fillStyle(0x64B5F6, 0.08);
    g.fillCircle(cx, tipY - 6, 10);
    g.fillStyle(0x42A5F5, 0.85);
    g.beginPath();
    g.moveTo(cx, tipY);
    g.lineTo(cx - 7, tipY - 10);
    g.lineTo(cx - 3, tipY - 10);
    g.lineTo(cx - 3, tipY - 20);
    g.lineTo(cx + 3, tipY - 20);
    g.lineTo(cx + 3, tipY - 10);
    g.lineTo(cx + 7, tipY - 10);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xBBDEFB, 0.5);
    g.fillRect(cx - 2, tipY - 19, 4, 6);
    g.lineStyle(1, 0x1E88E5, 0.6);
    g.strokePath();
    g.generateTexture('tex_arrow_indicator', tw, th);
    g.destroy();
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

  getRoadLayout() {
    return {
      hRoads: [300, 600, 900],
      vRoads: [400, 800, 1200],
      roadW: 48,
      sidewalkW: 10,
    };
  }

  // ===== Ground — uses TileSprite + colored block overlays =====
  drawGround(w, h) {
    this.add.tileSprite(0, 0, w, h, 'tex_ground_tile')
      .setOrigin(0).setDepth(DEPTH.GROUND);

    const g = this.add.graphics().setDepth(DEPTH.GROUND_OVERLAY);
    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    const totalRoadW = roadW + sidewalkW * 2;

    const blockTones = {
      'downtown':  0x4a4d52, 'midtown':   0x484b50, 'eastside':  0x4e504a,
      'westpark':  0x3a5a3a, 'northgate': 0x4d4840, 'southview': 0x454a45,
      'lakefront': 0x3e4a52, 'oldquarter':0x4a4440,
    };

    const xEdges = [0, ...vRoads.map(v => v - totalRoadW / 2), ...vRoads.map(v => v + totalRoadW / 2), w].sort((a, b) => a - b);
    const yEdges = [0, ...hRoads.map(h2 => h2 - totalRoadW / 2), ...hRoads.map(h2 => h2 + totalRoadW / 2), h].sort((a, b) => a - b);

    for (let yi = 0; yi < yEdges.length - 1; yi++) {
      for (let xi = 0; xi < xEdges.length - 1; xi++) {
        const bx = xEdges[xi], by = yEdges[yi];
        const bw = xEdges[xi + 1] - bx, bh = yEdges[yi + 1] - by;
        if (bw < 20 || bh < 20) continue;

        let tone = 0x454850;
        const cx = bx + bw / 2, cy = by + bh / 2;
        if (cx < 400 && cy < 300) tone = blockTones.northgate;
        else if (cx > 400 && cx < 800 && cy < 300) tone = blockTones.downtown;
        else if (cx > 800 && cy < 300) tone = blockTones.eastside;
        else if (cx < 400 && cy > 300 && cy < 600) tone = blockTones.westpark;
        else if (cx > 400 && cx < 800 && cy > 300 && cy < 600) tone = blockTones.midtown;
        else if (cx < 400 && cy > 600) tone = blockTones.oldquarter;
        else if (cx > 400 && cx < 800 && cy > 600) tone = blockTones.southview;
        else if (cx > 800 && cy > 600) tone = blockTones.lakefront;

        g.fillStyle(tone, 0.6);
        g.fillRect(bx, by, bw, bh);
      }
    }

    // Westpark green area
    g.fillStyle(0x3d7a34, 1);
    g.fillRect(2, hRoads[0] + totalRoadW / 2 + 2, vRoads[0] - totalRoadW / 2 - 4, hRoads[1] - hRoads[0] - totalRoadW - 4);
    g.fillStyle(0x4a8f3f, 0.5);
    for (let i = 0; i < 80; i++) {
      const px = 4 + Math.random() * (vRoads[0] - totalRoadW / 2 - 8);
      const py = hRoads[0] + totalRoadW / 2 + 4 + Math.random() * (hRoads[1] - hRoads[0] - totalRoadW - 8);
      g.fillRect(px, py, 3 + Math.random() * 5, 2 + Math.random() * 4);
    }

    // Green strips along roads
    const stripW = 8;
    g.fillStyle(0x3d7a34, 0.7);
    hRoads.forEach(ry => {
      g.fillRect(0, ry - totalRoadW / 2 - stripW, w, stripW);
      g.fillRect(0, ry + totalRoadW / 2, w, stripW);
    });
    vRoads.forEach(rx => {
      g.fillRect(rx - totalRoadW / 2 - stripW, 0, stripW, h);
      g.fillRect(rx + totalRoadW / 2, 0, stripW, h);
    });
  }

  // ===== Roads — single Graphics object =====
  drawRoads(w, h) {
    const g = this.add.graphics().setDepth(DEPTH.ROADS);
    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    const totalRoadW = roadW + sidewalkW * 2;

    hRoads.forEach(y => {
      g.fillStyle(0x9e9e9e, 1);
      g.fillRect(0, y - totalRoadW / 2, w, totalRoadW);
      g.lineStyle(1, 0x8a8a8a, 0.2);
      for (let tx = 0; tx < w; tx += 12) {
        g.lineBetween(tx, y - totalRoadW / 2, tx, y - totalRoadW / 2 + sidewalkW);
        g.lineBetween(tx, y + totalRoadW / 2 - sidewalkW, tx, y + totalRoadW / 2);
      }
      g.lineStyle(1, 0xb0b0b0, 0.6);
      g.lineBetween(0, y - roadW / 2, w, y - roadW / 2);
      g.lineBetween(0, y + roadW / 2, w, y + roadW / 2);
      g.lineStyle(1, 0x606060, 0.4);
      g.lineBetween(0, y - roadW / 2 + 1, w, y - roadW / 2 + 1);
      g.lineBetween(0, y + roadW / 2 - 1, w, y + roadW / 2 - 1);
      g.fillStyle(0x505458, 1);
      g.fillRect(0, y - roadW / 2, w, roadW);
      for (let i = 0; i < 60; i++) {
        g.fillStyle(0x484c50, 0.3);
        g.fillRect(Math.random() * w, y - roadW / 2 + Math.random() * roadW, 2 + Math.random() * 4, 1);
      }
      for (let x = 0; x < w; x += 40) {
        g.fillStyle(0xf1c40f, 0.7);
        g.fillRect(x, y - 1, 20, 2);
      }
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(0, y - roadW / 2 + 2, w, 1);
      g.fillRect(0, y + roadW / 2 - 3, w, 1);
    });

    vRoads.forEach(x => {
      g.fillStyle(0x9e9e9e, 1);
      g.fillRect(x - totalRoadW / 2, 0, totalRoadW, h);
      g.lineStyle(1, 0x8a8a8a, 0.2);
      for (let ty = 0; ty < h; ty += 12) {
        g.lineBetween(x - totalRoadW / 2, ty, x - totalRoadW / 2 + sidewalkW, ty);
        g.lineBetween(x + totalRoadW / 2 - sidewalkW, ty, x + totalRoadW / 2, ty);
      }
      g.lineStyle(1, 0xb0b0b0, 0.6);
      g.lineBetween(x - roadW / 2, 0, x - roadW / 2, h);
      g.lineBetween(x + roadW / 2, 0, x + roadW / 2, h);
      g.lineStyle(1, 0x606060, 0.4);
      g.lineBetween(x - roadW / 2 + 1, 0, x - roadW / 2 + 1, h);
      g.lineBetween(x + roadW / 2 - 1, 0, x + roadW / 2 - 1, h);
      g.fillStyle(0x505458, 1);
      g.fillRect(x - roadW / 2, 0, roadW, h);
      for (let i = 0; i < 60; i++) {
        g.fillStyle(0x484c50, 0.3);
        g.fillRect(x - roadW / 2 + Math.random() * roadW, Math.random() * h, 1, 2 + Math.random() * 4);
      }
      for (let y = 0; y < h; y += 40) {
        g.fillStyle(0xf1c40f, 0.7);
        g.fillRect(x - 1, y, 2, 20);
      }
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(x - roadW / 2 + 2, 0, 1, h);
      g.fillRect(x + roadW / 2 - 3, 0, 1, h);
    });

    hRoads.forEach(hy => {
      vRoads.forEach(vx => {
        g.fillStyle(0x505458, 1);
        g.fillRect(vx - totalRoadW / 2, hy - totalRoadW / 2, totalRoadW, totalRoadW);
        g.fillStyle(0x4a4e52, 1);
        g.fillRect(vx - roadW / 2, hy - roadW / 2, roadW, roadW);
        const stripeW = 4, stripeGap = 6;
        for (let s = vx - roadW / 2 + 4; s < vx + roadW / 2 - 4; s += stripeW + stripeGap) {
          g.fillStyle(0xffffff, 0.65);
          g.fillRect(s, hy - totalRoadW / 2 + 1, stripeW, sidewalkW - 2);
          g.fillRect(s, hy + roadW / 2 + 1, stripeW, sidewalkW - 2);
        }
        for (let s = hy - roadW / 2 + 4; s < hy + roadW / 2 - 4; s += stripeW + stripeGap) {
          g.fillStyle(0xffffff, 0.65);
          g.fillRect(vx - totalRoadW / 2 + 1, s, sidewalkW - 2, stripeW);
          g.fillRect(vx + roadW / 2 + 1, s, sidewalkW - 2, stripeW);
        }
        g.fillStyle(0xffffff, 0.5);
        g.fillRect(vx - roadW / 2, hy - roadW / 2 + sidewalkW + 2, roadW, 2);
        g.fillRect(vx - roadW / 2, hy + roadW / 2 - sidewalkW - 4, roadW, 2);
      });
    });
  }

  // ===== Decorations =====
  drawDecorations(w, h) {
    this.drawLake();
    this.drawVegetation(w, h);
    this.drawStreetFurniture(w, h);
    this.addNPCs(w, h);
  }

  // ===== Vegetation — uses Image sprites from pre-generated textures =====
  drawVegetation(w, h) {
    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    const totalRoadW = roadW + sidewalkW * 2;
    const treeSpacing = 80;

    const placeCityTree = (x, y) => {
      this.add.image(x, y, 'tex_city_tree')
        .setOrigin(0.5, 0.6).setDepth(DEPTH.VEGETATION_BASE + Math.floor(y));
    };
    const placeBush = (x, y) => {
      this.add.image(x, y, 'tex_bush')
        .setOrigin(0.5).setDepth(DEPTH.VEGETATION_BASE + Math.floor(y));
    };

    hRoads.forEach(ry => {
      for (let tx = 40; tx < w; tx += treeSpacing) {
        let skip = false;
        vRoads.forEach(vx => { if (Math.abs(tx - vx) < totalRoadW) skip = true; });
        if (skip) continue;
        const ty1 = ry - totalRoadW / 2 - 14;
        const ty2 = ry + totalRoadW / 2 + 14;
        if (!this.isNearHouse(tx, ty1, 60)) placeCityTree(tx, ty1);
        if (!this.isNearHouse(tx + treeSpacing / 2, ty2, 60)) placeCityTree(tx + treeSpacing / 2, ty2);
      }
    });

    vRoads.forEach(rx => {
      for (let ty = 40; ty < h; ty += treeSpacing) {
        let skip = false;
        hRoads.forEach(hy => { if (Math.abs(ty - hy) < totalRoadW) skip = true; });
        if (skip) continue;
        const tx1 = rx - totalRoadW / 2 - 14;
        const tx2 = rx + totalRoadW / 2 + 14;
        if (!this.isNearHouse(tx1, ty, 60)) placeCityTree(tx1, ty);
        if (!this.isNearHouse(tx2, ty + treeSpacing / 2, 60)) placeCityTree(tx2, ty + treeSpacing / 2);
      }
    });

    hRoads.forEach(ry => {
      for (let bx = 20; bx < w; bx += 50 + Math.random() * 30) {
        let skip = false;
        vRoads.forEach(vx => { if (Math.abs(bx - vx) < totalRoadW) skip = true; });
        if (skip) continue;
        const by1 = ry - totalRoadW / 2 - 4;
        const by2 = ry + totalRoadW / 2 + 4;
        if (!this.isNearHouse(bx, by1, 50)) placeBush(bx, by1);
        if (!this.isNearHouse(bx + 25, by2, 50)) placeBush(bx + 25, by2);
      }
    });

    const wpHouseX = 200, wpHouseY = 520, wpClear = 70;
    const fountainX = 120, fountainY = 420, fountainClear = 55;
    for (let i = 0; i < 6; i++) {
      let tx, ty, attempts = 0;
      do {
        tx = 30 + Math.random() * (vRoads[0] - totalRoadW / 2 - 60);
        ty = hRoads[0] + totalRoadW / 2 + 30 + Math.random() * (hRoads[1] - hRoads[0] - totalRoadW - 60);
        attempts++;
        const nearHouse = Math.abs(tx - wpHouseX) < wpClear && Math.abs(ty - wpHouseY) < wpClear;
        const nearFountain = Math.hypot(tx - fountainX, ty - fountainY) < fountainClear;
        if (!nearHouse && !nearFountain) break;
      } while (attempts < 30);
      this.add.image(tx, ty, 'tex_park_tree')
        .setOrigin(0.5, 0.6).setDepth(DEPTH.VEGETATION_BASE + Math.floor(ty));
    }

    const flowerSpots = [
      { x: 100, y: hRoads[0] + totalRoadW / 2 + 20 },
      { x: vRoads[0] - totalRoadW / 2 - 20, y: hRoads[0] + totalRoadW / 2 + 20 },
      { x: vRoads[1] + totalRoadW / 2 + 20, y: hRoads[0] + totalRoadW / 2 + 20 },
      { x: vRoads[1] + totalRoadW / 2 + 20, y: hRoads[1] + totalRoadW / 2 + 20 },
      { x: 100, y: hRoads[1] + totalRoadW / 2 + 20 },
    ];
    flowerSpots.forEach(s => {
      this.add.image(s.x, s.y, 'tex_flower_bed')
        .setOrigin(0.5).setDepth(DEPTH.VEGETATION_BASE + Math.floor(s.y));
    });

    const lakeX = 1400, lakeY = 1065;
    const willowSpots = [
      { x: lakeX - 100, y: lakeY + 10 },
      { x: lakeX + 100, y: lakeY + 10 },
      { x: lakeX - 40,  y: lakeY + 76 },
      { x: lakeX + 40,  y: lakeY + 76 },
    ];
    willowSpots.forEach(s => {
      if (s.y > hRoads[2] + totalRoadW / 2 + 20) {
        this.add.image(s.x, s.y, 'tex_willow_tree')
          .setOrigin(0.5, 0.55).setDepth(DEPTH.VEGETATION_BASE + Math.floor(s.y));
      }
    });
  }

  isNearHouse(x, y, margin) {
    return this.housePositions.some(h => Math.abs(x - h.x) < margin && Math.abs(y - h.y) < margin);
  }

  // ===== Lake — single Graphics + managed tweenables =====
  drawLake() {
    const lakeX = 1400, lakeY = 1065;
    const g = this.add.graphics().setDepth(DEPTH.VEGETATION_BASE + 3);

    g.fillStyle(0x9e9e9e, 0.7);
    g.fillEllipse(lakeX, lakeY, 190, 150);
    g.fillStyle(0x388E3C, 0.6);
    g.fillEllipse(lakeX, lakeY, 176, 138);
    g.lineStyle(3, 0x757575, 0.6);
    g.strokeEllipse(lakeX, lakeY, 160, 122);
    g.fillStyle(0x1565C0, 0.8);
    g.fillEllipse(lakeX, lakeY, 150, 114);
    g.fillStyle(0x1976D2, 0.7);
    g.fillEllipse(lakeX, lakeY, 128, 96);
    g.fillStyle(0x2196F3, 0.4);
    g.fillEllipse(lakeX - 10, lakeY - 5, 90, 64);

    g.lineStyle(1, 0x64B5F6, 0.3);
    for (let i = 0; i < 4; i++) {
      const wy = lakeY - 25 + i * 14;
      g.beginPath();
      for (let wx = lakeX - 50; wx < lakeX + 50; wx += 4) {
        const wwy = wy + Math.sin(wx * 0.08) * 3;
        if (wx === lakeX - 50) g.moveTo(wx, wwy);
        else g.lineTo(wx, wwy);
      }
      g.strokePath();
    }

    // Dock
    const dockD = DEPTH.VEGETATION_BASE + Math.floor(lakeY) + 5;
    const dockG = this.add.graphics().setDepth(dockD);
    const dockX = lakeX + 82, dockY = lakeY - 4;
    dockG.fillStyle(0x5D4037, 1);
    dockG.fillRect(dockX, dockY, 24, 12);
    dockG.fillStyle(0x795548, 0.6);
    dockG.fillRect(dockX, dockY + 3, 24, 1);
    dockG.fillRect(dockX, dockY + 7, 24, 1);
    dockG.fillStyle(0x4E342E, 1);
    dockG.fillRect(dockX + 22, dockY - 1, 3, 14);

    // Sparkle — tracked for culling
    for (let i = 0; i < 10; i++) {
      const sx = lakeX - 55 + Math.random() * 110;
      const sy = lakeY - 40 + Math.random() * 80;
      const sparkle = this.add.circle(sx, sy, 1.5, 0xffffff, 0.4).setDepth(DEPTH.VEGETATION_BASE + 4);
      const tw = this.tweens.add({
        targets: sparkle,
        alpha: { from: 0.1, to: 0.7 },
        duration: 1000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
      });
      this._tweenables.push({ obj: sparkle, tween: tw, x: sx, y: sy });
    }

    // Ripple rings — animated expanding circles
    for (let i = 0; i < 3; i++) {
      const rx = lakeX - 30 + Math.random() * 60;
      const ry = lakeY - 20 + Math.random() * 40;
      const ring = this.add.circle(rx, ry, 4, 0x64B5F6, 0).setDepth(DEPTH.VEGETATION_BASE + 5);
      ring.setStrokeStyle(1, 0x90CAF9, 0.3);
      const tw = this.tweens.add({
        targets: ring,
        scaleX: 3,
        scaleY: 2,
        alpha: 0,
        duration: 2500 + Math.random() * 1500,
        repeat: -1,
        delay: i * 1200,
        onRepeat: () => { ring.setScale(1); ring.setAlpha(0.3); },
      });
      this._tweenables.push({ obj: ring, tween: tw, x: rx, y: ry });
    }

    // Benches as Images
    [
      { x: lakeX - 50, y: lakeY - 78 },
      { x: lakeX + 50, y: lakeY - 78 },
      { x: lakeX - 80, y: lakeY + 50 },
      { x: lakeX + 80, y: lakeY + 50 },
    ].forEach(s => {
      this.add.image(s.x, s.y, 'tex_bench')
        .setOrigin(0.5).setDepth(DEPTH.VEGETATION_BASE + Math.floor(s.y));
    });
  }

  // ===== Street Furniture — uses Image sprites =====
  drawStreetFurniture(w, h) {
    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    const totalRoadW = roadW + sidewalkW * 2;

    const placeSL = (x, y) => {
      this.add.image(x, y, 'tex_street_light')
        .setOrigin(0.5, 0.85).setDepth(DEPTH.VEGETATION_BASE + Math.floor(y));
      const glowOuter = this.add.circle(x, y - 20, 22, 0xFFF9C4, 0.04)
        .setDepth(DEPTH.VEGETATION_BASE + Math.floor(y) - 1);
      const glowInner = this.add.circle(x, y - 20, 12, 0xFFE082, 0.08)
        .setDepth(DEPTH.VEGETATION_BASE + Math.floor(y) - 1);
      const tw = this.tweens.add({
        targets: [glowOuter, glowInner],
        alpha: '+= 0.04',
        duration: 2000 + Math.random() * 1500,
        yoyo: true,
        repeat: -1,
      });
      this._tweenables.push({ obj: glowOuter, tween: tw, x, y: y - 20 });
    };

    hRoads.forEach(ry => {
      for (let lx = 60; lx < w; lx += 120) {
        let skip = false;
        vRoads.forEach(vx => { if (Math.abs(lx - vx) < totalRoadW) skip = true; });
        if (skip) continue;
        placeSL(lx, ry - totalRoadW / 2 - 2);
        placeSL(lx + 60, ry + totalRoadW / 2 + 2);
      }
    });
    vRoads.forEach(rx => {
      for (let ly = 60; ly < h; ly += 120) {
        let skip = false;
        hRoads.forEach(hy => { if (Math.abs(ly - hy) < totalRoadW) skip = true; });
        if (skip) continue;
        placeSL(rx - totalRoadW / 2 - 2, ly);
      }
    });

    // Hydrants
    [
      { x: vRoads[0] + totalRoadW / 2 + 6, y: hRoads[0] - totalRoadW / 2 - 6 },
      { x: vRoads[1] - totalRoadW / 2 - 6, y: hRoads[1] + totalRoadW / 2 + 6 },
      { x: vRoads[2] + totalRoadW / 2 + 6, y: hRoads[2] - totalRoadW / 2 - 6 },
    ].forEach(s => {
      this.add.image(s.x, s.y, 'tex_hydrant')
        .setOrigin(0.5, 0.62).setDepth(DEPTH.VEGETATION_BASE + Math.floor(s.y));
    });

    // Mailboxes
    [
      { x: vRoads[0] - totalRoadW / 2 - 6, y: hRoads[0] + totalRoadW / 2 + 8 },
      { x: vRoads[2] - totalRoadW / 2 - 6, y: hRoads[1] + totalRoadW / 2 + 8 },
    ].forEach(s => {
      this.add.image(s.x, s.y, 'tex_mailbox')
        .setOrigin(0.5, 0.55).setDepth(DEPTH.VEGETATION_BASE + Math.floor(s.y));
    });

    // Trash cans
    for (let i = 0; i < 10; i++) {
      const road = hRoads[Math.floor(Math.random() * hRoads.length)];
      const tx = 80 + Math.random() * (w - 160);
      let skip = false;
      vRoads.forEach(vx => { if (Math.abs(tx - vx) < totalRoadW) skip = true; });
      if (skip) continue;
      const side = Math.random() > 0.5 ? -1 : 1;
      const ty = road + side * (totalRoadW / 2 + 3);
      this.add.image(tx, ty, 'tex_trash_can')
        .setOrigin(0.5).setDepth(DEPTH.VEGETATION_BASE + Math.floor(ty));
    }

    // Fountain — placed in Westpark green area
    const cx = 120, cy = 420;
    const fg = this.add.graphics().setDepth(DEPTH.VEGETATION_BASE + Math.floor(cy) + 10);
    fg.fillStyle(0x78909C, 0.8);
    fg.fillCircle(cx, cy, 40);
    fg.fillStyle(0x90A4AE, 0.6);
    fg.fillCircle(cx, cy, 36);
    fg.lineStyle(2, 0x607D8B, 0.8);
    fg.strokeCircle(cx, cy, 22);
    fg.fillStyle(0x1976D2, 0.6);
    fg.fillCircle(cx, cy, 20);
    fg.fillStyle(0x2196F3, 0.4);
    fg.fillCircle(cx, cy, 14);
    fg.fillStyle(0x78909C, 1);
    fg.fillCircle(cx, cy, 5);

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const drop = this.add.circle(
        cx + Math.cos(angle) * 8,
        cy + Math.sin(angle) * 8,
        1.5, 0x64B5F6, 0.7
      ).setDepth(DEPTH.VEGETATION_BASE + Math.floor(cy) + 11);
      const tw = this.tweens.add({
        targets: drop,
        x: cx + Math.cos(angle) * 20,
        y: cy + Math.sin(angle) * 20 - 6,
        alpha: 0.1,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 700 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        delay: i * 120,
      });
      this._tweenables.push({ obj: drop, tween: tw, x: cx, y: cy });
    }

    // Center jet spray
    const jet = this.add.circle(cx, cy - 5, 2, 0xBBDEFB, 0.5)
      .setDepth(DEPTH.VEGETATION_BASE + Math.floor(cy) + 12);
    const jetTw = this.tweens.add({
      targets: jet,
      y: cy - 14,
      alpha: 0,
      scaleX: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeOut',
    });
    this._tweenables.push({ obj: jet, tween: jetTw, x: cx, y: cy });
  }

  // ===== NPCs =====
  addNPCs(w, h) {
    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    const totalRoadW = roadW + sidewalkW * 2;
    const npcColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0x34495e];
    this._npcs = [];

    for (let i = 0; i < 8; i++) {
      const road = i < 4 ? hRoads[i % hRoads.length] : vRoads[i % vRoads.length];
      const isHoriz = i < 4;
      const side = Math.random() > 0.5 ? -1 : 1;
      const color = npcColors[Math.floor(Math.random() * npcColors.length)];

      let sx, sy;
      if (isHoriz) {
        sx = Math.random() * w;
        sy = road + side * (roadW / 2 + sidewalkW / 2);
      } else {
        sx = road + side * (roadW / 2 + sidewalkW / 2);
        sy = Math.random() * h;
      }

      const npcBody = this.add.circle(sx, sy, 4, color).setDepth(DEPTH.NPC);
      const npcHead = this.add.circle(sx, sy - 5, 3, 0xFDEBD3).setDepth(DEPTH.NPC + 1);

      const dir = Math.random() > 0.5 ? 1 : -1;
      const moveSpeed = 0.8 + Math.random() * 1.2;
      this._npcs.push({ body: npcBody, head: npcHead, isHoriz, dir, speed: moveSpeed, road });
    }

    // Cars — still use update-based movement
    const carColors = [0xF44336, 0x2196F3, 0x4CAF50, 0xFFEB3B, 0x9C27B0, 0xFF9800];
    this._cars = [];
    for (let i = 0; i < 4; i++) {
      const isHoriz = i < 2;
      const road = isHoriz ? hRoads[Math.floor(Math.random() * hRoads.length)] : vRoads[Math.floor(Math.random() * vRoads.length)];
      const lane = Math.random() > 0.5 ? -8 : 8;
      const color = carColors[Math.floor(Math.random() * carColors.length)];

      let cx, cy, carW, carH;
      if (isHoriz) {
        cx = Math.random() * w;
        cy = road + lane;
        carW = 18; carH = 10;
      } else {
        cx = road + lane;
        cy = Math.random() * h;
        carW = 10; carH = 18;
      }

      const car = this.add.graphics().setDepth(DEPTH.NPC);
      car.fillStyle(color, 1);
      car.fillRoundedRect(-carW / 2, -carH / 2, carW, carH, 2);
      car.fillStyle(0xBBDEFB, 0.6);
      if (isHoriz) {
        car.fillRect(-carW / 2 + 2, -carH / 2 + 2, 5, carH - 4);
        car.fillRect(carW / 2 - 7, -carH / 2 + 2, 5, carH - 4);
      } else {
        car.fillRect(-carW / 2 + 2, -carH / 2 + 2, carW - 4, 5);
        car.fillRect(-carW / 2 + 2, carH / 2 - 7, carW - 4, 5);
      }
      car.setPosition(cx, cy);

      const dir = lane > 0 ? 1 : -1;
      const speed = 2 + Math.random() * 2;
      this._cars.push({ gfx: car, isHoriz, dir, speed });
    }
  }

  // ===== Houses =====
  createHouses() {
    const houseDefs = [
      { id: 'downtown',    x: 600,  y: 180,  w: 110, h: 90,  color: 0x37474F, roofColor: 0x546E7A, tier: 'high',   icon: '🏢', floors: 3 },
      { id: 'midtown',     x: 600,  y: 520,  w: 90,  h: 72,  color: 0x455A64, roofColor: 0x78909C, tier: 'mid',    icon: '🏬', floors: 2 },
      { id: 'eastside',    x: 1050, y: 180,  w: 85,  h: 65,  color: 0x8D6E63, roofColor: 0xBCAAA4, tier: 'mid',    icon: '🏘️', floors: 2 },
      { id: 'westpark',    x: 200,  y: 520,  w: 90,  h: 70,  color: 0x558B2F, roofColor: 0x7CB342, tier: 'mid',    icon: '🌳', floors: 2 },
      { id: 'northgate',   x: 200,  y: 180,  w: 72,  h: 55,  color: 0x6D4C41, roofColor: 0x8D6E63, tier: 'low',    icon: '🚉', floors: 1 },
      { id: 'southview',   x: 600,  y: 820,  w: 70,  h: 55,  color: 0x546E7A, roofColor: 0x78909C, tier: 'low',    icon: '🌆', floors: 1 },
      { id: 'lakefront',   x: 1100, y: 820,  w: 105, h: 80,  color: 0x1565C0, roofColor: 0x42A5F5, tier: 'high',   icon: '🌊', floors: 3 },
      { id: 'oldquarter',  x: 200,  y: 820,  w: 65,  h: 50,  color: 0x795548, roofColor: 0x8D6E63, tier: 'low',    icon: '🏛️', floors: 1 },
    ];

    const houses = [];
    this.buildingColliders = this.physics.add.staticGroup();

    houseDefs.forEach((def, i) => {
      const areaData = this.areaPrices[i];
      const depth = DEPTH.BUILDINGS_BASE + Math.floor(def.y + def.h);
      const bx = def.x - def.w / 2;
      const by = def.y - def.h / 2;

      // Merge shadow + foundation + fence + body into one Graphics
      const buildingG = this.add.graphics().setDepth(depth);

      // Shadow
      buildingG.fillStyle(0x000000, 0.18);
      buildingG.fillRect(bx + 5, by + 5, def.w, def.h);

      // Foundation
      buildingG.fillStyle(0x9E9E9E, 0.6);
      buildingG.fillRect(bx - 6, by + def.h - 4, def.w + 12, 8);

      // Fence / yard
      if (def.tier === 'high') {
        buildingG.lineStyle(1, 0x37474F, 0.6);
        const fy = by + def.h + 6;
        buildingG.lineBetween(bx - 12, fy, bx + def.w + 12, fy);
        for (let fx = bx - 12; fx <= bx + def.w + 12; fx += 8) {
          buildingG.lineBetween(fx, fy, fx, fy - 8);
        }
        buildingG.lineBetween(bx - 12, fy - 8, bx + def.w + 12, fy - 8);
      } else if (def.tier === 'mid') {
        buildingG.lineStyle(1, 0x8D6E63, 0.5);
        const fy = by + def.h + 4;
        buildingG.lineBetween(bx - 8, fy, bx + def.w + 8, fy);
        for (let fx = bx - 8; fx <= bx + def.w + 8; fx += 10) {
          buildingG.fillStyle(0x795548, 0.6);
          buildingG.fillRect(fx, fy - 6, 2, 6);
        }
      }

      // Building body with gradient (lighter top, darker bottom)
      const bodyColor = Phaser.Display.Color.IntegerToColor(def.color);
      const lighter = Phaser.Display.Color.IntegerToColor(def.color).lighten(8).color;
      const darker = Phaser.Display.Color.IntegerToColor(def.color).darken(5).color;

      const bandH = Math.ceil(def.h / 3);
      buildingG.fillStyle(lighter, 1);
      buildingG.fillRect(bx, by, def.w, bandH);
      buildingG.fillStyle(def.color, 1);
      buildingG.fillRect(bx, by + bandH, def.w, bandH);
      buildingG.fillStyle(darker, 1);
      buildingG.fillRect(bx, by + bandH * 2, def.w, def.h - bandH * 2);

      // Brick texture
      buildingG.lineStyle(1, 0x000000, 0.06);
      for (let ly = by + 6; ly < by + def.h; ly += 6) {
        buildingG.lineBetween(bx, ly, bx + def.w, ly);
      }

      // Floor dividers
      if (def.floors > 1) {
        buildingG.lineStyle(1, 0x000000, 0.15);
        for (let f = 1; f < def.floors; f++) {
          const fy = by + (def.h / def.floors) * f;
          buildingG.lineBetween(bx, fy, bx + def.w, fy);
          buildingG.fillStyle(0x000000, 0.08);
          buildingG.fillRect(bx, fy - 1, def.w, 2);
        }
      }

      // Windows (on same Graphics)
      const winCols = Math.max(2, Math.floor(def.w / 24));
      const winRows = def.floors;
      const winW = def.tier === 'high' ? 10 : 8;
      const winH = def.tier === 'high' ? 12 : 10;
      const gapX = (def.w - 16) / winCols;
      const gapY = def.h / winRows;

      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const wx = bx + 10 + c * gapX + (Math.random() - 0.5) * 1.5;
          const wy = by + 6 + r * gapY;
          const lit = Math.random() > 0.35;

          buildingG.fillStyle(0x263238, 0.8);
          buildingG.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
          buildingG.fillStyle(lit ? 0xFFF9C4 : 0x1a1a2e, lit ? 0.6 : 0.5);
          buildingG.fillRect(wx, wy, winW, winH);
          buildingG.fillStyle(0x263238, 0.4);
          buildingG.fillRect(wx + winW / 2 - 0.5, wy, 1, winH);
          buildingG.fillRect(wx, wy + winH / 2 - 0.5, winW, 1);

          if (def.tier === 'high') {
            buildingG.fillStyle(0xFFFFFF, 0.15);
            buildingG.fillRect(wx + 1, wy + 1, winW / 3, winH - 2);
          }

          buildingG.fillStyle(0x9E9E9E, 0.5);
          buildingG.fillRect(wx - 1, wy + winH, winW + 2, 2);

          if (def.id === 'lakefront') {
            buildingG.fillStyle(0x90A4AE, 0.7);
            buildingG.fillRect(wx - 3, wy + winH + 2, winW + 6, 3);
            buildingG.lineStyle(1, 0x607D8B, 0.5);
            buildingG.lineBetween(wx - 3, wy + winH + 2, wx - 3, wy + winH + 5);
            buildingG.lineBetween(wx + winW + 3, wy + winH + 2, wx + winW + 3, wy + winH + 5);
            buildingG.lineBetween(wx - 3, wy + winH + 5, wx + winW + 3, wy + winH + 5);
          }
        }
      }

      // Roof
      const roofY = by;
      if (def.tier === 'high') {
        buildingG.fillStyle(def.roofColor, 1);
        buildingG.fillRect(bx - 4, roofY - 6, def.w + 8, 8);
        buildingG.lineStyle(1, 0x263238, 0.3);
        buildingG.strokeRect(bx - 4, roofY - 6, def.w + 8, 8);
        buildingG.fillStyle(0x78909C, 0.8);
        buildingG.fillRect(bx + 4, roofY - 12, 10, 6);
        buildingG.fillRect(bx + 18, roofY - 10, 8, 4);
        buildingG.fillStyle(0x546E7A, 0.6);
        buildingG.fillRect(bx + def.w - 20, roofY - 14, 12, 8);
        buildingG.fillStyle(0x455A64, 0.7);
        const awX = def.x - 14, awY = by + def.h - 22;
        buildingG.beginPath();
        buildingG.moveTo(awX - 4, awY);
        buildingG.lineTo(awX + 14, awY - 8);
        buildingG.lineTo(awX + 32, awY);
        buildingG.closePath();
        buildingG.fillPath();
      } else if (def.tier === 'mid') {
        buildingG.fillStyle(def.roofColor, 1);
        buildingG.beginPath();
        buildingG.moveTo(bx - 8, roofY);
        buildingG.lineTo(def.x, roofY - 22);
        buildingG.lineTo(bx + def.w + 8, roofY);
        buildingG.closePath();
        buildingG.fillPath();
        buildingG.lineStyle(1, 0x000000, 0.15);
        for (let sy = roofY - 18; sy < roofY; sy += 4) {
          const progress = (sy - (roofY - 22)) / 22;
          const lx = bx - 8 + (def.x - bx + 8) * (1 - progress);
          const rx = bx + def.w + 8 - (bx + def.w + 8 - def.x) * (1 - progress);
          buildingG.lineBetween(lx + 4, sy, rx - 4, sy);
        }
        buildingG.lineStyle(2, 0x000000, 0.15);
        buildingG.strokePath();
        if (def.id === 'westpark' || def.id === 'midtown') {
          buildingG.fillStyle(0x5D4037, 0.8);
          buildingG.fillRect(def.x + def.w / 4, roofY - 28, 8, 12);
        }
      } else {
        buildingG.fillStyle(def.roofColor, 1);
        buildingG.beginPath();
        buildingG.moveTo(bx - 5, roofY);
        buildingG.lineTo(def.x, roofY - 14);
        buildingG.lineTo(bx + def.w + 5, roofY);
        buildingG.closePath();
        buildingG.fillPath();
        buildingG.lineStyle(1, 0x000000, 0.2);
        buildingG.strokePath();
        if (def.id === 'oldquarter') {
          buildingG.lineStyle(1, 0x4E342E, 0.25);
          buildingG.lineBetween(bx + 8, by + 10, bx + 14, by + 25);
          buildingG.lineBetween(bx + def.w - 10, by + 15, bx + def.w - 16, by + 30);
          buildingG.lineBetween(bx + def.w - 10, by + 15, bx + def.w - 6, by + 22);
        }
      }

      // Door
      const doorW = def.tier === 'high' ? 16 : 12;
      const doorH = def.tier === 'high' ? 24 : 18;
      const doorX = def.x;
      const doorY = by + def.h;

      const steps = def.tier === 'high' ? 3 : def.tier === 'mid' ? 2 : 1;
      for (let s = 0; s < steps; s++) {
        buildingG.fillStyle(0x9E9E9E, 0.7 - s * 0.1);
        buildingG.fillRect(doorX - doorW / 2 - 2 - s * 2, doorY - 1 + s * 3, doorW + 4 + s * 4, 3);
      }
      buildingG.fillStyle(0x4E342E, 1);
      buildingG.fillRect(doorX - doorW / 2, doorY - doorH, doorW, doorH);
      buildingG.lineStyle(1, 0x3E2723, 0.6);
      buildingG.strokeRect(doorX - doorW / 2, doorY - doorH, doorW, doorH);
      buildingG.fillStyle(0xFFD54F, 1);
      buildingG.fillCircle(doorX + doorW / 3, doorY - doorH / 2, 2);

      this.add.text(doorX, doorY - doorH + 4, `${i + 1}`, {
        fontSize: '7px', color: '#BCAAA4', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(depth + 1);

      // Door mat
      const matColors = { high: 0x8D6E63, mid: 0x795548, low: 0x6D4C41 };
      buildingG.fillStyle(matColors[def.tier] || 0x795548, 0.7);
      buildingG.fillRect(doorX - doorW / 2 - 4, doorY, doorW + 8, 4);
      buildingG.fillStyle(0xBCAAA4, 0.4);
      buildingG.fillRect(doorX - doorW / 2 - 2, doorY + 1, doorW + 4, 2);

      // Entrance planters (two small green boxes flanking the door)
      if (def.tier !== 'low') {
        const planterW = 6, planterH = 8;
        [-1, 1].forEach(side => {
          const px = doorX + side * (doorW / 2 + planterW / 2 + 3);
          const py = doorY - planterH;
          buildingG.fillStyle(0x5D4037, 0.8);
          buildingG.fillRect(px - planterW / 2, py, planterW, planterH);
          buildingG.fillStyle(0x4CAF50, 0.7);
          buildingG.fillCircle(px, py - 2, 5);
          buildingG.fillStyle(0x388E3C, 0.5);
          buildingG.fillCircle(px + 1, py - 3, 3);
        });
      }

      // Cornice / awning for premium & mid-tier buildings
      if (def.tier === 'high') {
        const corniceColor = Phaser.Display.Color.IntegerToColor(def.color).lighten(15).color;
        const corniceDark = Phaser.Display.Color.IntegerToColor(def.color).darken(10).color;

        buildingG.fillStyle(corniceColor, 0.9);
        buildingG.fillRect(bx - 3, by + 2, def.w + 6, 4);
        buildingG.fillStyle(corniceDark, 0.5);
        buildingG.fillRect(bx - 3, by + 6, def.w + 6, 1);

        for (let f = 1; f < def.floors; f++) {
          const fy = by + (def.h / def.floors) * f;
          buildingG.fillStyle(corniceColor, 0.7);
          buildingG.fillRect(bx - 2, fy - 2, def.w + 4, 3);
          buildingG.fillStyle(corniceDark, 0.3);
          buildingG.fillRect(bx - 2, fy + 1, def.w + 4, 1);
        }

        buildingG.fillStyle(corniceDark, 0.6);
        buildingG.fillRect(bx - 2, by + def.h - 3, def.w + 4, 3);
      }
      if (def.tier === 'mid') {
        const awX = bx - 4, awY2 = by + def.h - 20;
        buildingG.fillStyle(0x455A64, 0.7);
        buildingG.beginPath();
        buildingG.moveTo(awX, awY2);
        buildingG.lineTo(awX + def.w / 3, awY2 - 8);
        buildingG.lineTo(awX + def.w / 3 * 2 + 8, awY2 - 8);
        buildingG.lineTo(awX + def.w + 8, awY2);
        buildingG.closePath();
        buildingG.fillPath();
        const stripeColor = def.id === 'westpark' ? 0x8BC34A : 0xFF7043;
        buildingG.lineStyle(1, stripeColor, 0.5);
        for (let sx = awX + 4; sx < awX + def.w + 4; sx += 6) {
          buildingG.lineBetween(sx, awY2, sx + 2, awY2 - 5);
        }
      }

      // Wall-mounted light (small warm glow beside door)
      const wallLightY = doorY - doorH - 4;
      buildingG.fillStyle(0xFFF9C4, 0.15);
      buildingG.fillCircle(doorX - doorW / 2 - 6, wallLightY, 8);
      buildingG.fillCircle(doorX + doorW / 2 + 6, wallLightY, 8);
      buildingG.fillStyle(0xFFE082, 0.3);
      buildingG.fillCircle(doorX - doorW / 2 - 6, wallLightY, 3);
      buildingG.fillCircle(doorX + doorW / 2 + 6, wallLightY, 3);

      // Special: Westpark front yard
      if (def.id === 'westpark') {
        const yardG = this.add.graphics().setDepth(depth - 2);
        yardG.fillStyle(0x4CAF50, 0.4);
        yardG.fillRect(bx - 10, doorY + 4, def.w + 20, 20);
        yardG.fillStyle(0x388E3C, 0.5);
        for (let p = 0; p < 5; p++) {
          yardG.fillCircle(bx - 5 + Math.random() * (def.w + 10), doorY + 8 + Math.random() * 12, 2 + Math.random() * 2);
        }
        yardG.fillStyle(0x9E9E9E, 0.4);
        yardG.fillRect(doorX - 4, doorY + 4, 8, 20);
      }

      // Special: Eastside side walls
      if (def.id === 'eastside') {
        buildingG.fillStyle(0x7B5B4D, 0.7);
        buildingG.fillRect(bx + def.w, by + 4, 4, def.h - 4);
        buildingG.fillStyle(0x9B7B6B, 0.7);
        buildingG.fillRect(bx - 4, by + 4, 4, def.h - 4);
      }

      // Door sprite for open/close animation
      const doorSprite = this.add.graphics().setDepth(depth + 2);
      doorSprite.fillStyle(0x4E342E, 1);
      doorSprite.fillRect(-doorW / 2, -doorH, doorW, doorH);
      doorSprite.lineStyle(1, 0x3E2723, 0.6);
      doorSprite.strokeRect(-doorW / 2, -doorH, doorW, doorH);
      doorSprite.fillStyle(0xFFD54F, 1);
      doorSprite.fillCircle(doorW / 3, -doorH / 2, 2);
      doorSprite.setPosition(doorX, doorY);
      doorSprite.setVisible(false);

      // Info card
      const cardH = 30;
      const cardW = 110;
      const cardY = by - (def.tier === 'high' ? 38 : def.tier === 'mid' ? 34 : 26);
      const cardX = def.x - cardW / 2;

      const cardBg = this.add.graphics().setDepth(DEPTH.LABELS);
      cardBg.fillStyle(0x1a1a2e, 0.75);
      cardBg.fillRoundedRect(cardX, cardY - cardH / 2, cardW, cardH, 6);
      cardBg.lineStyle(1, 0xffffff, 0.15);
      cardBg.strokeRoundedRect(cardX, cardY - cardH / 2, cardW, cardH, 6);
      cardBg.fillStyle(0x1a1a2e, 0.75);
      cardBg.fillTriangle(def.x - 5, cardY + cardH / 2, def.x + 5, cardY + cardH / 2, def.x, cardY + cardH / 2 + 5);

      this.add.text(def.x, cardY - 4, `${def.icon} ${areaData.name}`, {
        fontSize: '11px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH.LABELS + 1);

      this.add.text(def.x, cardY + 8, `$${areaData.price.toLocaleString()}`, {
        fontSize: '10px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#FFD54F',
      }).setOrigin(0.5).setDepth(DEPTH.LABELS + 1);

      // Trigger zone — covers entire building + margin
      const triggerZone = this.add.zone(def.x, def.y, def.w + 60, def.h + 60);
      this.physics.add.existing(triggerZone, true);

      // Collision body — blocks player from walking into building
      // Extend upward to cover roof and downward to cover foundation
      const roofExtra = def.tier === 'mid' ? 28 : def.tier === 'high' ? 14 : 14;
      const baseExtra = 10;
      const colH = def.h + roofExtra + baseExtra;
      const colY = def.y + (baseExtra - roofExtra) / 2;
      const collisionBody = this.add.zone(def.x, colY, def.w + 8, colH);
      this.physics.add.existing(collisionBody, true);
      this.buildingColliders.add(collisionBody);

      // Visit marker (hidden by default)
      const visitMark = this.add.text(bx + def.w + 8, by - 6, '✅', {
        fontSize: '16px',
      }).setOrigin(0.5).setDepth(DEPTH.LABELS + 2).setVisible(false);

      // Unvisited indicator — floating arrow
      const arrowY = by - (def.tier === 'high' ? 50 : def.tier === 'mid' ? 46 : 36);
      const unvisitedMark = this.add.image(def.x, arrowY, 'tex_arrow_indicator')
        .setOrigin(0.5).setDepth(DEPTH.LABELS + 2);

      const unvisitedTween = this.tweens.add({
        targets: unvisitedMark,
        y: arrowY - 6,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Glow pillar — vertical light beam above unvisited house
      const pillarH = def.tier === 'high' ? 60 : def.tier === 'mid' ? 50 : 40;
      const pillarW = 16;
      const pillarColor = { high: 0x64B5F6, mid: 0x81C784, low: 0xFFB74D }[def.tier];
      const glowPillar = this.add.graphics().setDepth(depth - 2).setAlpha(0.6);
      for (let strip = 0; strip < 5; strip++) {
        const sw = pillarW + strip * 8;
        const a = 0.15 - strip * 0.03;
        glowPillar.fillStyle(pillarColor, a);
        glowPillar.fillRect(def.x - sw / 2, by - pillarH - strip * 4, sw, pillarH + strip * 4);
      }
      glowPillar.fillStyle(pillarColor, 0.25);
      glowPillar.fillRect(def.x - pillarW / 2, by - pillarH, pillarW, pillarH);
      glowPillar.fillStyle(0xffffff, 0.12);
      glowPillar.fillRect(def.x - 3, by - pillarH, 6, pillarH);

      const glowTween = this.tweens.add({
        targets: glowPillar,
        alpha: { from: 0.35, to: 0.7 },
        duration: 1500 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Highlight glow for proximity — breathing pulse
      const highlightG = this.add.graphics().setDepth(depth - 1).setVisible(false);
      highlightG.lineStyle(3, 0x3498db, 0.5);
      highlightG.strokeRoundedRect(bx - 4, by - 4, def.w + 8, def.h + 8, 4);
      highlightG.lineStyle(1, 0x64B5F6, 0.2);
      highlightG.strokeRoundedRect(bx - 8, by - 8, def.w + 16, def.h + 16, 6);
      highlightG.fillStyle(0x3498db, 0.04);
      highlightG.fillRoundedRect(bx - 8, by - 8, def.w + 16, def.h + 16, 6);

      houses.push({
        def, areaData, triggerZone, visitMark,
        unvisitedMark, unvisitedTween, highlightG,
        buildingG, doorSprite, glowPillar, glowTween,
      });
    });

    return houses;
  }

  // ===== Player — Chibi style, 4-frame walk animation + directional facing =====
  createPlayer(worldW, worldH) {
    const startX = worldW / 2;
    const startY = worldH / 2;
    const skinColor = this.getSkinColorHex();
    const hairColor = this.getHairColorHex();
    const shirtColor = 0x3498db;
    const pantsColor = 0x2c3e50;
    const shoeColor = 0x1a1a2e;
    const skinDark = Phaser.Display.Color.IntegerToColor(skinColor).darken(12).color;
    const shirtLight = Phaser.Display.Color.IntegerToColor(shirtColor).lighten(12).color;
    const hairDark = Phaser.Display.Color.IntegerToColor(hairColor).darken(15).color;

    this.player = this.add.container(startX, startY).setDepth(DEPTH.PLAYER);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(22, 22);
    this.player.body.setOffset(-11, -11);

    const tw = 48, th = 64;
    const cx = tw / 2;
    const headCY = 20;
    const bodyCY = 44;

    const drawCharFrame = (legOffset, frameIdx) => {
      const g = this.make.graphics({ add: false });
      const bounce = (frameIdx === 1 || frameIdx === 3) ? -1 : 0;
      const armSwing = legOffset * 0.6;

      // -- Feet (short rounded) --
      g.fillStyle(shoeColor, 1);
      g.fillRoundedRect(cx - 8 + legOffset, bodyCY + 12, 7, 5, 2);
      g.fillRoundedRect(cx + 1 - legOffset, bodyCY + 12, 7, 5, 2);

      // -- Legs (stubby) --
      g.fillStyle(pantsColor, 1);
      g.fillRoundedRect(cx - 7 + legOffset, bodyCY + 4, 6, 10, 2);
      g.fillRoundedRect(cx + 1 - legOffset, bodyCY + 4, 6, 10, 2);

      // -- Body (small rounded rectangle) --
      g.fillStyle(shirtColor, 1);
      g.fillRoundedRect(cx - 10, bodyCY - 10, 20, 16, 5);
      g.fillStyle(shirtLight, 0.3);
      g.fillRoundedRect(cx - 8, bodyCY - 9, 8, 12, 3);

      // -- Arms (small round balls) --
      g.fillStyle(shirtColor, 1);
      g.fillCircle(cx - 12, bodyCY - 2 + armSwing, 4);
      g.fillCircle(cx + 12, bodyCY - 2 - armSwing, 4);
      g.fillStyle(skinColor, 1);
      g.fillCircle(cx - 12, bodyCY + 3 + armSwing, 3);
      g.fillCircle(cx + 12, bodyCY + 3 - armSwing, 3);

      // -- Neck --
      g.fillStyle(skinColor, 1);
      g.fillRect(cx - 3, bodyCY - 14, 6, 6);

      // -- Head (large ellipse) --
      const hy = headCY + bounce;
      g.fillStyle(skinColor, 1);
      g.fillEllipse(cx, hy, 34, 30);

      // -- Ears --
      g.fillStyle(skinColor, 1);
      g.fillCircle(cx - 17, hy + 1, 4);
      g.fillCircle(cx + 17, hy + 1, 4);
      g.fillStyle(skinDark, 0.3);
      g.fillCircle(cx - 17, hy + 1, 2);
      g.fillCircle(cx + 17, hy + 1, 2);

      // -- Hair (poofy top) --
      g.fillStyle(hairColor, 1);
      g.fillEllipse(cx, hy - 10, 36, 18);
      g.fillRoundedRect(cx - 18, hy - 14, 36, 12, 6);
      g.fillStyle(hairColor, 0.9);
      g.fillEllipse(cx - 14, hy - 2, 10, 16);
      g.fillEllipse(cx + 14, hy - 2, 10, 16);
      g.fillStyle(hairDark, 0.4);
      g.fillEllipse(cx, hy - 14, 28, 8);

      // -- Face --
      // Eyes: big black bean eyes with highlights
      g.fillStyle(0x1a1a1a, 1);
      g.fillCircle(cx - 7, hy + 1, 3.5);
      g.fillCircle(cx + 7, hy + 1, 3.5);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(cx - 6, hy - 0.5, 1.5);
      g.fillCircle(cx + 8, hy - 0.5, 1.5);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(cx - 8, hy + 2, 0.8);
      g.fillCircle(cx + 6, hy + 2, 0.8);

      // Blush
      g.fillStyle(0xFF9999, 0.25);
      g.fillEllipse(cx - 12, hy + 5, 8, 5);
      g.fillEllipse(cx + 12, hy + 5, 8, 5);

      // Smile
      g.lineStyle(1.5, 0xc0392b, 0.45);
      g.beginPath();
      g.arc(cx, hy + 5, 4, Phaser.Math.DegToRad(15), Phaser.Math.DegToRad(165));
      g.strokePath();

      return g;
    };

    const offsets = [0, -2, 0, 2];
    offsets.forEach((off, idx) => {
      const g = drawCharFrame(off, idx);
      g.generateTexture(`player_walk_${idx}`, tw, th);
      g.destroy();
    });

    this.anims.create({
      key: 'player_walk',
      frames: [
        { key: 'player_walk_0' },
        { key: 'player_walk_1' },
        { key: 'player_walk_2' },
        { key: 'player_walk_3' },
      ],
      frameRate: 8,
      repeat: -1,
    });

    const charSprite = this.add.sprite(0, 0, 'player_walk_0').setOrigin(0.5).setScale(0.65);
    this._charSprite = charSprite;

    const arrow = this.add.graphics();
    arrow.fillStyle(0x2ecc71, 0.8);
    arrow.fillTriangle(0, -26, -4, -21, 4, -21);
    this.tweens.add({
      targets: arrow,
      y: -2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.player.add([charSprite, arrow]);
    this._isWalking = false;

    this.playerShadow = this.add.ellipse(startX, startY + 16, 18, 6, 0x000000, 0.2).setDepth(DEPTH.PLAYER_SHADOW);
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
    const areaIcons = ['🏢', '🏬', '🏘️', '🌳', '🚉', '🌆', '🌊', '🏛️'];
    const areaIds = ['downtown', 'midtown', 'eastside', 'westpark', 'northgate', 'southview', 'lakefront', 'oldquarter'];

    const dotStartX = 24;
    const dotY = 42;
    const dotR = 8;
    const dotSpacing = 20;
    const dotsEndX = dotStartX + 7 * dotSpacing + dotR;
    const labelGap = 6;
    const hudW = dotsEndX + labelGap + 30 + 8;

    this.hudBg = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD);
    this.hudBg.fillStyle(0x000000, 0.5);
    this.hudBg.fillRoundedRect(8, 8, hudW, 68, 8);

    this.hudTitle = this.add.text(16, 14, '🗺️ Explore Valrenta City', {
      fontSize: '13px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#3498db',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    this.hudDots = [];
    for (let i = 0; i < 8; i++) {
      const dx = dotStartX + i * dotSpacing;
      const bg = this.add.circle(dx, dotY, dotR, 0x2c3e50, 0.6)
        .setScrollFactor(0).setDepth(DEPTH.HUD + 1);
      const icon = this.add.text(dx, dotY, areaIcons[i], {
        fontSize: '9px',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD + 2).setAlpha(0.4);
      this.hudDots.push({ bg, icon, id: areaIds[i] });
    }

    this.hudProgressLabel = this.add.text(dotsEndX + labelGap, dotY, '0/8', {
      fontSize: '11px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#7f8c8d',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    this.hudBalance = this.add.text(20, 55, `Balance: $${GameState.balance.toLocaleString()}`, {
      fontSize: '11px',
      color: '#2ecc71',
    }).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    this.controlsHint = this.add.text(16, cam.height - 22, 'WASD / Arrows: Move    E: Enter house    Visit all 8 houses to continue', {
      fontSize: '11px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#8899aa',
      stroke: '#0a0f1a',
      strokeThickness: 3,
      letterSpacing: 0.5,
    }).setScrollFactor(0).setDepth(DEPTH.HUD + 1).setAlpha(0.75);

    this.continueBtn = { btnW: 140, btnH: 36 };
    this.continueBtn.btnX = cam.width - this.continueBtn.btnW - 16;
    this.continueBtn.btnY = cam.height - this.continueBtn.btnH - 14;
    const { btnW, btnH, btnX, btnY } = this.continueBtn;

    this.continueBtnBg = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD);
    this.continueBtnBg.fillStyle(0x2c3e50, 0.5);
    this.continueBtnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);

    this.continueBtnText = this.add.text(btnX + btnW / 2, btnY + btnH / 2, '🔒 Visit all 8 houses', {
      fontSize: '11px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#7f8c8d',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    this.continueBtnZone = this.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
      .setScrollFactor(0).setDepth(DEPTH.HUD + 2).setInteractive({ useHandCursor: false });

    this.continueBtnZone.on('pointerdown', () => {
      if (this.allVisited()) {
        this.exitMap();
      }
    });
  }

  updateHUD() {
    const count = this.visitedHouses.size;
    this.hudProgressLabel.setText(`${count}/8`);
    if (count >= 8) {
      this.hudProgressLabel.setColor('#2ecc71');
    } else if (count >= 4) {
      this.hudProgressLabel.setColor('#f39c12');
    }

    for (const dot of this.hudDots) {
      if (this.visitedHouses.has(dot.id) && !dot._done) {
        dot._done = true;
        dot.bg.setFillStyle(0x27ae60, 0.9);
        dot.icon.setAlpha(1);
        this.tweens.add({
          targets: [dot.bg, dot.icon],
          scaleX: 1.4,
          scaleY: 1.4,
          duration: 150,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      }
    }

    if (!this._continueUnlocked) {
      const remaining = 8 - count;
      this.continueBtnText.setText(`🔒 ${remaining} house${remaining !== 1 ? 's' : ''} left`);
    }

    this.updateMinimap();

    if (this.allVisited() && !this._continueUnlocked) {
      this._continueUnlocked = true;
      this.unlockContinueButton();
    }
  }

  // ===== Minimap — top-right semi-transparent overview =====
  createMinimap() {
    const cam = this.cameras.main;
    const mmW = 140, mmH = 105;
    const mmX = cam.width - mmW - 10;
    const mmY = 10;
    const scaleX = mmW / this.WORLD_W;
    const scaleY = mmH / this.WORLD_H;

    this._mm = { x: mmX, y: mmY, w: mmW, h: mmH, scaleX, scaleY };

    const mmBg = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.MINIMAP);
    mmBg.fillStyle(0x1a1a2e, 0.7);
    mmBg.fillRoundedRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 6);
    mmBg.lineStyle(1, 0x3498db, 0.4);
    mmBg.strokeRoundedRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 6);

    const mmContent = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.MINIMAP + 1);
    mmContent.fillStyle(0x454850, 1);
    mmContent.fillRect(mmX, mmY, mmW, mmH);

    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    mmContent.fillStyle(0x707070, 0.6);
    hRoads.forEach(ry => {
      mmContent.fillRect(mmX, mmY + ry * scaleY - 2, mmW, 4);
    });
    vRoads.forEach(rx => {
      mmContent.fillRect(mmX + rx * scaleX - 2, mmY, 4, mmH);
    });

    this._mmHouseDots = [];
    this.houses.forEach(house => {
      const hx = mmX + house.def.x * scaleX;
      const hy = mmY + house.def.y * scaleY;
      const dot = this.add.circle(hx, hy, 3, 0xe74c3c, 0.8)
        .setScrollFactor(0).setDepth(DEPTH.MINIMAP + 2);
      this._mmHouseDots.push({ dot, id: house.def.id });
    });

    this._mmPlayerDot = this.add.circle(mmX + mmW / 2, mmY + mmH / 2, 3, 0x2ecc71, 1)
      .setScrollFactor(0).setDepth(DEPTH.MINIMAP + 3);
    this._mmPlayerDot.setStrokeStyle(1, 0xffffff, 0.8);

    this._mmViewRect = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.MINIMAP + 2);
    this._mmGuideLine = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.MINIMAP + 2);
    this._mmGuidePhase = 0;
  }

  _findNearestUnvisited() {
    let best = null;
    let bestDist = Infinity;
    for (const house of this.houses) {
      if (this.visitedHouses.has(house.def.id)) continue;
      const dx = this.player.x - house.def.x;
      const dy = this.player.y - house.def.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = house;
      }
    }
    return best;
  }

  updateMinimap() {
    if (!this._mm) return;
    const { x: mmX, y: mmY, scaleX, scaleY } = this._mm;

    const playerMmX = mmX + this.player.x * scaleX;
    const playerMmY = mmY + this.player.y * scaleY;
    this._mmPlayerDot.setPosition(playerMmX, playerMmY);

    this._mmHouseDots.forEach(item => {
      item.dot.setFillStyle(
        this.visitedHouses.has(item.id) ? 0x2ecc71 : 0xe74c3c,
        this.visitedHouses.has(item.id) ? 0.6 : 0.8
      );
    });

    this._mmGuideLine.clear();
    const nearest = this._findNearestUnvisited();
    if (nearest) {
      const targetMmX = mmX + nearest.def.x * scaleX;
      const targetMmY = mmY + nearest.def.y * scaleY;
      this._mmGuidePhase = (this._mmGuidePhase + 0.04) % (Math.PI * 2);
      const dashLen = 4;
      const gapLen = 3;
      const dx = targetMmX - playerMmX;
      const dy = targetMmY - playerMmY;
      const totalLen = Math.sqrt(dx * dx + dy * dy);
      if (totalLen > 8) {
        const nx = dx / totalLen;
        const ny = dy / totalLen;
        const pulseAlpha = 0.3 + 0.2 * Math.sin(this._mmGuidePhase);
        this._mmGuideLine.lineStyle(1, 0xf39c12, pulseAlpha);
        let traveled = 3;
        while (traveled < totalLen - 3) {
          const x1 = playerMmX + nx * traveled;
          const y1 = playerMmY + ny * traveled;
          const end = Math.min(traveled + dashLen, totalLen - 3);
          const x2 = playerMmX + nx * end;
          const y2 = playerMmY + ny * end;
          this._mmGuideLine.lineBetween(x1, y1, x2, y2);
          traveled = end + gapLen;
        }
      }
    }

    const cam = this.cameras.main;
    this._mmViewRect.clear();
    this._mmViewRect.lineStyle(1, 0xffffff, 0.35);
    this._mmViewRect.strokeRect(
      mmX + cam.scrollX * scaleX,
      mmY + cam.scrollY * scaleY,
      cam.width * scaleX,
      cam.height * scaleY
    );
  }

  allVisited() {
    return this.visitedHouses.size >= 8;
  }

  drawContinueBtn(color) {
    const { btnW, btnH, btnX, btnY } = this.continueBtn;
    this.continueBtnBg.clear();
    this.continueBtnBg.fillStyle(color, 1);
    this.continueBtnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
    this.continueBtnBg.setVisible(true);
  }

  unlockContinueButton() {
    this.drawContinueBtn(0x27ae60);
    this.continueBtnText.setText('Continue →');
    this.continueBtnText.setColor('#ffffff');
    this.continueBtnText.setFontSize('13px');
    this.continueBtnText.setFontStyle('bold');
    this.continueBtnZone.input.cursor = 'pointer';

    this.continueBtnZone.on('pointerover', () => {
      this.drawContinueBtn(0x2ecc71);
      this.continueBtnText.setFontSize('14px');
    });
    this.continueBtnZone.on('pointerout', () => {
      this.drawContinueBtn(0x27ae60);
      this.continueBtnText.setFontSize('13px');
    });

    if (this.controlsHint) {
      this.controlsHint.setText('WASD / Arrows: Move    E: Enter house    Continue → to proceed');
    }

    this.tweens.add({
      targets: [this.continueBtnBg, this.continueBtnText],
      alpha: { from: 0.5, to: 1 },
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 2,
    });
  }

  showAllVisitedToast() {
    const cam = this.cameras.main;
    const toast = this.add.text(cam.width / 2, cam.height / 2, '✅  All houses visited!\nYou may now continue.', {
      fontSize: '16px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#2ecc71',
      fontStyle: 'bold',
      align: 'center',
      backgroundColor: 'rgba(13, 27, 62, 0.92)',
      padding: { x: 28, y: 18 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.TOAST).setAlpha(0);

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

    if (house.unvisitedMark) {
      if (house.unvisitedTween) house.unvisitedTween.stop();
      this.tweens.add({
        targets: house.unvisitedMark,
        y: house.unvisitedMark.y - 20,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => { house.unvisitedMark.destroy(); house.unvisitedMark = null; },
      });
    }

    if (house.glowPillar) {
      this.tweens.add({
        targets: house.glowPillar,
        alpha: 0,
        duration: 300,
        onComplete: () => { house.glowPillar.destroy(); house.glowPillar = null; },
      });
      if (house.glowTween) { house.glowTween.stop(); house.glowTween = null; }
    }

    if (house.buildingG) {
      this.tweens.add({
        targets: house.buildingG,
        alpha: 0.55,
        duration: 400,
        ease: 'Power2',
      });
    }

    this.updateHUD();
    this.player.body.setVelocity(0, 0);
    this.stopWalkAnimation();

    // Camera zoom-in to the house before entering
    const houseInfo = this.buildHouseInfo(house);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.4,
      scrollX: house.def.x - this.cameras.main.width / 2,
      scrollY: house.def.y - this.cameras.main.height / 2,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.cameras.main.setZoom(1);
        this.scene.pause();
        this.scene.launch('HouseInteriorScene', houseInfo);
      },
    });
  }

  buildHouseInfo(house) {
    const def = house.def;
    const areaData = house.areaData;
    const salary = GameState.config.monthlyBaseSalary;

    const typeMap = {
      downtown:   { type: 'Luxury High-Rise Apartment', sqft: '167 - 232 m²' },
      midtown:    { type: 'Modern Apartment',           sqft: '111 - 149 m²' },
      eastside:   { type: 'Townhouse',                  sqft: '130 - 167 m²' },
      westpark:   { type: 'Garden Villa',               sqft: '139 - 186 m²' },
      northgate:  { type: 'Classic Apartment',          sqft: '74 - 102 m²' },
      southview:  { type: 'Compact Studio',             sqft: '46 - 74 m²' },
      lakefront:  { type: 'Lakeside Villa',             sqft: '186 - 260 m²' },
      oldquarter: { type: 'Heritage Cottage',           sqft: '56 - 84 m²' },
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

  exitMap() {
    this.scene.start('CityScene');
  }

  // ===== Walk Animation — sprite-based frame animation =====
  startWalkAnimation() {
    if (this._isWalking) return;
    this._isWalking = true;
    this._charSprite.play('player_walk');
  }

  stopWalkAnimation() {
    if (!this._isWalking) return;
    this._isWalking = false;
    this._charSprite.stop();
    this._charSprite.setTexture('player_walk_0');
  }

  // ===== Update Loop =====
  update(time, delta) {
    if (this.isInsideHouse) return;

    const speed = 200;
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.player.body.setVelocity(vx, vy);

    // Directional facing — flip sprite horizontally
    if (vx < 0) this._charSprite.setFlipX(true);
    else if (vx > 0) this._charSprite.setFlipX(false);

    this.playerShadow.setPosition(this.player.x, this.player.y + 16);

    if (vx !== 0 || vy !== 0) {
      this.startWalkAnimation();
    } else {
      this.stopWalkAnimation();
    }

    this.player.setDepth(DEPTH.PLAYER + Math.floor(this.player.y));
    this.playerShadow.setDepth(DEPTH.PLAYER_SHADOW + Math.floor(this.player.y));

    this.updateNPCs(delta);
    this.updateCars(delta);
    this.updateParticles(delta);
    this.updateMinimap();
    this.cullTweens();
    this.checkHouseProximity();
    this.updateIdleHint(delta, vx, vy);
  }

  updateNPCs(delta) {
    if (!this._npcs) return;
    const w = this.WORLD_W, h = this.WORLD_H;
    const dt = delta / 1000;

    for (const npc of this._npcs) {
      if (npc.isHoriz) {
        npc.body.x += npc.dir * npc.speed * 60 * dt;
        npc.head.x = npc.body.x;
        npc.head.y = npc.body.y - 5;
        if (npc.dir > 0 && npc.body.x > w + 20) { npc.body.x = -20; npc.head.x = -20; }
        else if (npc.dir < 0 && npc.body.x < -20) { npc.body.x = w + 20; npc.head.x = w + 20; }
      } else {
        npc.body.y += npc.dir * npc.speed * 60 * dt;
        npc.head.x = npc.body.x;
        npc.head.y = npc.body.y - 5;
        if (npc.dir > 0 && npc.body.y > h + 20) { npc.body.y = -20; npc.head.y = -25; }
        else if (npc.dir < 0 && npc.body.y < -20) { npc.body.y = h + 20; npc.head.y = h + 15; }
      }
      npc.body.setDepth(DEPTH.NPC + Math.floor(npc.body.y));
      npc.head.setDepth(DEPTH.NPC + Math.floor(npc.body.y) + 1);
    }
  }

  updateCars(delta) {
    if (!this._cars) return;
    const w = this.WORLD_W, h = this.WORLD_H;
    const dt = delta / 1000;

    for (const car of this._cars) {
      if (car.isHoriz) {
        car.gfx.x += car.dir * car.speed * 60 * dt;
        if (car.dir > 0 && car.gfx.x > w + 30) car.gfx.x = -30;
        else if (car.dir < 0 && car.gfx.x < -30) car.gfx.x = w + 30;
      } else {
        car.gfx.y += car.dir * car.speed * 60 * dt;
        if (car.dir > 0 && car.gfx.y > h + 30) car.gfx.y = -30;
        else if (car.dir < 0 && car.gfx.y < -30) car.gfx.y = h + 30;
      }
      car.gfx.setDepth(DEPTH.NPC + Math.floor(car.gfx.y));
    }
  }

  updateParticles(delta) {
    const dt = delta / 1000;
    const w = this.WORLD_W, h = this.WORLD_H;

    if (this._leaves) {
      for (const leaf of this._leaves) {
        leaf.wobble += leaf.wobbleSpeed;
        leaf.obj.x += leaf.vx * 60 * dt + Math.sin(leaf.wobble) * 0.3;
        leaf.obj.y += leaf.vy * 60 * dt;
        leaf.obj.rotation += 0.01;
        if (leaf.obj.x > w + 20) leaf.obj.x = -10;
        if (leaf.obj.y > h + 20) { leaf.obj.y = -10; leaf.obj.x = Math.random() * w; }
      }
    }

    if (this._dustMotes) {
      for (const mote of this._dustMotes) {
        mote.life += dt * 60;
        mote.obj.x += mote.vx * 60 * dt;
        mote.obj.y += mote.vy * 60 * dt;
        mote.obj.setAlpha(0.1 + Math.sin(mote.life * 0.02) * 0.1);
        if (mote.obj.y < -10 || mote.life > 800) {
          mote.obj.x = Math.random() * w;
          mote.obj.y = Math.random() * h;
          mote.life = 0;
        }
      }
    }
  }

  // Pause tweens for objects outside camera viewport
  cullTweens() {
    const cam = this.cameras.main;
    const pad = 100;
    const left = cam.scrollX - pad;
    const right = cam.scrollX + cam.width + pad;
    const top = cam.scrollY - pad;
    const bottom = cam.scrollY + cam.height + pad;

    for (const item of this._tweenables) {
      const visible = item.x >= left && item.x <= right && item.y >= top && item.y <= bottom;
      if (visible && item.tween.isPaused()) {
        item.tween.resume();
      } else if (!visible && !item.tween.isPaused()) {
        item.tween.pause();
      }
    }
  }

  checkHouseProximity() {
    let nearHouse = null;

    for (const house of this.houses) {
      const zone = house.triggerZone;
      const dx = Math.abs(this.player.x - zone.x);
      const dy = Math.abs(this.player.y - zone.y);
      const roofExtra = house.def.tier === 'mid' ? 28 : 14;
      const rangeX = (house.def.w / 2) + 40;
      const rangeY = (house.def.h / 2) + roofExtra + 25;

      if (dx < rangeX && dy < rangeY) {
        nearHouse = house;
        break;
      }
    }

    if (nearHouse !== this.currentNearHouse) {
      // Hide previous highlight
      if (this.currentNearHouse && this.currentNearHouse.highlightG) {
        this.currentNearHouse.highlightG.setVisible(false);
      }
      this.currentNearHouse = nearHouse;
      if (nearHouse) {
        this.showPrompt(nearHouse);
        if (nearHouse.highlightG) nearHouse.highlightG.setVisible(true);
      } else {
        this.hidePrompt();
      }
    }

    if (this.currentNearHouse) {
      this.positionPrompt(this.currentNearHouse);
    }
  }

  updateIdleHint(delta, vx, vy) {
    if (this.allVisited()) {
      this._hideIdleArrow();
      return;
    }

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      this._idleTime = 0;
      if (this._idleArrowShown) this._hideIdleArrow();
      return;
    }

    this._idleTime += delta;

    if (this._idleTime > 10000 && !this._idleArrowShown) {
      this._idleArrowShown = true;
      const nearest = this._findNearestUnvisited();
      if (!nearest) return;

      const cam = this.cameras.main;
      const screenCX = cam.width / 2;
      const screenCY = cam.height / 2;
      const targetScreenX = nearest.def.x - cam.scrollX;
      const targetScreenY = nearest.def.y - cam.scrollY;
      const dx = targetScreenX - screenCX;
      const dy = targetScreenY - screenCY;
      const angle = Math.atan2(dy, dx);

      const margin = 40;
      const edgeX = screenCX + Math.cos(angle) * (cam.width / 2 - margin);
      const edgeY = screenCY + Math.sin(angle) * (cam.height / 2 - margin);
      const clampedX = Phaser.Math.Clamp(edgeX, margin, cam.width - margin);
      const clampedY = Phaser.Math.Clamp(edgeY, margin, cam.height - margin);

      const arrowG = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.TOAST - 1);
      arrowG.fillStyle(0xf39c12, 0.8);
      arrowG.beginPath();
      arrowG.moveTo(0, -10);
      arrowG.lineTo(8, 6);
      arrowG.lineTo(-8, 6);
      arrowG.closePath();
      arrowG.fillPath();
      arrowG.fillStyle(0xffffff, 0.3);
      arrowG.fillTriangle(0, -7, 4, 3, -4, 3);
      arrowG.setPosition(clampedX, clampedY);
      arrowG.setRotation(angle + Math.PI / 2);
      arrowG.setAlpha(0);

      const label = this.add.text(clampedX, clampedY + 16, nearest.areaData.name, {
        fontSize: '9px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#f39c12',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.TOAST - 1).setAlpha(0);

      this._idleArrow = { gfx: arrowG, label };

      this.tweens.add({
        targets: [arrowG, label],
        alpha: 1,
        duration: 400,
        ease: 'Power2',
      });

      this.tweens.add({
        targets: arrowG,
        scaleX: { from: 0.8, to: 1.1 },
        scaleY: { from: 0.8, to: 1.1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  _hideIdleArrow() {
    if (!this._idleArrow) return;
    const { gfx, label } = this._idleArrow;
    this.tweens.add({
      targets: [gfx, label],
      alpha: 0,
      duration: 200,
      onComplete: () => {
        gfx.destroy();
        label.destroy();
      },
    });
    this._idleArrow = null;
    this._idleArrowShown = false;
  }

  showPrompt(house) {
    const py = house.def.y + house.def.h / 2 + 22;
    const px = house.def.x;

    const pillW = 100, pillH = 24;
    this.promptBg.clear();
    this.promptBg.fillStyle(0x000000, 0.7);
    this.promptBg.fillRoundedRect(px - pillW / 2, py - pillH / 2, pillW, pillH, pillH / 2);
    this.promptBg.lineStyle(1, 0x3498db, 0.5);
    this.promptBg.strokeRoundedRect(px - pillW / 2, py - pillH / 2, pillW, pillH, pillH / 2);
    this.promptBg.fillStyle(0x000000, 0.5);
    this.promptBg.fillTriangle(px - 5, py - pillH / 2, px + 5, py - pillH / 2, px, py - pillH / 2 - 5);
    this.promptBg.setVisible(true);
    this.promptBg.setAlpha(0);

    this.promptKey.setPosition(px - 30, py);
    this.promptKey.setVisible(true);
    this.promptKey.setAlpha(0);

    this.promptText.setText('Enter');
    this.promptText.setPosition(px + 4, py);
    this.promptText.setVisible(true);
    this.promptText.setAlpha(0);

    this.tweens.add({
      targets: [this.promptBg, this.promptKey, this.promptText],
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    // Door open animation
    if (house.doorSprite) {
      house.doorSprite.setVisible(true);
      house.doorSprite.setScale(1, 1);
      this.tweens.add({
        targets: house.doorSprite,
        scaleX: 0.3,
        duration: 300,
        ease: 'Power2',
      });
    }

    // Breathing pulse on highlight
    if (house.highlightG && !house._hlTween) {
      house._hlTween = this.tweens.add({
        targets: house.highlightG,
        alpha: { from: 0.5, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  hidePrompt() {
    this.tweens.add({
      targets: [this.promptBg, this.promptKey, this.promptText],
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.promptBg.setVisible(false);
        this.promptText.setVisible(false);
        this.promptKey.setVisible(false);
      },
    });

    // Close door on previous house
    if (this.currentNearHouse && this.currentNearHouse.doorSprite) {
      this.tweens.add({
        targets: this.currentNearHouse.doorSprite,
        scaleX: 1,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          if (this.currentNearHouse && this.currentNearHouse.doorSprite) {
            this.currentNearHouse.doorSprite.setVisible(false);
          }
        },
      });
    }

    // Stop highlight pulse
    if (this.currentNearHouse && this.currentNearHouse._hlTween) {
      this.currentNearHouse._hlTween.stop();
      this.currentNearHouse._hlTween = null;
      if (this.currentNearHouse.highlightG) {
        this.currentNearHouse.highlightG.setAlpha(1);
      }
    }
  }

  positionPrompt(house) {
    const py = house.def.y + house.def.h / 2 + 22;
    const px = house.def.x;
    const pillW = 100, pillH = 24;
    this.promptBg.clear();
    this.promptBg.fillStyle(0x000000, 0.7);
    this.promptBg.fillRoundedRect(px - pillW / 2, py - pillH / 2, pillW, pillH, pillH / 2);
    this.promptBg.lineStyle(1, 0x3498db, 0.5);
    this.promptBg.strokeRoundedRect(px - pillW / 2, py - pillH / 2, pillW, pillH, pillH / 2);
    this.promptBg.fillStyle(0x000000, 0.5);
    this.promptBg.fillTriangle(px - 5, py - pillH / 2, px + 5, py - pillH / 2, px, py - pillH / 2 - 5);
    this.promptKey.setPosition(px - 30, py);
    this.promptText.setPosition(px + 4, py);
  }
}
