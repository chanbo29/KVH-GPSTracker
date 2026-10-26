import { C } from "../../constants/colors.js";

export default function PageHeader({ title, subtitle, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
      <div>
        <div style={{ color: C.navy, fontSize: 20, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ color: C.faint, fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>{children}</div>
    </div>
  );
}