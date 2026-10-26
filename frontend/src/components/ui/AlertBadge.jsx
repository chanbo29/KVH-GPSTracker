import { ALERT_COLOR, ALERT_LABEL } from "../../constants/colors.js";

export default function AlertBadge({ type }) {
  const c = ALERT_COLOR[type] || "#2563EB";
  return (
    <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, background: `${c}15`, color: c, fontSize: 11, fontWeight: 600, border: `1px solid ${c}30` }}>
      {ALERT_LABEL[type] || type}
    </span>
  );
}