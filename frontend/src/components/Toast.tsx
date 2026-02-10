import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ type, message, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const t = setTimeout(onClose, duration);
      return () => clearTimeout(t);
    }
  }, [duration, onClose]);

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-modal max-w-md animate-slideDown ${
      type === 'success' ? 'bg-white border-l-4 border-l-emerald-500' : 'bg-white border-l-4 border-l-red-500'
    }`}>
      {type === 'success'
        ? <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
        : <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
      }
      <p className="flex-1 text-sm text-orbi-text font-medium">{message}</p>
      <button onClick={onClose} className="text-orbi-muted hover:text-orbi-text transition-colors flex-shrink-0"><X size={14} /></button>
    </div>
  );
}
