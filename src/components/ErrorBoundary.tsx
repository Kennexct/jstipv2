import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f2f5f7] flex flex-col items-center justify-center p-6 text-center">
          <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-[#163300] mb-2 uppercase tracking-tight">Oops! Something went wrong</h1>
          <p className="text-sm font-medium text-slate-500 mb-8 max-w-sm">
            We encountered an unexpected error while rendering this screen. Your data is safe.
          </p>
          <Button 
            className="h-14 px-8 rounded-2xl font-black gap-2 bg-[#163300] hover:bg-[#1f4700]"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            <RefreshCw className="h-5 w-5" />
            Reload Application
          </Button>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl text-left overflow-auto max-w-full">
              <p className="text-xs font-mono text-red-800 break-all">
                {this.state.error.toString()}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
