import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, type = 'bottom-sheet', children }) {
  if (!isOpen) return null;

  const isAlert = type === 'centered-alert';

  return (
    <div 
      className={isAlert ? '' : 'modal-overlay'} 
      style={isAlert ? {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      } : {}}
      onClick={onClose}
    >
      <div 
        className={isAlert ? '' : 'modal-content'} 
        style={isAlert ? {
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #E5E5EA',
          padding: 24,
          width: '100%',
          maxWidth: 320,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        } : {}}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {!isAlert && (
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
              {title && <h2 style={{ fontSize: 20, fontWeight: '800', margin: 0, color: '#1C1C1E', textAlign: 'left', flex: 1, letterSpacing: '-0.02em' }}>{title}</h2>}
              <button 
                onClick={onClose} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#8E8E93', 
                  padding: 4, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
                aria-label="Close modal"
              >
                <X size={20} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}
        {isAlert && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            {title && <h2 style={{ fontSize: 18, fontWeight: '800', margin: 0, color: '#1C1C1E', textAlign: 'center', flex: 1, letterSpacing: '-0.02em' }}>{title}</h2>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
