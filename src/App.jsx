import { Component, useState } from 'react'
import World from './World'
import EntryGate from './EntryGate'

class ErrorBoundary extends Component {
  state = { error: null, info: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('CoffeeShop crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 14,
            background: '#1b0f0f',
            color: '#ffd2c2',
            minHeight: '100vh',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
          }}
        >
          <h1 style={{ color: '#ff7a5a', marginTop: 0 }}>3D scene crashed</h1>
          <p style={{ color: '#ffaa90' }}>
            <strong>{this.state.error.name}:</strong> {this.state.error.message}
          </p>
          <details open style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', color: '#ffaa90' }}>Stack trace</summary>
            <pre style={{ marginTop: 8 }}>{this.state.error.stack}</pre>
          </details>
          {this.state.info?.componentStack && (
            <details open style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: '#ffaa90' }}>Component stack</summary>
              <pre style={{ marginTop: 8 }}>{this.state.info.componentStack}</pre>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const [session, setSession] = useState(null)
  return (
    <ErrorBoundary>
      {session ? <World room={session.room} /> : <EntryGate onEnter={setSession} />}
    </ErrorBoundary>
  )
}

export default App
