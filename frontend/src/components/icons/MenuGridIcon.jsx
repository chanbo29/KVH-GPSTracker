/* Matches the Menu page's 2x2 tile-grid glyph (3 rounded squares + 1
   diamond), used as the "back to Menu" button on every full-screen
   Car Maintenance page. Drawn as an inline SVG, lucide-style
   (stroke-only, round joins), so it scales cleanly at any size. */
export default function MenuGridIcon({ size = 15, color = 'currentColor', strokeWidth = 2, style }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={style}
    >
      <rect x="3" y="3" width="8" height="8" rx="2"/>
      <rect x="3" y="13" width="8" height="8" rx="2"/>
      <rect x="13" y="13" width="8" height="8" rx="2"/>
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" transform="rotate(45 17 7)"/>
    </svg>
  )
}
