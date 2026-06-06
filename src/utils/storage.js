// Storage utility for offline-first data persistence

const STORAGE_KEYS = {
  WORKOUT_LOG: 'fitforge_workout_log',
  DIET_LOG: 'fitforge_diet_log',
  BODY_STATS: 'fitforge_body_stats',
  SETTINGS: 'fitforge_settings',
  STREAK: 'fitforge_streak',
  PR_RECORDS: 'fitforge_pr_records',
  DELOAD_TRACKER: 'fitforge_deload',
  WEEK_COUNTER: 'fitforge_week_counter',
};

function getItem(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

// Date helpers
export function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
}

export function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getWeekStart(date = new Date()) {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Workout Log
export function getWorkoutLogs() {
  return getItem(STORAGE_KEYS.WORKOUT_LOG) || [];
}

export function saveWorkoutLog(log) {
  const logs = getWorkoutLogs();
  log.id = Date.now();
  log.date = log.date || getToday();
  logs.push(log);
  setItem(STORAGE_KEYS.WORKOUT_LOG, logs);
  updateStreak(log.date);
  return log;
}

export function getWorkoutsByDate(date) {
  return getWorkoutLogs().filter(l => l.date === date);
}

export function getWorkoutsThisWeek() {
  const weekStart = getWeekStart();
  return getWorkoutLogs().filter(l => l.date >= weekStart);
}

// Diet Log
export function getDietLogs() {
  return getItem(STORAGE_KEYS.DIET_LOG) || [];
}

export function saveDietLog(entry) {
  const logs = getDietLogs();
  entry.date = entry.date || getToday();
  
  const existingIdx = logs.findIndex(l => 
    l.foodId === entry.foodId && 
    l.meal === entry.meal && 
    l.date === entry.date
  );
  
  if (existingIdx !== -1) {
    const existing = logs[existingIdx];
    existing.multiplier = Math.round((existing.multiplier + entry.multiplier) * 100) / 100;
    existing.calories = Math.round(existing.calories + entry.calories);
    existing.protein = Math.round((existing.protein + entry.protein) * 10) / 10;
    existing.carbs = Math.round((existing.carbs + entry.carbs) * 10) / 10;
    existing.fat = Math.round((existing.fat + entry.fat) * 10) / 10;
    existing.timestamp = new Date().toISOString();
    setItem(STORAGE_KEYS.DIET_LOG, logs);
    return existing;
  } else {
    entry.id = Date.now();
    entry.timestamp = new Date().toISOString();
    logs.push(entry);
    setItem(STORAGE_KEYS.DIET_LOG, logs);
    return entry;
  }
}

export function getDietByDate(date) {
  return getDietLogs().filter(l => l.date === date);
}

export function removeDietEntry(id) {
  const logs = getDietLogs().filter(l => l.id !== id);
  setItem(STORAGE_KEYS.DIET_LOG, logs);
}

export function getDailyTotals(date) {
  const meals = getDietByDate(date);
  return meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein: acc.protein + (m.protein || 0),
    carbs: acc.carbs + (m.carbs || 0),
    fat: acc.fat + (m.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

// Body Stats
export function getBodyStats() {
  return getItem(STORAGE_KEYS.BODY_STATS) || [];
}

export function saveBodyStat(stat) {
  const stats = getBodyStats();
  stat.id = Date.now();
  stat.date = stat.date || getToday();
  stats.push(stat);
  setItem(STORAGE_KEYS.BODY_STATS, stats);
  return stat;
}

// PR Records
export function getPRRecords() {
  return getItem(STORAGE_KEYS.PR_RECORDS) || {};
}

export function updatePR(exerciseId, weight, reps) {
  const prs = getPRRecords();
  const key = exerciseId;
  const estimated1RM = weight * (1 + reps / 30);
  if (!prs[key] || estimated1RM > prs[key].estimated1RM) {
    prs[key] = { weight, reps, estimated1RM, date: getToday() };
    setItem(STORAGE_KEYS.PR_RECORDS, prs);
    return true;
  }
  return false;
}

// Streak
export function getStreak() {
  return getItem(STORAGE_KEYS.STREAK) || { current: 0, best: 0, lastWorkoutDate: null, weeklyCount: 0 };
}

function updateStreak(date) {
  const streak = getStreak();
  const today = new Date(date);
  const lastDate = streak.lastWorkoutDate ? new Date(streak.lastWorkoutDate) : null;

  if (lastDate) {
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) {
      streak.current += 1;
    } else {
      streak.current = 1;
    }
  } else {
    streak.current = 1;
  }

  streak.best = Math.max(streak.best, streak.current);
  streak.lastWorkoutDate = date;
  
  const weekWorkouts = getWorkoutsThisWeek();
  streak.weeklyCount = weekWorkouts.length;
  
  setItem(STORAGE_KEYS.STREAK, streak);
}

// Deload tracker
export function getDeloadTracker() {
  return getItem(STORAGE_KEYS.DELOAD_TRACKER) || {
    startDate: getToday(),
    currentWeek: 1,
    isDeloadWeek: false,
    completedCycles: 0,
  };
}

export function updateDeloadTracker() {
  const tracker = getDeloadTracker();
  const start = parseLocalDate(tracker.startDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weeksDiff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  const cycleWeek = (weeksDiff % 7) + 1; // 6 training + 1 deload = 7 week cycle
  
  tracker.currentWeek = Math.min(cycleWeek, 7);
  tracker.isDeloadWeek = cycleWeek === 7;
  tracker.completedCycles = Math.floor(weeksDiff / 7);
  
  setItem(STORAGE_KEYS.DELOAD_TRACKER, tracker);
  return tracker;
}

// Settings
export function getSettings() {
  return getItem(STORAGE_KEYS.SETTINGS) || {
    name: '',
    heightCm: 178,
    weightKg: 72.7,
    calorieTarget: 2900,
    proteinTarget: 160,
    carbsTarget: 360,
    fatTarget: 80,
    trainingDays: 3,
    startDate: getToday(),
  };
}

export function saveSettings(settings) {
  setItem(STORAGE_KEYS.SETTINGS, settings);
  
  if (settings.weightKg) {
    try {
      const stats = getItem(STORAGE_KEYS.BODY_STATS) || [];
      const today = getToday();
      const existingIdx = stats.findIndex(s => s.date === today);
      const newWeight = parseFloat(settings.weightKg) || 0;
      
      if (newWeight > 0) {
        if (existingIdx !== -1) {
          stats[existingIdx].weight = newWeight;
        } else {
          stats.push({
            id: Date.now(),
            date: today,
            weight: newWeight,
            waist: 0,
            chest: 0,
            arm: 0
          });
        }
        setItem(STORAGE_KEYS.BODY_STATS, stats);
      }
    } catch (e) {
      console.error("Failed to auto-log weight history in saveSettings:", e);
    }
  }
}

// Calculate TDEE
export function calculateTDEE(weightKg, heightCm, age, activityMultiplier = 1.55) {
  // Mifflin-St Jeor
  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  return Math.round(bmr * activityMultiplier);
}

// Week number in current cycle
export function getCurrentWeekInCycle() {
  const tracker = updateDeloadTracker();
  return tracker;
}

// Get workout type for today (always 'custom' to match the single default plan)
export function getTodayWorkoutType() {
  return 'custom';
}

// ===== WORKOUT SHEETS =====
const SHEETS_KEY = 'fitforge_workout_sheets';
const ACTIVE_SHEET_KEY = 'fitforge_active_sheet';

export function getWorkoutSheets() {
  let sheets = getItem(SHEETS_KEY) || [];
  
  // Clean up any old default/generic push/pull/A/B templates to completely eliminate them!
  const hasOldSheets = sheets.some(s => 
    s.name && (
      s.name.includes("Workout A") || 
      s.name.includes("Workout B") || 
      s.name.includes("Workout-A") || 
      s.name.includes("Workout-B") || 
      s.name.includes("Push Focus") || 
      s.name.includes("Pull Focus")
    )
  );
  if (hasOldSheets) {
    sheets = sheets.filter(s => 
      s.name && (
        !s.name.includes("Workout A") && 
        !s.name.includes("Workout B") && 
        !s.name.includes("Workout-A") && 
        !s.name.includes("Workout-B") && 
        !s.name.includes("Push Focus") && 
        !s.name.includes("Pull Focus")
      )
    );
    localStorage.setItem(SHEETS_KEY, JSON.stringify(sheets));
    
    // If the active sheet was one of the old deleted ones, clear it
    const active = getActiveSheet();
    if (active && active.name && (
      active.name.includes("Workout A") || 
      active.name.includes("Workout B") || 
      active.name.includes("Workout-A") || 
      active.name.includes("Workout-B") || 
      active.name.includes("Push Focus") || 
      active.name.includes("Pull Focus")
    )) {
      localStorage.setItem(ACTIVE_SHEET_KEY, JSON.stringify(null));
    }
  }
  
  // Smart Seeding: Seed the new CNS Strength Blueprint personalized default sheet if not present
  const hasCNSBlueprint = sheets.some(s => s.name === "CNS Strength Blueprint");
  if (!hasCNSBlueprint) {
    const today = getToday();
    // 6-week Deload Cycle End Date calculation
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 42);
    const endStr = futureDate.toISOString().split('T')[0];
    
    const cnsSheet = {
      id: 1780143765896,
      name: "CNS Strength Blueprint",
      description: "Personalized compound routine maximizing myofibrillar density and neural drive (1-5 rep range) based on your stats (72.7kg, 5'10\"). Squeeze the bar with a white-knuckle grip to activate full-body tension (irradiation).",
      isDefault: true,
      createdAt: today,
      startDate: today,
      endDate: endStr,
      exercises: [
        { exerciseId: 'squat', minSets: 3, maxSets: 5, reps: 5, weight: 60, restMinutes: 4, amrap: false, notes: 'White-knuckle the bar and squeeze glutes. Rest 4m.' },
        { exerciseId: 'bench', minSets: 3, maxSets: 5, reps: 5, weight: 50, restMinutes: 4, amrap: true, notes: 'Crush the bar, brace stomach. Last set AMRAP. Rest 4m.' },
        { exerciseId: 'row', minSets: 3, maxSets: 5, reps: 5, weight: 45, restMinutes: 3, amrap: false, notes: 'Explode up, 2-sec slow eccentric control. Rest 3m.' },
        { exerciseId: 'ohp', minSets: 3, maxSets: 5, reps: 5, weight: 35, restMinutes: 4, amrap: true, notes: 'Stand tall, squeeze glutes. Last set AMRAP. Rest 4m.' },
        { exerciseId: 'deadlift', minSets: 1, maxSets: 3, reps: 5, weight: 70, restMinutes: 5, amrap: true, notes: 'Single high-effort work set. Pull with perfect form. Rest 5m.' },
      ]
    };
    
    // Clear any previous generic default sheets to keep it a single default plan as requested!
    sheets = sheets.filter(s => !s.isDefault);
    sheets.push(cnsSheet);
    localStorage.setItem(SHEETS_KEY, JSON.stringify(sheets));
    
    // Set this sheet as the active sheet by default
    localStorage.setItem(ACTIVE_SHEET_KEY, JSON.stringify(cnsSheet));
  }
  
  return sheets;
}

export function saveWorkoutSheet(sheet) {
  const sheets = getWorkoutSheets();
  if (sheet.id) {
    // Update existing
    const idx = sheets.findIndex(s => s && s.id === sheet.id);
    if (idx >= 0) sheets[idx] = sheet;
    else sheets.push(sheet);
  } else {
    // New sheet
    sheet.id = Date.now();
    sheet.createdAt = getToday();
    sheets.push(sheet);
  }
  setItem(SHEETS_KEY, sheets);
  
  // Critical synchronization fix: if this sheet was active, update ACTIVE_SHEET_KEY as well!
  const active = getActiveSheet();
  if (active && active.id === sheet.id) {
    setItem(ACTIVE_SHEET_KEY, sheet);
  }
  
  return sheet;
}

export function deleteWorkoutSheet(sheetId) {
  const sheets = getWorkoutSheets().filter(s => s.id !== sheetId);
  setItem(SHEETS_KEY, sheets);
  // If the deleted sheet was active, clear active
  const active = getActiveSheet();
  if (active && active.id === sheetId) {
    setItem(ACTIVE_SHEET_KEY, null);
  }
}

export function setActiveSheet(sheetId) {
  const sheets = getWorkoutSheets();
  const sheet = sheets.find(s => s.id === sheetId) || null;
  setItem(ACTIVE_SHEET_KEY, sheet);
  return sheet;
}


export function getActiveSheet() {
  return getItem(ACTIVE_SHEET_KEY) || null;
}

// Export all for convenience
export default {
  getWorkoutLogs, saveWorkoutLog, getWorkoutsByDate, getWorkoutsThisWeek,
  getDietLogs, saveDietLog, getDietByDate, removeDietEntry, getDailyTotals,
  getBodyStats, saveBodyStat, getPRRecords, updatePR,
  getStreak, getDeloadTracker, updateDeloadTracker,
  getSettings, saveSettings, calculateTDEE,
  getCurrentWeekInCycle, getTodayWorkoutType, getToday,
  getWorkoutSheets, saveWorkoutSheet, deleteWorkoutSheet, setActiveSheet, getActiveSheet,
};
