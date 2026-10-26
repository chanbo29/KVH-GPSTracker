import { STATUS_COLOR, STATUS_BG } from "../../constants/colors.js";

export default function Badge({ status, label, size = 12 }) {
  const c  = STATUS_COLOR[status] || "#2563EB";
  const bg = STATUS_BG[status]    || "#EFF6FF";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: bg, color: c, fontSize: size, fontWeight: 600, border: `1px solid ${c}30` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />
      {label || status}
    </span>
  );
}