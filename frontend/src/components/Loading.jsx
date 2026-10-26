// src/components/Loading.jsx
// Shared loading components — import into any page

import { useEffect } from 'react'

const COLORS = {
  blue:   '#1B6BB5',
  border: '#E2E8F0',
  skel:   '#E9EEF4',
}

// Inject CSS once
export function LoadingStyles() {
  useEffect(() => {
    const id = 'kvh-loading-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = `
      @keyframes kvh-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      @keyframes kvh-spin   { to{transform:rotate(360deg)} }
      .kvh-pulse { animation: kvh-pulse 1.4s ease-in-out infinite }
      .kvh-spin  { animation: kvh-spin  .75s linear infinite }
    `
    document.head.appendChild(el)
  }, [])
  return null
}

// Grey skeleton block
export const Skel = ({ w = '100%', h = 14, r = 6, mb = 0, style = {} }) => (
  <div className="kvh-pulse" style={{ width: w, height: h, borderRadius: r, background: COLORS.skel, marginBottom: mb, flexShrink: 0, ...style }} />
)

// Circular spinner
export const Spinner = ({ size = 22, color = COLORS.blue, style = {} }) => (
  <div className="kvh-spin" style={{ width: size, height: size, borderRadius: '50%', border: `2.5px solid ${color}22`, borderTopColor: color, flexShrink: 0, ...style }} />
)

// Thin animated bar (top of page)
export const LoadingBar = ({ show }) => (
  <div style={{ height: 3, background: show ? COLORS.blue : 'transparent', transition: 'background .2s' }}>
    {show && <div className="kvh-pulse" style={{ height: '100%', background: COLORS.blue }} />}
  </div>
)

// Full-page centered spinner
export const PageSpinner = ({ label = 'Loading...' }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 300 }}>
    <Spinner size={36} />
    <div style={{ color: '#94A3B8', fontSize: 14 }}>{label}</div>
  </div>
)

// Skeleton for a table row — pass colWidths e.g. ['30%','20%','20%','30%']
export const SkeletonRow = ({ cols = [3], height = 16 }) => (
  <tr>
    {cols.map((w, i) => (
      <td key={i} style={{ padding: '14px 16px' }}>
        <Skel w={w} h={height} />
      </td>
    ))}
  </tr>
)

// N skeleton table rows
export const SkeletonRows = ({ n = 5, cols, height }) => (
  <>{Array.from({ length: n }).map((_, i) => <SkeletonRow key={i} cols={cols} height={height} />)}</>
)

// Skeleton stat card  (matches the small stat boxes used in dashboards)
export const SkeletonStatCard = ({ style = {} }) => (
  <div className="kvh-pulse" style={{ background: '#F1F5F9', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0', ...style }}>
    <Skel w={40} h={40} r={10} mb={14} />
    <Skel w="50%" h={28} r={6} mb={8} />
    <Skel w="70%" h={12} r={6} />
  </div>
)

// Skeleton list card (matches the card rows in Drivers, Devices, Geofences)
export const SkeletonCard = ({ lines = 2, style = {} }) => (
  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, ...style }}>
    <Skel w={46} h={46} r={12} />
    <div style={{ flex: 1 }}>
      <Skel h={15} mb={8} />
      {lines > 1 && <Skel w="60%" h={12} />}
    </div>
    <Skel w={70} h={26} r={20} />
  </div>
)

export const SkeletonCards = ({ n = 4, lines }) => (
  <>{Array.from({ length: n }).map((_, i) => <SkeletonCard key={i} lines={lines} />)}</>
)

// Saving overlay — shows on top of a form while saving
export const SavingOverlay = ({ show, label = 'Saving...' }) => !show ? null : (
  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit', zIndex: 10, gap: 12, backdropFilter: 'blur(2px)' }}>
    <Spinner />
    <span style={{ fontWeight: 600, color: COLORS.blue }}>{label}</span>
  </div>
)

export default { LoadingStyles, Skel, Spinner, LoadingBar, PageSpinner, SkeletonRow, SkeletonRows, SkeletonStatCard, SkeletonCard, SkeletonCards, SavingOverlay }