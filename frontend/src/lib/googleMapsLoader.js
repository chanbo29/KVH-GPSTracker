// Shared Google Maps JS API loader — safe to call from multiple components
// (LiveTracking.jsx, MobileApp.jsx) without injecting the <script> tag twice
// or racing two separate "ready" callbacks.
let loadingPromise = null

export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!key) {
      reject(new Error('VITE_GOOGLE_MAPS_KEY is not set in frontend/.env'))
      return
    }
    window.__kvhGmapsInit = () => resolve(window.google.maps)
    const s = document.createElement('script')
    // libraries=places → address/place search (Autocomplete) on both the
    // desktop and mobile tracking maps.
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__kvhGmapsInit`
    s.async = true
    s.defer = true
    s.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(s)
  })

  return loadingPromise
}
