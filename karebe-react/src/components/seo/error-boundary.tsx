import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Loader2 } from 'lucide-react';
import { getErrorDisplay, type ErrorDisplay } from '@/lib/error-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
  retryCount: number;
  errorDisplay: ErrorDisplay | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
      retryCount: 0,
      errorDisplay: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorDisplay = getErrorDisplay(error);
    return {
      hasError: true,
      error,
      errorInfo: null,
      isRetrying: false,
      retryCount: 0,
      errorDisplay,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    const errorDisplay = getErrorDisplay(error);
    this.setState({
      error,
      errorInfo,
      errorDisplay,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
      retryCount: 0,
      errorDisplay: null,
    });
  };

  handleRetry = async (): Promise<void> => {
    const { retryCount, error } = this.state;
    const maxRetries = 3;

    if (retryCount >= maxRetries || !error) {
      return;
    }

    this.setState({ isRetrying: true });

    await new Promise(resolve => setTimeout(resolve, 1000));

    this.setState(prevState => ({
      isRetrying: false,
      retryCount: prevState.retryCount + 1,
      hasError: false,
      error: null,
      errorInfo: null,
      errorDisplay: null,
    }));
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {this.state.errorDisplay?.title || 'Something went wrong'}
            </h1>

            <p className="text-gray-600 mb-6">
              {this.state.errorDisplay?.message || 'We apologize for the inconvenience. Please try again or contact support if the problem persists.'}
            </p>

            {this.state.error && (
              <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-red-600 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              {this.state.errorDisplay?.retryable && this.state.retryCount < 3 && (
                <Button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                  className="flex items-center gap-2"
                >
                  {this.state.isRetrying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {this.state.isRetrying ? 'Retrying...' : `Try Again (${this.state.retryCount}/3)`}
                </Button>
              )}

              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </Button>

              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
