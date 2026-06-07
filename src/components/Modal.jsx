import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, type = 'bottom-sheet', children }) {
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
    }
  }

  useEffect(() => {
    if (isClosing && shouldRender) {
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [isClosing, shouldRender]);

  if (!shouldRender) return null;

  const isAlert = type === 'centered-alert';

  const overlayClass = isAlert 
    ? (isClosing ? 'modal-alert-overlay modal-alert-overlay-closing' : 'modal-alert-overlay') 
    : (isClosing ? 'modal-overlay modal-overlay-closing' : 'modal-overlay');

  const contentClass = isAlert 
    ? (isClosing ? 'modal-alert-content modal-alert-content-closing' : 'modal-alert-content') 
    : (isClosing ? 'modal-content modal-content-closing' : 'modal-content');

  return createPortal(
    <div 
      className={overlayClass} 
      onClick={onClose}
    >
      <div 
        className={contentClass} 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {!isAlert ? (
          <div style={{
            position: 'sticky',
            top: -24,
            background: 'var(--bg-secondary)',
            zIndex: 100,
            margin: '-24px -20px 20px -20px',
            padding: '20px 20px 20px 20px',
            borderTopLeftRadius: '22px',
            borderTopRightRadius: '22px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {title && (
                <h2 style={{
                  fontSize: 20,
                  fontWeight: '800',
                  margin: 0,
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  flex: 1,
                  letterSpacing: '-0.02em'
                }}>
                  {title}
                </h2>
              )}
              <button 
                onClick={onClose} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--text-tertiary)', 
                  padding: 12,
                  margin: -12,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  minWidth: 44,
                  minHeight: 44
                }}
                aria-label="Close modal"
              >
                <X size={20} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        ) : (
          title && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{
                fontSize: 18,
                fontWeight: '800',
                margin: 0,
                color: 'var(--text-primary)',
                textAlign: 'center',
                flex: 1,
                letterSpacing: '-0.02em'
              }}>
                {title}
              </h2>
            </div>
          )
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}