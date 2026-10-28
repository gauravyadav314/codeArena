import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CodeArena ErrorBoundary caught an unhandled exception]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-card">
          <div className="error-icon-circle">
            <AlertTriangle size={36} className="text-rose" />
          </div>
          <h2 className="error-boundary-title">
            {this.props.fallbackTitle || 'Component Encountered an Unexpected Error'}
          </h2>
          <p className="error-boundary-msg">
            {this.state.error?.message || 'An unhandled rendering fault occurred.'}
          </p>
          <button className="btn-error-reload" onClick={this.handleReset}>
            <RotateCcw size={16} />
            <span>Attempt Recovery</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
