import './App.css'
import { SchedulingPage } from './pages/SchedulingPage'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Partner Scheduling API Demo</h1>
        <p className="disclaimer">
          Demo/integration sample code only, not production reference. Do not use real patient data.
        </p>
      </header>
      <SchedulingPage />
    </div>
  )
}

export default App
