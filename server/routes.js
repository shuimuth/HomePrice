/**
 * RESTful API Routes for the Home Price Experiment
 */
const express = require('express');
const router = express.Router();
const { stringify } = require('csv-stringify/sync');
const config = require('./config');
const db = require('./db');

// --- POST /api/session --- Create or resume game session
router.post('/session', (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid || uid.trim() === '') {
      return res.status(400).json({ error: 'Missing uid parameter' });
    }

    // Check if player already exists (resume)
    let player = db.getPlayer(uid);
    if (player) {
      return res.json({
        isNew: false,
        condition: player.condition_group,
        config: getClientConfig(player.condition_group),
        balance: player.balance,
        currentPhase: player.current_phase,
        currentMonth: player.current_month,
        character: player.name ? {
          gender: player.gender,
          age: player.age,
          race: player.race,
          name: player.name,
        } : null,
        jobType: player.job_type,
      });
    }

    // Create new player
    player = db.createPlayer(uid, config.initialFunds);
    return res.json({
      isNew: true,
      condition: player.condition_group,
      config: getClientConfig(player.condition_group),
      balance: player.balance,
      currentPhase: player.current_phase,
      currentMonth: player.current_month,
      character: null,
      jobType: null,
    });
  } catch (error) {
    console.error('Error in POST /session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PUT /api/character --- Save character info
router.put('/character', (req, res) => {
  try {
    const { uid, gender, age, race, name } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });
    if (!gender || !age || !race || !name) {
      return res.status(400).json({ error: 'All character fields are required' });
    }

    db.updateCharacter(uid, { gender, age, race, name });
    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PUT /api/job --- Save job selection
router.put('/job', (req, res) => {
  try {
    const { uid, jobType } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });
    if (!['restaurant', 'computer', 'finance'].includes(jobType)) {
      return res.status(400).json({ error: 'Invalid job type' });
    }

    db.updateJob(uid, jobType);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PUT /api/work-performance --- Save monthly work performance
router.put('/work-performance', (req, res) => {
  try {
    const { uid, month, clicks, units, timeSpent, balance, monthDuration } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });
    if (month < 1 || month > 3) return res.status(400).json({ error: 'Invalid month' });

    db.updateWorkPerformance(uid, month, { clicks, units, timeSpent, balance, monthDuration });

    // Update phase tracking
    const nextMonth = month < 3 ? month + 1 : month;
    const phase = month >= 3 ? 'work_done' : 'working';
    db.updatePhaseAndMonth(uid, phase, nextMonth);

    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /work-performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PUT /api/lottery --- Save lottery decision
router.put('/lottery', (req, res) => {
  try {
    const { uid, choice } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });
    if (!['A', 'B', 'none'].includes(choice)) {
      return res.status(400).json({ error: 'Invalid lottery choice' });
    }

    // Calculate new balance after lottery purchase
    const player = db.getPlayer(uid);
    let newBalance = player.balance;
    if (choice !== 'none') {
      newBalance = player.balance - config.lotteryPrice;
    }

    db.updateLottery(uid, choice, newBalance);
    res.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('Error in PUT /lottery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PUT /api/survey --- Save investment survey and complete game
router.put('/survey', (req, res) => {
  try {
    const { uid, lowRiskPercent, highRiskPercent } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });
    if (lowRiskPercent == null || highRiskPercent == null) {
      return res.status(400).json({ error: 'Survey responses required' });
    }
    if (Math.abs(lowRiskPercent + highRiskPercent - 100) > 0.01) {
      return res.status(400).json({ error: 'Percentages must sum to 100' });
    }

    const player = db.getPlayer(uid);
    db.updateSurvey(uid, {
      lowRiskPercent,
      highRiskPercent,
      finalBalance: player.balance,
    });

    res.json({ success: true, gameCompleted: true });
  } catch (error) {
    console.error('Error in PUT /survey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /api/config --- Return game configuration
router.get('/config', (req, res) => {
  res.json(getClientConfig());
});

// --- GET /api/export --- Export CSV data (password protected)
router.get('/export', (req, res) => {
  try {
    const { password } = req.query;
    if (password !== config.exportPassword) {
      return res.status(403).json({ error: 'Invalid password' });
    }

    const players = db.getAllPlayers();

    // Define CSV columns
    const columns = [
      'uid', 'condition_group',
      'lottery_choice', 'low_risk_percent', 'high_risk_percent',
      'gender', 'age', 'race', 'name', 'job_type',
      'month1_clicks', 'month1_units', 'month1_time_spent',
      'month2_clicks', 'month2_units', 'month2_time_spent',
      'month3_clicks', 'month3_units', 'month3_time_spent',
      'initial_funds', 'final_balance',
      'game_start_time', 'game_end_time', 'game_total_duration',
      'month1_duration', 'month2_duration', 'month3_duration',
      'game_completed',
    ];

    const csvData = stringify(players, {
      header: true,
      columns,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=experiment_data.csv');
    res.send(csvData);
  } catch (error) {
    console.error('Error in GET /export:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /api/stats --- Experiment statistics overview
router.get('/stats', (req, res) => {
  try {
    const { password } = req.query;
    if (password !== config.exportPassword) {
      return res.status(403).json({ error: 'Invalid password' });
    }

    const stats = db.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error in GET /stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /api/health --- Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Build client-safe configuration object
 */
function getClientConfig(condition) {
  const salary = config.monthlyBaseSalary;
  const housePrice = condition === 'HHP'
    ? salary * config.highHousePriceMultiplier
    : salary * config.lowHousePriceMultiplier;

  return {
    monthlyBaseSalary: salary,
    livingExpenseRatio: config.livingExpenseRatio,
    livingExpenseBreakdown: config.livingExpenseBreakdown,
    initialFunds: config.initialFunds,
    averageHousePrice: housePrice || null,
    housePriceVariation: config.housePriceVariation,
    lotteryPrice: config.lotteryPrice,
    lotteryA: {
      winProbability: config.lotteryA.winProbability,
      prize: salary * config.lotteryA.prizeMultiplier,
    },
    lotteryB: {
      winProbability: config.lotteryB.winProbability,
      prize: salary * config.lotteryB.prizeMultiplier,
    },
    investmentAmount: config.investmentAmount,
    clicksPerTaskUnit: config.clicksPerTaskUnit,
    workTimeLimitSeconds: config.workTimeLimitSeconds,
    bonusThreshold: config.bonusThreshold,
    penaltyThreshold: config.penaltyThreshold,
    bonusPerUnit: config.bonusPerUnit,
    penaltyPerUnit: config.penaltyPerUnit,
    totalGameMonths: config.totalGameMonths,
  };
}

module.exports = router;