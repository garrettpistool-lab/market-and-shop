import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.jsx'
import './index.css'
import { getAuth0ProviderProps, isAuth0Configured } from './lib/auth0Config'
import { initMonitoring } from './lib/monitoring'

initMonitoring()

const appTree = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAuth0Configured() ? (
      <Auth0Provider {...getAuth0ProviderProps()}>{appTree}</Auth0Provider>
    ) : (
      appTree
    )}
  </React.StrictMode>,
)