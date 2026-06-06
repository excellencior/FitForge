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
        {!isAlert ? (
          <div style={{
            position: 'sticky',
            top: -24,
            background: 'var(--bg-secondary)',
            zIndex: 100,
            margin: '-24px -20px 20px -20px',
            padding: '24px 20px 0 20px',
            borderTopLeftRadius: '22px',
            borderTopRightRadius: '22px',
          }}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
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
    </div>
  );
}