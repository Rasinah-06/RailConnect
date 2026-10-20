import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((p) => [...p.slice(-3), { id, message, kind }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 7000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span>{t.message}</span>
            <button aria-label="Dismiss" onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))}>&times;</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
