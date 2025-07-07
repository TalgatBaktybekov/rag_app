// frontend/src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo || { componentStack: '' } // Provide default for errorInfo
    });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-gray-900 to-gray-800 text-white">
          <div className="bg-white/10 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-full max-w-md border border-red-700">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-400 mb-4">
                Something went wrong
              </h1>
              <p className="text-gray-300 mb-6">
                We're sorry, but something unexpected happened. Please refresh the page or contact support if the problem persists.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-red-600 to-red-400 text-white py-2 rounded-lg font-semibold shadow hover:brightness-110 transition-all"
              >
                Refresh Page
              </button>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-red-300">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs mt-2 bg-gray-900 p-2 rounded overflow-auto">
                    {this.state.error ? this.state.error.toString() : 'Unknown error'}
                    <br />
                    {this.state.errorInfo && this.state.errorInfo.componentStack ? 
                      this.state.errorInfo.componentStack : 'No component stack available'}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
