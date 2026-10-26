import { C } from "../../constants/colors.js";

export default function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,.04)", ...style }}>
      {children}
    </div>
  );
}