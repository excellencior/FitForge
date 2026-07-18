import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  getWorkoutSheets, saveWorkoutSheet, deleteWorkoutSheet,
  getRoutineSchedule, saveRoutineSchedule
} from '../utils/storage';
import { useModalLock, useInputFocus, useToast } from '../utils/ux';
import { exercises as defaultExercises } from '../data/workouts';
import Modal from '../components/Modal';
import {
  Plus, X, Trash2, Check, Edit3, ChevronDown, ChevronUp,
  Play, AlertTriangle, Dumbbell, RotateCcw, Zap, Star, Calendar,
  GripVertical, Sparkles, Search, Moon
} from 'lucide-react';

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
      from { transform: translateX(-50%) translateY(24px); opacity: 0; }
      to   { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes toastSlideOut {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to   { transform: translateX(-50%) translateY(24px); opacity: 0; }
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

const defaultSheets = [
  {
    id: 1780143765896,
    name: "CNS Strength Blueprint",
    description: "Personalized compound routine maximizing myofibrillar density and neural drive (1-5 rep range) based on your stats (72.7kg, 5'10\"). Squeeze the bar with a white-knuckle grip to activate full-body tension (irradiation).",
    isDefault: true,
    exercises: [
      { exerciseId: 'squat', minSets: 3, maxSets: 5, reps: 5, weight: 60, restMinutes: 4, amrap: false, notes: 'White-knuckle the bar and squeeze glutes. Rest 4m.' },
      { exerciseId: 'bench', minSets: 3, maxSets: 5, reps: 5, weight: 50, restMinutes: 4, amrap: true, notes: 'Crush the bar, brace stomach. Last set AMRAP. Rest 4m.' },
      { exerciseId: 'row', minSets: 3, maxSets: 5, reps: 5, weight: 45, restMinutes: 3, amrap: false, notes: 'Explode up, 2-sec slow eccentric control. Rest 3m.' },
      { exerciseId: 'ohp', minSets: 3, maxSets: 5, reps: 5, weight: 35, restMinutes: 4, amrap: true, notes: 'Stand tall, squeeze glutes. Last set AMRAP. Rest 4m.' },
      { exerciseId: 'deadlift', minSets: 1, maxSets: 3, reps: 5, weight: 70, restMinutes: 5, amrap: true, notes: 'Single high-effort work set. Pull with perfect form. Rest 5m.' },
    ],
  }
];

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
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogMuscle, setCatalogMuscle] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [expandedSheet, setExpandedSheet] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedExIdx, setExpandedExIdx] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [deletingSheetId, setDeletingSheetId] = useState(null);
  const [removingExIdx, setRemovingExIdx] = useState(null);
  const [undoExercise, setUndoExercise] = useState(null); // { exercise, index, timer }
  
  const handleFocus = useInputFocus();
  const { toast, show: showToast } = useToast();

  useModalLock(showEditor || showCatalog || !!showDeleteConfirm || !!dayPickerDay);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    let loaded = getWorkoutSheets();
    if (loaded.length === 0) {
      defaultSheets.forEach(s => saveWorkoutSheet({ ...s }));
      loaded = getWorkoutSheets();
    }
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

  const handleSetDefault = (sheet) => {
    const all = getWorkoutSheets();
    all.forEach(s => {
      if (s.isDefault) saveWorkoutSheet({ ...s, isDefault: false });
    });
    saveWorkoutSheet({ ...sheet, isDefault: true });
    loadData();
    showToast(`${sheet.name} set as default`, 'success');
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
    setEditingSheet({ ...sheet, exercises: [...sheet.exercises] });
    setShowEditor(true);
  };

  const handleSaveSheet = () => {
    if (!editingSheet.name.trim()) {
      showToast('Please enter a sheet name', 'warning');
      return;
    }
    if (editingSheet.exercises.length === 0) {
      showToast('Add at least one exercise', 'warning');
      return;
    }
    saveWorkoutSheet(editingSheet);
    setShowEditor(false);
    setEditingSheet(null);
    loadData();
    showToast(editingSheet.id ? 'Sheet updated' : 'Sheet created', 'success');
  };

  const addExerciseToSheet = (catalogExercise) => {
    setEditingSheet(prev => ({
      ...prev,
      exercises: [...prev.exercises, {
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
    showToast(`Added ${catalogExercise.name}`);
  };

  const removeExerciseFromSheet = (index) => {
    const removed = editingSheet.exercises[index];
    const removedInfo = getExerciseInfo(removed.exerciseId);

    // Clear any previous undo
    if (undoExercise?.timer) clearTimeout(undoExercise.timer);

    // Start slide-out animation
    setRemovingExIdx(index);
    setExpandedExIdx(null);

    setTimeout(() => {
      setEditingSheet(prev => ({
        ...prev,
        exercises: prev.exercises.filter((_, i) => i !== index),
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
      const exercises = [...prev.exercises];
      const insertAt = Math.min(undoExercise.index, exercises.length);
      exercises.splice(insertAt, 0, undoExercise.exercise);
      return { ...prev, exercises };
    });
    setUndoExercise(null);
  };

  const updateExerciseInSheet = (index, field, value) => {
    setEditingSheet(prev => {
      const exercises = [...prev.exercises];
      exercises[index] = { ...exercises[index], [field]: value };
      return { ...prev, exercises };
    });
  };

  const moveExercise = (index, direction) => {
    setEditingSheet(prev => {
      const exercises = [...prev.exercises];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= exercises.length) return prev;
      [exercises[index], exercises[newIndex]] = [exercises[newIndex], exercises[index]];
      return { ...prev, exercises };
    });
  };

  const autoOrderExercises = () => {
    setEditingSheet(prev => {
      const sorted = [...prev.exercises].sort((a, b) => {
        const pa = EXERCISE_PRIORITY[a.exerciseId] ?? 45;
        const pb = EXERCISE_PRIORITY[b.exerciseId] ?? 45;
        return pa - pb;
      });
      return { ...prev, exercises: sorted };
    });
    setExpandedExIdx(null);
    showToast('Exercises reordered optimally', 'success');
  };

  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setEditingSheet(prev => {
      const exercises = [...prev.exercises];
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

  const getAreaOrMuscleMatch = (ex, filter) => {
    if (filter === 'all') return true;
    const muscleGroup = (ex.muscleGroup || '').toLowerCase();
    const muscle = (ex.muscle || '').toLowerCase();
    const name = (ex.name || '').toLowerCase();

    if (filter === 'upper') {
      return ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'arms'].includes(muscleGroup) ||
             muscle.includes('chest') || muscle.includes('back') || muscle.includes('shoulder') ||
             muscle.includes('biceps') || muscle.includes('triceps') || muscle.includes('lats') ||
             muscle.includes('arms') || muscle.includes('delt') || muscle.includes('rotator');
    }
    if (filter === 'lower') {
      return ['legs', 'calves', 'quads', 'hamstrings'].includes(muscleGroup) ||
             muscle.includes('legs') || muscle.includes('quads') || muscle.includes('hamstrings') ||
             muscle.includes('glutes') || muscle.includes('calves') || muscle.includes('calf');
    }
    if (filter === 'chest') {
      return muscleGroup === 'chest' || muscle.includes('chest') || name.includes('pushup') || name.includes('bench') || name.includes('dip');
    }
    if (filter === 'back') {
      return muscleGroup === 'back' || muscle.includes('back') || muscle.includes('lats') || name.includes('pull') || name.includes('row');
    }
    if (filter === 'shoulders') {
      return muscleGroup === 'shoulders' || muscle.includes('shoulder') || muscle.includes('delt') || (name.includes('press') && !name.includes('bench'));
    }
    if (filter === 'biceps') {
      return muscleGroup === 'biceps' || muscle.includes('bicep') || name.includes('curl') || name.includes('chin-up');
    }
    if (filter === 'triceps') {
      return muscleGroup === 'triceps' || muscle.includes('tricep') || name.includes('pushdown') || name.includes('skull') || name.includes('dip');
    }
    if (filter === 'legs') {
      return muscleGroup === 'legs' || muscle.includes('legs') || muscle.includes('quad') || muscle.includes('hamstring') || muscle.includes('glute') || muscle.includes('calf') || muscle.includes('calves');
    }
    if (filter === 'core') {
      return muscleGroup === 'core' || muscle.includes('core') || muscle.includes('abs') || muscle.includes('oblique') || name.includes('plank') || name.includes('twist') || name.includes('raise');
    }
    return false;
  };

  const handleAssignRoutine = (dayKey, sheetId) => {
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
            <Star size={24} strokeWidth={1.5} color="var(--border-light)" />
            <span>No plans created. Create a new plan using the button below.</span>
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
                      {sheet.isDefault && <Star size={12} fill="#333" color="#333" />}
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
                              {ex.minSets || ex.sets || 3}{ex.maxSets ? `-${ex.maxSets}` : ''} × {ex.reps}{ex.amrap ? '+' : ''} · {ex.weight > 0 ? `${ex.weight}kg` : 'No weight'} · Rest {ex.restMinutes}m
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
                    {!sheet.isDefault && (
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
                        onClick={() => handleSetDefault(sheet)} 
                        title="Set as default"
                      >
                        <Star size={14} strokeWidth={2.4} color="var(--text-primary)" />
                      </button>
                    )}

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
          title={editingSheet.id ? 'Edit Sheet' : 'New Workout Sheet'}
          type="bottom-sheet"
        >
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
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Exercises ({editingSheet.exercises.length})</span>
                {editingSheet.exercises.length >= 2 && (
                  <button
                    type="button"
                    className="sheet-btn"
                    style={{ 
                      background: 'var(--bg-card)', 
                      color: 'var(--text-primary)', 
                      fontSize: 11, 
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                       border: '2px solid var(--border)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    onClick={autoOrderExercises}
                  >
                    <Sparkles size={12} strokeWidth={2.4} /> Optimize Order
                  </button>
                )}
              </div>

              {editingSheet.exercises.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '2px dashed var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <Dumbbell size={28} strokeWidth={2.2} color="var(--text-tertiary)" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>No exercises added yet</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Tap "Add Exercise" below</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {editingSheet.exercises.map((ex, i) => {
                  const info = getExerciseInfo(ex.exerciseId);
                  const type = getExerciseType(ex.exerciseId);
                  const isOpen = expandedExIdx === i;
                  const tierColor = getTierColor(ex.exerciseId);
                  const tierLabel = getTierLabel(ex.exerciseId);
                  const isDragging = dragIdx === i;
                  const summary = `${ex.minSets || ex.sets || 3}-${ex.maxSets || ex.minSets || ex.sets || 5} × ${ex.reps}${ex.amrap ? '+' : ''} · ${ex.weight > 0 ? ex.weight + 'kg' : '—'} · ${ex.restMinutes}m rest`;

                  return (
                    <div
                      key={i}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: 'var(--bg-card)',
                        borderRadius: '14px',
                        border: '2px solid var(--border)',
                        overflow: 'hidden',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        opacity: isDragging ? 0.4 : 1,
                        transform: isDragging ? 'scale(0.96)' : 'scale(1)',
                        boxShadow: isDragging ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                        animation: removingExIdx === i
                          ? 'sheetsExRemove 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                          : 'sheetsExInsert 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                      }}
                    >
                      {/* Collapsed Header */}
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
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            <span>{summary}</span>
                          </div>
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

                      {/* Expanded Config */}
                      {isOpen && (
                        <div className="ex-config-container" style={{ padding: '0 14px 14px', borderTop: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
                          <div style={{ display: 'flex', gap: 4, marginTop: 10, marginBottom: 10 }}>
                            <button 
                              type="button" 
                              className="sheet-btn"
                              style={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: '8px',
                                background: 'var(--bg-card)',
                                border: '2px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-sm)',
                              }} 
                              onClick={() => moveExercise(i, -1)} 
                              disabled={i === 0}
                            >
                              <ChevronUp size={14} strokeWidth={2.4} color={i === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)'} />
                            </button>
                            <button 
                              type="button" 
                              className="sheet-btn"
                              style={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: '8px',
                                background: 'var(--bg-card)',
                                border: '2px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-sm)',
                              }} 
                              onClick={() => moveExercise(i, 1)} 
                              disabled={i === editingSheet.exercises.length - 1}
                            >
                              <ChevronDown size={14} strokeWidth={2.4} color={i === editingSheet.exercises.length - 1 ? 'var(--text-tertiary)' : 'var(--text-primary)'} />
                            </button>
                            <div style={{ flex: 1, fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: 600 }}>
                              Targeting: {info.muscle}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase' }}>Min Sets</label>
                              <input 
                                type="number" 
                                inputMode="numeric" 
                                min="1" 
                                max="10" 
                                style={{ 
                                  width: '100%', 
                                  background: 'var(--bg-card)', 
                                  border: '2px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: 'var(--text-primary)',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.2s',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                                value={ex.minSets || ex.sets || 3} 
                                onChange={e => updateExerciseInSheet(i, 'minSets', +e.target.value)} 
                                onFocus={handleFocus}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase' }}>Max Sets</label>
                              <input 
                                type="number" 
                                inputMode="numeric" 
                                min="1" 
                                max="10" 
                                style={{ 
                                  width: '100%', 
                                  background: 'var(--bg-card)', 
                                  border: '2px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: 'var(--text-primary)',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.2s',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                                value={ex.maxSets || ex.minSets || ex.sets || 5} 
                                onChange={e => updateExerciseInSheet(i, 'maxSets', +e.target.value)} 
                                onFocus={handleFocus}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase' }}>Reps</label>
                              <input 
                                type="number" 
                                inputMode="numeric" 
                                min="1" 
                                max="30" 
                                style={{ 
                                  width: '100%', 
                                  background: 'var(--bg-card)', 
                                  border: '2px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: 'var(--text-primary)',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.2s',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                                value={ex.reps} 
                                onChange={e => updateExerciseInSheet(i, 'reps', +e.target.value)} 
                                onFocus={handleFocus}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase' }}>Weight (kg)</label>
                              <input 
                                type="number" 
                                inputMode="decimal" 
                                min="0" 
                                step="0.5" 
                                style={{ 
                                  width: '100%', 
                                  background: 'var(--bg-card)', 
                                  border: '2px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: 'var(--text-primary)',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.2s',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                                placeholder="0" 
                                value={ex.weight || ''} 
                                onChange={e => updateExerciseInSheet(i, 'weight', +e.target.value)} 
                                onFocus={handleFocus}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase' }}>Rest (min)</label>
                              <input 
                                type="number" 
                                inputMode="decimal" 
                                min="0.5" 
                                max="10" 
                                step="0.5" 
                                style={{ 
                                  width: '100%', 
                                  background: 'var(--bg-card)', 
                                  border: '2px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: 'var(--text-primary)',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.2s',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                                value={ex.restMinutes} 
                                onChange={e => updateExerciseInSheet(i, 'restMinutes', +e.target.value)} 
                                onFocus={handleFocus}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                              <button
                                type="button"
                                className="sheet-btn"
                                onClick={() => updateExerciseInSheet(i, 'amrap', !ex.amrap)}
                                style={{
                                  width: '100%',
                                  height: '37px',
                                  background: ex.amrap ? 'var(--text-primary)' : 'var(--bg-card)',
                                  color: ex.amrap ? 'var(--bg-primary)' : 'var(--text-primary)',
                                  border: '2px solid var(--border)',
                                  borderRadius: '10px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  boxShadow: 'var(--shadow-sm)'
                                }}
                              >
                                <Check size={14} strokeWidth={2.4} color={ex.amrap ? 'var(--bg-primary)' : 'var(--text-tertiary)'} />
                                AMRAP
                              </button>
                            </div>
                          </div>

                          <input
                            style={{
                              width: '100%',
                              background: 'var(--bg-card)',
                              border: '2px solid var(--border)',
                              borderRadius: '10px',
                              padding: '8px 10px',
                              fontSize: 12,
                              outline: 'none',
                              color: 'var(--text-primary)',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                            placeholder="Notes (optional)"
                            value={ex.notes || ''} 
                            onChange={e => updateExerciseInSheet(i, 'notes', e.target.value)}
                            onFocus={handleFocus}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Exercise Button */}
              <button
                type="button"
                className="sheet-btn"
                style={{ 
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
                onClick={() => setShowCatalog(true)}
              >
                <Plus size={14} strokeWidth={2.4} /> Add Exercise
              </button>
            </div>

            {/* Save Button */}
            <button
              className="sheet-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                background: editingSheet.name.trim() ? 'var(--text-primary)' : 'var(--bg-secondary)',
                color: editingSheet.name.trim() ? 'var(--bg-primary)' : 'var(--text-tertiary)',
                border: '2px solid var(--border)',
                borderRadius: '14px',
                padding: '14px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: editingSheet.name.trim() ? 'pointer' : 'default',
                boxShadow: 'var(--shadow-sm)',
              }}
              onClick={handleSaveSheet}
              disabled={!editingSheet.name.trim()}
            >
              <Check size={16} strokeWidth={2.4} /> {editingSheet.id ? 'Save Changes' : 'Create Sheet'}
            </button>
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
        onClose={() => setShowCatalog(false)}
        title="Add Exercise"
        type="bottom-sheet"
      >
        <div style={{
          position: 'relative',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingTop: 12,
          paddingBottom: 12,
          borderBottom: '2px solid var(--border)',
          margin: '0 -20px 12px -20px',
          paddingLeft: 20,
          paddingRight: 20,
        }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={16} strokeWidth={2.4} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search exercises..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '10px',
                border: '2px solid var(--border)',
                background: 'var(--bg-card)',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)',
              }}
              onFocus={handleFocus}
            />
            {catalogSearch && (
              <button
                onClick={() => setCatalogSearch('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            )}
          </div>

          {/* Primary Category selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'strength', label: 'Strength' },
              { id: 'calisthenics', label: 'Calisthenics' },
              { id: 'cardio', label: 'Cardio' },
              { id: 'mobility', label: 'Mobility' }
            ].map(c => {
              const isAct = catalogCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCatalogCategory(c.id)}
                  className="sheet-chip"
                  style={{
                    flexShrink: 0,
                    background: isAct ? 'var(--text-primary)' : 'var(--bg-card)',
                    color: isAct ? 'var(--bg-primary)' : 'var(--text-primary)',
                    border: '2px solid var(--border)',
                    borderRadius: '100px',
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Secondary Muscle selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'all', label: 'All Areas' },
              { id: 'upper', label: 'Upper Body' },
              { id: 'lower', label: 'Lower Body' },
              { id: 'chest', label: 'Chest' },
              { id: 'back', label: 'Back' },
              { id: 'shoulders', label: 'Shoulder' },
              { id: 'biceps', label: 'Biceps' },
              { id: 'triceps', label: 'Triceps' },
              { id: 'legs', label: 'Legs' },
              { id: 'core', label: 'Core' }
            ].map(m => {
              const isAct = catalogMuscle === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setCatalogMuscle(m.id)}
                  className="sheet-chip"
                  style={{
                    flexShrink: 0,
                    background: isAct ? 'var(--text-primary)' : 'var(--bg-card)',
                    color: isAct ? 'var(--bg-primary)' : 'var(--text-primary)',
                    border: '2px solid var(--border)',
                    borderRadius: '100px',
                    padding: '5px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exercise list grouped by category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(() => {
            const filtered = exerciseCatalog.filter(e => {
              const matchesSearch = !catalogSearch.trim() || 
                e.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                e.muscle.toLowerCase().includes(catalogSearch.toLowerCase());
              const matchesCategory = catalogCategory === 'all' || e.category === catalogCategory;
              const matchesMuscle = getAreaOrMuscleMatch(e, catalogMuscle);
              return matchesSearch && matchesCategory && matchesMuscle;
            });

            const categoryGroups = [
              { id: 'strength', name: 'Strength Training', icon: <Dumbbell size={14} strokeWidth={2.4} /> },
              { id: 'calisthenics', name: 'Calisthenics & Bodyweight', icon: <Zap size={14} strokeWidth={2.4} /> },
              { id: 'cardio', name: 'Cardio & Conditioning', icon: <Play size={14} strokeWidth={2.4} /> },
              { id: 'mobility', name: 'Mobility & Warm-up', icon: <RotateCcw size={14} strokeWidth={2.4} /> }
            ];

            const grouped = categoryGroups.map(group => {
              const items = filtered.filter(e => e.category === group.id);
              return { ...group, items };
            }).filter(group => group.items.length > 0);

            if (grouped.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                  <AlertTriangle size={32} strokeWidth={2} style={{ marginBottom: 10, color: 'var(--text-tertiary)' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No Exercises Found</div>
                  <div style={{ fontSize: 12, marginBottom: 14 }}>Try adjusting your search terms or filters.</div>
                  <button
                    className="sheet-btn"
                    onClick={() => {
                      setCatalogSearch('');
                      setCatalogCategory('all');
                      setCatalogMuscle('all');
                    }}
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
                    Reset Filters
                  </button>
                </div>
              );
            }

            return grouped.map(group => (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Category Header */}
                <div style={{
                  position: 'sticky',
                  top: 40,
                  background: 'var(--bg-secondary)',
                  zIndex: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-tertiary)',
                  padding: '12px 20px 6px 20px',
                  borderBottom: '2px solid var(--border)',
                  margin: '0 -20px 8px -20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{ display: 'flex' }}>{group.icon}</span>
                  <span>{group.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)' }}>({group.items.length})</span>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(ex => {
                    const addedCount = editingSheet?.exercises.filter(e => e.exerciseId === ex.id).length || 0;
                    const alreadyAdded = addedCount > 0;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => addExerciseToSheet(ex)}
                        className="sheet-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          padding: '12px 14px',
                          background: alreadyAdded ? 'var(--bg-secondary)' : 'var(--bg-card)',
                          borderRadius: '14px',
                          border: '2px solid var(--border)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxSizing: 'border-box',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
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
                          {renderExerciseIcon(ex.type, 16)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{ex.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 600 }}>
                            {ex.muscle} · <span style={{ textTransform: 'capitalize' }}>{ex.category}</span>
                          </div>
                        </div>
                        {alreadyAdded ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ 
                              fontSize: 9, 
                              fontWeight: 700, 
                              background: 'var(--bg-primary)', 
                              color: 'var(--text-primary)',
                              border: '2px solid var(--border)',
                              padding: '2px 6px', 
                              borderRadius: '100px', 
                              letterSpacing: '0.03em',
                              animation: 'sheetsAddPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                            }}>
                              {addedCount}× Added
                            </span>
                            <Plus size={16} strokeWidth={2.4} color="var(--text-primary)" />
                          </div>
                        ) : (
                          <Plus size={16} strokeWidth={2.4} color="var(--text-primary)" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      </Modal>

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
          bottom: 100, 
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
