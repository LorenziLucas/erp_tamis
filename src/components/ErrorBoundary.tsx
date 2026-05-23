import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 max-w-2xl mx-auto mt-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-base font-semibold text-red-700 mb-2">Erro ao renderizar a página</h2>
            <pre className="text-xs text-red-600 whitespace-pre-wrap break-all font-mono bg-red-100 rounded p-3 mt-2 max-h-60 overflow-auto">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
