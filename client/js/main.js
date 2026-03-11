/**
 * Main Game Entry Point
 * Initializes Phaser 3 game instance and manages global game state.
 */

// --- Global Game State ---
const GameState = {
  uid: null,
  condition: null,       // 'LHP' or 'HHP'
  config: null,          // server config parameters
  character: null,       // { gender, age, race, name }
  jobType: null,         // 'restaurant' | 'computer' | 'finance'
  balance: 0,            // current asset balance
  currentMonth: 1,       // 1, 2, or 3
  monthlyPerformance: [],// [{clicks, unitsCompleted, timeSpent}]
  salaryHistory: [],     // actual salary earned each month
  monthStartTime: null,  // timestamp for current month start
  gameStartTime: null,   // timestamp for game start
  sessionData: null,     // session data from server (for resume)
};

// --- UID Extraction ---
function extractUID() {
  const params = new URLSearchParams(window.location.search);
  return params.get('uid') || params.get('UID') || null;
}

// --- Game Initialization ---
async function initGame() {
  const uid = extractUID();

  // Validate UID
  if (!uid || uid.trim() === '') {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('error-overlay').style.display = 'flex';
    return;
  }

  GameState.uid = uid;
  GameAPI.init(uid);

  try {
    // Create or resume session
    const session = await GameAPI.createSession();
    GameState.condition = session.condition;
    GameState.config = session.config;
    GameState.sessionData = session;

    // If resuming, restore relevant state
    if (session.balance !== undefined && session.balance !== null) {
      GameState.balance = session.balance;
    }

    // Initialize Phaser game
    const phaserConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game-container',
      backgroundColor: '#1a1a2e',
      scene: [
        BootScene,
        CharacterCreateScene,
        MapScene,
        HouseInteriorScene,
        JobSelectScene,
        CityScene,
        WorkScene,
        MonthEndScene,
        HousePriceScene,
        LotteryScene,
        SurveyScene,
        EndScene,
      ],
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(phaserConfig);

    // Store game reference globally
    window.game = game;

    // Handle resume: if returning player, switch to the appropriate scene
    const startScene = getResumeScene(session);
    if (startScene !== 'BootScene') {
      // If resuming, restore additional state before scene starts
      if (session.character) GameState.character = session.character;
      if (session.jobType) GameState.jobType = session.jobType;
      if (session.currentMonth) GameState.currentMonth = session.currentMonth;

      // Wait for boot scene to be created, then switch
      game.events.once(Phaser.Core.Events.READY, () => {
        game.scene.stop('BootScene');
        game.scene.start(startScene);
      });
    }

    // Hide loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 500);

  } catch (error) {
    console.error('Failed to initialize game:', error);
    const loadingBox = document.querySelector('.loading-box');
    if (loadingBox) {
      loadingBox.innerHTML = `
        <p style="color: #e74c3c;">❌ Failed to connect to server</p>
        <p style="color: #95a5a6; margin-top: 10px; font-size: 14px;">Please ensure the server is running and try again.</p>
        <button class="btn btn-primary" style="margin-top: 16px;" onclick="location.reload()">Retry</button>
      `;
    }
  }
}

/**
 * Determine which scene to resume from based on saved progress
 */
function getResumeScene(session) {
  if (!session || session.isNew) return 'BootScene';

  switch (session.currentPhase) {
    case 'init':
      return 'BootScene';
    case 'character_done':
      return 'MapScene';
    case 'job_done':
    case 'working':
      return 'CityScene';
    case 'work_done':
      return 'LotteryScene';
    case 'lottery_done':
      return 'SurveyScene';
    case 'completed':
      return 'EndScene';
    default:
      return 'BootScene';
  }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initGame);
