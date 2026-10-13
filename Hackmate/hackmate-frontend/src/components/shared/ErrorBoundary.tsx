import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              An unexpected error occurred while rendering this section.
              {this.state.error?.message && (
                <span className="block mt-2 font-mono text-xs bg-gray-50 p-2 rounded text-red-500 break-all text-left">
                  {this.state.error.message}
                </span>
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Reload Page
              </button>

              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Home
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
