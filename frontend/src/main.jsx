import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Load Google Maps script immediately when app starts
const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
if (key && !window.google?.maps) {
  window.__mapsReady = false
  window.__mapsCallbacks = []
  window.__onMapsReady = () => {
    window.__mapsReady = true
    window.__mapsCallbacks.forEach(cb => cb())
    window.__mapsCallbacks = []
  }
  const s = document.createElement('script')
  s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=__onMapsReady&loading=async`
  s.async = true
  s.defer = true
  document.head.appendChild(s)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)