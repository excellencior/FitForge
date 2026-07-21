import React, { useMemo } from 'react';
import { muscleMappings, FRONT_PATH_IDS, BACK_PATH_IDS } from '../data/muscleMappings';
import FrontBodySVG from './anatomy/FrontBodySVG';
import BackBodySVG from './anatomy/BackBodySVG';
import './MuscleMap.css';

/**
 * MuscleMap — Reusable SVG anatomy component
 *
 * @param {string[]}  exerciseIds     Array of exercise IDs to highlight
 * @param {'front'|'back'|'auto'} view  Which view to render
 * @param {'sm'|'md'|'lg'} size        Controls SVG dimensions
 * @param {string}    primaryColor    Fill for primary muscles (default: red)
 * @param {string}    secondaryColor  Fill for secondary muscles (default: light blue)
 * @param {string}    idleColor       Fill for non-targeted muscles (default: light gray)
 * @param {string}    outlineColor    Stroke color for all paths (default: subtle gray)
 * @param {boolean}   showLabel       Show "Full Body" label for unmapped exercises
 * @param {string}    className       Additional CSS class
 */
export default function MuscleMap({
  exerciseIds = [],
  view = 'auto',
  size = 'md',
  primaryColor = '#ef4444',
  secondaryColor = '#93c5fd',
  idleColor = '#e5e5e5',
  outlineColor = '#d4d4d4',
  showLabel = true,
  className = '',
}) {
  // Union all primary and secondary muscle path IDs across all exercises
  const { primaryPaths, secondaryPaths, hasAnyMapping } = useMemo(() => {
    const primary = new Set();
    const secondary = new Set();
    let hasMapping = false;

    for (const exId of exerciseIds) {
      const mapping = muscleMappings[exId];
      if (!mapping) continue;

      if (mapping.primary.length > 0 || mapping.secondary.length > 0) {
        hasMapping = true;
      }

      for (const p of mapping.primary) primary.add(p);
      for (const s of mapping.secondary) secondary.add(s);
    }

    // Primary wins over secondary if a muscle appears in both
    for (const p of primary) {
      secondary.delete(p);
    }

    return { primaryPaths: primary, secondaryPaths: secondary, hasAnyMapping: hasMapping };
  }, [exerciseIds]);

  // Determine which views to render
  const views = useMemo(() => {
    if (view !== 'auto') return [view];

    // If no exercises or all unmapped → show both as silhouette
    if (exerciseIds.length === 0 || !hasAnyMapping) return ['front', 'back'];

    const allPaths = new Set([...primaryPaths, ...secondaryPaths]);
    let hasFront = false;
    let hasBack = false;

    for (const pathId of allPaths) {
      if (FRONT_PATH_IDS.has(pathId)) hasFront = true;
      if (BACK_PATH_IDS.has(pathId)) hasBack = true;
      if (hasFront && hasBack) break;
    }

    if (hasFront && hasBack) return ['front', 'back'];
    if (hasFront) return ['front'];
    if (hasBack) return ['back'];
    return ['front', 'back']; // fallback
  }, [view, exerciseIds, hasAnyMapping, primaryPaths, secondaryPaths]);

  // Style function for individual paths
  const getPathStyle = useMemo(() => {
    return (pathId) => {
      if (primaryPaths.has(pathId)) {
        return {
          fill: primaryColor,
          stroke: outlineColor,
          strokeWidth: 0.5,
        };
      }
      if (secondaryPaths.has(pathId)) {
        return {
          fill: secondaryColor,
          stroke: outlineColor,
          strokeWidth: 0.5,
        };
      }
      return {
        fill: idleColor,
        stroke: outlineColor,
        strokeWidth: 0.5,
      };
    };
  }, [primaryPaths, secondaryPaths, primaryColor, secondaryColor, idleColor, outlineColor]);

  const isFullBody = exerciseIds.length > 0 && !hasAnyMapping;
  const containerClass = [
    'muscle-map',
    `muscle-map--${size}`,
    views.length > 1 ? 'muscle-map--row' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {views.map((v) => (
        v === 'front'
          ? <FrontBodySVG key="front" getPathStyle={getPathStyle} className="muscle-map__svg" />
          : <BackBodySVG key="back" getPathStyle={getPathStyle} className="muscle-map__svg" />
      ))}
      {isFullBody && showLabel && (
        <span className="muscle-map__label">Full Body</span>
      )}
    </div>
  );
}

/**
 * MuscleMapLazy — Lazy-loaded wrapper with IntersectionObserver
 */
export function MuscleMapLazy({ exerciseId, rootRef, ...props }) {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        root: rootRef?.current || null,
        rootMargin: '200px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootRef]);

  const minHeight = props.size === 'sm' ? 80 : props.size === 'lg' ? 160 : 120;

  return (
    <div ref={ref} style={{ minHeight }}>
      {visible ? (
        <MuscleMap exerciseIds={[exerciseId]} {...props} />
      ) : (
        <div className="muscle-map-shimmer" style={{ width: '100%', height: minHeight }} />
      )}
    </div>
  );
}
