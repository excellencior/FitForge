# FitForge — Strength & Bangladeshi Nutrition Tracker

FitForge is a premium, mobile-first strength training and nutrition companion designed specifically for powerlifters, strength athletes, and fitness enthusiasts in Bangladesh. Built with a high-fidelity iOS-inspired user interface, the app is fully optimized for mobile devices and Capacitor shells, offering a gorgeous, fluid experience on any screen size.

---

## 📱 Testing the Android App

To test FitForge directly on your Android device:

> [!IMPORTANT]  
> **Pre-compiled APK Location:**  
> The Android test package is located at: `release/FitForge.apk` (or click [FitForge.apk](file:///home/apurboturjo/My/projects/fitforge/release/FitForge.apk) to view). Copy this file to your Android phone to install and experience the app natively!

> [!WARNING]  
> **Android "Unsafe App" / Play Protect Warning:**  
> When installing the APK, your phone may display a warning stating that the app is "unsafe to install" or from an "unknown source." **This is completely normal** and occurs solely because the package is currently self-published for testing and is not yet uploaded to the official Google Play Store. You can safely proceed by tapping **"Install Anyway"** or enabling installation from unknown sources.

---

## ⚡ Core Features

### 1. iOS-Inspired Dynamic Dashboard
- **Visual Calorie Progress Ring:** Smoothly animates your percentage completion of daily calorie targets, changing color (Blue ➔ Orange ➔ Green) to indicate nutritional status.
- **Macronutrient Tracking Rows:** Stacked progress indicators optimized for narrow mobile viewports (e.g., Samsung Galaxy A50s), tracking Protein, Carbs, and Fats.
- **Dynamic Training Cycle Dots:** Visually maps your progress through a 7-week training block, clearly demarcating intensity weeks from your scheduled deload.
- **Pro Safety Guidance:** Built-in strength training tips and safety advice adapted for heat and hydration requirements in Bangladesh (Dhaka's climate).

### 2. Personalized Workout Sheets
- **CNS Strength Blueprint:** Pre-seeded with heavy, high-intensity compound programs designed to maximize neural drive and muscle density.
- **Scientific Exercise Tiering:** Organizes and recommends exercises based on neural fatigue:
  1. *Primary Compounds* (Squat, Deadlift, Bench Press)
  2. *Secondary Compounds* (Rows, Pull-ups, RDLs)
  3. *Accessory Compounds* (Dips, Leg Press)
  4. *Isolation* (Bicep Curls, Lateral Raises)
  5. *Core* (Planks)
  6. *Conditioning* (Kettlebell Swings, Farmer's Walks)
- **Interactive Sheet Editor:** Customize sheet names, descriptions, start/end dates, sets, reps, weight (in kg), rest times, and toggles for AMRAP (As Many Reps As Possible).
- **Drag-and-Drop Order Optimization:** Reorder exercises using simple drag-and-drop or leverage the intelligent auto-ordering tool to automatically sort movements in scientific sequence (heaviest compounds first).
- **Activation Lock:** Enforces discipline by limiting active sheet changes to once per calendar day.

### 3. Bangladeshi Nutrition Tracker
- **Bilingual Local Food Search:** Search our preloaded database in both English and Bengali (e.g., search `ভাত` for local rice options, chicken, lentils, local fish, etc.).
- **Serving Multiplier:** Easily adjust serving sizes using intuitive scaling multipliers.
- **Daily Log Records:** Organized meals grouped by breakfast, lunch, dinner, and snacks with one-click deletion and direct macros calculations.

### 4. Journey Analytics & Archives
- **1RM Progression Curves:** Graph-based trackers mapping weight increases and estimating One-Repetition Maximums (1RM) for primary lifts (Squats, Deadlifts, Bench, and OHP).
- **Body Measurements Tracker:** Charts body weight trends over a rolling 30-day window, alongside chest, waist, and arm size logging.
- **Trophy Cabinet (PRs):** Showcases your all-time heaviest compound personal records alongside estimated 1RM calculations.
- **Monthly Journey Archives:** At the end of each month, the app compiles a comprehensive card detailing total workouts done, estimated calorie burn, most repeated exercise, net weight/BMI changes, and your top 3 most frequently logged meals.

### 5. Milestone Streak Celebrations
- Gamifies consistency with beautifully-designed full-screen milestone badges and unique motivational alerts for hitting streak thresholds (10, 20, 30, 50, 100+ days).

---

## 🛠️ Technology Stack
- **Frontend Core:** React 19, Vite 8, JavaScript
- **Styling:** Vanilla CSS Custom Properties (Variable-driven theme engine with smooth animations, iOS system fonts, and glassmorphism)
- **Icons:** Lucide React
- **Data & Charts:** Chart.js, React-Chartjs-2
- **Mobile Wrapper:** Capacitor Core/Android
