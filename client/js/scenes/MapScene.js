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

    // House positions needed by vegetation to avoid overlap
    this.housePositions = [
      { x: 600, y: 180 }, { x: 600, y: 520 }, { x: 1050, y: 180 }, { x: 200, y: 520 },
      { x: 200, y: 180 }, { x: 600, y: 820 }, { x: 1100, y: 820 }, { x: 200, y: 820 },
    ];

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
    }).setOrigin(0.5).setDepth(40000).setVisible(false);

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

  // ===== Road layout constants =====
  getRoadLayout() {
    return {
      hRoads: [300, 600, 900],
      vRoads: [400, 800, 1200],
      roadW: 48,
      sidewalkW: 10,
    };
  }

  // ===== Ground =====
  drawGround(w, h) {
    const g = this.add.graphics().setDepth(0);
    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    const totalRoadW = roadW + sidewalkW * 2;

    // Base: dark urban grey
    g.fillStyle(0x3a3d42, 1);
    g.fillRect(0, 0, w, h);

    // Block fills — each city block gets its own ground tone
    const blockTones = {
      'downtown':  { base: 0x4a4d52, accent: 0x555860 },
      'midtown':   { base: 0x484b50, accent: 0x52555a },
      'eastside':  { base: 0x4e504a, accent: 0x585a54 },
      'westpark':  { base: 0x3a5a3a, accent: 0x446844 },
      'northgate': { base: 0x4d4840, accent: 0x575248 },
      'southview': { base: 0x454a45, accent: 0x4f544f },
      'lakefront': { base: 0x3e4a52, accent: 0x48545c },
      'oldquarter':{ base: 0x4a4440, accent: 0x544e48 },
    };

    // Fill each block between roads with zone-appropriate tones
    const xEdges = [0, ...vRoads.map(v => v - totalRoadW / 2), ...vRoads.map(v => v + totalRoadW / 2), w].sort((a, b) => a - b);
    const yEdges = [0, ...hRoads.map(h2 => h2 - totalRoadW / 2), ...hRoads.map(h2 => h2 + totalRoadW / 2), h].sort((a, b) => a - b);

    for (let yi = 0; yi < yEdges.length - 1; yi++) {
      for (let xi = 0; xi < xEdges.length - 1; xi++) {
        const bx = xEdges[xi], by = yEdges[yi];
        const bw = xEdges[xi + 1] - bx, bh = yEdges[yi + 1] - by;
        if (bw < 20 || bh < 20) continue;

        // Determine block tone based on which house is nearby
        let tone = { base: 0x454850, accent: 0x4f525a };
        const cx = bx + bw / 2, cy = by + bh / 2;
        if (cx < 400 && cy < 300) tone = blockTones.northgate;
        else if (cx > 400 && cx < 800 && cy < 300) tone = blockTones.downtown;
        else if (cx > 800 && cy < 300) tone = blockTones.eastside;
        else if (cx < 400 && cy > 300 && cy < 600) tone = blockTones.westpark;
        else if (cx > 400 && cx < 800 && cy > 300 && cy < 600) tone = blockTones.midtown;
        else if (cx < 400 && cy > 600) tone = blockTones.oldquarter;
        else if (cx > 400 && cx < 800 && cy > 600) tone = blockTones.southview;
        else if (cx > 800 && cy > 600) tone = blockTones.lakefront;

        g.fillStyle(tone.base, 1);
        g.fillRect(bx, by, bw, bh);

        // Paving tile texture
        g.lineStyle(1, tone.accent, 0.15);
        for (let tx = bx; tx < bx + bw; tx += 16) {
          g.lineBetween(tx, by, tx, by + bh);
        }
        for (let ty = by; ty < by + bh; ty += 16) {
          g.lineBetween(bx, ty, bx + bw, ty);
        }
      }
    }

    // Westpark green area
    g.fillStyle(0x3d7a34, 1);
    g.fillRect(2, hRoads[0] + totalRoadW / 2 + 2, vRoads[0] - totalRoadW / 2 - 4, hRoads[1] - hRoads[0] - totalRoadW - 4);
    const parkG = this.add.graphics().setDepth(0);
    parkG.fillStyle(0x4a8f3f, 0.5);
    for (let i = 0; i < 80; i++) {
      const px = 4 + Math.random() * (vRoads[0] - totalRoadW / 2 - 8);
      const py = hRoads[0] + totalRoadW / 2 + 4 + Math.random() * (hRoads[1] - hRoads[0] - totalRoadW - 8);
      parkG.fillRect(px, py, 3 + Math.random() * 5, 2 + Math.random() * 4);
    }

    // Green strips along roads (between sidewalk and blocks)
    const stripG = this.add.graphics().setDepth(0);
    const stripW = 8;
    stripG.fillStyle(0x3d7a34, 0.7);
    hRoads.forEach(ry => {
      stripG.fillRect(0, ry - totalRoadW / 2 - stripW, w, stripW);
      stripG.fillRect(0, ry + totalRoadW / 2, w, stripW);
    });
    vRoads.forEach(rx => {
      stripG.fillRect(rx - totalRoadW / 2 - stripW, 0, stripW, h);
      stripG.fillRect(rx + totalRoadW / 2, 0, stripW, h);
    });
  }

  // ===== Roads =====
  drawRoads(w, h) {
    const g = this.add.graphics().setDepth(1);
    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    const totalRoadW = roadW + sidewalkW * 2;

    // --- Draw horizontal roads ---
    hRoads.forEach(y => {
      // Sidewalks
      g.fillStyle(0x9e9e9e, 1);
      g.fillRect(0, y - totalRoadW / 2, w, totalRoadW);

      // Sidewalk tile pattern
      g.lineStyle(1, 0x8a8a8a, 0.2);
      for (let tx = 0; tx < w; tx += 12) {
        g.lineBetween(tx, y - totalRoadW / 2, tx, y - totalRoadW / 2 + sidewalkW);
        g.lineBetween(tx, y + totalRoadW / 2 - sidewalkW, tx, y + totalRoadW / 2);
      }

      // Curb lines
      g.lineStyle(1, 0xb0b0b0, 0.6);
      g.lineBetween(0, y - roadW / 2, w, y - roadW / 2);
      g.lineBetween(0, y + roadW / 2, w, y + roadW / 2);
      g.lineStyle(1, 0x606060, 0.4);
      g.lineBetween(0, y - roadW / 2 + 1, w, y - roadW / 2 + 1);
      g.lineBetween(0, y + roadW / 2 - 1, w, y + roadW / 2 - 1);

      // Asphalt
      g.fillStyle(0x505458, 1);
      g.fillRect(0, y - roadW / 2, w, roadW);

      // Road surface noise
      for (let i = 0; i < 60; i++) {
        g.fillStyle(0x484c50, 0.3);
        g.fillRect(Math.random() * w, y - roadW / 2 + Math.random() * roadW, 2 + Math.random() * 4, 1);
      }

      // Center dashed yellow line
      for (let x = 0; x < w; x += 40) {
        g.fillStyle(0xf1c40f, 0.7);
        g.fillRect(x, y - 1, 20, 2);
      }

      // Edge white lines
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(0, y - roadW / 2 + 2, w, 1);
      g.fillRect(0, y + roadW / 2 - 3, w, 1);
    });

    // --- Draw vertical roads ---
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

    // --- Intersections ---
    hRoads.forEach(hy => {
      vRoads.forEach(vx => {
        g.fillStyle(0x505458, 1);
        g.fillRect(vx - totalRoadW / 2, hy - totalRoadW / 2, totalRoadW, totalRoadW);
        g.fillStyle(0x4a4e52, 1);
        g.fillRect(vx - roadW / 2, hy - roadW / 2, roadW, roadW);

        // Crosswalks — white stripes
        const stripeW = 4, stripeGap = 6, stripeLen = roadW - 6;
        // Top crosswalk
        for (let s = vx - roadW / 2 + 4; s < vx + roadW / 2 - 4; s += stripeW + stripeGap) {
          g.fillStyle(0xffffff, 0.65);
          g.fillRect(s, hy - totalRoadW / 2 + 1, stripeW, sidewalkW - 2);
          g.fillRect(s, hy + roadW / 2 + 1, stripeW, sidewalkW - 2);
        }
        // Left crosswalk
        for (let s = hy - roadW / 2 + 4; s < hy + roadW / 2 - 4; s += stripeW + stripeGap) {
          g.fillStyle(0xffffff, 0.65);
          g.fillRect(vx - totalRoadW / 2 + 1, s, sidewalkW - 2, stripeW);
          g.fillRect(vx + roadW / 2 + 1, s, sidewalkW - 2, stripeW);
        }

        // Stop lines
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

  // ===== Vegetation =====
  drawVegetation(w, h) {
    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    const totalRoadW = roadW + sidewalkW * 2;
    const treeSpacing = 80;

    // --- Street trees along horizontal roads ---
    hRoads.forEach(ry => {
      for (let tx = 40; tx < w; tx += treeSpacing) {
        let skip = false;
        vRoads.forEach(vx => { if (Math.abs(tx - vx) < totalRoadW) skip = true; });
        if (skip) continue;
        const ty1 = ry - totalRoadW / 2 - 14;
        const ty2 = ry + totalRoadW / 2 + 14;
        if (!this.isNearHouse(tx, ty1, 60)) this.drawCityTree(tx, ty1);
        if (!this.isNearHouse(tx + treeSpacing / 2, ty2, 60)) this.drawCityTree(tx + treeSpacing / 2, ty2);
      }
    });

    // --- Street trees along vertical roads ---
    vRoads.forEach(rx => {
      for (let ty = 40; ty < h; ty += treeSpacing) {
        let skip = false;
        hRoads.forEach(hy => { if (Math.abs(ty - hy) < totalRoadW) skip = true; });
        if (skip) continue;
        const tx1 = rx - totalRoadW / 2 - 14;
        const tx2 = rx + totalRoadW / 2 + 14;
        if (!this.isNearHouse(tx1, ty, 60)) this.drawCityTree(tx1, ty);
        if (!this.isNearHouse(tx2, ty + treeSpacing / 2, 60)) this.drawCityTree(tx2, ty + treeSpacing / 2);
      }
    });

    // --- Bushes along green strips ---
    hRoads.forEach(ry => {
      for (let bx = 20; bx < w; bx += 50 + Math.random() * 30) {
        let skip = false;
        vRoads.forEach(vx => { if (Math.abs(bx - vx) < totalRoadW) skip = true; });
        if (skip) continue;
        const by1 = ry - totalRoadW / 2 - 4;
        const by2 = ry + totalRoadW / 2 + 4;
        if (!this.isNearHouse(bx, by1, 50)) this.drawBush(bx, by1);
        if (!this.isNearHouse(bx + 25, by2, 50)) this.drawBush(bx + 25, by2);
      }
    });

    // --- Westpark extra greenery (avoid house at ~200, 520) ---
    const wpHouseX = 200, wpHouseY = 520, wpClear = 70;
    for (let i = 0; i < 8; i++) {
      let tx, ty, attempts = 0;
      do {
        tx = 30 + Math.random() * (vRoads[0] - totalRoadW / 2 - 60);
        ty = hRoads[0] + totalRoadW / 2 + 30 + Math.random() * (hRoads[1] - hRoads[0] - totalRoadW - 60);
        attempts++;
      } while (Math.abs(tx - wpHouseX) < wpClear && Math.abs(ty - wpHouseY) < wpClear && attempts < 20);
      this.drawParkTree(tx, ty);
    }

    // --- Flower beds at some block corners ---
    const flowerSpots = [
      { x: 100, y: hRoads[0] + totalRoadW / 2 + 20 },
      { x: vRoads[0] - totalRoadW / 2 - 20, y: hRoads[0] + totalRoadW / 2 + 20 },
      { x: vRoads[1] + totalRoadW / 2 + 20, y: hRoads[0] + totalRoadW / 2 + 20 },
      { x: vRoads[1] + totalRoadW / 2 + 20, y: hRoads[1] + totalRoadW / 2 + 20 },
      { x: 100, y: hRoads[1] + totalRoadW / 2 + 20 },
    ];
    flowerSpots.forEach(s => this.drawFlowerBed(s.x, s.y));

    // --- Lakefront willows — hand-placed around south/sides of lake, avoiding benches ---
    const lakeX = 1400, lakeY = 1065;
    const willowSpots = [
      { x: lakeX - 100, y: lakeY + 10 },
      { x: lakeX + 100, y: lakeY + 10 },
      { x: lakeX - 40,  y: lakeY + 76 },
      { x: lakeX + 40,  y: lakeY + 76 },
    ];
    willowSpots.forEach(s => {
      if (s.y > hRoads[2] + totalRoadW / 2 + 20) {
        this.drawWillowTree(s.x, s.y);
      }
    });
  }

  isNearHouse(x, y, margin) {
    return this.housePositions.some(h => Math.abs(x - h.x) < margin && Math.abs(y - h.y) < margin);
  }

  drawCityTree(x, y) {
    const d = Math.floor(y) + 5;
    const g = this.add.graphics().setDepth(d);
    // Shadow
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(x + 3, y + 8, 18, 8);
    // Trunk
    g.fillStyle(0x6B4E3D, 1);
    g.fillRect(x - 2, y - 2, 4, 10);
    // Canopy layers
    g.fillStyle(0x2E7D32, 0.9);
    g.fillCircle(x, y - 8, 11);
    g.fillStyle(0x388E3C, 0.7);
    g.fillCircle(x - 3, y - 6, 8);
    g.fillStyle(0x4CAF50, 0.4);
    g.fillCircle(x + 2, y - 10, 5);
  }

  drawParkTree(x, y) {
    const d = Math.floor(y) + 5;
    const g = this.add.graphics().setDepth(d);
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(x + 4, y + 12, 26, 10);
    g.fillStyle(0x5D4037, 1);
    g.fillRect(x - 3, y - 2, 6, 14);
    g.fillStyle(0x1B5E20, 0.9);
    g.fillCircle(x, y - 10, 16);
    g.fillStyle(0x2E7D32, 0.7);
    g.fillCircle(x - 5, y - 6, 12);
    g.fillCircle(x + 6, y - 12, 10);
    g.fillStyle(0x4CAF50, 0.3);
    g.fillCircle(x + 2, y - 14, 6);
  }

  drawWillowTree(x, y) {
    const d = Math.floor(y) + 5;
    const g = this.add.graphics().setDepth(d);
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(x + 3, y + 10, 30, 10);
    g.fillStyle(0x5D4037, 1);
    g.fillRect(x - 3, y - 4, 6, 14);
    g.fillStyle(0x558B2F, 0.85);
    g.fillEllipse(x, y - 6, 32, 22);
    g.fillStyle(0x689F38, 0.5);
    g.fillEllipse(x - 4, y - 2, 28, 18);
    // Drooping branches
    g.lineStyle(1, 0x33691E, 0.4);
    for (let a = -3; a <= 3; a++) {
      g.lineBetween(x + a * 4, y - 4, x + a * 6, y + 10);
    }
  }

  drawBush(x, y) {
    const d = Math.floor(y) + 3;
    const g = this.add.graphics().setDepth(d);
    g.fillStyle(0x2E7D32, 0.7);
    g.fillEllipse(x, y, 14, 8);
    g.fillStyle(0x388E3C, 0.5);
    g.fillEllipse(x + 3, y - 1, 10, 6);
  }

  drawFlowerBed(x, y) {
    const d = Math.floor(y) + 3;
    const g = this.add.graphics().setDepth(d);
    g.fillStyle(0x5D4037, 0.6);
    g.fillRect(x - 14, y - 8, 28, 16);
    g.fillStyle(0x33691E, 0.8);
    g.fillRect(x - 12, y - 6, 24, 12);
    const colors = [0xff69b4, 0xff6347, 0xffa500, 0xffff00, 0xee82ee, 0xff4081];
    for (let i = 0; i < 8; i++) {
      g.fillStyle(colors[Math.floor(Math.random() * colors.length)], 0.8);
      g.fillCircle(x - 10 + Math.random() * 20, y - 4 + Math.random() * 8, 2);
    }
  }

  // ===== Lake =====
  drawLake() {
    // Safe zone: x 1234..1600, y 934..1200 → center (1400, 1065)
    const lakeX = 1400, lakeY = 1065;
    const g = this.add.graphics().setDepth(3);

    // Walkway ring
    g.fillStyle(0x9e9e9e, 0.7);
    g.fillEllipse(lakeX, lakeY, 190, 150);

    // Grassy shore
    g.fillStyle(0x388E3C, 0.6);
    g.fillEllipse(lakeX, lakeY, 176, 138);

    // Stone embankment
    g.lineStyle(3, 0x757575, 0.6);
    g.strokeEllipse(lakeX, lakeY, 160, 122);

    // Water layers
    g.fillStyle(0x1565C0, 0.8);
    g.fillEllipse(lakeX, lakeY, 150, 114);
    g.fillStyle(0x1976D2, 0.7);
    g.fillEllipse(lakeX, lakeY, 128, 96);
    g.fillStyle(0x2196F3, 0.4);
    g.fillEllipse(lakeX - 10, lakeY - 5, 90, 64);

    // Wave lines
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

    // Sparkle animation
    for (let i = 0; i < 8; i++) {
      const sx = lakeX - 50 + Math.random() * 100;
      const sy = lakeY - 35 + Math.random() * 70;
      const sparkle = this.add.circle(sx, sy, 1.5, 0xffffff, 0.4).setDepth(4);
      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0.15, to: 0.7 },
        duration: 1200 + Math.random() * 1800,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
      });
    }

    // Small dock (east side, horizontal plank extending from shore)
    const dockD = Math.floor(lakeY) + 5;
    const dockG = this.add.graphics().setDepth(dockD);
    const dockX = lakeX + 82, dockY = lakeY - 4;
    // Planks
    dockG.fillStyle(0x5D4037, 1);
    dockG.fillRect(dockX, dockY, 24, 12);
    // Plank lines
    dockG.fillStyle(0x795548, 0.6);
    dockG.fillRect(dockX, dockY + 3, 24, 1);
    dockG.fillRect(dockX, dockY + 7, 24, 1);
    // Side rails
    dockG.fillStyle(0x4E342E, 1);
    dockG.fillRect(dockX + 22, dockY - 1, 3, 14);

    // Benches on the walkway — manually placed on the grey path, not overlapping trees
    this.drawBench(lakeX - 50, lakeY - 78);
    this.drawBench(lakeX + 50, lakeY - 78);
    this.drawBench(lakeX - 80, lakeY + 50);
    this.drawBench(lakeX + 80, lakeY + 50);
  }

  // ===== Street Furniture =====
  drawStreetFurniture(w, h) {
    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    const totalRoadW = roadW + sidewalkW * 2;

    // --- Street lights along roads ---
    hRoads.forEach(ry => {
      for (let lx = 60; lx < w; lx += 120) {
        let skip = false;
        vRoads.forEach(vx => { if (Math.abs(lx - vx) < totalRoadW) skip = true; });
        if (skip) continue;
        this.drawStreetLight(lx, ry - totalRoadW / 2 - 2);
        this.drawStreetLight(lx + 60, ry + totalRoadW / 2 + 2);
      }
    });
    vRoads.forEach(rx => {
      for (let ly = 60; ly < h; ly += 120) {
        let skip = false;
        hRoads.forEach(hy => { if (Math.abs(ly - hy) < totalRoadW) skip = true; });
        if (skip) continue;
        this.drawStreetLight(rx - totalRoadW / 2 - 2, ly);
      }
    });

    // --- Fire hydrants ---
    const hydrantSpots = [
      { x: vRoads[0] + totalRoadW / 2 + 6, y: hRoads[0] - totalRoadW / 2 - 6 },
      { x: vRoads[1] - totalRoadW / 2 - 6, y: hRoads[1] + totalRoadW / 2 + 6 },
      { x: vRoads[2] + totalRoadW / 2 + 6, y: hRoads[2] - totalRoadW / 2 - 6 },
    ];
    hydrantSpots.forEach(s => {
      const d = Math.floor(s.y) + 6;
      const hg = this.add.graphics().setDepth(d);
      hg.fillStyle(0xc62828, 1);
      hg.fillRect(s.x - 3, s.y - 6, 6, 10);
      hg.fillStyle(0xd32f2f, 1);
      hg.fillRect(s.x - 4, s.y - 7, 8, 3);
      hg.fillStyle(0xb71c1c, 1);
      hg.fillCircle(s.x, s.y - 8, 3);
    });

    // --- Mailboxes ---
    const mailSpots = [
      { x: vRoads[0] - totalRoadW / 2 - 6, y: hRoads[0] + totalRoadW / 2 + 8 },
      { x: vRoads[2] - totalRoadW / 2 - 6, y: hRoads[1] + totalRoadW / 2 + 8 },
    ];
    mailSpots.forEach(s => {
      const d = Math.floor(s.y) + 6;
      const mg = this.add.graphics().setDepth(d);
      mg.fillStyle(0x1565C0, 1);
      mg.fillRect(s.x - 4, s.y - 8, 8, 10);
      mg.fillStyle(0x1976D2, 1);
      mg.fillRect(s.x - 5, s.y - 9, 10, 3);
      mg.fillStyle(0x0D47A1, 1);
      mg.fillRect(s.x - 2, s.y + 2, 4, 4);
    });

    // --- Trash cans along sidewalks ---
    for (let i = 0; i < 10; i++) {
      const road = hRoads[Math.floor(Math.random() * hRoads.length)];
      const tx = 80 + Math.random() * (w - 160);
      let skip = false;
      vRoads.forEach(vx => { if (Math.abs(tx - vx) < totalRoadW) skip = true; });
      if (skip) continue;
      const side = Math.random() > 0.5 ? -1 : 1;
      const ty = road + side * (totalRoadW / 2 + 3);
      const d = Math.floor(ty) + 6;
      const tg = this.add.graphics().setDepth(d);
      tg.fillStyle(0x2E7D32, 0.9);
      tg.fillRect(tx - 3, ty - 5, 6, 8);
      tg.fillStyle(0x1B5E20, 1);
      tg.fillRect(tx - 4, ty - 6, 8, 2);
    }

    // --- Center plaza fountain ---
    const cx = vRoads[1], cy = hRoads[1];
    const fg = this.add.graphics().setDepth(cy + 10);
    // Plaza
    fg.fillStyle(0x78909C, 0.8);
    fg.fillCircle(cx, cy, 40);
    fg.fillStyle(0x90A4AE, 0.6);
    fg.fillCircle(cx, cy, 36);
    // Basin
    fg.lineStyle(2, 0x607D8B, 0.8);
    fg.strokeCircle(cx, cy, 22);
    fg.fillStyle(0x1976D2, 0.6);
    fg.fillCircle(cx, cy, 20);
    fg.fillStyle(0x2196F3, 0.4);
    fg.fillCircle(cx, cy, 14);
    // Center column
    fg.fillStyle(0x78909C, 1);
    fg.fillCircle(cx, cy, 5);

    // Water spray particles
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const drop = this.add.circle(
        cx + Math.cos(angle) * 10,
        cy + Math.sin(angle) * 10,
        1.5, 0x64B5F6, 0.7
      ).setDepth(cy + 11);
      this.tweens.add({
        targets: drop,
        x: cx + Math.cos(angle) * 18,
        y: cy + Math.sin(angle) * 18 - 4,
        alpha: 0.2,
        duration: 800 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        delay: i * 140,
      });
    }
  }

  drawStreetLight(x, y) {
    const d = Math.floor(y) + 7;
    const g = this.add.graphics().setDepth(d);
    // Pole
    g.fillStyle(0x616161, 1);
    g.fillRect(x - 1, y - 16, 2, 16);
    // Lamp head
    g.fillStyle(0x9E9E9E, 1);
    g.fillRect(x - 3, y - 18, 6, 3);
    // Light glow
    const glow = this.add.circle(x, y - 16, 12, 0xFFF9C4, 0.08).setDepth(d - 1);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.05, to: 0.12 },
      duration: 2000 + Math.random() * 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  drawBench(x, y) {
    const d = Math.floor(y) + 5;
    const g = this.add.graphics().setDepth(d);
    // Seat
    g.fillStyle(0x795548, 1);
    g.fillRect(x - 8, y - 2, 16, 4);
    // Legs
    g.fillStyle(0x4E342E, 1);
    g.fillRect(x - 7, y + 2, 2, 3);
    g.fillRect(x + 5, y + 2, 2, 3);
    // Back rest
    g.fillStyle(0x6D4C41, 1);
    g.fillRect(x - 8, y - 4, 16, 2);
  }

  // ===== NPCs =====
  addNPCs(w, h) {
    const { hRoads, vRoads, roadW, sidewalkW } = this.getRoadLayout();
    const totalRoadW = roadW + sidewalkW * 2;
    const npcColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0x34495e];

    // Pedestrians on sidewalks
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

      const npcBody = this.add.circle(sx, sy, 4, color).setDepth(Math.floor(sy) + 50);
      const npcHead = this.add.circle(sx, sy - 5, 3, 0xFDEBD3).setDepth(Math.floor(sy) + 51);

      const dir = Math.random() > 0.5 ? 1 : -1;
      const speed = 15000 + Math.random() * 25000;
      const endVal = isHoriz ? (dir > 0 ? w + 20 : -20) : (dir > 0 ? h + 20 : -20);

      const targets = isHoriz ? { x: endVal } : { y: endVal };
      this.tweens.add({
        targets: [npcBody, npcHead],
        ...targets,
        duration: speed,
        repeat: -1,
        onRepeat: () => {
          const resetVal = dir > 0 ? -20 : (isHoriz ? w + 20 : h + 20);
          if (isHoriz) {
            npcBody.x = resetVal; npcHead.x = resetVal;
          } else {
            npcBody.y = resetVal; npcHead.y = resetVal - 5;
          }
        },
      });
    }

    // Cars on roads
    const carColors = [0xF44336, 0x2196F3, 0x4CAF50, 0xFFEB3B, 0x9C27B0, 0xFF9800];
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

      const car = this.add.graphics().setDepth(Math.floor(cy) + 50);
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
      const speed = 8000 + Math.random() * 12000;
      const endVal = isHoriz ? (dir > 0 ? w + 30 : -30) : (dir > 0 ? h + 30 : -30);

      this.tweens.add({
        targets: car,
        [isHoriz ? 'x' : 'y']: endVal,
        duration: speed,
        repeat: -1,
        onRepeat: () => {
          const resetVal = dir > 0 ? -30 : (isHoriz ? w + 30 : h + 30);
          if (isHoriz) car.x = resetVal;
          else car.y = resetVal;
        },
      });
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

    houseDefs.forEach((def, i) => {
      const areaData = this.areaPrices[i];
      const depth = Math.floor(def.y + def.h);
      const bx = def.x - def.w / 2;
      const by = def.y - def.h / 2;

      // --- Shadow ---
      const shadowG = this.add.graphics().setDepth(depth - 1);
      shadowG.fillStyle(0x000000, 0.18);
      shadowG.fillRect(bx + 5, by + 5, def.w, def.h);

      // --- Foundation ---
      const foundG = this.add.graphics().setDepth(depth - 1);
      foundG.fillStyle(0x9E9E9E, 0.6);
      foundG.fillRect(bx - 6, by + def.h - 4, def.w + 12, 8);

      // --- Fence / yard ---
      if (def.tier === 'high') {
        const fenceG = this.add.graphics().setDepth(depth - 1);
        fenceG.lineStyle(1, 0x37474F, 0.6);
        const fy = by + def.h + 6;
        fenceG.lineBetween(bx - 12, fy, bx + def.w + 12, fy);
        for (let fx = bx - 12; fx <= bx + def.w + 12; fx += 8) {
          fenceG.lineBetween(fx, fy, fx, fy - 8);
        }
        fenceG.lineBetween(bx - 12, fy - 8, bx + def.w + 12, fy - 8);
      } else if (def.tier === 'mid') {
        const fenceG = this.add.graphics().setDepth(depth - 1);
        fenceG.lineStyle(1, 0x8D6E63, 0.5);
        const fy = by + def.h + 4;
        fenceG.lineBetween(bx - 8, fy, bx + def.w + 8, fy);
        for (let fx = bx - 8; fx <= bx + def.w + 8; fx += 10) {
          fenceG.fillStyle(0x795548, 0.6);
          fenceG.fillRect(fx, fy - 6, 2, 6);
        }
      }

      // --- Building body ---
      const bodyG = this.add.graphics().setDepth(depth);
      bodyG.fillStyle(def.color, 1);
      bodyG.fillRect(bx, by, def.w, def.h);

      // Brick texture lines
      bodyG.lineStyle(1, 0x000000, 0.06);
      for (let ly = by + 6; ly < by + def.h; ly += 6) {
        bodyG.lineBetween(bx, ly, bx + def.w, ly);
      }

      // Floor dividers
      if (def.floors > 1) {
        bodyG.lineStyle(1, 0x000000, 0.15);
        for (let f = 1; f < def.floors; f++) {
          const fy = by + (def.h / def.floors) * f;
          bodyG.lineBetween(bx, fy, bx + def.w, fy);
          bodyG.fillStyle(0x000000, 0.08);
          bodyG.fillRect(bx, fy - 1, def.w, 2);
        }
      }

      // --- Windows ---
      const winG = this.add.graphics().setDepth(depth + 1);
      const winCols = Math.max(2, Math.floor(def.w / 24));
      const winRows = def.floors;
      const winW = def.tier === 'high' ? 10 : 8;
      const winH = def.tier === 'high' ? 12 : 10;
      const gapX = (def.w - 16) / winCols;
      const gapY = def.h / winRows;

      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const wx = bx + 10 + c * gapX;
          const wy = by + 6 + r * gapY;
          const lit = Math.random() > 0.35;

          // Window frame
          winG.fillStyle(0x263238, 0.8);
          winG.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);

          // Glass
          winG.fillStyle(lit ? 0xFFF9C4 : 0x1a1a2e, lit ? 0.6 : 0.5);
          winG.fillRect(wx, wy, winW, winH);

          // Mullion cross
          winG.fillStyle(0x263238, 0.4);
          winG.fillRect(wx + winW / 2 - 0.5, wy, 1, winH);
          winG.fillRect(wx, wy + winH / 2 - 0.5, winW, 1);

          if (def.tier === 'high') {
            // Highlight reflection
            winG.fillStyle(0xFFFFFF, 0.15);
            winG.fillRect(wx + 1, wy + 1, winW / 3, winH - 2);
          }

          // Sill
          winG.fillStyle(0x9E9E9E, 0.5);
          winG.fillRect(wx - 1, wy + winH, winW + 2, 2);

          // Lakefront balcony
          if (def.id === 'lakefront') {
            winG.fillStyle(0x90A4AE, 0.7);
            winG.fillRect(wx - 3, wy + winH + 2, winW + 6, 3);
            winG.lineStyle(1, 0x607D8B, 0.5);
            winG.lineBetween(wx - 3, wy + winH + 2, wx - 3, wy + winH + 5);
            winG.lineBetween(wx + winW + 3, wy + winH + 2, wx + winW + 3, wy + winH + 5);
            winG.lineBetween(wx - 3, wy + winH + 5, wx + winW + 3, wy + winH + 5);
          }
        }
      }

      // --- Roof ---
      const roofG = this.add.graphics().setDepth(depth + 2);
      const roofY = by;

      if (def.tier === 'high') {
        // Flat roof with rooftop items
        roofG.fillStyle(def.roofColor, 1);
        roofG.fillRect(bx - 4, roofY - 6, def.w + 8, 8);
        roofG.lineStyle(1, 0x263238, 0.3);
        roofG.strokeRect(bx - 4, roofY - 6, def.w + 8, 8);

        // AC units and water tank
        roofG.fillStyle(0x78909C, 0.8);
        roofG.fillRect(bx + 4, roofY - 12, 10, 6);
        roofG.fillRect(bx + 18, roofY - 10, 8, 4);
        roofG.fillStyle(0x546E7A, 0.6);
        roofG.fillRect(bx + def.w - 20, roofY - 14, 12, 8);

        // Awning over door
        roofG.fillStyle(0x455A64, 0.7);
        const awX = def.x - 14, awY = by + def.h - 22;
        roofG.beginPath();
        roofG.moveTo(awX - 4, awY);
        roofG.lineTo(awX + 14, awY - 8);
        roofG.lineTo(awX + 32, awY);
        roofG.closePath();
        roofG.fillPath();
      } else if (def.tier === 'mid') {
        // Triangle roof with shingle lines
        roofG.fillStyle(def.roofColor, 1);
        roofG.beginPath();
        roofG.moveTo(bx - 8, roofY);
        roofG.lineTo(def.x, roofY - 22);
        roofG.lineTo(bx + def.w + 8, roofY);
        roofG.closePath();
        roofG.fillPath();
        roofG.lineStyle(1, 0x000000, 0.15);
        for (let sy = roofY - 18; sy < roofY; sy += 4) {
          const progress = (sy - (roofY - 22)) / 22;
          const lx = bx - 8 + (def.x - bx + 8) * (1 - progress);
          const rx = bx + def.w + 8 - (bx + def.w + 8 - def.x) * (1 - progress);
          roofG.lineBetween(lx + 4, sy, rx - 4, sy);
        }
        roofG.lineStyle(2, 0x000000, 0.15);
        roofG.strokePath();

        // Chimney
        if (def.id === 'westpark' || def.id === 'midtown') {
          roofG.fillStyle(0x5D4037, 0.8);
          roofG.fillRect(def.x + def.w / 4, roofY - 28, 8, 12);
        }
      } else {
        // Simple low roof
        roofG.fillStyle(def.roofColor, 1);
        roofG.beginPath();
        roofG.moveTo(bx - 5, roofY);
        roofG.lineTo(def.x, roofY - 14);
        roofG.lineTo(bx + def.w + 5, roofY);
        roofG.closePath();
        roofG.fillPath();
        roofG.lineStyle(1, 0x000000, 0.2);
        roofG.strokePath();

        // Old quarter cracks
        if (def.id === 'oldquarter') {
          bodyG.lineStyle(1, 0x4E342E, 0.25);
          bodyG.lineBetween(bx + 8, by + 10, bx + 14, by + 25);
          bodyG.lineBetween(bx + def.w - 10, by + 15, bx + def.w - 16, by + 30);
          bodyG.lineBetween(bx + def.w - 10, by + 15, bx + def.w - 6, by + 22);
        }
      }

      // --- Door ---
      const doorW = def.tier === 'high' ? 16 : 12;
      const doorH = def.tier === 'high' ? 24 : 18;
      const doorX = def.x;
      const doorY = by + def.h;
      const doorG = this.add.graphics().setDepth(depth + 1);

      // Steps
      const steps = def.tier === 'high' ? 3 : def.tier === 'mid' ? 2 : 1;
      for (let s = 0; s < steps; s++) {
        doorG.fillStyle(0x9E9E9E, 0.7 - s * 0.1);
        doorG.fillRect(doorX - doorW / 2 - 2 - s * 2, doorY - 1 + s * 3, doorW + 4 + s * 4, 3);
      }

      // Door body
      doorG.fillStyle(0x4E342E, 1);
      doorG.fillRect(doorX - doorW / 2, doorY - doorH, doorW, doorH);
      // Door frame
      doorG.lineStyle(1, 0x3E2723, 0.6);
      doorG.strokeRect(doorX - doorW / 2, doorY - doorH, doorW, doorH);
      // Door handle
      doorG.fillStyle(0xFFD54F, 1);
      doorG.fillCircle(doorX + doorW / 3, doorY - doorH / 2, 2);
      // Door number
      this.add.text(doorX, doorY - doorH + 4, `${i + 1}`, {
        fontSize: '7px', color: '#BCAAA4', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(depth + 2);

      // --- Westpark front yard ---
      if (def.id === 'westpark') {
        const yardG = this.add.graphics().setDepth(depth - 2);
        yardG.fillStyle(0x4CAF50, 0.4);
        yardG.fillRect(bx - 10, doorY + 4, def.w + 20, 20);
        yardG.fillStyle(0x388E3C, 0.5);
        for (let p = 0; p < 5; p++) {
          yardG.fillCircle(bx - 5 + Math.random() * (def.w + 10), doorY + 8 + Math.random() * 12, 2 + Math.random() * 2);
        }
        // Small path to door
        yardG.fillStyle(0x9E9E9E, 0.4);
        yardG.fillRect(doorX - 4, doorY + 4, 8, 20);
      }

      // --- Eastside row style: side walls ---
      if (def.id === 'eastside') {
        const sideG = this.add.graphics().setDepth(depth);
        sideG.fillStyle(0x7B5B4D, 0.7);
        sideG.fillRect(bx + def.w, by + 4, 4, def.h - 4);
        sideG.fillStyle(0x9B7B6B, 0.7);
        sideG.fillRect(bx - 4, by + 4, 4, def.h - 4);
      }

      // --- Area label (high depth so trees never cover it) ---
      const labelDepth = 30000;
      const labelBg = this.add.graphics().setDepth(labelDepth);
      const labelY = by - (def.tier === 'high' ? 34 : def.tier === 'mid' ? 30 : 22);
      labelBg.fillStyle(0x000000, 0.5);
      labelBg.fillRoundedRect(def.x - 50, labelY - 8, 100, 18, 4);

      this.add.text(def.x, labelY, `${def.icon} ${areaData.name}`, {
        fontSize: '12px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(labelDepth + 1);

      // --- Price tag (high depth so trees never cover it) ---
      const priceBg = this.add.graphics().setDepth(labelDepth);
      priceBg.fillStyle(0x000000, 0.4);
      priceBg.fillRoundedRect(def.x - 40, doorY + steps * 3 + 8, 80, 16, 3);

      this.add.text(def.x, doorY + steps * 3 + 16, `$${areaData.price.toLocaleString()}`, {
        fontSize: '11px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#FFD54F',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(labelDepth + 1);

      // --- Trigger zone ---
      const triggerZone = this.add.zone(doorX, doorY + 20, 60, 40);
      this.physics.add.existing(triggerZone, true);

      // --- Visit marker ---
      const visitMark = this.add.text(bx + def.w + 8, by - 6, '✅', {
        fontSize: '16px',
      }).setOrigin(0.5).setDepth(labelDepth + 2).setVisible(false);

      houses.push({ def, areaData, triggerZone, visitMark });
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
