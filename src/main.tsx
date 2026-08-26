import React, { StrictMode, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AquaChirp Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFD] flex items-center justify-center p-6 text-[#0E1A2D] font-mono">
          <div className="max-w-lg w-full bg-white p-6 rounded-2xl border border-rose-200 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-lg mb-2">
              <span>⚠️ Interface Recovery</span>
            </div>
            <p className="text-sm text-[#536B88] mb-4">
              An unexpected error occurred in the dashboard:
            </p>
            <pre className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg overflow-x-auto mb-4 border border-rose-200">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-[#8CC0EB] text-[#0E1A2D] font-bold rounded-lg hover:bg-[#7AB3E0] transition-colors text-xs cursor-pointer shadow-sm"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
