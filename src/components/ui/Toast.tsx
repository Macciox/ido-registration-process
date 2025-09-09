import { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'border-l-green-500',
    error: 'border-l-red-500', 
    warning: 'border-l-yellow-500',
    info: 'border-l-blue-500'
  }[type];

  const icon = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }[type];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-right duration-300">
      <div className={`bg-gray-900 border border-border rounded-lg shadow-2xl border-l-4 ${bgColor}`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-lg">{icon}</div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm leading-relaxed">{message}</div>
            </div>
            <button 
              onClick={onClose} 
              className="flex-shrink-0 text-text-secondary hover:text-white transition-colors ml-2 p-1 hover:bg-white/10 rounded"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );

  return { showToast, ToastContainer };
}