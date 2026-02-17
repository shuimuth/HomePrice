/**
 * EndScene - Game completion / thank you screen
 */
class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x0f3460);
    bg.fillRect(0, 0, width, height);

    // Confetti effect
    for (let i = 0; i < 40; i++) {
      const colors = [0x3498db, 0x2ecc71, 0xf39c12, 0xe74c3c, 0x9b59b6];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const x = Math.random() * width;
      const confetti = this.add.rectangle(x, -10, 6, 10, color, 0.7);
      this.tweens.add({
        targets: confetti,
        y: height + 20,
        x: x + (Math.random() - 0.5) * 100,
        angle: Math.random() * 360,
        duration: 2000 + Math.random() * 3000,
        delay: Math.random() * 2000,
        repeat: -1,
      });
    }

    // Thank you message
    this.add.text(width / 2, height * 0.25, '🎉', {
      fontSize: '64px',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, 'Thank You!', {
      fontSize: '36px',
      fontFamily: 'Georgia, serif',
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.48, 'You have completed the simulation.', {
      fontSize: '16px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#bdc3c7',
    }).setOrigin(0.5);

    // Final stats
    const statsText = [
      `Final Balance: $${GameState.balance.toLocaleString()}`,
      `Months Completed: ${GameState.config.totalGameMonths}`,
      `Condition: ${GameState.condition}`,
    ];

    this.add.text(width / 2, height * 0.62, statsText.join('\n'), {
      fontSize: '14px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#95a5a6',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.78, 'Your data has been saved. You may now close this window.', {
      fontSize: '13px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#7f8c8d',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.86, 'Thank you for participating in this research study.', {
      fontSize: '13px',
      fontFamily: 'Segoe UI, sans-serif',
      color: '#7f8c8d',
    }).setOrigin(0.5);
  }
}
