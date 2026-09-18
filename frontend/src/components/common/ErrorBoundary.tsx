import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('QEMS Uncaught Component Exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handlePurgeStorage = () => {
    try {
      localStorage.removeItem('qems_events_v2');
      localStorage.removeItem('qems_calibrations_v2');
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950"
        >
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {this.props.fallbackTitle || 'Operational Workspace Interrupted'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  An isolated rendering anomaly occurred. Session state is safeguarded.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono text-rose-700 dark:text-rose-300 overflow-x-auto">
                {this.state.error.message || 'Unknown error'}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded hover:bg-slate-800 dark:hover:bg-slate-100 transition flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Workspace</span>
              </button>

              <button
                type="button"
                onClick={this.handlePurgeStorage}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 underline transition"
              >
                Restore Factory Defaults
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
