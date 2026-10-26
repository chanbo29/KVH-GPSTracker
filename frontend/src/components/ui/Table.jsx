import { C } from "../../constants/colors.js";

export default function Table({ columns, rows, onAction }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
            {columns.map(c => (
              <th key={c.key} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
                {c.label}
              </th>
            ))}
            {onAction && <th style={{ padding: "10px 14px", color: C.muted, fontWeight: 600, fontSize: 11 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} style={{ borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: "11px 14px", color: C.mid, whiteSpace: "nowrap" }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
              {onAction && (
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", gap: 4 }}>{onAction(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: C.faint, fontSize: 13 }}>No records found</div>
      )}
    </div>
  );
}