import { useState, useEffect } from 'react'

/* ──────────────────────────────────────────────────────────────────
   Car Maintenance font-size setting — a simple zoom-style scale the
   user can set from the Vehicle Settings page, persisted in
   localStorage and applied to every Car Maintenance page (the 17
   generic pages, Vehicle Table, Other Work, and Vehicle Settings
   itself) via the CSS `zoom` property on each page's main content
   box. Dispatches a window event so a page already mounted updates
   immediately when the setting changes elsewhere.
   ────────────────────────────────────────────────────────────────── */

const KEY   = 'kvh_cm_font_scale'
const EVENT = 'kvh-cm-font-scale-changed'
const MIN   = 0.8
const MAX   = 1.4
const DEFAULT = 1

export const FONT_SCALE_PRESETS = [
  { label: 'Small',       value: 0.85 },
  { label: 'Medium',      value: 1 },
  { label: 'Large',       value: 1.15 },
  { label: 'Extra Large', value: 1.3 },
]

function clamp(v) {
  const n = Number(v)
  if (Number.isNaN(n)) return DEFAULT
  return Math.min(MAX, Math.max(MIN, n))
}

export function getFontScale() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return DEFAULT
    return clamp(raw)
  } catch {
    return DEFAULT
  }
}

export function setFontScale(value) {
  const v = clamp(value)
  try { localStorage.setItem(KEY, String(v)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: v }))
  return v
}

export function resetFontScale() {
  return setFontScale(DEFAULT)
}

export function useFontScale() {
  const [scale, setScale] = useState(getFontScale)
  useEffect(() => {
    const onChange = e => setScale(e.detail)
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])
  return scale
}
