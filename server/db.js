/**
 * Database Module - SQLite initialization and CRUD helpers
 * Uses better-sqlite3 for synchronous, high-performance SQLite access.
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'experiment.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// --- Create Tables ---
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    uid TEXT PRIMARY KEY,

    -- Experiment condition
    condition_group TEXT CHECK(condition_group IN ('LHP', 'HHP')),

    -- Character info
    gender TEXT,
    age TEXT,
    race TEXT,
    name TEXT,

    -- Job
    job_type TEXT,

    -- Monthly work performance (stored as JSON arrays)
    month1_clicks INTEGER DEFAULT 0,
    month1_units INTEGER DEFAULT 0,
    month1_time_spent REAL DEFAULT 0,
    month2_clicks INTEGER DEFAULT 0,
    month2_units INTEGER DEFAULT 0,
    month2_time_spent REAL DEFAULT 0,
    month3_clicks INTEGER DEFAULT 0,
    month3_units INTEGER DEFAULT 0,
    month3_time_spent REAL DEFAULT 0,

    -- Financial state
    initial_funds REAL DEFAULT 0,
    final_balance REAL DEFAULT 0,

    -- Lottery decision
    lottery_choice TEXT CHECK(lottery_choice IN ('A', 'B', 'none') OR lottery_choice IS NULL),

    -- Investment survey
    low_risk_percent REAL,
    high_risk_percent REAL,

    -- Timing
    game_start_time TEXT,
    game_end_time TEXT,
    game_total_duration REAL,
    month1_duration REAL,
    month2_duration REAL,
    month3_duration REAL,

    -- Completion status
    game_completed INTEGER DEFAULT 0,

    -- Progress tracking (for resume)
    current_phase TEXT DEFAULT 'init',
    current_month INTEGER DEFAULT 1,
    balance REAL DEFAULT 0,

    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// --- Prepared Statements ---

const stmts = {
  getPlayer: db.prepare('SELECT * FROM players WHERE uid = ?'),

  createPlayer: db.prepare(`
    INSERT INTO players (uid, condition_group, game_start_time, initial_funds, balance, current_phase)
    VALUES (@uid, @condition_group, @game_start_time, @initial_funds, @balance, 'init')
  `),

  getConditionCounts: db.prepare(`
    SELECT condition_group, COUNT(*) as count FROM players GROUP BY condition_group
  `),

  updateCharacter: db.prepare(`
    UPDATE players SET gender = @gender, age = @age, race = @race, name = @name, current_phase = 'character_done'
    WHERE uid = @uid
  `),

  updateJob: db.prepare(`
    UPDATE players SET job_type = @job_type, current_phase = 'job_done'
    WHERE uid = @uid
  `),

  updateWorkPerformanceMonth1: db.prepare(`
    UPDATE players SET
      month1_clicks = @clicks, month1_units = @units, month1_time_spent = @time_spent,
      balance = @balance, month1_duration = @month_duration
    WHERE uid = @uid
  `),

  updateWorkPerformanceMonth2: db.prepare(`
    UPDATE players SET
      month2_clicks = @clicks, month2_units = @units, month2_time_spent = @time_spent,
      balance = @balance, month2_duration = @month_duration
    WHERE uid = @uid
  `),

  updateWorkPerformanceMonth3: db.prepare(`
    UPDATE players SET
      month3_clicks = @clicks, month3_units = @units, month3_time_spent = @time_spent,
      balance = @balance, month3_duration = @month_duration
    WHERE uid = @uid
  `),

  updatePhaseAndMonth: db.prepare(`
    UPDATE players SET current_phase = @current_phase, current_month = @current_month
    WHERE uid = @uid
  `),

  updateBalance: db.prepare(`
    UPDATE players SET balance = @balance WHERE uid = @uid
  `),

  updateLottery: db.prepare(`
    UPDATE players SET lottery_choice = @lottery_choice, balance = @balance, current_phase = 'lottery_done'
    WHERE uid = @uid
  `),

  updateSurvey: db.prepare(`
    UPDATE players SET
      low_risk_percent = @low_risk_percent,
      high_risk_percent = @high_risk_percent,
      final_balance = @final_balance,
      game_end_time = @game_end_time,
      game_total_duration = @game_total_duration,
      game_completed = 1,
      current_phase = 'completed'
    WHERE uid = @uid
  `),

  getAllPlayers: db.prepare('SELECT * FROM players ORDER BY created_at'),

  getCompletedCount: db.prepare('SELECT COUNT(*) as count FROM players WHERE game_completed = 1'),

  getTotalCount: db.prepare('SELECT COUNT(*) as count FROM players'),
};

// --- Helper Functions ---

/**
 * Get player by UID
 */
function getPlayer(uid) {
  return stmts.getPlayer.get(uid);
}

/**
 * Create a new player session with balanced random assignment
 */
function createPlayer(uid, initialFunds) {
  // Balanced random assignment: check current counts
  const counts = stmts.getConditionCounts.all();
  let lhpCount = 0, hhpCount = 0;
  for (const row of counts) {
    if (row.condition_group === 'LHP') lhpCount = row.count;
    if (row.condition_group === 'HHP') hhpCount = row.count;
  }

  // Assign to the group with fewer participants; if equal, random
  let condition;
  if (lhpCount < hhpCount) {
    condition = 'LHP';
  } else if (hhpCount < lhpCount) {
    condition = 'HHP';
  } else {
    condition = Math.random() < 0.5 ? 'LHP' : 'HHP';
  }

  stmts.createPlayer.run({
    uid,
    condition_group: condition,
    game_start_time: new Date().toISOString(),
    initial_funds: initialFunds,
    balance: initialFunds,
  });

  return getPlayer(uid);
}

/**
 * Update character info
 */
function updateCharacter(uid, { gender, age, race, name }) {
  return stmts.updateCharacter.run({ uid, gender, age, race, name });
}

/**
 * Update job selection
 */
function updateJob(uid, jobType) {
  return stmts.updateJob.run({ uid, job_type: jobType });
}

/**
 * Update work performance for a specific month
 */
function updateWorkPerformance(uid, month, { clicks, units, timeSpent, balance, monthDuration }) {
  const params = {
    uid,
    clicks,
    units,
    time_spent: timeSpent,
    balance,
    month_duration: monthDuration,
  };

  if (month === 1) stmts.updateWorkPerformanceMonth1.run(params);
  else if (month === 2) stmts.updateWorkPerformanceMonth2.run(params);
  else if (month === 3) stmts.updateWorkPerformanceMonth3.run(params);
}

/**
 * Update current phase and month for progress tracking
 */
function updatePhaseAndMonth(uid, phase, month) {
  return stmts.updatePhaseAndMonth.run({ uid, current_phase: phase, current_month: month });
}

/**
 * Update player balance
 */
function updateBalance(uid, balance) {
  return stmts.updateBalance.run({ uid, balance });
}

/**
 * Save lottery choice
 */
function updateLottery(uid, choice, balance) {
  return stmts.updateLottery.run({ uid, lottery_choice: choice, balance });
}

/**
 * Save survey results and mark game as completed
 */
function updateSurvey(uid, { lowRiskPercent, highRiskPercent, finalBalance }) {
  const gameEndTime = new Date().toISOString();
  const player = getPlayer(uid);
  let totalDuration = null;
  if (player && player.game_start_time) {
    totalDuration = (new Date(gameEndTime) - new Date(player.game_start_time)) / 1000; // seconds
  }

  return stmts.updateSurvey.run({
    uid,
    low_risk_percent: lowRiskPercent,
    high_risk_percent: highRiskPercent,
    final_balance: finalBalance,
    game_end_time: gameEndTime,
    game_total_duration: totalDuration,
  });
}

/**
 * Get all players for CSV export
 */
function getAllPlayers() {
  return stmts.getAllPlayers.all();
}

/**
 * Get experiment stats
 */
function getStats() {
  const completed = stmts.getCompletedCount.get().count;
  const total = stmts.getTotalCount.get().count;
  const conditions = stmts.getConditionCounts.all();
  return { completed, total, conditions };
}

module.exports = {
  db,
  getPlayer,
  createPlayer,
  updateCharacter,
  updateJob,
  updateWorkPerformance,
  updatePhaseAndMonth,
  updateBalance,
  updateLottery,
  updateSurvey,
  getAllPlayers,
  getStats,
};
