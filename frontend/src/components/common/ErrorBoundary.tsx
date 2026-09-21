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
          className="min-h-[400px] flex items-center justify-center p-6 bg-qems-bg-surface "
        >
          <div className="max-w-lg w-full bg-qems-bg-white border border-rose-200 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-qems-danger-bg text-qems-danger border border-rose-200 ">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-qems-text-primary ">
                  {this.props.fallbackTitle || 'Operational Workspace Interrupted'}
                </h2>
                <p className="text-xs text-qems-text-muted ">
                  An isolated rendering anomaly occurred. Session state is safeguarded.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="p-3 bg-qems-bg-surface rounded border border-qems-border text-xs font-mono text-qems-danger-dark overflow-x-auto">
                {this.state.error.message || 'Unknown error'}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-qems-border-light ">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 :bg-qems-bg-secondary transition flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-qems-brand"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Workspace</span>
              </button>

              <button
                type="button"
                onClick={this.handlePurgeStorage}
                className="text-xs text-qems-text-muted hover:text-qems-danger :text-rose-400 underline transition"
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
