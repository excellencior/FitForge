import { useState, useMemo, useRef, useCallback } from 'react';
import Modal from '../components/Modal';
import {
  Plus, Search, X, Trash2, ChevronDown, ChevronUp, Droplets, AlertTriangle,
  Sun, CloudSun, Moon, Cookie, Circle, Check, ChevronLeft, ChevronRight, CalendarCheck
} from 'lucide-react';
import foods, { foodCategories } from '../data/foods';
import { getDietByDate, saveDietLog, removeDietEntry, getToday, getSettings, getWorkoutsByDate } from '../utils/storage';
import { useModalLock, useInputFocus, useDebounce, useToast } from '../utils/ux';



/* ──────────────────── helpers ──────────────────── */
const fmtDate = (d) => {
  const [year, month, day] = d.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-BD', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const shiftDate = (d, n) => {
  const [year, month, day] = d.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + n);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};


/** Generate days grid for month calendar */
const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  const firstDayIndex = date.getDay();
  
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({ date: d, isCurrentMonth: false });
  }
  
  const numDays = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= numDays; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d, isCurrentMonth: true });
  }
  
  const remaining = days.length % 7;
  if (remaining > 0) {
    for (let i = 1; i <= 7 - remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }
  }
  return days;
};

const formatDateString = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
};

const formatCalVal = (val) => {
  if (val >= 1000) {
    return `${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return val;
};


const MEAL_ICONS = {
  breakfast: <Sun size={18} strokeWidth={2.2} />,
  lunch: <CloudSun size={18} strokeWidth={2.2} />,
  dinner: <Moon size={18} strokeWidth={2.2} />,
  snacks: <Cookie size={18} strokeWidth={2.2} />,
};

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', labelbn: 'সকালের নাস্তা' },
  { key: 'lunch', label: 'Lunch', labelbn: 'দুপুরের খাবার' },
  { key: 'dinner', label: 'Dinner', labelbn: 'রাতের খাবার' },
  { key: 'snacks', label: 'Snacks', labelbn: 'নাস্তা' },
];

const MULTIPLIERS = [0.5, 1, 1.5, 2, 3];

/** Category → color map for the small dot in the modal food list */
const CAT_COLORS = {
  rice_bread: 'var(--carbs-color)',  // Amber / Warning
  fish: 'var(--protein-color)',      // Indigo / Accent Blue
  meat: 'var(--danger)',             // Rose / Danger
  egg_dairy: 'var(--warning)',       // Amber / Warning
  dal_legume: 'var(--text-tertiary)',// Muted gray
  vegetable: 'var(--success)',       // Emerald
  fruit: 'var(--accent-purple)',     // Violet
  snack: 'var(--danger)',            // Rose
  drink: 'var(--info)',              // Blue
  supplement: 'var(--accent-purple)',// Violet
};

/* ──────────────────── component ──────────────────── */
export default function Diet() {
  const settings = getSettings();
  const [date, setDate] = useState(getToday());
  const [slideDirection, setSlideDirection] = useState('right');
  const [slideKey, setSlideKey] = useState(getToday());
  const [entries, setEntries] = useState(() => getDietByDate(getToday()));

  const handleDateShift = (direction) => {
    const nextDate = shiftDate(date, direction);
    if (nextDate === date) return;
    if (direction < 0) {
      setSlideDirection('right');
    } else {
      setSlideDirection('left');
    }
    setDate(nextDate);
    setSlideKey(nextDate);
  };
  // Calendar History states
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(getToday());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const handleDateChange = (newDate) => {
    if (newDate === date) return;
    if (newDate < date) {
      setSlideDirection('right');
    } else {
      setSlideDirection('left');
    }
    setDate(newDate);
    setSlideKey(newDate);
  };

  const getCaloriesOutForDate = useCallback((dateStr) => {
    const workouts = getWorkoutsByDate(dateStr);
    const userWeight = parseFloat(settings.weightKg) || 70;
    return workouts.reduce((total, w) => {
      if (w.caloriesBurnt) return total + w.caloriesBurnt;
      const duration = w.duration || 45;
      const burnt = Math.round(5.0 * 3.5 * userWeight / 200 * duration);
      return total + burnt;
    }, 0);
  }, [settings.weightKg]);

  const calendarDateMeals = useMemo(() => {
    return getDietByDate(selectedCalendarDate);
  }, [selectedCalendarDate]);

  const calendarDays = useMemo(() => {
    return getDaysInMonth(calendarYear, calendarMonth);
  }, [calendarYear, calendarMonth]);

  const touchStartRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartRef.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        handlePrevMonth();
      } else {
        handleNextMonth();
      }
    }
    touchStartRef.current = null;
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(y => y - 1);
    } else {
      setCalendarMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(y => y + 1);
    } else {
      setCalendarMonth(m => m + 1);
    }
  };

  const calendarDaysData = useMemo(() => {
    return calendarDays.map(day => {
      const dateStr = formatDateString(day.date);
      const caloriesIn = getDietByDate(dateStr).reduce((sum, e) => sum + (e.calories || 0), 0);
      const caloriesOut = getCaloriesOutForDate(dateStr);
      return {
        ...day,
        dateStr,
        caloriesIn,
        caloriesOut,
      };
    });
  }, [calendarDays, getCaloriesOutForDate]);

  const calendarTotals = useMemo(() => {
    return calendarDateMeals.reduce((a, e) => ({
      calories: a.calories + (e.calories || 0),
      protein: a.protein + (e.protein || 0),
      carbs: a.carbs + (e.carbs || 0),
      fat: a.fat + (e.fat || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [calendarDateMeals]);

  const calendarMealEntries = useMemo(() => {
    const grouped = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    calendarDateMeals.forEach(e => {
      if (grouped[e.meal]) grouped[e.meal].push(e);
    });
    return grouped;
  }, [calendarDateMeals]);

  const [expanded, setExpanded] = useState({ breakfast: true, lunch: true, dinner: true, snacks: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMeal, setModalMeal] = useState('breakfast');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [multipliers, setMultipliers] = useState({});
  const [expandedFoodId, setExpandedFoodId] = useState(null);
  const [water, setWater] = useState(() => {
    const stored = localStorage.getItem('fitforge_water_' + getToday());
    return stored ? Number(stored) : 0;
  });
  const [flashId, setFlashId] = useState(null); // for delete flash
  const [lastWaterIdx, setLastWaterIdx] = useState(-1); // for water popIn
  const [prevDate, setPrevDate] = useState(date);

  if (date !== prevDate) {
    setPrevDate(date);
    setEntries(getDietByDate(date));
    const storedWater = localStorage.getItem(`fitforge_water_${date}`);
    setWater(storedWater ? Number(storedWater) : 0);
    setLastWaterIdx(-1);
  }

  const searchInputRef = useRef(null);
  const onFocusInput = useInputFocus();
  const debounceAdd = useDebounce(450);
  const { toast, show: showToast } = useToast();

  /* lock background scroll when modal is open */
  useModalLock(modalOpen || calendarOpen);

  /* targets from settings */
  const targets = useMemo(() => ({
    calories: settings.calorieTarget || 2900,
    protein: settings.proteinTarget || 160,
    carbs: settings.carbsTarget || 360,
    fat: settings.fatTarget || 80,
  }), [settings.calorieTarget, settings.proteinTarget, settings.carbsTarget, settings.fatTarget]);
  
  const waterTarget = 12;

  /* memoize today to prevent running layout helpers repeatedly */
  const today = useMemo(() => getToday(), []);





  /* computed totals */
  const totals = useMemo(() => entries.reduce((a, e) => ({
    calories: a.calories + (e.calories || 0),
    protein: a.protein + (e.protein || 0),
    carbs: a.carbs + (e.carbs || 0),
    fat: a.fat + (e.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [entries]);

  /* meals grouped */
  const mealEntries = useMemo(() => {
    const grouped = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    entries.forEach(e => {
      if (grouped[e.meal]) grouped[e.meal].push(e);
    });
    return grouped;
  }, [entries]);


  /* protein alert threshold */
  const isToday = date === today;
  const showProteinWarning = useMemo(() => {
    const h = new Date().getHours();
    return isToday && h >= 17 && totals.protein < targets.protein * 0.5;
  }, [isToday, totals.protein, targets.protein]);

  /* filtered food list for modal */
  const filteredFoods = useMemo(() => {
    let list = foods;
    if (catFilter !== 'all') list = list.filter(f => f.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.namebn.includes(q) ||
        f.category.includes(q)
      );
    }
    return list;
  }, [search, catFilter]);

  /* actions */
  const handleAdd = useCallback((food, meal) => {
    if (!debounceAdd()) return;
    let mult = multipliers[food.id];
    if (mult === undefined || mult === '' || isNaN(mult) || mult <= 0) {
      mult = 1;
    }
    const entry = {
      foodId: food.id,
      name: food.name,
      namebn: food.namebn,
      meal,
      serving: food.serving,
      multiplier: mult,
      calories: Math.round(food.calories * mult),
      protein: Math.round(food.protein * mult * 10) / 10,
      carbs: Math.round(food.carbs * mult * 10) / 10,
      fat: Math.round(food.fat * mult * 10) / 10,
      date,
    };
    saveDietLog(entry);
    setEntries(getDietByDate(date));
    setMultipliers(p => ({ ...p, [food.id]: 1 }));
    showToast(`Added ${food.namebn || food.name}`);
  }, [multipliers, date, debounceAdd, showToast]);

  const handleRemove = (id, name) => {
    setFlashId(id);
    showToast(`Removed ${name}`, 'error');
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    setTimeout(() => {
      removeDietEntry(id);
      setEntries(getDietByDate(date));
      setFlashId(null);
    }, 280);
  };

  const openModal = (mealKey) => {
    setModalMeal(mealKey);
    setSearch('');
    setCatFilter('all');
    setMultipliers({});
    setModalOpen(true);
  };

  const addWater = () => {
    const next = Math.min(water + 1, 20);
    setLastWaterIdx(next - 1);
    setWater(next);
    localStorage.setItem(`fitforge_water_${date}`, next);
  };

  const removeWater = () => {
    const next = Math.max(water - 1, 0);
    setLastWaterIdx(-1);
    setWater(next);
    localStorage.setItem(`fitforge_water_${date}`, next);
  };

  /* calorie ring math — guard against divide-by-zero */
  const calPct = targets.calories > 0 ? Math.min(totals.calories / targets.calories, 1) : 0;
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dash = calPct * circ;

  return (
    <div className="page-content" style={s.page}>

      {/* ───── Header Top Bar ───── */}
      <div style={s.headerTopBar}>
        <h1 style={s.pageTitle}>Diet Tracker</h1>
        <button
          style={s.logoContainer}
          onClick={() => {
            setSelectedCalendarDate(date);
            setCalendarOpen(true);
          }}
          className="sheet-btn"
          aria-label="Open calendar history"
        >
          <CalendarCheck size={20} strokeWidth={2.2} color="#007AFF" />
        </button>
      </div>

      {/* ── Toast Notification (positioned elegantly above bottom navigation) ── */}
      {toast && (
        <div key={toast.id} style={s.toast}>
          <div style={{
            ...s.toastInner,
            background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
          }}>
            {toast.type === 'success' ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
            {toast.message}
          </div>
        </div>
      )}

      {/* ── Protein Warning Banner ── */}
      {showProteinWarning && (
        <div style={s.warning}>
          <AlertTriangle size={18} color="#FF9500" strokeWidth={2.2} />
          <span style={s.warningText}>Low on protein today! Consider adding boiled eggs, chicken breast, or dal.</span>
        </div>
      )}

      {/* ── Header / Date Navigator ── */}
      <div style={s.dateNav}>
        <button 
          style={s.dateBtn} 
          onClick={() => handleDateShift(-1)}
          aria-label="Previous Day"
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
        </button>
        <div style={s.dateLabel}>
          <span style={s.dateText}>{fmtDate(date)}</span>
          {isToday && <span style={s.dateBadge}>Today</span>}
        </div>
        <button
          style={{ ...s.dateBtn, ...(date >= today ? s.dateBtnDisabled : {}) }}
          onClick={() => handleDateShift(1)}
          disabled={date >= today}
          aria-label="Next Day"
        >
          <ChevronRight size={20} strokeWidth={2.2} />
        </button>
      </div>

      {/* Date-switching animated container wrapper */}
      <div 
        key={slideKey} 
        className={slideDirection === 'left' ? 'slide-in-from-right' : 'slide-in-from-left'}
        style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        {/* ── Daily Summary Card ── */}
        <div style={s.summaryCard}>
          <div style={s.summaryTop}>
            {/* Calorie Ring */}
            <div style={s.ringWrap}>
              <svg 
                viewBox="0 0 120 120" 
                style={{
                  ...s.ringSvg,
                  filter: totals.calories >= targets.calories 
                    ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.45))' 
                    : 'none',
                  transition: 'filter 0.3s ease',
                }}
              >
                <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth="9" />
                <circle
                  cx="60" cy="60" r={radius}
                  fill="none"
                  stroke="var(--accent-blue)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ}`}
                  transform="rotate(-90 60 60)"
                  style={{
                    transition: 'stroke-dasharray 0.5s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
                    animation: 'dietRingDraw 0.8s ease-out',
                  }}
                />
              </svg>
              <div style={s.ringInner}>
                <span style={s.ringVal}>{totals.calories}</span>
                <span style={s.ringUnit}>/ {targets.calories}</span>
                <span style={s.ringLabel}>kcal</span>
              </div>
            </div>

            {/* Macro Progress Grid */}
            <div style={s.macros}>
              <MacroRow label="Protein" value={totals.protein} target={targets.protein} unit="g" color="var(--protein-color)" />
              <MacroRow label="Carbs" value={totals.carbs} target={targets.carbs} unit="g" color="var(--carbs-color)" />
              <MacroRow label="Fat" value={totals.fat} target={targets.fat} unit="g" color="var(--fat-color)" />
            </div>
          </div>
          
          <div style={s.remaining}>
            {totals.calories < targets.calories
              ? <span>{targets.calories - totals.calories} kcal left to reach target</span>
              : <span style={s.overText}>Exceeded target by {totals.calories - targets.calories} kcal</span>}
          </div>
        </div>

        {/* ── Meal Cards ── */}
        <div style={s.mealList}>
        {MEALS.map(meal => {
          const items = mealEntries[meal.key] || [];
          const mealCal = items.reduce((sum, e) => sum + e.calories, 0);
          const isOpen = expanded[meal.key];
          return (
            <div key={meal.key} style={s.mealCard}>
              <button style={s.mealHeader} onClick={() => setExpanded(p => ({ ...p, [meal.key]: !p[meal.key] }))}>
                <div style={s.mealLeft}>
                  <span style={s.mealIcon}>{MEAL_ICONS[meal.key]}</span>
                  <div>
                    <span style={s.mealTitle}>{meal.label}</span>
                    <span style={s.mealTitleBn}>{meal.labelbn}</span>
                  </div>
                </div>
                <div style={s.mealRight}>
                  <span style={s.mealCal}>{mealCal} kcal</span>
                  {isOpen ? <ChevronUp size={16} strokeWidth={2.2} /> : <ChevronDown size={16} strokeWidth={2.2} />}
                </div>
              </button>

              {isOpen && (
                <div style={s.mealBody}>
                  {items.length === 0 ? (
                    <p style={s.mealEmpty}>No logs for this meal</p>
                  ) : (
                    <div style={s.foodRows}>
                      {items.map(item => (
                        <div
                          key={item.id}
                          style={{
                            ...s.foodItem,
                            ...(flashId === item.id ? { animation: 'dietRowFlash 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards' } : {}),
                          }}
                        >
                          <div style={s.foodInfo}>
                            <span style={s.foodName}>{item.namebn || item.name}</span>
                            <span style={s.foodMeta}>
                              {item.multiplier !== 1 && `${item.multiplier}× · `}
                              {item.calories} kcal · P {item.protein}g · C {item.carbs}g
                            </span>
                          </div>
                          <button 
                            style={{
                              ...s.foodDel,
                              ...(flashId === item.id ? { animation: 'dietDelBtnAnim 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards' } : {}),
                            }} 
                            onClick={() => handleRemove(item.id, item.namebn || item.name)}
                          >
                            <Trash2 size={15} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button style={s.addBtn} onClick={() => openModal(meal.key)}>
                    <Plus size={15} strokeWidth={2.2} /> Add to {meal.label}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Hydration Card ── */}
      <div style={{
        ...s.hydrationCard,
        boxShadow: water >= waterTarget 
          ? '0 0 12px rgba(16, 185, 129, 0.25), 0 1px 4px rgba(0,0,0,0.02)' 
          : s.hydrationCard.boxShadow,
        borderColor: water >= waterTarget ? 'var(--success)' : s.hydrationCard.borderColor,
        transition: 'all 0.3s ease',
      }}>
        <div style={s.hydrationHeader}>
          <div style={s.hydrationLeft}>
            <div style={s.waterIconBox}><Droplets size={18} color="var(--info)" strokeWidth={2.2} /></div>
            <div>
              <span style={s.hydrationTitle}>Hydration Tracker</span>
              <span style={s.hydrationSub}>{water} / {waterTarget} glasses · {(water * 0.25).toFixed(2)}L</span>
            </div>
          </div>
          <div style={s.hydrationBtns}>
            <button 
              style={{ ...s.waterBtn, ...s.waterBtnMinus, ...(water <= 0 ? s.waterBtnDisabled : {}) }} 
              onClick={removeWater} 
              disabled={water <= 0}
              aria-label="Remove Water Glass"
            >
              −
            </button>
            <button 
              style={{ ...s.waterBtn, ...s.waterBtnPlus }} 
              onClick={addWater}
              aria-label="Add Water Glass"
            >
              +
            </button>
          </div>
        </div>

        <div style={s.waterGlasses}>
          {Array.from({ length: waterTarget }, (_, i) => (
            <div
              key={i}
              style={{
                ...s.glass,
                ...(i < water ? s.glassFilled : {}),
                ...(i === lastWaterIdx ? { animation: 'dietPopIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)' } : {}),
              }}
            >
              <Circle
                size={8}
                fill={i < water ? 'var(--info)' : 'transparent'}
                color={i < water ? 'var(--info)' : 'var(--text-tertiary)'}
              />
            </div>
          ))}
        </div>

        <div style={s.waterBarWrap}>
          <div style={{ ...s.waterBar, width: `${Math.min(water / waterTarget * 100, 100)}%` }} />
        </div>
      </div>
      </div>

      {/* ── Floating Food Search Modal ── */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-blue)' }}>{MEAL_ICONS[modalMeal]}</span>
              <span>Add to {MEALS.find(m => m.key === modalMeal)?.label}</span>
            </span>
          }
          type="bottom-sheet"
        >

            {/* Search and Category Filters Container (scrolls out of view) */}
            <div style={{
              position: 'relative',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              margin: '0 -20px 12px -20px',
              borderBottom: '1px solid var(--border-light)',
            }}>
              {/* Search Box - no autofocus to prevent keyboard obstruction */}
              <div style={{ ...s.modalSearchWrap, padding: '10px 20px' }}>
                <Search size={16} strokeWidth={2.2} style={{ ...s.modalSearchIcon, left: 30 }} />
                <input
                  ref={searchInputRef}
                  style={s.modalSearchInput}
                  type="text"
                  placeholder="Search food... (e.g. ভাত, chicken)"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={onFocusInput}
                />
                {search && (
                  <button style={{ ...s.modalSearchClear, right: 26 }} onClick={() => setSearch('')}>
                    <X size={15} strokeWidth={2.2} />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div style={{ ...s.catChips, padding: '0 20px 12px 20px' }}>
                <button
                  className="sheet-chip"
                  style={{ ...s.catChip, ...(catFilter === 'all' ? s.catChipActive : {}) }}
                  onClick={() => setCatFilter('all')}
                >
                  All
                </button>
                {foodCategories.map(c => (
                  <button
                    key={c.id}
                    className="sheet-chip"
                    style={{ ...s.catChip, ...(catFilter === c.id ? s.catChipActive : {}) }}
                    onClick={() => setCatFilter(c.id)}
                  >
                    <span style={{ ...s.catDot, background: CAT_COLORS[c.id] || '#8E8E93' }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Food List */}
            <div style={s.modalList}>
              {filteredFoods.length === 0 ? (
                <p style={s.modalEmpty}>No matching foods found</p>
              ) : (
                filteredFoods.map(food => {
                  const mult = multipliers[food.id] || 1;
                  return (
                    <div key={food.id} style={s.modalItem}>
                      <div style={s.modalItemTop}>
                        <span style={{ ...s.modalItemDot, background: CAT_COLORS[food.category] || '#8E8E93' }} />
                        <div
                          style={s.modalItemInfo}
                          onClick={() => setExpandedFoodId(expandedFoodId === food.id ? null : food.id)}
                        >
                          <div style={s.modalItemNameRow}>
                            <span style={s.modalItemName}>{food.namebn}</span>
                            {mult !== 1 && (
                              <span style={s.modalItemMultBadge}>{mult}×</span>
                            )}
                          </div>
                          <span style={s.modalItemMeta}>
                            {food.name} · {food.serving} · {Math.round(food.calories * mult)} kcal · P {Math.round(food.protein * mult * 10) / 10}g
                          </span>
                        </div>
                        
                        {/* Minimalist circular Gray Add button instead of unappealing blue button */}
                        <button
                          style={s.modalAddBtn}
                          onClick={() => handleAdd(food, modalMeal)}
                        >
                          <Plus size={16} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Expanded Details & Multipliers */}
                      {expandedFoodId === food.id && (
                        <div style={s.expandedContent}>
                          {/* Macro Details Grid - never cut off by width */}
                          <div style={s.macroGrid}>
                            <div style={s.macroDetailCellFull}>
                              <span style={s.macroDetailLabel}>Serving Size</span>
                              <span style={s.macroDetailVal}>{food.serving}</span>
                            </div>
                            <div style={s.macroDetailCell}>
                              <span style={s.macroDetailLabel}>Calories</span>
                              <span style={{ ...s.macroDetailVal, color: 'var(--text-primary)', fontWeight: 700 }}>
                                {Math.round(food.calories * mult)} kcal
                              </span>
                            </div>
                            <div style={s.macroDetailCell}>
                              <span style={s.macroDetailLabel}>Protein</span>
                              <span style={{ ...s.macroDetailVal, color: '#007AFF' }}>
                                {Math.round(food.protein * mult * 10) / 10}g
                              </span>
                            </div>
                            <div style={s.macroDetailCell}>
                              <span style={s.macroDetailLabel}>Carbohydrates</span>
                              <span style={{ ...s.macroDetailVal, color: '#FF9500' }}>
                                {Math.round(food.carbs * mult * 10) / 10}g
                              </span>
                            </div>
                            <div style={s.macroDetailCell}>
                              <span style={s.macroDetailLabel}>Fat</span>
                              <span style={{ ...s.macroDetailVal, color: '#FF3B30' }}>
                                {Math.round(food.fat * mult * 10) / 10}g
                              </span>
                            </div>
                          </div>

                          <div style={s.multLabel}>Serving Multiplier:</div>
                          <div style={s.multRow}>
                            {MULTIPLIERS.map(m => (
                              <button
                                key={m}
                                style={{ ...s.multBtn, ...(mult === m ? s.multBtnActive : {}) }}
                                onClick={() => setMultipliers(p => ({ ...p, [food.id]: m }))}
                              >
                                {m}×
                              </button>
                            ))}
                          </div>

                          {/* Custom Serving Multiplier Input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                            <span style={{ fontSize: 12, color: '#636366', fontWeight: 600 }}>Custom Portion:</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              min="0.1"
                              value={multipliers[food.id] !== undefined ? multipliers[food.id] : ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                setMultipliers(p => ({ ...p, [food.id]: isNaN(val) ? '' : val }));
                              }}
                              onFocus={onFocusInput}
                              placeholder="1.0"
                              style={{
                                width: 70,
                                padding: '6px 10px',
                                border: '2px solid var(--border)',
                                borderRadius: 8,
                                background: 'var(--bg-card)',
                                fontSize: 13,
                                color: 'var(--text-primary)',
                                fontWeight: '650',
                                textAlign: 'center',
                                outline: 'none',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                            />
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: '500' }}>servings</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Modal>
        )}

      {/* ── Calendar History Modal ── */}
      {calendarOpen && (
        <Modal
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          title="Diet History"
          type="bottom-sheet"
        >
          {/* Month Selector */}
          <div style={s.calendarMonthSelector}>
            <button 
              style={s.calendarMonthNavBtn} 
              onClick={handlePrevMonth}
              aria-label="Previous Month"
            >
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
            <span style={s.calendarMonthName}>
              {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button 
              style={s.calendarMonthNavBtn} 
              onClick={handleNextMonth}
              aria-label="Next Month"
            >
              <ChevronRight size={20} strokeWidth={2.2} />
            </button>
          </div>

          {/* Swipeable Calendar Container */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'pan-y' }}
          >
            {/* Weekday Row */}
            <div style={s.calendarWeekdays}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <span key={idx} style={s.calendarWeekdayLabel}>{day}</span>
              ))}
            </div>

            {/* Days Grid */}
            <div style={s.calendarGrid}>
              {calendarDaysData.map((day) => {
                const isSelected = day.dateStr === selectedCalendarDate;
                const isTodayDate = day.dateStr === today;
                return (
                  <button
                    key={day.dateStr}
                    onClick={() => setSelectedCalendarDate(day.dateStr)}
                    style={{
                      ...s.calendarCell,
                      backgroundColor: isSelected ? 'var(--accent-blue-light)' : 'transparent',
                      borderColor: isSelected ? 'var(--accent-blue)' : (isTodayDate ? 'var(--border-light)' : 'transparent'),
                      opacity: !day.isCurrentMonth ? 0.3 : 1
                    }}
                    className="sheet-btn"
                  >
                    <span style={{
                      ...s.calendarCellDayNum,
                      color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)'
                    }}>
                      {day.date.getDate()}
                    </span>
                    <div style={s.calendarCellCals}>
                      {day.caloriesIn > 0 && (
                        <span style={s.calendarCalIn}>+{formatCalVal(day.caloriesIn)}</span>
                      )}
                      {day.caloriesOut > 0 && (
                        <span style={s.calendarCalOut}>-{formatCalVal(day.caloriesOut)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Header and Active Shift Button */}
          <div style={s.calendarSelectedHeader}>
            <div style={s.calendarSelectedDateLabel}>
              <span style={s.calendarSelectedDateText}>{fmtDate(selectedCalendarDate)}</span>
              {selectedCalendarDate === today && <span style={s.dateBadge}>Today</span>}
            </div>
            {selectedCalendarDate !== date && (
              <button
                style={s.calendarSwitchBtn}
                onClick={() => {
                  handleDateChange(selectedCalendarDate);
                  setCalendarOpen(false);
                }}
                className="sheet-btn"
              >
                Set Active Date
              </button>
            )}
          </div>

          {/* Macros summary for selected date */}
          <div style={s.calendarMacrosBar}>
            <div style={s.calendarMacroCard}>
              <span style={s.calendarMacroVal}>{calendarTotals.calories} kcal</span>
              <span style={s.calendarMacroLabel}>Calories</span>
            </div>
            <div style={s.calendarMacroCard}>
              <span style={{ ...s.calendarMacroVal, color: 'var(--protein-color)' }}>{Math.round(calendarTotals.protein)}g</span>
              <span style={s.calendarMacroLabel}>Protein</span>
            </div>
            <div style={s.calendarMacroCard}>
              <span style={{ ...s.calendarMacroVal, color: 'var(--carbs-color)' }}>{Math.round(calendarTotals.carbs)}g</span>
              <span style={s.calendarMacroLabel}>Carbs</span>
            </div>
            <div style={s.calendarMacroCard}>
              <span style={{ ...s.calendarMacroVal, color: 'var(--fat-color)' }}>{Math.round(calendarTotals.fat)}g</span>
              <span style={s.calendarMacroLabel}>Fat</span>
            </div>
          </div>

          {/* Meals for selected date */}
          <div style={s.calendarMealsTitle}>Logged Meals</div>
          {calendarDateMeals.length === 0 ? (
            <p style={s.calendarMealsEmpty}>No meals logged for this date.</p>
          ) : (
            <div style={s.calendarMealGroups}>
              {MEALS.map(meal => {
                const items = calendarMealEntries[meal.key] || [];
                if (items.length === 0) return null;
                const mealCal = items.reduce((sum, e) => sum + e.calories, 0);
                return (
                  <div key={meal.key} style={s.calendarMealGroup}>
                    <div style={s.calendarMealGroupHeader}>
                      <span style={s.calendarMealGroupTitle}>
                        {meal.label} <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 'normal' }}>({meal.labelbn})</span>
                      </span>
                      <span style={s.calendarMealGroupCal}>{mealCal} kcal</span>
                    </div>
                    <div style={s.calendarMealItems}>
                      {items.map(item => (
                        <div key={item.id} style={s.calendarMealItemRow}>
                          <div style={s.calendarMealItemLeft}>
                            <span style={s.calendarMealItemName}>{item.namebn || item.name}</span>
                            <span style={s.calendarMealItemMeta}>
                              {item.multiplier !== 1 && `${item.multiplier}× · `}
                              P {item.protein}g · C {item.carbs}g · F {item.fat}g
                            </span>
                          </div>
                          <span style={s.calendarMealItemCal}>{item.calories} kcal</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ──────────────────── sub-components ──────────────────── */
function MacroRow({ label, value, target, unit, color }) {
  const pct = target > 0 ? Math.min(value / target * 100, 100) : 0;
  return (
    <div style={s.macro}>
      <div style={s.macroHead}>
        <span style={s.macroLabel}>{label}</span>
        <span style={s.macroVal}>
          {Math.round(value)}{unit} <span style={s.macroTarget}>/ {target}{unit}</span>
        </span>
      </div>
      <div style={s.macroTrack}>
        <div style={{ ...s.macroFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ──────────────────── styles ──────────────────── */
const font = "'Google Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";

const s = {
  page: {
    fontFamily: font,
    letterSpacing: '-0.01em',
    paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)', // prevent obstruction of last card
  },

  /* ── Elegant Toast Alert ── */
  toast: {
    position: 'fixed',
    bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 16px)', // perfectly sits above bottom nav bar
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 2000,
    pointerEvents: 'none',
    animation: 'dietToastSlideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  toastInner: {
    padding: '10px 20px',
    borderRadius: 24,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  /* ── Warning Banner ── */
  warning: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--warning-light)',
    color: 'var(--warning)',
    padding: '12px 14px',
    borderRadius: 14,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
    lineHeight: 1.45,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
  },
  warningText: {
    flex: 1,
  },

  /* ── Date Navigator ── */
  dateNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateBtn: {
    width: 44,
    height: 44,
    background: 'var(--bg-card)',
    border: '2px solid var(--border)',
    borderRadius: 12,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.15s ease',
  },
  dateBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  dateLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  dateText: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  dateBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: '#FFFFFF',
    background: 'var(--accent-blue)',
    border: '1.5px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    padding: '1px 8px',
    borderRadius: 10,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },

  /* ── Premium Header Top Bar ── */
  headerTopBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.04em',
    lineHeight: 1.2,
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

  /* ── Daily Summary Card ── */
  summaryCard: {
    background: 'var(--bg-card)',
    borderRadius: 18,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
    padding: 16,
    marginBottom: 16,
  },
  summaryTop: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  ringWrap: {
    position: 'relative',
    width: 110,
    height: 110,
    flexShrink: 0,
  },
  ringSvg: {
    width: '100%',
    height: '100%',
  },
  ringInner: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringVal: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  ringUnit: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    fontWeight: 500,
    marginTop: 1,
  },
  ringLabel: {
    fontSize: 9,
    color: 'var(--text-tertiary)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginTop: 2,
  },
  macros: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  macro: {},
  macroHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  macroVal: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  macroTarget: {
    fontWeight: 400,
    color: 'var(--text-tertiary)',
  },
  macroTrack: {
    height: 5,
    background: 'var(--bg-tertiary)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
  },
  remaining: {
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid var(--border-light)',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
  },
  overText: {
    color: 'var(--danger)',
    fontWeight: 600,
  },

  /* ── Section Title ── */
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    margin: '0 0 8px 4px',
  },
  sectionTitleIcon: {
    display: 'flex',
    alignItems: 'center',
  },

  /* ── Favorites Section ── */
  favSection: {
    marginBottom: 16,
  },
  favChips: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  favChip: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    background: 'var(--bg-card)',
    border: '2px solid var(--border)',
    borderRadius: 12,
    padding: '8px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: font,
    boxShadow: 'var(--shadow-sm)',
  },
  favName: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    maxWidth: 90,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  favCal: {
    fontSize: 9,
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },

  /* ── Meal Logs ── */
  mealList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  mealCard: {
    background: 'var(--bg-card)',
    borderRadius: 16,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
  },
  mealHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: font,
  },
  mealLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  mealIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'var(--bg-tertiary)',
    border: '2px solid var(--border)',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  mealTitle: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'left',
  },
  mealTitleBn: {
    display: 'block',
    fontSize: 10,
    color: 'var(--text-tertiary)',
    textAlign: 'left',
    marginTop: 1,
  },
  mealRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#AEAEB2',
  },
  mealCal: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent-blue)',
  },
  mealBody: {
    padding: '0 14px 12px',
    borderTop: '2px solid var(--border)',
    animation: 'dietMealExpand 0.25s ease',
    overflow: 'hidden',
  },
  mealEmpty: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    padding: '8px 0',
    margin: 0,
  },
  foodRows: {
    display: 'flex',
    flexDirection: 'column',
  },
  foodItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1.5px solid var(--border-light)',
    animation: 'dietRowInsert 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  foodInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  foodName: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  foodMeta: {
    fontSize: 10.5,
    color: 'var(--text-tertiary)',
    marginTop: 1.5,
  },
  foodDel: {
    background: 'none',
    border: 'none',
    color: '#C7C7CC',
    cursor: 'pointer',
    padding: 8,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '100%',
    padding: '10px',
    marginTop: 8,
    border: '2px solid var(--border)',
    borderRadius: 10,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: font,
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.15s ease',
  },

  /* ── Hydration Card ── */
  hydrationCard: {
    background: 'var(--bg-card)',
    borderRadius: 16,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
    padding: 14,
    marginBottom: 16,
  },
  hydrationHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hydrationLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  waterIconBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'var(--info-light)',
    border: '2px solid var(--border)',
    flexShrink: 0,
  },
  hydrationTitle: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  hydrationSub: {
    display: 'block',
    fontSize: 10.5,
    color: 'var(--text-tertiary)',
    marginTop: 1,
  },
  hydrationBtns: {
    display: 'flex',
    gap: 6,
  },
  waterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: font,
  },
  waterBtnPlus: {
    background: 'var(--info)',
    color: '#FFFFFF',
  },
  waterBtnMinus: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
  },
  waterBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  waterGlasses: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    margin: '10px 0 8px 2px',
  },
  glass: {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    border: '1.5px solid var(--border-light)',
    transition: 'all 0.2s ease',
  },
  glassFilled: {
    background: 'var(--info-light)',
    border: '2px solid var(--border)',
    boxShadow: 'none',
  },
  waterBarWrap: {
    height: 4,
    background: 'var(--bg-tertiary)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  waterBar: {
    height: '100%',
    background: 'var(--info)',
    borderRadius: 4,
    transition: 'width 0.4s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
  },

  /* ── Search Food Modal (Premium floating sheet design) ── */
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    zIndex: 90, // lower than bottom navigation's zIndex 100 to keep it visible
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    WebkitBackdropFilter: 'blur(3px)',
    backdropFilter: 'blur(3px)',
    animation: 'dietModalOverlayIn 0.22s ease-out',
  },
  modal: {
    background: 'var(--bg-card)',
    width: '94%',
    maxWidth: 440,
    maxHeight: '75vh',
    borderRadius: 24,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    marginBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 12px)', // FLOATING ABOVE bottom tabs
    boxShadow: 'var(--shadow-xl)',
    border: '2px solid var(--border)',
    animation: 'dietModalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  modalHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px 12px',
    borderBottom: '2px solid var(--border)',
    flexShrink: 0, // prevent Android keyboard shrink
  },
  modalTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    fontFamily: font,
  },
  modalTitleIcon: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--accent-blue)',
  },
  modalClose: {
    background: 'var(--bg-tertiary)',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    borderRadius: '50%',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  modalSearchWrap: {
    position: 'relative',
    padding: '10px 18px',
    flexShrink: 0, // prevent Android keyboard shrink
  },
  modalSearchIcon: {
    position: 'absolute',
    left: 28,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-tertiary)',
    pointerEvents: 'none',
  },
  modalSearchInput: {
    width: '100%',
    padding: '10px 32px 10px 36px',
    border: 'none',
    borderRadius: 10,
    fontSize: 13.5,
    fontFamily: font,
    color: 'var(--text-primary)',
    background: 'var(--bg-tertiary)',
    outline: 'none',
    minHeight: 40,
  },
  modalSearchClear: {
    position: 'absolute',
    right: 24,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChips: {
    display: 'flex',
    gap: 6,
    padding: '0 18px 10px',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    flexShrink: 0, // prevent Android keyboard shrink
  },
  catChip: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 16,
    border: 'none',
    background: 'var(--bg-tertiary)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: font,
    transition: 'all 0.15s ease',
  },
  catChipActive: {
    background: 'var(--accent-blue)',
    color: '#FFFFFF',
  },
  catDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  modalList: {
    flex: 1,
    padding: '0 20px 16px 20px',
  },
  modalEmpty: {
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    padding: '24px 0',
    fontSize: 13,
  },
  modalItem: {
    padding: '10px 0',
    borderBottom: '0.5px solid var(--border-light)',
  },
  modalItemTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalItemDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  modalItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    cursor: 'pointer',
  },
  modalItemNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  modalItemName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  modalItemMultBadge: {
    fontSize: 9.5,
    fontWeight: 700,
    color: 'var(--accent-blue)',
    background: 'var(--accent-blue-light)',
    padding: '0.5px 5px',
    borderRadius: 6,
  },
  modalItemMeta: {
    fontSize: 10.5,
    color: 'var(--text-tertiary)',
    marginTop: 1.5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    transition: 'transform 0.15s ease',
  },
  modalAddBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    flexShrink: 0,
  },
  multRow: {
    display: 'flex',
    gap: 6,
    marginTop: 8,
    paddingLeft: 12,
    animation: 'dietMealExpand 0.2s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
  },
  multBtn: {
    padding: '5px 10px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--bg-tertiary)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    minHeight: 28,
    minWidth: 38,
    transition: 'all 0.15s ease',
    fontFamily: font,
  },
  multBtnActive: {
    background: 'var(--accent-blue-light)',
    color: 'var(--accent-blue)',
  },
  expandedContent: {
    marginTop: 10,
    padding: '12px',
    background: 'var(--bg-secondary)',
    borderRadius: 12,
    border: '2px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    animation: 'dietMealExpand 0.22s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
  },
  macroGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    marginBottom: 4,
  },
  macroDetailCellFull: {
    gridColumn: '1 / span 2',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '6px 8px',
    background: 'var(--bg-card)',
    borderRadius: 8,
    border: '2px solid var(--border)',
  },
  macroDetailCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '6px 8px',
    background: 'var(--bg-card)',
    borderRadius: 8,
    border: '2px solid var(--border)',
  },
  macroDetailLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  macroDetailVal: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  multLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    margin: '8px 0 6px 2px',
  },
  calendarMonthSelector: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px 12px',
    borderBottom: '0.5px solid var(--border-light)',
    marginBottom: 8,
  },
  calendarMonthNavBtn: {
    width: 44,
    height: 44,
    background: 'none',
    border: 'none',
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
  },
  calendarMonthName: {
    fontSize: 16,
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: font,
  },
  calendarWeekdays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center',
    marginBottom: 6,
  },
  calendarWeekdayLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    paddingBottom: 4,
    fontFamily: font,
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
    marginBottom: 16,
  },
  calendarCell: {
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '4px 2px 2px',
    borderRadius: 8,
    border: '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontFamily: font,
    outline: 'none',
    transition: 'all 0.15s ease',
  },
  calendarCellDimmed: {
    opacity: 0.3,
  },
  calendarCellSelected: {
    background: 'var(--accent-blue-light)',
    borderColor: 'var(--border)',
    borderWidth: 2,
    boxShadow: 'var(--shadow-sm)',
  },
  calendarCellToday: {
    borderColor: 'var(--border-light)',
  },
  calendarCellDayNum: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  calendarCellDayNumSelected: {
    color: 'var(--accent-blue)',
  },
  calendarCellCals: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    marginTop: 2,
    width: '100%',
  },
  calendarCalIn: {
    fontSize: 8.5,
    fontWeight: 600,
    color: 'var(--accent-blue)',
    lineHeight: '9px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  calendarCalOut: {
    fontSize: 8.5,
    fontWeight: 600,
    color: 'var(--danger)',
    lineHeight: '9px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  calendarSelectedHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0 8px',
    borderTop: '0.5px solid var(--border-light)',
    marginTop: 8,
  },
  calendarSelectedDateLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  calendarSelectedDateText: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: font,
  },
  calendarSwitchBtn: {
    background: 'var(--accent-blue)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 14,
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: font,
  },
  calendarMacrosBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
    margin: '8px 0 12px',
  },
  calendarMacroCard: {
    background: 'var(--bg-tertiary)',
    borderRadius: 8,
    padding: '6px 4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1.5,
  },
  calendarMacroVal: {
    fontSize: 11.5,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  calendarMacroLabel: {
    fontSize: 8.5,
    color: 'var(--text-tertiary)',
    fontWeight: 500,
    textTransform: 'uppercase',
  },
  calendarMealsTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    marginBottom: 8,
    fontFamily: font,
  },
  calendarMealsEmpty: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    padding: '16px 0',
    fontFamily: font,
  },
  calendarMealGroups: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingBottom: 20,
  },
  calendarMealGroup: {
    background: 'var(--bg-card)',
    border: '2px solid var(--border)',
    borderRadius: 12,
    padding: 10,
    boxShadow: 'var(--shadow-sm)',
  },
  calendarMealGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: '2px solid var(--border)',
  },
  calendarMealGroupTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  calendarMealGroupCal: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
  calendarMealItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  calendarMealItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarMealItemLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  calendarMealItemName: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  calendarMealItemMeta: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
  },
  calendarMealItemCal: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
};
