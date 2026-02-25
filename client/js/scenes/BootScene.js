/**
 * BootScene - Welcome/splash screen for Valrenta City
 * Shows game title, brief introduction, and a start button.
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background gradient effect using graphics
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x0f3460);
    bg.fillRect(0, 0, width, height);

    // City skyline silhouette (simple rectangles)
    this.drawSkyline(width, height);

    // Game title
    const titleText = this.add.text(width / 2, height * 0.22, 'VALRENTA CITY LIFE', {
      fontSize: '42px',
      fontFamily: 'Georgia, serif',
      color: '#3498db',
      fontStyle: 'bold',
      stroke: '#1a1a2e',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.32, 'A life simulation experience', {
      fontSize: '18px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#bdc3c7',
    }).setOrigin(0.5);

    // Description
    const desc = [
      '\u2014 customize your avatar and',
      'build a life in the city of Valrenta!',
    ];
    this.add.text(width / 2, height * 0.48, desc.join('\n'), {
      fontSize: '16px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#95a5a6',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Start button
    const btnBg = this.add.graphics();
    const btnX = width / 2 - 80;
    const btnY = height * 0.78;
    const btnW = 160;
    const btnH = 44;
    btnBg.fillStyle(0x3498db, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);

    const btnText = this.add.text(width / 2, btnY + btnH / 2, 'BEGIN', {
      fontSize: '18px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Make button interactive
    const btnZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });

    btnZone.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x2980b9, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
    });

    btnZone.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x3498db, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
    });

    btnZone.on('pointerdown', () => {
      this.scene.start('CharacterCreateScene');
    });

    // Animate title entrance
    titleText.setAlpha(0);
    this.tweens.add({
      targets: titleText,
      alpha: 1,
      y: titleText.y,
      duration: 1000,
      ease: 'Power2',
    });
  }

  drawSkyline(width, height) {
    const skyline = this.add.graphics();
    skyline.fillStyle(0x0a0a1a, 0.6);

    // Random buildings along bottom
    const buildings = [
      { x: 20, w: 40, h: 80 }, { x: 70, w: 30, h: 120 },
      { x: 110, w: 50, h: 60 }, { x: 170, w: 35, h: 140 },
      { x: 215, w: 45, h: 90 }, { x: 270, w: 30, h: 160 },
      { x: 310, w: 55, h: 70 }, { x: 375, w: 25, h: 130 },
      { x: 410, w: 50, h: 100 }, { x: 470, w: 35, h: 150 },
      { x: 515, w: 40, h: 85 }, { x: 565, w: 30, h: 170 },
      { x: 605, w: 55, h: 95 }, { x: 670, w: 35, h: 125 },
      { x: 715, w: 45, h: 75 }, { x: 770, w: 30, h: 110 },
    ];

    buildings.forEach(b => {
      skyline.fillRect(b.x, height - b.h, b.w, b.h);
    });

    // Small twinkling lights (windows)
    for (let i = 0; i < 60; i++) {
      const bIdx = Math.floor(Math.random() * buildings.length);
      const b = buildings[bIdx];
      const lx = b.x + 4 + Math.random() * (b.w - 8);
      const ly = height - b.h + 8 + Math.random() * (b.h - 16);
      const light = this.add.rectangle(lx, ly, 3, 3, 0xf1c40f, 0.3 + Math.random() * 0.5);

      // Twinkle animation
      this.tweens.add({
        targets: light,
        alpha: 0.1 + Math.random() * 0.3,
        duration: 1000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
      });
    }
  }
}
