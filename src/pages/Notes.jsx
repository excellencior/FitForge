import React, { useState, useEffect, useRef } from 'react';
import { StickyNote } from 'lucide-react';
import { getDailyNotes, saveDailyNote } from '../utils/storage';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
const DAY_FULL_LABELS = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };

export default function Notes() {
  const todayDayIndex = new Date().getDay();
  const todayKey = DAY_KEYS[todayDayIndex];
  const [activeDay, setActiveDay] = useState(todayKey);
  const [notes, setNotes] = useState(() => getDailyNotes());
  const timerRef = useRef(null);

  const textareaRef = useRef(null);

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setNotes(prev => ({ ...prev, [activeDay]: val }));
    autoResize(e.target);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveDailyNote(activeDay, val);
    }, 400);
  };

  useEffect(() => {
    autoResize(textareaRef.current);
  }, [activeDay]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <div style={styles.pageWrapper}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div style={styles.iconWrap}>
          <StickyNote size={20} strokeWidth={2.4} color="var(--text-primary)" />
        </div>
        <div>
          <h1 style={styles.pageTitle}>Notes</h1>
          <p style={styles.pageSubtitle}>Quick notes for each day</p>
        </div>
      </div>

      {/* Day Tabs */}
      <div style={styles.tabRow}>
        {DAY_KEYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            style={{
              ...styles.tab,
              ...(activeDay === day ? styles.tabActive : {}),
              ...(day === todayKey && activeDay !== day ? styles.tabToday : {}),
            }}
          >
            {DAY_LABELS[day]}
            {day === todayKey && (
              <span style={styles.todayDot} />
            )}
          </button>
        ))}
      </div>

      {/* Note Card — fills remaining space */}
      <div className="notes-card" style={styles.noteCard}>
        <div style={styles.noteCardHeader}>
          <span style={styles.noteCardDay}>{DAY_FULL_LABELS[activeDay]}</span>
          {activeDay === todayKey && (
            <span style={styles.todayBadge}>Today</span>
          )}
        </div>
        <textarea
          ref={textareaRef}
          className="notes-textarea"
          value={notes[activeDay] || ''}
          onChange={handleChange}
          placeholder={`Write your notes for ${DAY_LABELS[activeDay]}...`}
          style={styles.textarea}
        />
        <style>{`
          .notes-card,
          .notes-card *,
          .notes-textarea,
          .notes-textarea:focus {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
          }
          .notes-textarea,
          .notes-textarea:focus {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .notes-textarea::selection {
            background: #222222 !important;
            color: #ffffff !important;
          }
          .notes-textarea::-moz-selection {
            background: #222222 !important;
            color: #ffffff !important;
          }
        `}</style>
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100dvh',
    padding: 20,
    paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
    paddingBottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
    maxWidth: 480,
    margin: '0 auto',
    width: '100%',
    animation: 'fadeIn var(--duration-short) var(--ease-out)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingTop: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'var(--glass-bg-elevated)',
    border: '1px solid rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: 'var(--glass-shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: '#0F172A',
    margin: 0,
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    margin: '2px 0 0',
    letterSpacing: '0.01em',
  },
  tabRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
    background: 'var(--glass-bg-elevated)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 16,
    padding: 5,
    border: 'var(--glass-border)',
    boxShadow: 'var(--glass-shadow), var(--glass-rim)',
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    background: 'transparent',
    border: '1px solid transparent',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'var(--font-family)',
    WebkitTapHighlightColor: 'transparent',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    position: 'relative',
  },
  tabActive: {
    background: 'var(--accent-dark-subtle)',
    color: '#0F172A',
    border: 'var(--glass-border-strong)',
    boxShadow: 'var(--glass-shadow-sm)',
  },
  tabToday: {
    color: 'var(--text-secondary)',
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: '#0F172A',
  },
  noteCard: {
    background: 'var(--glass-bg-elevated)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: 20,
    padding: 20,
    border: 'var(--glass-border)',
    boxShadow: 'var(--glass-shadow-md), var(--glass-rim)',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflowY: 'auto',
  },
  noteCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexShrink: 0,
  },
  noteCardDay: {
    fontSize: 15,
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  todayBadge: {
    fontSize: 10,
    fontWeight: 800,
    color: '#ffffff',
    background: '#222222',
    borderRadius: 100,
    padding: '2px 10px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    lineHeight: 1.4,
  },
  textarea: {
    width: '100%',
    flex: 1,
    padding: '0 4px',
    borderRadius: 0,
    border: 'none',
    background: 'transparent',
    fontFamily: 'var(--font-family)',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.7,
    letterSpacing: '-0.01em',
    WebkitAppearance: 'none',
    minHeight: 0,
  },
};
