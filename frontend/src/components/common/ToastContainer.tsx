import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useQEMS();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-10 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-qems-bg-white border border-qems-border rounded-lg p-3 shadow-lg flex items-start space-x-3 transition-all"
          >
            {isSuccess ? (
              <CheckCircle className="w-4 h-4 text-qems-success shrink-0 mt-0.5" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4 text-qems-warning shrink-0 mt-0.5" />
            ) : isError ? (
              <AlertCircle className="w-4 h-4 text-qems-danger shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-qems-brand-dark shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <h4 className="text-xs font-semibold text-qems-text-primary ">{toast.title}</h4>
              {toast.description && (
                <p className="text-[11px] text-qems-text-muted mt-0.5 leading-snug">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-qems-text-disabled hover:text-qems-text-muted :text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
