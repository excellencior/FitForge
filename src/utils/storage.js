// Storage utility for offline-first data persistence

const STORAGE_KEYS = {
  WORKOUT_LOG: 'fitforge_workout_log',
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

export function removeWorkoutLogByExercise(exerciseId, date) {
  const logs = getWorkoutLogs();
  const filtered = logs.filter(l => {
    if (l.date !== date) return true;
    if (!l.sets) return true;
    return !l.sets.some(s => s.exerciseId === exerciseId);
  });
  setItem(STORAGE_KEYS.WORKOUT_LOG, filtered);
}

export function getWorkoutsByDate(date) {
  return getWorkoutLogs().filter(l => l.date === date);
}

export function getWorkoutsThisWeek() {
  const weekStart = getWeekStart();
  return getWorkoutLogs().filter(l => l.date >= weekStart);
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

// Deload tracker — simple date range
export function getDeloadTracker() {
  return getItem(STORAGE_KEYS.DELOAD_TRACKER) || {
    from: '',
    to: '',
  };
}

export function saveDeloadTracker(from, to) {
  const tracker = { from: from || '', to: to || '' };
  setItem(STORAGE_KEYS.DELOAD_TRACKER, tracker);
  return tracker;
}

export function isDeloadDate(dateStr) {
  const tracker = getDeloadTracker();
  if (!tracker.from || !tracker.to) return false;
  return dateStr >= tracker.from && dateStr <= tracker.to;
}

// Settings
export function getSettings() {
  return getItem(STORAGE_KEYS.SETTINGS) || {
    name: '',
    heightCm: 178,
    weightKg: 72.7,
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
  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  return Math.round(bmr * activityMultiplier);
}

// Week number in current cycle
export function getCurrentWeekInCycle() {
  const tracker = updateDeloadTracker();
  return tracker;
}

// Get workout type for today
export function getTodayWorkoutType() {
  return 'custom';
}

// ===== WORKOUT SHEETS =====
const SHEETS_KEY = 'fitforge_workout_sheets';
const ROUTINE_SCHEDULE_KEY = 'fitforge_routine_schedule';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function getWorkoutSheets() {
  return getItem(SHEETS_KEY) || [];
}

export function saveWorkoutSheet(sheet) {
  const sheets = getWorkoutSheets();
  if (sheet.id) {
    const idx = sheets.findIndex(s => s && s.id === sheet.id);
    if (idx >= 0) sheets[idx] = sheet;
    else sheets.push(sheet);
  } else {
    sheet.id = Date.now();
    sheet.createdAt = getToday();
    sheets.push(sheet);
  }
  setItem(SHEETS_KEY, sheets);
  return sheet;
}

export function deleteWorkoutSheet(sheetId) {
  const sheets = getWorkoutSheets().filter(s => s.id !== sheetId);
  setItem(SHEETS_KEY, sheets);
  
  // Also remove from schedule
  const schedule = getRoutineSchedule();
  let changed = false;
  for (const day of WEEKDAY_KEYS) {
    if (schedule[day] === sheetId) {
      schedule[day] = null;
      changed = true;
    }
  }
  if (changed) {
    saveRoutineSchedule(schedule);
  }
}

// ===== ROUTINE SCHEDULE (Weekday Assignments) =====
export function getRoutineSchedule() {
  return getItem(ROUTINE_SCHEDULE_KEY) || {
    sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null,
  };
}

export function saveRoutineSchedule(schedule) {
  setItem(ROUTINE_SCHEDULE_KEY, schedule);
}

export function getTodayRoutine() {
  const dayIndex = new Date().getDay();
  const dayKey = WEEKDAY_KEYS[dayIndex];
  const schedule = getRoutineSchedule();
  const sheetId = schedule[dayKey];
  if (!sheetId) return null;
  const sheets = getWorkoutSheets();
  return sheets.find(s => s.id === sheetId) || null;
}

export function getRoutineForDay(dayKey) {
  const schedule = getRoutineSchedule();
  const sheetId = schedule[dayKey];
  if (!sheetId) return null;
  const sheets = getWorkoutSheets();
  return sheets.find(s => s.id === sheetId) || null;
}

// Legacy compatibility
export function getActiveSheet() {
  return getTodayRoutine();
}

export function setActiveSheet(sheetId) {
  return null;
}

// Export all
export default {
  getWorkoutLogs, saveWorkoutLog, getWorkoutsByDate, getWorkoutsThisWeek,
  getBodyStats, saveBodyStat, getPRRecords, updatePR,
  getStreak, getDeloadTracker, saveDeloadTracker, isDeloadDate,
  getSettings, saveSettings, calculateTDEE,
  getCurrentWeekInCycle, getTodayWorkoutType, getToday,
  getWorkoutSheets, saveWorkoutSheet, deleteWorkoutSheet,
  getRoutineSchedule, saveRoutineSchedule, getTodayRoutine, getRoutineForDay,
  getActiveSheet, setActiveSheet,
};
