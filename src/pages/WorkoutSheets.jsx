import { useState, useEffect, useRef, useLayoutEffect } from 'react';

import { createPortal } from 'react-dom';
import {
  getWorkoutSheets, saveWorkoutSheet, deleteWorkoutSheet,
  getRoutineSchedule, saveRoutineSchedule
} from '../utils/storage';
import { useModalLock, useInputFocus, useToast } from '../utils/ux';
import { exercises as defaultExercises } from '../data/workouts';
import Modal from '../components/Modal';
import {
  Plus, Minus, X, Trash2, Check, Edit3, ChevronDown, ChevronUp,
  Play, AlertTriangle, Dumbbell, RotateCcw, Zap, Star, Calendar,
  GripVertical, Sparkles, Search, Moon, PersonStanding
} from 'lucide-react';
import MuscleMap, { MuscleMapLazy } from '../components/MuscleMap';
import '../components/MuscleMap.css';

const KEYFRAMES_ID = 'sheets-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
  const sheet = document.createElement('style');
  sheet.id = KEYFRAMES_ID;
  sheet.textContent = `
    @keyframes sheetsCardInsert {
      0%   { opacity: 0; transform: translateY(12px) scale(0.97); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes sheetsCardRemove {
      0%   { opacity: 1; transform: scale(1); max-height: 200px; padding: 16px; margin-bottom: 20px; overflow: hidden; }
      100% { opacity: 0; transform: scale(0.95); max-height: 0; padding: 0; margin-bottom: 0; border: none; overflow: hidden; }
    }
    @keyframes sheetsAddPop {
      0%   { transform: scale(0.6); opacity: 0; }
      60%  { transform: scale(1.15); }
      100% { transform: scale(1);   opacity: 1; }
    }
    @keyframes sheetsExInsert {
      0%   { opacity: 0; transform: translateY(-8px) scale(0.98); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes sheetsExRemove {
      0%   { opacity: 1; transform: translateX(0); max-height: 120px; margin-bottom: 10px; }
      100% { opacity: 0; transform: translateX(-100%); max-height: 0; margin-bottom: 0; padding: 0; border-width: 0; overflow: hidden; }
    }
    @keyframes sheetsContentExpand {
      0%   { opacity: 0; transform: translateY(-10px); max-height: 0; margin-top: 0; padding-top: 0; overflow: hidden; }
      100% { opacity: 1; transform: translateY(0); max-height: 1500px; margin-top: 16px; padding-top: 16px; }
    }
    @keyframes sheetsExConfigExpand {
      0%   { opacity: 0; transform: translateY(-8px); max-height: 0; overflow: hidden; }
      100% { opacity: 1; transform: translateY(0); max-height: 500px; }
    }
    @keyframes toastSlideIn {
      from { transform: translateX(-50%) translateY(-24px); opacity: 0; }
      to   { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes toastSlideOut {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to   { transform: translateX(-50%) translateY(-40px); opacity: 0; }
    }
    .sheet-btn {
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sheet-btn:active {
      transform: scale(0.96);
      opacity: 0.85;
    }
    .sheet-btn:disabled {
      opacity: 0.4;
      pointer-events: none;
      transform: none !important;
    }
    .sheet-chip {
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sheet-chip:active {
      transform: scale(0.92);
    }
    .modal-content::-webkit-scrollbar {
      display: none !important;
    }
    .modal-content {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
    .catalog-eye-btn:active {
      opacity: 0.4;
    }
    .ios-form-row {
      transition: background-color 0.2s ease;
    }
    .ios-form-row:focus-within {
      background-color: var(--bg-secondary);
    }
    .ios-form-row:focus-within label {
      color: var(--text-primary) !important;
    }
    .ex-config-container {
      animation: sheetsExConfigExpand 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      overflow: hidden;
    }
    @keyframes catalogItemIn {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .catalog-item-anim {
      animation: catalogItemIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
      will-change: transform, opacity;
    }
    @keyframes catalogDonePop {
      from { opacity: 0; transform: translateX(-50%) scale(0.5); }
      to { opacity: 1; transform: translateX(-50%) scale(1); }
    }
    .catalog-done-btn {
      animation: catalogDonePop 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
  `;
  document.head.appendChild(sheet);
}

const exerciseCatalog = Object.values(defaultExercises).map(ex => ({
  id: ex.id,
  name: ex.name,
  muscle: ex.muscle,
  category: ex.category || 'strength',
  muscleGroup: ex.muscleGroup || 'legs',
  type: ex.type
}));

const EXERCISE_PRIORITY = {
  squat: 10, deadlift: 11, bench: 12, ohp: 13,
  frontSquat: 14,
  row: 20, pullup: 21, inclineDbPress: 22, romanianDeadlift: 23,
  legPress: 30, latPulldown: 31, dips: 32,
  legCurl: 40, lateralRaise: 41, facePull: 42, curl: 43, calfRaise: 44,
  plank: 50,
  kbSwing: 60, farmerWalk: 61, jumpRope: 62, burpees: 63,
};

const TIER_LABELS = {
  1: 'Primary Compound', 2: 'Secondary Compound', 3: 'Accessory Compound',
  4: 'Isolation', 5: 'Core', 6: 'Conditioning',
};

const getTier = (exId) => {
  const p = EXERCISE_PRIORITY[exId];
  if (!p) return 4;
  return Math.floor(p / 10);
};

const getTierLabel = (exId) => TIER_LABELS[getTier(exId)] || 'Exercise';
const getTierColor = (exId) => {
  return 'var(--text-secondary)';
};



const WEEKDAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export default function WorkoutSheets() {
  const [sheets, setSheets] = useState([]);
  const [schedule, setSchedule] = useState({ sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null });
  const [dayPickerDay, setDayPickerDay] = useState(null);
  
  const [showEditor, setShowEditor] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const [catalogSearch, setCatalogSearch] = useState('');
  const [expandedSheet, setExpandedSheet] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedExIdx, setExpandedExIdx] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [deletingSheetId, setDeletingSheetId] = useState(null);
  const [removingExIdx, setRemovingExIdx] = useState(null);
  const [undoExercise, setUndoExercise] = useState(null);
  const [justAddedId, setJustAddedId] = useState(null);
  const [catalogSearchOpen, setCatalogSearchOpen] = useState(false);
  const [catalogExpanded, setCatalogExpanded] = useState(false);
  const catalogSearchRef = useRef(null);
  const catalogExpandedRef = useRef(false);
  const exercisesSnapshot = useRef(null);
  const [anatomyMode, setAnatomyMode] = useState(false);

  const [longPressExercise, setLongPressExercise] = useState(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const catalogContentRef = useRef(null);
  const previewExpandedRef = useRef(false);
  const previewContentRef = useRef(null);
  
  const handleFocus = useInputFocus();
  const { toast, show: showToast } = useToast();

  const listRef = useRef(null);
  const positionsRef = useRef({});

  const capturePositions = () => {
    if (!listRef.current) return;
    const children = listRef.current.children;
    const positions = {};
    for (let child of children) {
      const id = child.dataset.id;
      if (id) {
        positions[id] = child.getBoundingClientRect().top;
      }
    }
    positionsRef.current = positions;
  };

  useLayoutEffect(() => {
    if (!listRef.current || Object.keys(positionsRef.current).length === 0) return;
    const children = listRef.current.children;
    for (let child of children) {
      const id = child.dataset.id;
      if (!id) continue;
      const oldTop = positionsRef.current[id];
      if (oldTop !== undefined) {
        const newTop = child.getBoundingClientRect().top;
        const deltaY = oldTop - newTop;
        if (deltaY !== 0) {
          child.style.transition = 'none';
          child.style.transform = `translateY(${deltaY}px)`;
          // Force reflow
          child.offsetHeight;
          requestAnimationFrame(() => {
            child.style.transition = 'transform 0.38s cubic-bezier(0.19, 1, 0.22, 1)';
            child.style.transform = '';
          });
        }
      }
    }
    positionsRef.current = {};
  }, [editingSheet?.exercises]);

  const scrollRafRef = useRef(null);
  const handleCatalogScroll = (e) => {
    const target = e.currentTarget;
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const st = target.scrollTop;
      if (st > 2 && !catalogExpandedRef.current) {
        catalogExpandedRef.current = true;
        setCatalogExpanded(true);
      } else if (st <= 1 && catalogExpandedRef.current) {
        catalogExpandedRef.current = false;
        setCatalogExpanded(false);
      }
    });
  };

  const previewScrollRafRef = useRef(null);
  const handlePreviewScroll = (e) => {
    const target = e.currentTarget;
    if (previewScrollRafRef.current) return;
    previewScrollRafRef.current = requestAnimationFrame(() => {
      previewScrollRafRef.current = null;
      if (target.scrollTop <= 1 && previewExpandedRef.current) {
        previewExpandedRef.current = false;
        setPreviewExpanded(false);
      } else if (target.scrollTop > 0 && !previewExpandedRef.current) {
        previewExpandedRef.current = true;
        setPreviewExpanded(true);
      }
    });
  };

  // Reset expanded state when preview modal closes
  useEffect(() => {
    if (!longPressExercise) {
      previewExpandedRef.current = false;
      setPreviewExpanded(false);
    }
  }, [longPressExercise]);

  // Touch-based pull-down collapse when scrollTop is 0
  const previewTouchStartY = useRef(null);
  useEffect(() => {
    const el = previewContentRef.current;
    if (!el || !longPressExercise) return;
    const onTouchStart = (e) => {
      if (el.scrollTop <= 1 && previewExpandedRef.current) {
        previewTouchStartY.current = e.touches[0].clientY;
      } else {
        previewTouchStartY.current = null;
      }
    };
    const onTouchMove = (e) => {
      if (previewTouchStartY.current === null) return;
      const dy = e.touches[0].clientY - previewTouchStartY.current;
      if (dy > 30) {
        previewExpandedRef.current = false;
        setPreviewExpanded(false);
        previewTouchStartY.current = null;
      }
    };
    const onTouchEnd = () => { previewTouchStartY.current = null; };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [longPressExercise]);

  useModalLock(showEditor || showCatalog || !!showDeleteConfirm || !!dayPickerDay || !!longPressExercise);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    const loaded = getWorkoutSheets();
    setSheets(loaded);
    setSchedule(getRoutineSchedule());
  }

  const handleDelete = (sheetId) => {
    const sheetName = sheets.find(s => s.id === sheetId)?.name || 'Sheet';
    setDeletingSheetId(sheetId);
    setShowDeleteConfirm(null);
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    setTimeout(() => {
      deleteWorkoutSheet(sheetId);
      
      // Update schedule if deleted sheet was assigned
      const currentSchedule = getRoutineSchedule();
      let scheduleChanged = false;
      Object.keys(currentSchedule).forEach(day => {
        if (currentSchedule[day] === sheetId) {
          currentSchedule[day] = null;
          scheduleChanged = true;
        }
      });
      if (scheduleChanged) {
        saveRoutineSchedule(currentSchedule);
        setSchedule(currentSchedule);
      }

      loadData();
      setDeletingSheetId(null);
      showToast(`Deleted: ${sheetName}`, 'success');
    }, 280);
  };



  const openNewSheet = () => {
    setEditingSheet({
      name: '',
      description: '',
      exercises: [],
    });
    setShowEditor(true);
  };

  const openEditSheet = (sheet) => {
    setEditingSheet({ ...sheet, exercises: [...(sheet.exercises || [])] });
    setShowEditor(true);
  };

  const handleSaveSheet = () => {
    if (!editingSheet.name.trim()) {
      showToast('Please enter a sheet name', 'warning');
      return;
    }
    if (!editingSheet.exercises || editingSheet.exercises.length === 0) {
      showToast('Add at least one exercise', 'warning');
      return;
    }
    saveWorkoutSheet(editingSheet);
    setShowEditor(false);
    setEditingSheet(null);
    loadData();
    showToast(editingSheet.id ? 'Sheet updated' : 'Sheet created', 'success');
  };

  const toggleExerciseInSheet = (catalogExercise) => {
    const alreadyAdded = editingSheet?.exercises?.some(e => e.exerciseId === catalogExercise.id);
    if (alreadyAdded) {
      // Remove it
      setEditingSheet(prev => ({
        ...prev,
        exercises: (prev.exercises || []).filter(e => e.exerciseId !== catalogExercise.id),
      }));
      if (navigator.vibrate) navigator.vibrate(10);
    } else {
      // Add it
      setEditingSheet(prev => ({
        ...prev,
        exercises: [...(prev.exercises || []), {
          exerciseId: catalogExercise.id,
          minSets: 3,
          maxSets: 5,
          reps: 5,
          weight: 0,
          restMinutes: 3,
          amrap: false,
          notes: '',
        }],
      }));
      if (navigator.vibrate) navigator.vibrate(15);
    }
  };

  const removeExerciseFromSheet = (index) => {
    const removed = editingSheet.exercises?.[index];
    const removedInfo = getExerciseInfo(removed.exerciseId);

    // Clear any previous undo
    if (undoExercise?.timer) clearTimeout(undoExercise.timer);

    // Start slide-out animation
    setRemovingExIdx(index);
    setExpandedExIdx(null);

    setTimeout(() => {
      setEditingSheet(prev => ({
        ...prev,
        exercises: (prev.exercises || []).filter((_, i) => i !== index),
      }));
      setRemovingExIdx(null);

      // Set up undo toast
      const timer = setTimeout(() => setUndoExercise(null), 5000);
      setUndoExercise({ exercise: removed, index, name: removedInfo.name, timer });
    }, 280);
  };

  const handleUndoRemove = () => {
    if (!undoExercise) return;
    clearTimeout(undoExercise.timer);
    setEditingSheet(prev => {
      const exercises = [...(prev.exercises || [])];
      const insertAt = Math.min(undoExercise.index, exercises.length);
      exercises.splice(insertAt, 0, undoExercise.exercise);
      return { ...prev, exercises };
    });
    setUndoExercise(null);
  };

  const updateExerciseInSheet = (index, field, value) => {
    setEditingSheet(prev => {
      const exercises = [...(prev.exercises || [])];
      exercises[index] = { ...exercises[index], [field]: value };
      return { ...prev, exercises };
    });
  };

  const moveExercise = (index, direction) => {
    setEditingSheet(prev => {
      const exercises = [...(prev.exercises || [])];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= exercises.length) return prev;
      [exercises[index], exercises[newIndex]] = [exercises[newIndex], exercises[index]];
      return { ...prev, exercises };
    });
  };



  const handleDragStart = (i) => {
    // Delay state change so browser captures high-quality drag image
    setTimeout(() => {
      setDragIdx(i);
    }, 0);
  };
  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    capturePositions();
    setEditingSheet(prev => {
      const exercises = [...(prev.exercises || [])];
      const [moved] = exercises.splice(dragIdx, 1);
      exercises.splice(i, 0, moved);
      return { ...prev, exercises };
    });
    setDragIdx(i);
  };
  const handleDragEnd = () => setDragIdx(null);

  const getExerciseInfo = (exId) => {
    return exerciseCatalog.find(e => e.id === exId) || defaultExercises[exId] || { name: exId, muscle: '' };
  };

  const getExerciseType = (exId) => {
    const item = exerciseCatalog.find(e => e.id === exId);
    return item ? item.type : 'accessory';
  };

  const renderExerciseIcon = (type, size = 16, color = "var(--text-primary)") => {
    if (type === 'compound') return <Dumbbell size={size} strokeWidth={2.4} color={color} />;
    if (type === 'conditioning') return <Zap size={size} strokeWidth={2.4} color={color} />;
    return <Sparkles size={size} strokeWidth={2.4} color={color} />;
  };



  const handleAssignRoutine = (dayKey, sheetId) => {
    // Already selected — do nothing
    if (schedule[dayKey] === sheetId || (!schedule[dayKey] && !sheetId)) return;
    const newSchedule = { ...schedule, [dayKey]: sheetId };
    saveRoutineSchedule(newSchedule);
    setSchedule(newSchedule);
    setDayPickerDay(null);
    showToast(`Schedule updated`, 'success');
  };

  const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

  return (
    <div className="page-content" style={{ paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: 0 }}>
          Workout Sheets
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '-0.01em', margin: '4px 0 0' }}>
          Create, customize, and schedule your weekly plans
        </p>
      </div>

      {/* Weekly Schedule */}
      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Weekly Schedule</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {WEEKDAYS.map(day => {
            const assignedSheetId = schedule[day.key];
            const isToday = day.key === todayKey;
            
            return (
              <div key={day.key} 
                onClick={() => setDayPickerDay(day.key)}
                className="sheet-btn"
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  cursor: 'pointer'
                }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{day.label}</div>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: assignedSheetId ? 'var(--text-primary)' : 'var(--bg-card)',
                  border: assignedSheetId ? '2px solid var(--text-primary)' : '2px dashed var(--border-light)',
                  boxShadow: assignedSheetId ? 'var(--shadow-sm)' : 'none',
                }}>
                   {assignedSheetId ? <Dumbbell size={18} color="var(--bg-primary)" strokeWidth={2.4} /> : <Moon size={16} color="var(--border-light)" strokeWidth={2} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sheets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        {sheets.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'var(--bg-card)',
            border: '2px dashed var(--border)',
            borderRadius: '20px',
            color: 'var(--text-tertiary)',
            fontSize: 13,
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <Dumbbell size={28} strokeWidth={1.5} color="var(--text-tertiary)" />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>No routines yet</span>
            <span>Create your first routine to start the commitment to being better.</span>
          </div>
        )}
        {sheets.map(sheet => {
          const isExpanded = expandedSheet === sheet.id;
          return (
            <div 
              key={sheet.id} 
              style={{
                background: 'var(--bg-card)',
                borderRadius: '20px',
                border: '2px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                padding: '16px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: deletingSheetId === sheet.id 
                  ? 'sheetsCardRemove 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards' 
                  : 'sheetsCardInsert 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              {/* Sheet Header */}
              <div
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => setExpandedSheet(isExpanded ? null : sheet.id)}
              >
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{sheet.name}</span>
                      {schedule[todayKey] === sheet.id && <Star size={12} fill="#333" color="#333" />}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      {sheet.exercises?.length || 0} exercises
                      {sheet.startDate && sheet.endDate && ` · ${sheet.startDate} to ${sheet.endDate}`}
                    </div>
                  </div>
                </div>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isExpanded ? <ChevronUp size={16} strokeWidth={2.4} color="var(--text-primary)" /> : <ChevronDown size={16} strokeWidth={2.4} color="var(--text-primary)" />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{
                  borderTop: '2px solid var(--border)',
                  marginTop: 12,
                  paddingTop: 12,
                  animation: 'sheetsContentExpand 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  overflow: 'hidden',
                }}>
                  {sheet.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.45 }}>{sheet.description}</div>
                  )}

                  {/* Exercise List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sheet.exercises?.map((ex, i) => {
                      const info = getExerciseInfo(ex.exerciseId);
                      const type = getExerciseType(ex.exerciseId);
                      return (
                        <div key={i} style={{
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 12,
                          padding: '12px 14px', 
                          background: 'var(--bg-secondary)', 
                          borderRadius: '14px',
                          border: '2px solid var(--border)',
                          boxShadow: 'var(--shadow-sm)',
                        }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            background: 'var(--bg-card)',
                            border: '2px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {renderExerciseIcon(type, 16)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{info.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {ex.minSets || ex.sets || 3}{ex.maxSets ? `-${ex.maxSets}` : ''} × {ex.reps}{ex.amrap ? '+' : ''} · Rest {ex.restMinutes}m
                            </div>
                          </div>
                          {ex.amrap && (
                            <span style={{ 
                              fontSize: 9, 
                              fontWeight: 700, 
                              background: 'var(--bg-tertiary)', 
                              color: 'var(--text-primary)', 
                              padding: '2px 6px', 
                              borderRadius: '100px', 
                              border: '2px solid var(--border)',
                              letterSpacing: '0.03em' 
                            }}>
                              AMRAP
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>

                    <button 
                      className="sheet-btn"
                      style={{
                        width: 38,
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-card)',
                        border: '2px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'pointer',
                      }} 
                      onClick={() => openEditSheet(sheet)}
                    >
                      <Edit3 size={14} strokeWidth={2.4} color="var(--text-primary)" />
                    </button>

                    <button
                      className="sheet-btn"
                      style={{ 
                        width: 38,
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-card)', 
                        color: 'var(--text-primary)',
                        border: '2px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(sheet.id); }}
                    >
                      <Trash2 size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create New Sheet Button */}
      <button 
        className="sheet-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          background: 'var(--text-primary)',
          color: 'var(--bg-primary)',
          border: '2px solid var(--border)',
          borderRadius: '14px',
          padding: '14px 20px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
        }} 
        onClick={openNewSheet}
      >
        <Plus size={16} strokeWidth={2.4} /> Create New Workout Sheet
      </button>

      {/* ===== DAY PICKER MODAL ===== */}
      <Modal
        isOpen={!!dayPickerDay}
        onClose={() => setDayPickerDay(null)}
        title={dayPickerDay ? `Select Routine for ${WEEKDAYS.find(d => d.key === dayPickerDay)?.label}` : ''}
        type="bottom-sheet"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16 }}>
          <button
            className="sheet-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '14px', background: !schedule[dayPickerDay] ? 'var(--bg-secondary)' : 'var(--bg-card)',
              borderRadius: '12px', border: '2px solid var(--border)', cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
            onClick={() => handleAssignRoutine(dayPickerDay, null)}
          >
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--bg-primary)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="var(--text-primary)" strokeWidth={2.4} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Rest Day (none)</div>
            {!schedule[dayPickerDay] && <Check size={18} strokeWidth={2.4} style={{ marginLeft: 'auto', color: 'var(--text-primary)' }} />}
          </button>
          
          {sheets.map(sheet => {
            const isAssigned = schedule[dayPickerDay] === sheet.id;
            return (
              <button
                key={sheet.id}
                className="sheet-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '14px', background: isAssigned ? 'var(--bg-secondary)' : 'var(--bg-card)',
                  borderRadius: '12px', border: '2px solid var(--border)', cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onClick={() => handleAssignRoutine(dayPickerDay, sheet.id)}
              >
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--text-primary)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Dumbbell size={16} color="var(--bg-primary)" strokeWidth={2.4} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{sheet.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sheet.exercises.length} exercises</div>
                </div>
                {isAssigned && <Check size={18} strokeWidth={2.4} style={{ marginLeft: 'auto', color: 'var(--text-primary)' }} />}
              </button>
            )
          })}
        </div>
      </Modal>

      {/* ===== SHEET EDITOR MODAL ===== */}
      {editingSheet && (
        <Modal
          isOpen={showEditor}
          onClose={() => { setShowEditor(false); setEditingSheet(null); }}
          type="bottom-sheet"
          hideHeader
        >
          {/* Custom header */}
          <div style={{
            position: 'sticky',
            top: -24,
            background: 'var(--bg-secondary)',
            zIndex: 101,
            margin: '-24px -20px 16px -20px',
            padding: '16px 20px 12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 800,
              margin: 0,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              flex: 1,
            }}>{editingSheet.id ? 'Edit Sheet' : 'New Sheet'}</h2>
            {editingSheet.exercises?.length > 0 ? (
              <button
                onClick={handleSaveSheet}
                disabled={!editingSheet.name.trim()}
                className="catalog-chip"
                style={{
                  background: editingSheet.name.trim() ? 'var(--text-primary)' : 'var(--bg-secondary)',
                  color: editingSheet.name.trim() ? 'var(--bg-primary)' : 'var(--text-tertiary)',
                  border: editingSheet.name.trim() ? 'none' : '1.5px solid var(--border)',
                  borderRadius: '100px',
                  padding: '7px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: editingSheet.name.trim() ? 'pointer' : 'default',
                }}
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => { setShowEditor(false); setEditingSheet(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  padding: 8,
                  margin: -8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 36,
                  minHeight: 36,
                }}
                aria-label="Close modal"
              >
                <X size={20} strokeWidth={2.2} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 16 }}>
            {/* Sheet Info Card */}
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '14px',
              border: '2px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}>
              {/* Row 1: Name */}
              <div className="ios-form-row" style={{
                padding: '12px 16px',
                borderBottom: '2px solid var(--border)',
              }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Sheet Name *</label>
                <input
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 0',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="e.g. Upper Body Power"
                  value={editingSheet.name}
                  onChange={e => setEditingSheet(p => ({ ...p, name: e.target.value }))}
                  onFocus={handleFocus}
                />
              </div>

              {/* Row 2: Description */}
              <div className="ios-form-row" style={{
                padding: '12px 16px',
                borderBottom: '2px solid var(--border)',
              }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Description</label>
                <input
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 0',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Brief description (optional)"
                  value={editingSheet.description || ''}
                  onChange={e => setEditingSheet(p => ({ ...p, description: e.target.value }))}
                  onFocus={handleFocus}
                />
              </div>

              {/* Row 3: Grid of Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div className="ios-form-row" style={{
                  padding: '12px 16px',
                  borderRight: '2px solid var(--border)',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    <Calendar size={11} strokeWidth={2.4} /> Start Date
                  </label>
                  <input
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 0',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    type="date"
                    value={editingSheet.startDate || ''}
                    onChange={e => setEditingSheet(p => ({ ...p, startDate: e.target.value }))}
                    onFocus={handleFocus}
                  />
                </div>
                <div className="ios-form-row" style={{
                  padding: '12px 16px',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    <Calendar size={11} strokeWidth={2.4} /> End Date
                  </label>
                  <input
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 0',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    type="date"
                    value={editingSheet.endDate || ''}
                    onChange={e => setEditingSheet(p => ({ ...p, endDate: e.target.value }))}
                    onFocus={handleFocus}
                  />
                </div>
              </div>
            </div>

            {/* Exercises in Sheet */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Exercises ({editingSheet.exercises?.length || 0})</span>
              </div>

              {(!editingSheet.exercises || editingSheet.exercises.length === 0) && (
                <button
                  onClick={() => { exercisesSnapshot.current = [...(editingSheet?.exercises || [])]; setShowCatalog(true); }}
                  style={{ padding: '28px 16px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '2px dashed var(--border)', boxShadow: 'var(--shadow-sm)', width: '100%', cursor: 'pointer' }}
                >
                  <Dumbbell size={28} strokeWidth={2.2} color="var(--text-tertiary)" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>No exercises added yet</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Tap here to add exercises</div>
                </button>
              )}

              <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(editingSheet.exercises || []).map((ex, i) => {
                  const info = getExerciseInfo(ex.exerciseId);
                  const type = getExerciseType(ex.exerciseId);
                  const isOpen = expandedExIdx === i;
                  const isDragging = dragIdx === i;
                  const currentReps = ex.reps || 5;
                  const currentSets = ex.minSets || ex.sets || 3;
                  const summary = `${currentSets} sets × ${currentReps}${ex.amrap ? '+' : ''} reps`;

                  const stepperBtnStyle = {
                    width: 28,
                    height: 28,
                    borderRadius: '8px',
                    border: '2px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    WebkitTapHighlightColor: 'transparent',
                    boxShadow: 'var(--shadow-sm)',
                  };

                  return (
                    <div
                      key={ex.exerciseId}
                      data-id={ex.exerciseId}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: isDragging ? 'var(--bg-secondary)' : 'var(--bg-card)',
                        borderRadius: '14px',
                        border: isDragging 
                          ? '2px dashed var(--border)' 
                          : (isOpen ? '2px solid var(--text-primary)' : '2px solid var(--border)'),
                        overflow: 'hidden',
                        transition: 'transform 0.38s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.25s ease, background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                        opacity: isDragging ? 0.3 : 1,
                        transform: isDragging ? 'scale(0.98)' : 'scale(1)',
                        boxShadow: isDragging ? 'none' : 'var(--shadow-sm)',
                        animation: removingExIdx === i
                          ? 'sheetsExRemove 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                          : 'sheetsExInsert 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                      }}
                    >
                      {/* Header */}
                      <div
                        onClick={() => setExpandedExIdx(isOpen ? null : i)}
                        style={{
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8, 
                          padding: '12px 14px',
                          cursor: 'pointer', 
                          userSelect: 'none',
                        }}
                      >
                        <GripVertical size={16} color="var(--border-light)" style={{ cursor: 'grab', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {renderExerciseIcon(type, 13)}
                            <span>{info.name}</span>
                          </div>
                          {!isOpen && (
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                              <span>{summary}</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="sheet-btn"
                          style={{ 
                            width: 28, 
                            height: 28, 
                            borderRadius: '8px',
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            border: '2px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            cursor: 'pointer',
                          }}
                          onClick={(e) => { e.stopPropagation(); removeExerciseFromSheet(i); }}
                        >
                          <Trash2 size={14} strokeWidth={2.4} />
                        </button>
                      </div>

                      {/* Inline Steppers */}
                      {isOpen && (
                        <div style={{
                          padding: '0 14px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          animation: 'sheetsExConfigExpand 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        }}>
                          {/* Steppers row */}
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {/* Sets stepper */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                              <button
                                type="button"
                                className="sheet-btn"
                                style={stepperBtnStyle}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  updateExerciseInSheet(i, 'minSets', Math.max(1, currentSets - 1));
                                }}
                              >
                                <Minus size={14} strokeWidth={2.5} />
                              </button>
                              <div style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{currentSets}</div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>sets</div>
                              </div>
                              <button
                                type="button"
                                className="sheet-btn"
                                style={stepperBtnStyle}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  updateExerciseInSheet(i, 'minSets', Math.min(10, currentSets + 1));
                                }}
                              >
                                <Plus size={14} strokeWidth={2.5} />
                              </button>
                            </div>

                            {/* Divider */}
                            <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

                            {/* Reps stepper */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                              <button
                                type="button"
                                className="sheet-btn"
                                style={stepperBtnStyle}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  updateExerciseInSheet(i, 'reps', Math.max(1, currentReps - 1));
                                }}
                              >
                                <Minus size={14} strokeWidth={2.5} />
                              </button>
                              <div style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{currentReps}</div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>reps</div>
                              </div>
                              <button
                                type="button"
                                className="sheet-btn"
                                style={stepperBtnStyle}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  updateExerciseInSheet(i, 'reps', Math.min(30, currentReps + 1));
                                }}
                              >
                                <Plus size={14} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>

                          {/* Muscle Map SVGs */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '4px 0',
                          }}>
                            <MuscleMap
                              exerciseIds={[ex.exerciseId]}
                              view="front"
                              size="sm"
                            />
                            <MuscleMap
                              exerciseIds={[ex.exerciseId]}
                              view="back"
                              size="sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add more row — only show when exercises exist */}
              {editingSheet.exercises?.length > 0 && (
                <button
                  type="button"
                  onClick={() => { exercisesSnapshot.current = [...(editingSheet?.exercises || [])]; setShowCatalog(true); }}
                  style={{
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    width: '100%',
                    background: 'none',
                    color: 'var(--text-tertiary)',
                    border: '1.5px dashed var(--border)',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} strokeWidth={2.4} /> Add more
                </button>
              )}
            </div>
          </div>

          {/* Undo Toast */}
          {undoExercise && (
            <div style={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 16px',
              background: 'var(--text-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderRadius: '14px',
              margin: '12px 0 0',
              border: '2px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              animation: 'sheetsExInsert 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Removed {undoExercise.name}
              </span>
              <button
                className="sheet-btn"
                onClick={handleUndoRemove}
                style={{
                  background: 'transparent',
                  color: '#FFFFFF',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  letterSpacing: '0.02em',
                }}
              >
                Undo
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* ===== EXERCISE CATALOG MODAL ===== */}
      <Modal
        isOpen={showCatalog}
        onClose={() => {
          if (exercisesSnapshot.current !== null) {
            setEditingSheet(prev => prev ? { ...prev, exercises: exercisesSnapshot.current } : prev);
            exercisesSnapshot.current = null;
          }
          setShowCatalog(false); setCatalogExpanded(false); catalogExpandedRef.current = false; setCatalogSearchOpen(false); setCatalogSearch('');
        }}
        type="bottom-sheet"
        fullscreen={catalogExpanded}
        onContentScroll={handleCatalogScroll}
        contentRef={catalogContentRef}
        hideHeader
      >
        {/* Unified header */}
        <div style={{
          position: 'sticky',
          top: -24,
          background: 'var(--bg-secondary)',
          zIndex: 101,
          margin: '-24px -20px 12px -20px',
          padding: '16px 20px 12px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, position: 'relative' }}>
            {/* Anatomy toggle — always visible, search expands up to it */}
            <button
              type="button"
              className={`anatomy-toggle${anatomyMode ? ' anatomy-toggle--active' : ''}`}
              onClick={() => setAnatomyMode(m => !m)}
              aria-label="Toggle muscle anatomy view"
              aria-pressed={anatomyMode}
              title="Show muscle anatomy"
            >
              <PersonStanding size={18} strokeWidth={2} />
            </button>
            {/* Title — always in DOM, hidden when search is open */}
            <h2 style={{
              fontSize: 20,
              fontWeight: 800,
              margin: 0,
              flex: catalogSearchOpen ? 0 : 1,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              opacity: catalogSearchOpen ? 0 : 1,
              width: catalogSearchOpen ? 0 : 'auto',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s ease, flex 0.2s ease',
              pointerEvents: catalogSearchOpen ? 'none' : 'auto',
            }}>Add Exercise
            </h2>

            {/* Search input — always in DOM, expanded when search is open */}
            <div style={{
              flex: catalogSearchOpen ? 1 : 0,
              width: catalogSearchOpen ? 'auto' : 0,
              opacity: catalogSearchOpen ? 1 : 0,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              transition: 'opacity 0.2s ease, flex 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              borderRadius: 10,
              border: '1.5px solid var(--border)',
              background: 'var(--bg-card)',
            }}>
              <Search size={15} strokeWidth={2.4} color="var(--text-tertiary)" style={{ position: 'absolute', left: 10, pointerEvents: 'none', zIndex: 1 }} />
              <input
                ref={catalogSearchRef}
                type="text"
                placeholder="Search exercises..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                tabIndex={catalogSearchOpen ? 0 : -1}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: 0,
                  border: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  color: 'inherit',
                }}
              />
            </div>

            {/* Action buttons */}
            {catalogSearchOpen ? (
              <button
                onClick={() => { setCatalogSearchOpen(false); setCatalogSearch(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  padding: 8,
                  margin: -8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 36,
                  minHeight: 36,
                }}
                aria-label="Close search"
              >
                <X size={20} strokeWidth={2.2} />
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={() => {
                    setCatalogSearchOpen(true);
                    requestAnimationFrame(() => {
                      catalogSearchRef.current?.focus({ preventScroll: true });
                    });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    padding: 8,
                    margin: -8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 36,
                    minHeight: 36,
                  }}
                  aria-label="Search exercises"
                >
                  <Search size={20} strokeWidth={2.2} />
                </button>
                <button
                  onClick={() => {
                    if (exercisesSnapshot.current !== null) {
                      setEditingSheet(prev => prev ? { ...prev, exercises: exercisesSnapshot.current } : prev);
                      exercisesSnapshot.current = null;
                    }
                    setShowCatalog(false); setCatalogExpanded(false); catalogExpandedRef.current = false; setCatalogSearchOpen(false); setCatalogSearch('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    padding: 8,
                    margin: -8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 36,
                    minHeight: 36,
                  }}
                  aria-label="Close modal"
                >
                  <X size={20} strokeWidth={2.2} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Exercise list grouped by category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(() => {
            const filtered = exerciseCatalog.filter(e => {
              if (!catalogSearch.trim()) return true;
              const q = catalogSearch.toLowerCase();
              return e.name.toLowerCase().includes(q) || 
                e.muscle.toLowerCase().includes(q) ||
                e.category.toLowerCase().includes(q);
            });
            const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

            if (sorted.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                  <AlertTriangle size={32} strokeWidth={2} style={{ marginBottom: 10, color: 'var(--text-tertiary)' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No Exercises Found</div>
                  <div style={{ fontSize: 12, marginBottom: 14 }}>Try adjusting your search terms.</div>
                  <button
                    className="sheet-btn"
                    onClick={() => setCatalogSearch('')}
                    style={{
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    Clear Search
                  </button>
                </div>
              );
            }

            return (
              <>
                {sorted.map((ex, i) => {
                  const alreadyAdded = editingSheet?.exercises?.some(e => e.exerciseId === ex.id);
                  return (
                    <button
                      key={ex.id}
                      className="catalog-item-anim"
                      onClick={() => toggleExerciseInSheet(ex)}
                      style={{
                        display: 'flex',
                        flexDirection: anatomyMode ? 'column' : 'row',
                        alignItems: anatomyMode ? 'stretch' : 'center',
                        gap: anatomyMode ? 8 : 12,
                        width: '100%',
                        padding: '12px 14px',
                        background: alreadyAdded ? '#f0fdf4' : 'var(--bg-card)',
                        borderRadius: '14px',
                        border: alreadyAdded ? '1.5px solid #86efac' : '1.5px solid var(--border)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxSizing: 'border-box',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        animationDelay: `${Math.min(i * 20, 300)}ms`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: alreadyAdded ? '50%' : '10px',
                          background: alreadyAdded ? '#22c55e' : 'var(--bg-secondary)',
                          border: alreadyAdded ? '1.5px solid #16a34a' : '1.5px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                        }}>
                          {alreadyAdded ? (
                            <Check size={16} strokeWidth={3} color="#FFFFFF" />
                          ) : (
                            renderExerciseIcon(ex.type, 16)
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: alreadyAdded ? '#15803d' : 'var(--text-primary)' }}>{ex.name}</div>
                          <div style={{ fontSize: 11, color: alreadyAdded ? '#4ade80' : 'var(--text-tertiary)', marginTop: 2, fontWeight: 600 }}>
                            {ex.muscle} · <span style={{ textTransform: 'capitalize' }}>{ex.category}</span>
                          </div>
                        </div>
                        {/* Eye banner button — floating top-right */}
                        {!anatomyMode && (
                          <div
                            className="catalog-eye-btn"
                            onClick={(e) => { e.stopPropagation(); setLongPressExercise(ex.id); }}
                            style={{
                              position: 'absolute',
                              right: -1,
                              top: -1,
                              padding: '4px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              color: '#fff',
                              cursor: 'pointer',
                              borderRadius: '0 13px 0 10px',
                              border: 'none',
                              background: '#1a1a1a',
                              WebkitTapHighlightColor: 'transparent',
                              transition: 'opacity 0.15s ease',
                              zIndex: 2,
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: '0.02em',
                            }}
                            aria-label={`View muscles for ${ex.name}`}
                          >
                            <PersonStanding size={12} strokeWidth={2.2} />
                          </div>
                        )}
                      </div>
                      {anatomyMode && (
                        <div className="catalog-muscle-inline">
                          <MuscleMapLazy
                            exerciseId={ex.id}
                            rootRef={catalogContentRef}
                            view="auto"
                            size="sm"
                            primaryColor={'#ef4444'}
                            secondaryColor={alreadyAdded ? '#fca5a5' : '#93c5fd'}
                            idleColor={alreadyAdded ? '#d1d5db' : '#e5e5e5'}
                          />
                        </div>
                      )}

                    </button>
                  );
                })}
              </>
            );
          })()}
        </div>
      </Modal>

      {/* ===== MUSCLE PREVIEW MODAL (Long-Press) ===== */}
      <Modal
        isOpen={!!longPressExercise}
        onClose={() => { setLongPressExercise(null); setPreviewExpanded(false); previewExpandedRef.current = false; }}
        type="bottom-sheet"
        fullscreen={previewExpanded}
        onContentScroll={handlePreviewScroll}
        contentRef={previewContentRef}
        hideHeader
      >
        {longPressExercise && (() => {
          const exData = defaultExercises[longPressExercise] || {};
          return (
            <div style={{ paddingBottom: 16 }}>
              {/* Custom sticky header */}
              <div style={{
                position: 'sticky',
                top: -24,
                background: 'var(--bg-secondary)',
                zIndex: 101,
                margin: '-24px -20px 16px -20px',
                padding: '16px 20px 12px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <h2 style={{
                  fontSize: 20,
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  flex: 1,
                }}>{exData.name || longPressExercise}</h2>
                <button
                  onClick={() => { setLongPressExercise(null); setPreviewExpanded(false); previewExpandedRef.current = false; }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    padding: 8,
                    margin: -8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 36,
                    minHeight: 36,
                  }}
                  aria-label="Close modal"
                >
                  <X size={20} strokeWidth={2.2} />
                </button>
              </div>

              <p className="muscle-preview-modal__muscles" style={{ textAlign: 'center', marginBottom: 16 }}>{exData.muscle || ''}</p>

              <div className="muscle-preview-modal__maps">
                <MuscleMap
                  exerciseIds={[longPressExercise]}
                  view="front"
                  size="lg"
                />
                <MuscleMap
                  exerciseIds={[longPressExercise]}
                  view="back"
                  size="lg"
                />
              </div>

            </div>
          );
        })()}
      </Modal>

      {/* Floating Done button — portaled above the blur overlay */}
      {showCatalog && !catalogExpanded && !longPressExercise && editingSheet?.exercises?.length > 0 && createPortal(
        <button
          className="catalog-done-btn"
          onClick={() => { exercisesSnapshot.current = null; setShowCatalog(false); setCatalogExpanded(false); catalogExpandedRef.current = false; setCatalogSearchOpen(false); setCatalogSearch(''); }}
          style={{
            position: 'fixed',
            bottom: 'calc(85vh + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10001,
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: '100px',
            padding: '10px 28px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }}
        >
          Done
        </button>,
        document.body
      )}

      {/* ===== DELETE CONFIRMATION ===== */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        type="centered-alert"
      >
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--bg-secondary)',
          border: '2px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          margin: '0 auto 12px'
        }}>
          <Trash2 size={22} strokeWidth={2.4} color="var(--text-primary)" />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, margin: 0 }}>Delete this sheet?</h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5, margin: '6px 0 20px', fontWeight: 600 }}>
          This action cannot be undone.
          {Object.values(schedule).includes(showDeleteConfirm) && ' It will be removed from your weekly schedule.'}
        </p>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button 
            className="sheet-btn"
            style={{ 
              flex: 1,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '2px solid var(--border)',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }} 
            onClick={() => setShowDeleteConfirm(null)}
          >
            Cancel
          </button>
          <button 
            className="sheet-btn"
            style={{ 
              flex: 1,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '2px solid var(--border)',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              boxShadow: 'var(--shadow-sm)',
            }} 
            onClick={(e) => { e.stopPropagation(); handleDelete(showDeleteConfirm); }}
          >
            <Trash2 size={12} strokeWidth={2.4} /> Delete
          </button>
        </div>
      </Modal>

      {/* ── Toast Notification ── */}
      {toast && createPortal(
        <div style={{
          position: 'fixed', 
          top: 'max(16px, env(safe-area-inset-top, 16px))', 
          left: '50%',
          display: 'flex', 
          justifyContent: 'center', 
          zIndex: 9999,
          animation: toast.phase === 'exit'
            ? 'toastSlideOut 0.3s ease-in forwards'
            : 'toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          pointerEvents: toast.phase === 'exit' ? 'none' : 'auto',
        }}>
          <div style={{
            background: toast.type === 'warning' ? 'rgba(180,80,20,0.92)' : 'rgba(17,17,17,0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '14px 24px', 
            borderRadius: 50, 
            fontSize: 13, 
            fontWeight: 700,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
          }}>
            {toast.type === 'success' ? (
              <Check size={16} strokeWidth={2.5} />
            ) : toast.type === 'warning' ? (
              <AlertTriangle size={16} strokeWidth={2.5} />
            ) : (
              <Check size={16} strokeWidth={2.5} />
            )}
            <span>{toast.message}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
