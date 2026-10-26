/* ──────────────────────────────────────────────────────────────────
   Shared color tokens.

   `C`, `STATUS_COLOR`, `STATUS_BG`, and `ALERT_COLOR` are exported as
   objects so every page can import them once and read properties like
   `C.navy` / `C.card` straight out — several pages also build colors
   by string-concatenating an alpha suffix onto a hex value
   (e.g. `${C.accent}30`, `color + '18'`), which only works because
   these stay plain hex strings.
   ────────────────────────────────────────────────────────────────── */

export const C = {
  sidebar:       "#0F172A",
  sidebarHover:  "#1E293B",
  sidebarActive: "#1E293B",

  bg:      "#F1F5F9",
  card:    "#FFFFFF",
  border:  "#E2E8F0",

  accent:  "#2563EB",
  accentL: "#EFF6FF",
  accentB: "#BFDBFE",

  navy:  "#0F172A",   // primary text
  mid:   "#334155",   // secondary text
  muted: "#64748B",   // tertiary text
  faint: "#94A3B8",   // faintest text

  green:  "#059669", greenL:  "#ECFDF5",
  red:    "#DC2626", redL:    "#FEF2F2",
  amber:  "#D97706", amberL:  "#FFFBEB",
  purple: "#7C3AED", purpleL: "#F5F3FF",
  blue:   "#0EA5E9", blueL:   "#F0F9FF",

  // Header "console pill" surface
  pillBg:     "rgba(15,23,42,.035)",
  pillBorder: "rgba(15,23,42,.08)",
};

export const STATUS_COLOR = { moving: "#059669", stopped: "#D97706", online: "#2563EB", offline: "#6B7280" };
export const STATUS_BG    = { moving: "#ECFDF5", stopped: "#FFFBEB", online: "#EFF6FF", offline: "#F8FAFC" };

export const ALERT_COLOR = {
  overspeed: "#DC2626", geofence_in: "#7C3AED", geofence_out: "#7C3AED", gps_offline: "#6B7280",
  ignition_on: "#059669", ignition_off: "#D97706", low_battery: "#EF4444", long_stop: "#F59E0B",
};

export const ALERT_LABEL = {
  overspeed:    "Overspeed",
  geofence_in:  "Geofence In",
  geofence_out: "Geofence Out",
  gps_offline:  "GPS Offline",
  ignition_on:  "Ignition ON",
  ignition_off: "Ignition OFF",
  low_battery:  "Low Battery",
  long_stop:    "Long Stop",
};

export const LIVE_MAP_STYLE = [
  { featureType:"water",     elementType:"geometry",        stylers:[{color:"#BFDBFE"}] },
  { featureType:"landscape", elementType:"geometry",        stylers:[{color:"#F0F7FF"}] },
  { featureType:"road",      elementType:"geometry",        stylers:[{color:"#FFFFFF"}] },
  { featureType:"road",      elementType:"geometry.stroke", stylers:[{color:"#BFDBFE"}] },
  { featureType:"poi",       elementType:"geometry",        stylers:[{color:"#DBEAFE"}] },
  { elementType:"labels.text.stroke", stylers:[{color:"#FFFFFF"}] },
  { elementType:"labels.text.fill",   stylers:[{color:"#3B6A9A"}] },
];
