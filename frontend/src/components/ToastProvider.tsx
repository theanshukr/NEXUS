import { createContext, useContext, useState, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  description?: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, description?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

// ─── Icons ────────────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, { icon: string; color: string; bg: string }> = {
  success: { icon: 'check_circle', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  error:   { icon: 'cancel',       color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  warning: { icon: 'warning',      color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  info:    { icon: 'info',         color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const cfg = TOAST_CONFIG[toast.type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: 'var(--color-glass-surface)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: `1px solid ${cfg.color}30`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px ${cfg.color}20`,
        minWidth: '300px',
        maxWidth: '380px',
        animation: 'toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Colored left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
        background: cfg.color, borderRadius: '16px 0 0 16px'
      }} />

      {/* Icon */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
        background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginLeft: '6px',
      }}>
        <span className="material-symbols-outlined" style={{ color: cfg.color, fontSize: '18px' }}>
          {cfg.icon}
        </span>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-ui-element)', lineHeight: 1.4 }}>
          {toast.message}
        </p>
        {toast.description && (
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            {toast.description}
          </p>
        )}
      </div>

      {/* Close */}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-secondary)', padding: '2px', borderRadius: '6px',
          display: 'flex', alignItems: 'center', flexShrink: 0,
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timerRefs.current[id]);
    delete timerRefs.current[id];
  }, []);

  const showToast = useCallback((message: any, type: ToastType = 'success', description?: any) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const safeMessage = typeof message === 'object' ? (message.message || JSON.stringify(message)) : String(message || '');
    const safeDescription = description 
      ? (typeof description === 'object' ? (description.message || JSON.stringify(description)) : String(description))
      : undefined;
    setToasts(prev => [...prev.slice(-4), { id, message: safeMessage, description: safeDescription, type }]);

    timerRefs.current[id] = setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
