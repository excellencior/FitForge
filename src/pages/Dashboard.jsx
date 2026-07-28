import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  CalendarCheck, 
  ChevronRight, 
  ChevronLeft, 
  Dumbbell, 
  Coffee,
  Moon
} from 'lucide-react';
import { 
  getToday, 
  getWorkoutsByDate, 
  getSettings, 
  getWorkoutLogs, 
  getTodayRoutine,
  isDeloadDate,
  getRoutineSchedule
} from '../utils/storage';
import { exercises as defaultExercises } from '../data/workouts';
import Modal from '../components/Modal';
import { useLottie } from 'lottie-react';
import checkAnimationData from '../assets/check-animation.json';
import logo from '../assets/fitforge_logo.png';

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

// --- Gym Attendance Tracker ---
function GymAttendanceTracker() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const workoutLogs = getWorkoutLogs();
  const schedule = getRoutineSchedule();

  const getExName = (id) => defaultExercises[id]?.name || id;

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const todayStr = getToday();
  const isCurrentMonth = monthOffset === 0;

  const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  // Build set of workout dates for this month
  const gymDates = new Set();
  workoutLogs.forEach(log => {
    if (!log.date) return;
    const [ly, lm] = log.date.split('-').map(Number);
    if (ly === year && lm === month + 1) {
      gymDates.add(log.date);
    }
  });

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay;

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, d).getDay();
    const isGym = gymDates.has(dateStr);
    const isPastDay = dateStr < todayStr;
    // Any past day without a logged workout is treated as a rest day
    const isScheduledRestDay = isPastDay ? !isGym : !schedule[weekdayKeys[dayOfWeek]];
    cells.push({ day: d, date: dateStr, isGym, isToday: dateStr === todayStr, isRestDay: isScheduledRestDay });
  }

  const totalSessions = gymDates.size;

  return (
    <section style={attendanceStyles.card}>

      {/* Month Navigation */}
      <div style={attendanceStyles.monthNav}>
        <button 
          onClick={() => setMonthOffset(p => p - 1)}
          aria-label="Previous Month"
          style={attendanceStyles.navBtn}
        >
          <ChevronLeft size={16} strokeWidth={2.5} color="var(--text-primary)" />
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
          <ChevronRight size={16} strokeWidth={2.5} color="var(--text-primary)" />
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
          const isPast = cell.date < todayStr;
          const isDeload = isDeloadDate(cell.date);

          return (
            <div
              key={cell.date}
              onClick={() => !isFuture && setSelectedDate(cell.date)}
              style={{
                ...attendanceStyles.dayCell,
                cursor: isFuture ? 'default' : 'pointer',
                background: cell.isToday
                  ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
                  : (cell.isGym && isPast)
                    ? 'rgba(15, 23, 42, 0.06)'
                    : 'transparent',
                border: cell.isToday
                  ? '1px solid rgba(255, 255, 255, 0.15)'
                  : (cell.isGym && isPast)
                    ? 'var(--glass-border-separator)'
                    : '1px solid transparent',
                borderRadius: 14,
                opacity: isFuture ? 0.3 : 1,
                boxShadow: cell.isToday
                  ? '0 4px 12px -2px rgba(15, 23, 42, 0.25)'
                  : 'none',
                position: 'relative',
              }}
            >
              <span style={{
                fontSize: 13,
                fontWeight: cell.isGym || cell.isToday ? '700' : '500',
                color: cell.isToday ? '#FFFFFF' : (cell.isGym && isPast ? 'var(--text-primary)' : 'var(--text-secondary)'),
                lineHeight: 1,
              }}>
                {cell.day}
              </span>
              {isPast && cell.isGym && !cell.isToday && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-mint)', marginTop: 3 }} />
              )}
              {cell.isToday && cell.isGym && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-mint)', marginTop: 3 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Workout Detail Modal */}
      <Modal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? formatDate(selectedDate) : ''}
        type="bottom-sheet"
      >
        {(() => {
          if (!selectedDate) return null;
          const dayLogs = getWorkoutsByDate(selectedDate);
          
          if (dayLogs.length === 0) {
            const [sy, sm, sd] = selectedDate.split('-').map(Number);
            const dow = new Date(sy, sm - 1, sd).getDay();
            const isRest = !schedule[weekdayKeys[dow]];
            return (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-tertiary)' }}>
                {isRest ? (
                  <>
                    <Moon size={28} strokeWidth={1.5} color="var(--text-tertiary)" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Rest Day</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>No workout scheduled</div>
                  </>
                ) : (
                  <>
                    <Dumbbell size={28} strokeWidth={1.5} color="var(--text-tertiary)" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>No Workout Logged</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>A workout was scheduled but not completed</div>
                  </>
                )}
              </div>
            );
          }

          // Group all sets by exercise
          // Group sets by exercise — only keep the latest log per exercise
          const exerciseSets = {};
          dayLogs.forEach(log => {
            (log.sets || []).forEach(s => {
              // Later logs overwrite earlier ones for the same exercise
              exerciseSets[s.exerciseId] = { sets: [], logId: log.id };
            });
          });
          // Second pass: collect sets from the latest log per exercise
          dayLogs.forEach(log => {
            (log.sets || []).forEach(s => {
              if (exerciseSets[s.exerciseId]?.logId === log.id) {
                exerciseSets[s.exerciseId].sets.push(s);
              }
            });
          });
          const templateName = dayLogs[0]?.templateName;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
              {templateName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Dumbbell size={16} strokeWidth={2.4} color="var(--text-primary)" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{templateName}</span>
                </div>
              )}
              {Object.entries(exerciseSets).map(([exId, { sets }], i, arr) => (
                <div key={exId} style={{
                  padding: '12px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {getExName(exId)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    {sets.length} sets × {sets[0]?.reps || 0} reps
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Modal>

    </section>
  );
}

const attendanceStyles = {
  card: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    borderRadius: 22,
    padding: 20,
    border: 'var(--glass-border)',
    boxShadow: 'var(--glass-shadow), var(--glass-rim)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: 'var(--text-secondary)',
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
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: 'var(--glass-border-subtle)',
    boxShadow: 'var(--glass-shadow-sm), var(--glass-rim)',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
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
    gap: 5,
  },
  dayHeader: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.04em',
    paddingBottom: 8,
  },
  emptyCell: {
    aspectRatio: '1',
  },
  dayCell: {
    aspectRatio: '1',
    borderRadius: 14,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    transition: 'all 0.2s ease',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
    paddingTop: 14,
    borderTop: 'var(--glass-border-separator)',
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
    width: 2,
    height: 24,
    background: 'var(--border)',
  },
};

function CheckAnimation() {
  const { View } = useLottie({
    animationData: checkAnimationData,
    loop: true,
    autoplay: true,
  });
  return (
    <div style={{ width: 44, height: 44, flexShrink: 0 }}>
      {View}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const today = getToday();
  const totalDays = useMemo(() => {
    const logs = getWorkoutLogs();
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    return new Set(logs.filter(l => l.date?.startsWith(prefix)).map(l => l.date)).size;
  }, []);
  const [todayWorkouts, setTodayWorkouts] = useState(() => getWorkoutsByDate(today));

  const refreshWorkouts = useCallback(() => {
    setTodayWorkouts(getWorkoutsByDate(today));
  }, [today]);

  useEffect(() => {
    // Re-read logs when navigating back or tab becomes visible
    const onVisible = () => { if (document.visibilityState === 'visible') refreshWorkouts(); };
    document.addEventListener('visibilitychange', onVisible);
    // Also refresh on focus (covers in-app navigation)
    window.addEventListener('focus', refreshWorkouts);
    // Refresh on mount
    refreshWorkouts();
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshWorkouts);
    };
  }, [refreshWorkouts]);
  
  const settings = getSettings();
  const routine = getTodayRoutine();
  const isRestDay = !routine || !routine.exercises || routine.exercises.length === 0;
  const workoutDone = useMemo(() => {
    if (isRestDay || todayWorkouts.length === 0) return false;
    const relevantLogs = todayWorkouts.filter(l => l.templateName === routine.name);
    if (relevantLogs.length === 0) return false;
    const loggedExercises = new Set(relevantLogs.flatMap(l => (l.sets || []).map(s => s.exerciseId)));
    return routine.exercises.every(ex => loggedExercises.has(ex.exerciseId));
  }, [isRestDay, routine, todayWorkouts]);

  return (
    <div className="page-content" style={{ paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)' }}>
      {/* ───── Header Top Bar ───── */}
      <div style={styles.headerTopBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.logoContainer}>
            <img
              src={logo}
              alt="FitForge"
              style={styles.logoImage}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', height: 40 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              color: '#0F172A',
              background: 'rgba(15, 23, 42, 0.08)',
              border: 'var(--glass-border-strong)',
              borderRadius: 100,
              padding: '2px 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              lineHeight: 1.2,
              width: 'fit-content',
            }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              paddingLeft: 10,
              lineHeight: 1.2,
            }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            role="status"
            aria-label={`Total workout days: ${totalDays}`}
            style={styles.daysBadge}
          >
            <CalendarCheck size={16} color="#0F172A" strokeWidth={2.2} />
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
        <h1 style={styles.greetingLarge}>
          {getGreeting()}, <span style={styles.warrior}>{settings.name || 'Warrior'}</span>
        </h1>
      </header>

      {/* ───── Today's Workout Pill ───── */}
      <section
        role="button"
        tabIndex={workoutDone || isRestDay ? -1 : 0}
        onClick={() => !workoutDone && !isRestDay && navigate('/track')}
        onKeyDown={(e) => {
          if (!workoutDone && !isRestDay && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            navigate('/track');
          }
        }}
        aria-label={isRestDay ? "Rest Day" : (workoutDone ? `Today's Workout: ${routine.name}, completed` : `Start Today's Workout: ${routine.name}`)}
        style={{
          ...styles.workoutPillCard,
          cursor: (workoutDone || isRestDay) ? 'default' : 'pointer',
          ...(workoutDone ? {
            background: 'var(--glass-green-bg)',
            border: 'var(--glass-green-border)',
            boxShadow: 'var(--glass-green-shadow), var(--glass-rim)',
          } : {}),
        }}
      >
        <div style={styles.workoutPillContent}>
          {workoutDone ? (
            <CheckAnimation />
          ) : (
            <div style={styles.workoutPillIconWrap}>
              {isRestDay ? (
                <Coffee size={18} strokeWidth={2.2} color="var(--text-secondary)" />
              ) : (
                <Dumbbell size={18} strokeWidth={2.2} color="var(--text-primary)" />
              )}
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {isRestDay && (
              <span style={styles.workoutPillSub}>Recovery</span>
            )}
            <h3 style={styles.workoutPillTitle}>{isRestDay ? 'Rest Day' : routine.name}</h3>
            {!isRestDay && (
              <span style={styles.workoutPillMeta}>{routine.exercises.length} exercises</span>
            )}
          </div>
          <div>
            {isRestDay ? (
              <div style={styles.workoutPillDoneBadge}>
                <span style={styles.workoutPillDoneText}>Rest</span>
              </div>
            ) : !workoutDone && (
              <div style={styles.workoutPillStartBadge}>
                <span>Start</span>
                <ChevronRight size={14} strokeWidth={2.5} color="var(--text-primary)" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───── Gym Attendance Tracker ───── */}
      <GymAttendanceTracker />
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
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--glass-bg)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  warrior: {
    color: '#222222',
  },
  daysBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--glass-bg)',
    borderRadius: 14,
    padding: '4px 12px 4px 6px',
    border: 'var(--glass-border)',
    boxShadow: 'var(--glass-shadow-sm), var(--glass-rim)',
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--glass-bg-elevated)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: 'var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: 'var(--glass-shadow), var(--glass-rim)',
    WebkitTapHighlightColor: 'transparent',
    transition: 'background-color 0.2s ease',
  },
  
  // Today Workout Pill
  workoutPillCard: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    border: 'var(--glass-border)',
    boxShadow: 'var(--glass-shadow), var(--glass-rim)',
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
    borderRadius: 14,
    background: 'var(--glass-bg-tint)',
    border: 'var(--glass-border-subtle)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
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
    lineHeight: 1,
  },
  workoutPillTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  workoutPillMeta: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    fontWeight: '500',
  },
  workoutPillDoneBadge: {
    background: 'var(--glass-bg)',
    border: 'var(--glass-border-subtle)',
    borderRadius: 20,
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  workoutPillDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  workoutPillStartBadge: {
    background: 'var(--glass-bg)',
    color: 'var(--text-primary)',
    border: 'var(--glass-border-subtle)',
    boxShadow: 'var(--shadow-sm)',
    borderRadius: 20,
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: 13,
    fontWeight: '700',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
};

