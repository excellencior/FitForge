import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useModalLock — Locks body scroll when a modal is open.
 * Uses inline styles instead of CSS class for safer cleanup on unmount.
 */
export function useModalLock(isOpen) {
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.dataset.scrollY = scrollY;
    } else {
      const scrollY = document.body.dataset.scrollY || '0';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      delete document.body.dataset.scrollY;
      window.scrollTo(0, parseInt(scrollY));
    }
    return () => {
      // CRITICAL: Always cleanup on unmount (page navigation)
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (document.body.dataset.scrollY) {
        const scrollY = document.body.dataset.scrollY;
        delete document.body.dataset.scrollY;
        window.scrollTo(0, parseInt(scrollY));
      }
    };
  }, [isOpen]);
}

/**
 * useInputFocus — Scrolls input into view when keyboard opens on Android.
 * Returns an onFocus handler to attach to inputs.
 */
export function useInputFocus() {
  return useCallback((e) => {
    setTimeout(() => {
      e.target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);
}

/**
 * useDebounce — Prevents rapid duplicate actions (e.g., double-tap).
 * Returns [isLocked, lock] where lock() sets a brief cooldown.
 */
export function useDebounce(cooldownMs = 500) {
  const locked = useRef(false);
  const lock = useCallback(() => {
    if (locked.current) return false;
    locked.current = true;
    setTimeout(() => { locked.current = false; }, cooldownMs);
    return true;
  }, [cooldownMs]);

  return lock;
}

/**
 * useToast — Provides a simple toast notification state manager.
 * Returns { toast, show } where show(message, type) triggers a toast
 * and toast is the current toast state (or null).
 */
export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const show = useCallback((message, type = 'success') => {
    clearTimeout(timerRef.current);
    setToast({ message, type, id: Date.now() });
    timerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  return { toast, show };
}
