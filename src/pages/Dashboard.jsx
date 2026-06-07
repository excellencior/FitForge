import { useState, useEffect, useMemo } from 'react';
import { getDailyTotals, getCurrentWeekInCycle, getTodayWorkoutType, getToday, getWorkoutsByDate, getSettings, getWorkoutLogs, getActiveSheet, getDeloadTracker } from '../utils/storage';
import { workoutTemplates } from '../data/workouts';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Target, ChevronRight, ChevronLeft, Settings, Zap, CalendarCheck, Award, Sparkles, TrendingUp, Cookie, Droplets, Flame } from 'lucide-react';
import logo from '../assets/fitforge_logo.png';

const safetyTips = [
  "Training near your max has HIGH injury risk. Perfect form is non-negotiable.",
  "Rest 3-5 minutes between heavy sets. Your ATP needs time to refuel.",
  "Crush the bar with a white-knuckle grip. Irradiation = 10-20% more strength.",
  "Intensity over volume. Fewer sets, higher effort = enjoyable workouts.",
  "Deload every 6 weeks. It's not laziness — it's strategy.",
  "If sweating profusely during strength training, you're doing it wrong.",
  "Hydrate aggressively in Dhaka's heat. 3-4 liters/day minimum.",
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// --- Calorie Ring Component ---
function CalorieRing({ consumed, target }) {
  const radius = 70;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;

  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  let ringColor = 'var(--accent-blue)'; // Beautiful Brand Indigo
  if (pct >= 100) ringColor = 'var(--success)'; // Success: Mint Green
  else if (pct > 80) ringColor = 'var(--warning)'; // High: Sunset Amber

  return (
    <div style={styles.ringWrapper}>
      <div style={styles.ringContainer}>
        <svg width={radius * 2} height={radius * 2} style={styles.ringSvg}>
          {/* background track */}
          <circle
            stroke="var(--bg-tertiary)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* progress arc */}
          <circle
            stroke={ringColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            transform="rotate(-90 70 70)"
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease',
            }}
          />
        </svg>
        <div style={styles.ringCenter}>
          <span style={styles.ringPct}>{Math.round(pct)}%</span>
          <span style={styles.ringCenterLabel}>Target</span>
        </div>
      </div>
      <div style={styles.ringStats}>
        <div style={styles.ringStatItem}>
          <span style={styles.ringStatVal}>{consumed}</span>
          <span style={styles.ringStatLbl}>consumed</span>
        </div>
        <div style={styles.ringDivider} />
        <div style={styles.ringStatItem}>
          <span style={styles.ringStatVal}>{target}</span>
          <span style={styles.ringStatLbl}>target kcal</span>
        </div>
      </div>
    </div>
  );
}

// --- Macro Row Component (Optimized for Samsung A50s / Narrow Width Viewports) ---
function MacroRow({ label, current, target, color, bgColor, icon: Icon }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div style={styles.macroRowStacked}>
      <div style={styles.macroRowStackedHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '10px',
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={15} color={color} strokeWidth={2.5} />
          </div>
          <span style={styles.macroRowStackedLabel}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={styles.macroRowStackedCurrent}>{Math.round(current)}g</span>
          <span style={styles.macroRowStackedTarget}>/ {target}g</span>
          <span style={{
            ...styles.macroRowStackedPct,
            color: color
          }}>{Math.round(pct)}%</span>
        </div>
      </div>
      <div style={styles.macroBarBg}>
        <div
          style={{
            ...styles.macroBarFill,
            width: `${pct}%`,
            backgroundColor: color,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
}

// --- Gym Attendance Tracker ---
function GymAttendanceTracker() {
  const [monthOffset, setMonthOffset] = useState(0);
  const workoutLogs = getWorkoutLogs();

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const todayStr = getToday();
  const isCurrentMonth = monthOffset === 0;

  // Build set of workout dates for this month
  const gymDates = new Set();
  workoutLogs.forEach(log => {
    if (!log.date) return;
    const [ly, lm] = log.date.split('-').map(Number);
    if (ly === year && lm === month + 1) {
      gymDates.add(log.date);
    }
  });

  // Calculate current streak
  const allDatesSet = new Set(workoutLogs.map(l => l.date));
  let streak = 0;
  const streakDate = new Date();
  // If no workout today, start checking from yesterday
  if (!allDatesSet.has(todayStr)) {
    streakDate.setDate(streakDate.getDate() - 1);
  }
  while (true) {
    const dateStr = `${streakDate.getFullYear()}-${String(streakDate.getMonth() + 1).padStart(2, '0')}-${String(streakDate.getDate()).padStart(2, '0')}`;
    if (allDatesSet.has(dateStr)) {
      streak++;
      streakDate.setDate(streakDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Adjust so Monday=0
  const startOffset = (firstDay + 6) % 7;

  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, date: dateStr, isGym: gymDates.has(dateStr), isToday: dateStr === todayStr });
  }

  const totalSessions = gymDates.size;

  return (
    <section style={attendanceStyles.card}>
      {/* Header */}
      <div style={attendanceStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={attendanceStyles.title}>Gym Attendance</h2>
        </div>
      </div>

      {/* Month Navigation */}
      <div style={attendanceStyles.monthNav}>
        <button 
          onClick={() => setMonthOffset(p => p - 1)}
          aria-label="Previous Month"
          style={attendanceStyles.navBtn}
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <span style={attendanceStyles.monthLabel}>{monthName}</span>
        <button 
          onClick={() => setMonthOffset(p => Math.min(p + 1, 0))}
          aria-label="Next Month"
          style={{
            ...attendanceStyles.navBtn,
            opacity: isCurrentMonth ? 0.3 : 1,
            pointerEvents: isCurrentMonth ? 'none' : 'auto'
          }}
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Day Name Headers */}
      <div style={attendanceStyles.grid}>
        {dayNames.map((name, i) => (
          <div key={`h-${i}`} style={attendanceStyles.dayHeader}>{name}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={attendanceStyles.grid}>
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`e-${i}`} style={attendanceStyles.emptyCell} />;
          }

          const isFuture = cell.date > todayStr;

          return (
            <div
              key={cell.date}
              style={{
                ...attendanceStyles.dayCell,
                background: cell.isGym ? 'var(--accent-gradient)' : 'transparent',
                border: cell.isToday
                  ? `2px solid ${cell.isGym ? 'var(--accent-purple)' : 'var(--accent-blue)'}`
                  : '2px solid transparent',
                opacity: isFuture ? 0.25 : 1,
                boxShadow: cell.isGym ? '0 2px 8px rgba(79, 70, 229, 0.2)' : 'none',
              }}
            >
              <span style={{
                fontSize: 12,
                fontWeight: cell.isGym || cell.isToday ? '800' : '600',
                color: cell.isGym ? '#FFFFFF' : (cell.isToday ? 'var(--accent-blue)' : 'var(--text-secondary)'),
                lineHeight: 1,
              }}>
                {cell.day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div style={attendanceStyles.footer}>
        <div style={attendanceStyles.footerStat}>
          <Dumbbell size={14} strokeWidth={2.2} color="var(--accent-blue)" />
          <span style={attendanceStyles.footerStatValue}>{totalSessions}</span>
          <span style={attendanceStyles.footerStatLabel}>sessions</span>
        </div>
        <div style={attendanceStyles.footerDivider} />
        <div style={attendanceStyles.footerStat}>
          <Flame size={14} strokeWidth={2.2} color="var(--warning)" />
          <span style={attendanceStyles.footerStatValue}>{streak}</span>
          <span style={attendanceStyles.footerStatLabel}>day streak</span>
        </div>
      </div>
    </section>
  );
}

const attendanceStyles = {
  card: {
    background: 'var(--bg-card)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'var(--accent-purple-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  monthNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    background: 'var(--bg-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    WebkitTapHighlightColor: 'transparent',
    transition: 'background 0.2s',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
  },
  dayHeader: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    paddingBottom: 8,
  },
  emptyCell: {
    aspectRatio: '1',
  },
  dayCell: {
    aspectRatio: '1',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
    paddingTop: 14,
    borderTop: '1px solid var(--border)',
  },
  footerStat: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  footerStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  footerStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.01em',
  },
  footerDivider: {
    width: 1,
    height: 24,
    background: 'var(--border)',
  },
};

// =================== DASHBOARD ===================
const MILESTONES = [10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 1000];
const MILESTONE_MESSAGES = {
  10: 'Double digits! You showed up.',
  20: 'Consistency building. Respect.',
  30: 'A full month of showing up. Beast.',
  50: 'Half a hundred. You\'re different.',
  75: 'Three quarters. Unstoppable.',
  100: 'TRIPLE DIGITS. You\'re a machine.',
  150: 'Most people quit at 30. You didn\'t.',
  200: 'Two hundred days. Legend status.',
  250: 'Quarter thousand. Insane discipline.',
  300: 'Three hundred. You live this.',
  365: 'ONE FULL YEAR. Absolute warrior.',
  500: 'Five hundred. History books.',
  1000: 'ONE THOUSAND. You ARE the gym.',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const today = getToday();
  const totals = useMemo(() => getDailyTotals(today), [today]);
  const uniqueDays = useMemo(() => {
    const logs = getWorkoutLogs();
    return new Set(logs.map(l => l.date)).size;
  }, []);
  const totalDays = uniqueDays;
  const cycleInfo = useMemo(() => getCurrentWeekInCycle(), []);
  const workoutType = useMemo(() => getTodayWorkoutType(), []);
  const todayWorkouts = useMemo(() => getWorkoutsByDate(today), [today]);
  const tipIndex = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = today.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % safetyTips.length;
  }, [today]);
  const [milestone, setMilestone] = useState(null);

  useEffect(() => {
    // Check milestone
    const seenKey = 'fitforge_milestones_seen';
    const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
    const hit = MILESTONES.find(m => uniqueDays >= m && !seen.includes(m));
    if (hit) {
      queueMicrotask(() => {
        setMilestone(hit);
      });
      localStorage.setItem(seenKey, JSON.stringify([...seen, hit]));
      const timer = setTimeout(() => setMilestone(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uniqueDays]);

  const settings = getSettings();
  const activeSheet = getActiveSheet();
  const template = (activeSheet && activeSheet.exercises && activeSheet.exercises.length > 0)
    ? { name: activeSheet.name, exercises: activeSheet.exercises }
    : (workoutTemplates[workoutType] || workoutTemplates.custom);
  const workoutDone = todayWorkouts.length > 0;
  const calorieTarget = settings.calorieTarget || 2900;

  return (
    <div className="page-content" style={{ paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)' }}>
      {/* ───── Header Top Bar ───── */}
      <div style={styles.headerTopBar}>
        <div style={styles.logoContainer}>
          <img
            src={logo}
            alt="FitForge"
            style={styles.logoImage}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            role="status"
            aria-label={`Total workout days: ${totalDays}`}
            style={styles.daysBadge}
          >
            <CalendarCheck size={16} color="var(--accent-purple)" strokeWidth={2.2} />
            <span style={{ fontSize: 13, fontWeight: '700', color: 'var(--text-primary)' }}>
              {totalDays} {totalDays === 1 ? 'day' : 'days'}
            </span>
          </div>
          <button
            onClick={() => navigate('/profile')}
            aria-label="Settings"
            style={styles.settingsBtn}
          >
            <Settings size={18} color="var(--text-secondary)" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* ───── Hero Greeting Section ───── */}
      <header style={styles.heroGreetingBlock}>
        <div>
          <h1 style={styles.greetingLarge}>
            {getGreeting()}, <span style={styles.warrior}>{settings.name || 'Warrior'}</span>
          </h1>
          <p style={styles.dateLarge}>{formatDate(today)}</p>
        </div>
      </header>

      {/* ───── Milestone Celebration ───── */}
      {milestone && (
        <div style={styles.milestoneOverlay} onClick={() => setMilestone(null)}>
          <div style={styles.milestoneCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.milestoneBadgeCircle}>
              <Award size={36} color="var(--accent-blue)" strokeWidth={2.2} />
            </div>
            <h2 style={styles.milestoneTitle}>Milestone Achieved!</h2>
            <div style={styles.milestoneNumberContainer}>
              <span style={styles.milestoneNumberText}>{milestone}</span>
              <span style={styles.milestoneNumberSub}>Days Completed</span>
            </div>
            <p style={styles.milestoneText}>{MILESTONE_MESSAGES[milestone]}</p>
            <button style={styles.milestoneButton} onClick={() => setMilestone(null)}>
              Keep Crusher Mentality
            </button>
          </div>
        </div>
      )}

      {/* ───── Calorie Ring ───── */}
      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>
          Daily Calories
        </h2>
        <CalorieRing consumed={totals.calories} target={calorieTarget} />
        
        <div style={styles.calorieRemaining}>
          {totals.calories < calorieTarget ? (
            <div style={styles.remainingPillSuccess}>
              <Target size={14} strokeWidth={2.5} color="var(--success)" />
              <span>{calorieTarget - totals.calories} kcal remaining</span>
            </div>
          ) : (
            <div style={styles.remainingPillDanger}>
              <Target size={14} strokeWidth={2.5} color="var(--danger)" />
              <span>Over target by {totals.calories - calorieTarget} kcal</span>
            </div>
          )}
        </div>
      </section>

      {/* ───── Daily Macronutrients (Optimized Stacked Card) ───── */}
      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>
          Macronutrients
        </h2>
        <div style={styles.macroCardStacked}>
          <MacroRow label="Protein" current={totals.protein} target={settings.proteinTarget || 160} color="var(--protein-color)" bgColor="var(--accent-blue-light)" icon={Zap} />
          <MacroRow label="Carbohydrates" current={totals.carbs} target={settings.carbsTarget || 360} color="var(--carbs-color)" bgColor="var(--warning-light)" icon={Cookie} />
          <MacroRow label="Fats" current={totals.fat} target={settings.fatTarget || 80} color="var(--fat-color)" bgColor="var(--danger-light)" icon={Droplets} />
        </div>
      </section>

      {/* ───── Deload Banner ───── */}
      {cycleInfo.isDeloadWeek && (
        <div style={styles.deloadBanner}>
          <Zap size={18} color="var(--warning)" strokeWidth={2.2} />
          <div>
            <strong style={styles.deloadTitle}>DELOAD WEEK</strong>
            <p style={styles.deloadSub}>Recover &amp; Rebuild</p>
          </div>
        </div>
      )}

      {/* ───── Today's Workout Pill ───── */}
      <section
        role="button"
        tabIndex={workoutDone ? -1 : 0}
        onClick={() => !workoutDone && navigate('/workout')}
        onKeyDown={(e) => {
          if (!workoutDone && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            navigate('/workout');
          }
        }}
        aria-label={workoutDone ? `Today's Workout: ${template.name}, completed` : `Start Today's Workout: ${template.name}`}
        style={{
          ...styles.workoutPillCard,
          cursor: workoutDone ? 'default' : 'pointer',
        }}
      >
        <div style={styles.workoutPillContent}>
          <div style={styles.workoutPillIconWrap}>
            <Dumbbell size={18} strokeWidth={2.2} color={workoutDone ? 'var(--success)' : 'var(--accent-blue)'} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={styles.workoutPillSub}>{workoutDone ? 'Routine Completed' : 'Today\'s Routine'}</span>
            <h3 style={styles.workoutPillTitle}>{template.name}</h3>
            <span style={styles.workoutPillMeta}>{template.exercises.length} exercises</span>
          </div>
          <div>
            {workoutDone ? (
              <div style={styles.workoutPillDoneBadge}>
                <span style={styles.workoutPillDoneText}>Completed</span>
              </div>
            ) : (
              <div style={styles.workoutPillStartBadge}>
                <span>Start</span>
                <ChevronRight size={14} strokeWidth={2.5} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───── Training Week Progress ───── */}
      <section style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Training Cycle</h2>
        </div>
        <p style={styles.cycleSubtitle}>
          Week {cycleInfo.currentWeek} of 7 · Cycle {cycleInfo.completedCycles + 1}
        </p>
        <div style={styles.weekRow}>
          {(() => {
            const workoutLogs = getWorkoutLogs();
            const tracker = getDeloadTracker();
            const [sy, sm, sd] = tracker.startDate.split('-').map(Number);
            const start = new Date(sy, sm - 1, sd);
            start.setHours(0, 0, 0, 0);

            return [1, 2, 3, 4, 5, 6, 7].map((w) => {
              const isPast = w < cycleInfo.currentWeek;
              const isCurrent = w === cycleInfo.currentWeek;
              const isDeload = w === 7;

              let dotBg = 'var(--bg-tertiary)';
              let textColor = 'var(--text-tertiary)';
              let border = '2px solid var(--border)';

              if (isPast) {
                dotBg = 'var(--accent-blue-light)';
                textColor = 'var(--text-primary)';
              } else if (isCurrent) {
                dotBg = isDeload ? 'var(--warning-light)' : 'var(--accent-purple-light)';
                textColor = 'var(--text-primary)';
              } else if (isDeload) {
                dotBg = 'var(--bg-card)';
                border = '2px dashed var(--border)';
                textColor = 'var(--warning)';
              } else {
                dotBg = 'var(--bg-card)';
              }

              const weekStart = new Date(start.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000);
              const weekEnd = new Date(start.getTime() + w * 7 * 24 * 60 * 60 * 1000);
              
              const hasWorkout = workoutLogs.some(log => {
                const [ly, lm, ld] = log.date.split('-').map(Number);
                const logDate = new Date(ly, lm - 1, ld);
                logDate.setHours(0, 0, 0, 0);
                return logDate >= weekStart && logDate < weekEnd;
              });

              let displayBg = dotBg;
              let displayBorder = border;
              let displayShadow = isCurrent ? 'var(--shadow-sm)' : 'none';

              if (hasWorkout) {
                displayBg = 'var(--accent-blue)';
              }

              return (
                <div
                  key={w}
                  style={{
                    ...styles.weekDot,
                    background: displayBg,
                    border: displayBorder,
                    boxShadow: displayShadow,
                  }}
                >
                  <span style={{
                    ...styles.weekNum,
                    color: hasWorkout ? '#FFFFFF' : textColor,
                    fontWeight: (isCurrent || hasWorkout) ? '800' : '600',
                    fontSize: 13,
                  }}>
                    {w}
                  </span>
                </div>
              );
            });
          })()}
        </div>
        <div style={styles.weekLabels}>
          <span style={styles.weekLabelText}>Training</span>
          <span style={{ ...styles.weekLabelText, color: 'var(--warning)' }}>Deload</span>
        </div>
      </section>

      {/* ───── Gym Attendance Tracker ───── */}
      <GymAttendanceTracker />

      {/* ───── Safety Tip ───── */}
      <section style={styles.tipCard}>
        <div style={styles.tipHeader}>
          <div style={styles.tipIconBg}>
            <Sparkles size={16} color="var(--warning)" strokeWidth={2.2} />
          </div>
          <span style={styles.tipTitle}>Pro Safety Tip</span>
        </div>
        <p style={styles.tipText}>{safetyTips[tipIndex]}</p>
      </section>
    </div>
  );
}

// =================== STYLES ===================
const styles = {
  headerTopBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  heroGreetingBlock: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  greetingLarge: {
    fontSize: 24,
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.04em',
    lineHeight: 1.2,
  },
  dateLarge: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    margin: '4px 0 0',
    fontWeight: '700',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  daysBadgeLarge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--bg-card)',
    borderRadius: 14,
    padding: '4px 12px 4px 6px',
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    flexShrink: 0,
    marginTop: 2,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-card)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.03em',
    lineHeight: 1.25,
  },
  warrior: {
    background: 'var(--accent-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  date: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    margin: '2px 0 0',
    fontWeight: '700',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  daysBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--bg-card)',
    borderRadius: 14,
    padding: '4px 12px 4px 6px',
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
  },
  calendarMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: '2px solid var(--border)',
    background: 'var(--bg-card)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  calendarMiniHeader: {
    height: 6,
    background: 'var(--danger)',
    width: '100%',
  },
  calendarMiniDay: {
    fontSize: 12,
    fontWeight: '800',
    color: 'var(--text-primary)',
    textAlign: 'center',
    lineHeight: '20px',
    fontFamily: 'var(--font-family)',
  },
  daysBadgeText: {
    display: 'flex',
    flexDirection: 'column',
  },
  daysBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--bg-card)',
    border: '2px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    WebkitTapHighlightColor: 'transparent',
    transition: 'background-color 0.2s ease',
  },

  // Milestone Celebration
  milestoneOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--bg-glass)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'dashFadeIn 0.3s ease',
  },
  milestoneCard: {
    background: 'var(--bg-card)',
    borderRadius: 24,
    padding: '32px 24px',
    width: '90%',
    maxWidth: 360,
    textAlign: 'center',
    boxShadow: 'var(--shadow-xl)',
    border: '2px solid var(--border)',
    animation: 'dashMilestonePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  milestoneBadgeCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'var(--accent-blue-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  milestoneTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: '0 0 12px 0',
    letterSpacing: '-0.02em',
  },
  milestoneNumberContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  milestoneNumberText: {
    fontSize: 60,
    fontWeight: '900',
    color: 'var(--accent-blue)',
    lineHeight: 1,
    letterSpacing: '-0.04em',
  },
  milestoneNumberSub: {
    fontSize: 11,
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginTop: 4,
  },
  milestoneText: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: '0 0 24px 0',
    fontWeight: '500',
  },
  milestoneButton: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: 14,
    padding: '14px 28px',
    fontSize: 14,
    fontWeight: '700',
    width: '100%',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },

  // Card
  card: {
    background: 'var(--bg-card)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    margin: '0 0 16px',
    display: 'flex',
    alignItems: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },

  // Calorie Ring Layout
  ringWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    padding: '8px 0',
  },
  ringContainer: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  ringSvg: {
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.02))',
  },
  ringCenter: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  ringPct: {
    fontSize: 26,
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  },
  ringCenterLabel: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginTop: 2,
  },
  ringStats: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  ringStatItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  ringStatVal: {
    fontSize: 20,
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  ringStatLbl: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  ringDivider: {
    height: 1,
    background: 'var(--border-light)',
    width: '100%',
  },
  calorieRemaining: {
    marginTop: 16,
    borderTop: '1px solid var(--border-light)',
    paddingTop: 12,
  },
  remainingPillSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--success-light)',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: '700',
    color: 'var(--success)',
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
  },
  remainingPillDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--danger-light)',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: '700',
    color: 'var(--danger)',
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
  },

  // Macro Cards Stacked Layout
  macroCardStacked: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  macroRowStacked: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  macroRowStackedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroRowStackedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  macroRowStackedCurrent: {
    fontSize: 14,
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  macroRowStackedTarget: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontWeight: '600',
  },
  macroRowStackedPct: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },
  macroBarBg: {
    height: 5,
    borderRadius: 3,
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Deload Banner
  deloadBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--warning-light)',
    borderRadius: 18,
    padding: '12px 16px',
    marginBottom: 20,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
  },
  deloadTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: 'var(--warning)',
    letterSpacing: '0.04em',
    display: 'block',
  },
  deloadSub: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    margin: '1px 0 0',
    fontWeight: '500',
  },

  // Today Workout Pill
  workoutPillCard: {
    background: 'var(--bg-card)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  workoutPillContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  workoutPillIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'var(--bg-tertiary)',
    border: '2px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutPillSub: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    display: 'block',
  },
  workoutPillTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: '2px 0',
    letterSpacing: '-0.02em',
  },
  workoutPillMeta: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    fontWeight: '500',
  },
  workoutPillDoneBadge: {
    background: 'var(--success-light)',
    border: '2px solid var(--border)',
    borderRadius: 20,
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutPillDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'var(--success)',
  },
  workoutPillStartBadge: {
    background: 'var(--accent-blue-light)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    borderRadius: 20,
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: 13,
    fontWeight: '700',
  },

  // Training Cycle
  cycleSubtitle: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    fontWeight: '600',
    margin: '0 0 16px',
    letterSpacing: '-0.01em',
  },
  weekRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 4,
  },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.3s ease, border 0.3s ease',
  },
  weekNum: {
    fontSize: 13,
    lineHeight: 1,
  },
  weekLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTop: '2px solid var(--border)',
    paddingTop: 8,
  },
  weekLabelText: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },

  // Safety Tip
  tipCard: {
    background: 'var(--bg-card)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
  },
  tipHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tipIconBg: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'var(--warning-light)',
    border: '2px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'var(--warning)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tipText: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontWeight: '500',
    lineHeight: 1.5,
    margin: 0,
  },
};
