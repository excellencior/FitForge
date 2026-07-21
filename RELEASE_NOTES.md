# FitForge v2.0 — Release Notes

**Release Date:** July 21, 2026

---

## 🏋️ What's New

### Muscle Map Anatomy Visualization
See exactly which muscles you're targeting — right inside the app.

- **Track Tab Hero Card** — A visual anatomy map at the top of your workout showing all muscles targeted today, with primary (red) and secondary (blue) highlighting and a legend.

- **Exercise Catalog Anatomy Mode** — Toggle the body icon (🧍) in the sheet editor to see inline muscle maps on every exercise card. Know what you're hitting before you add it.

- **Long-Press Exercise Preview** — Long-press any exercise in the catalog to open a full anatomy breakdown with front + back body views, form tips, and warnings. Swipe up to go fullscreen, pull down to collapse.

- **Lazy-Loaded SVGs** — Anatomy maps in the catalog load on-demand as you scroll, keeping the UI fast even with 60+ exercises.

### UX Improvements
- Scroll-to-fullscreen modal behavior matching the exercise catalog
- Hidden scrollbars for cleaner modal appearance
- Horizontal side-by-side front/back anatomy layout

---

## 📊 By the Numbers

| Metric | Value |
|--------|-------|
| Exercises mapped | 69 |
| Muscle paths (front) | 35 |
| Muscle paths (back) | 26 |
| New files | 6 |
| Lines added | 1,136 |

---

## 🔧 Technical Details

- `MuscleMap` reusable React component with auto view selection
- `MuscleMapLazy` wrapper with IntersectionObserver for performance
- `muscleMappings.js` — curated anatomical data (0 invalid path references)
- SVGs extracted from reference anatomy HTML into `FrontBodySVG` and `BackBodySVG` components
- Cross-browser scrollbar hiding (webkit, Firefox, Edge)
