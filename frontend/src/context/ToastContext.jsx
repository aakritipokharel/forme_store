import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import './Toast.css';

const ToastContext = createContext(null);
const toastDuration = 3000;
const exitDuration = 180;
const icons = {
  success: '✓',
  error: '!',
  warning: '!',
  info: 'i',
};

function Toast({ notice, onDismiss }) {
  return (
    <div
      className={`toast toast-${notice.type}${notice.isLeaving ? ' toast-leaving' : ''}`}
      role={notice.type === 'error' ? 'alert' : 'status'}
    >
      <span className="toast-icon" aria-hidden="true">{icons[notice.type]}</span>
      <p className="toast-message">{notice.message}</p>
      <button
        className="toast-dismiss"
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(notice.id)}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [notices, setNotices] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());
  const recent = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }

    setNotices((current) => current.map((notice) => (
      notice.id === id ? { ...notice, isLeaving: true } : notice
    )));
    window.setTimeout(() => {
      setNotices((current) => current.filter((notice) => notice.id !== id));
    }, exitDuration);
  }, []);

  const notify = useCallback((type, message) => {
    const text = String(message || '').trim();
    if (!icons[type] || !text) {
      return;
    }

    const key = `${type}:${text}`;
    const now = Date.now();
    const lastShown = recent.current.get(key) || 0;
    if (now - lastShown < 800) {
      return;
    }
    recent.current.set(key, now);

    const id = ++nextId.current;
    setNotices((current) => [...current, { id, type, message: text, isLeaving: false }]);
    timers.current.set(id, window.setTimeout(() => dismiss(id), toastDuration));
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-viewport" role="region" aria-live="polite" aria-label="Notifications">
        {notices.map((notice) => (
          <Toast key={notice.id} notice={notice} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) {
    throw new Error('useToast must be used within a ToastProvider.');
  }
  return notify;
}
