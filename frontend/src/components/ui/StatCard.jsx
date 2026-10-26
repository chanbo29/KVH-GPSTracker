import { TrendingUp, ArrowDown } from "lucide-react";
import { C } from "../../constants/colors.js";
import Card from "./Card.jsx";

export default function StatCard({ label, value, Icon, color, trend, sub }) {
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: C.muted, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{label}</div>
          <div style={{ color: C.navy, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ color: C.faint, fontSize: 11, marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={22} color={color} />
        </div>
      </div>
      {trend !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {trend >= 0 ? <TrendingUp size={13} color={C.green} /> : <ArrowDown size={13} color={C.red} />}
          <span style={{ fontSize: 11, color: trend >= 0 ? C.green : C.red, fontWeight: 600 }}>{Math.abs(trend)}% today</span>
        </div>
      )}
    </Card>
  );
}