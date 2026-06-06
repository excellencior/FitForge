import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, type = 'bottom-sheet', children }) {
  if (!isOpen) return null;

  const isAlert = type === 'centered-alert';

  return (
    <div 
      className={isAlert ? 'modal-alert-overlay' : 'modal-overlay'} 
      onClick={onClose}
    >
      <div 
        className={isAlert ? 'modal-alert-content' : 'modal-content'} 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {!isAlert && <div className="modal-handle" />}
        {(title || !isAlert) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isAlert ? 12 : 20 }}>
            {title && (
              <h2 
                style={{ 
                  fontSize: isAlert ? 18 : 20, 
                  fontWeight: '800', 
                  margin: 0, 
                  color: 'var(--text-primary)', 
                  textAlign: isAlert ? 'center' : 'left', 
                  flex: 1, 
                  letterSpacing: '-0.02em' 
                }}
              >
                {title}
              </h2>
            )}
            {!isAlert && (
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
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}