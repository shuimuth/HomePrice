/**
 * MonthEndScene - Transitional scene (living expenses now handled in WorkScene)
 * Kept for backward compatibility; simply redirects to HousePriceScene.
 */
class MonthEndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MonthEndScene' });
  }

  create() {
    // Living expenses are now shown in WorkScene after salary report.
    // This scene is kept as a fallback redirect.
    this.scene.start('HousePriceScene');
  }
}
