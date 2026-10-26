import { C } from "../../constants/colors.js";

export default function Input({ placeholder, value, onChange, icon, style = {} }) {
  return (
    <div style={{ position: "relative", ...style }}>
      {icon && (
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.faint }}>
          {icon}
        </span>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: icon ? "9px 9px 9px 34px" : "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.navy, background: C.card, outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}