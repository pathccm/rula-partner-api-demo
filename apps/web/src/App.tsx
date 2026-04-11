import './App.css'
import { useAuth } from './hooks/useAuth'
import { SchedulingPage } from './pages/SchedulingPage'

function App() {
  const { loading, isAuthenticated, user, login, logout } = useAuth()

  if (loading) {
    return (
      <div className="app-container">
        <div className="card">
          <h2>Loading…</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Partner Scheduling API Demo</h1>
        <p className="disclaimer">
          Demo/integration sample code only, not production reference. Do not use real patient data.
        </p>
        {isAuthenticated ? (
          <div className="header-auth">
            <span>{user?.email}</span>
            <button
              type="button"
              onClick={() => logout()}
              className="auth-button logout-button small"
            >
              Log Out
            </button>
          </div>
        ) : null}
      </header>

      {isAuthenticated ? (
        <SchedulingPage />
      ) : (
        <div className="card">
          <h2>Welcome</h2>
          <p>Sign in to demo the Partner Scheduling API.</p>
          <button type="button" onClick={() => login()} className="auth-button login-button">
            Log In with Auth0
          </button>
        </div>
      )}
    </div>
  )
}

export default App
