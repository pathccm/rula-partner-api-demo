import './App.css'
import { SchedulingPage } from './pages/SchedulingPage'

function App() {
  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <img src="/rula-logo.svg" alt="Rula" className="app-header-logo" />
        </div>
      </header>
      <main className="app-container">
        <SchedulingPage />
      </main>
    </>
  )
}

export default App
