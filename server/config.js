/**
 * Centralized configuration for the Home Price Experiment game.
 * Researchers can adjust these values without modifying game logic.
 */
module.exports = {
  // --- Monthly Salary ---
  monthlyBaseSalary: 3000, // base salary per game month (game currency)

  // --- Living Expenses ---
  livingExpenseRatio: 0.27, // living costs as fraction of monthly income (25%-30%)
  livingExpenseBreakdown: {
    rent: 0.45,      // fraction of total living expenses
    food: 0.30,
    transport: 0.15,
    utilities: 0.10
  },

  // --- Initial Funds ---
  initialFunds: 1500, // starting money (0 to ~1 month salary)

  // --- House Price Multipliers ---
  lowHousePriceMultiplier: 6,   // LHP: average house price = salary * 6
  highHousePriceMultiplier: 60, // HHP: average house price = salary * 60

  // --- Lottery Parameters ---
  lotteryPrice: 20, // cost per lottery ticket (game currency $2-$5)
  lotteryA: {
    winProbability: 1 / 1000,       // 1 in 1000 chance
    prizeMultiplier: 600,           // prize = monthlyBaseSalary * 600 (50 years income)
  },
  lotteryB: {
    winProbability: 1 / 5,         // 1 in 5 chance
    prizeMultiplier: 3,            // prize = monthlyBaseSalary * 3 (3 months income)
  },

  // --- Investment Survey ---
  investmentAmount: 10000, // hypothetical investment amount ($XXX)

  // --- Work Task Parameters ---
  clicksPerTaskUnit: 3,           // mouse clicks required per task unit
  workTimeLimitSeconds: 5,        // time limit per work session (seconds)
  bonusThreshold: 10,              // task units above this earn bonus
  penaltyThreshold: 5,             // task units below this incur penalty
  bonusPerUnit: 5,                 // bonus per extra task unit above threshold
  penaltyPerUnit: 5,               // deduction per missing task unit below threshold
  bonusMaxTotal: 250,              // maximum total bonus cap
  penaltyMaxTotal: 250,            // maximum total penalty cap

  // --- Game Structure ---
  totalGameMonths: 3,              // number of game months

  // --- House Price Display ---
  housePriceVariation: 0.05,       // random variation per month (+/- 5%)

  // --- Server ---
  port: 3000,
  exportPassword: 'research2026',  // basic password for CSV export endpoint
};
