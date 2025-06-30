import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <div className="space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  We encountered an unexpected error. Please try again or refresh the page.
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="text-left bg-gray-100 p-3 rounded text-xs mb-4">
                    <summary className="cursor-pointer font-medium">Error Details</summary>
                    <pre className="mt-2 whitespace-pre-wrap">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </div>

              <div className="flex space-x-3">
                <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}