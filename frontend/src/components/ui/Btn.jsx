import { C } from "../../constants/colors.js";

export default function Btn({ children, variant = "secondary", onClick, style = {}, disabled = false }) {
  const styles = {
    primary:   { background: C.accent, color: "#fff", boxShadow: `0 2px 8px ${C.accent}30` },
    danger:    { background: C.red,    color: "#fff", boxShadow: `0 2px 8px ${C.red}30`    },
    ghost:     { background: "transparent", color: C.muted, boxShadow: "none", padding: "6px 10px" },
    secondary: { background: C.card,   color: C.mid,  border: `1px solid ${C.border}`, boxShadow: "none" },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 8, fontSize: 13,
        fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        border: "none", transition: "all .15s",
        opacity: disabled ? .5 : 1,
        ...styles[variant], ...style,
      }}
    >
      {children}
    </button>
  );
}