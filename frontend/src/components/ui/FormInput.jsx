import { C } from "../../constants/colors.js";

export default function FormInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", color: C.mid, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.navy, outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}