import { useState } from 'react'
import StandupAssistant from './components/StandupAssistant'
import './App.css'

function App() {
  const [userName, setUserName] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)

  const handleLogin = (name: string) => {
    if (name.trim()) {
      setUserName(name)
      setIsLoggedIn(true)
    }
  }

  return (
    <div className="app-container">
      {!isLoggedIn ? (
        <div className="login-container">
          <h1>Voice AI Assistant</h1>
          <p>Please enter your name to begin:</p>
          <div className="input-group">
            <input 
              type="text" 
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin(userName)}
            />
            <button onClick={() => handleLogin(userName)}>Start Conversation</button>
          </div>
        </div>
      ) : (
        <StandupAssistant userName={userName} />
      )}
    </div>
  )
}

export default App 