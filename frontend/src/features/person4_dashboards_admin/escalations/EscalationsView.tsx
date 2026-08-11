import React, { useMemo, useState } from "react";
import { ShieldAlert, ArrowUpDown, Search } from "lucide-react";

const T = {
  navy: "#101A2E",
  cream: "#FAF7F1",
  card: "#FFFFFF",
  gold: "#B08B4F",
  green: "#3E7A5A",
  greenSoft: "#DCEBDF",
  amber: "#C08A2E",
  amberSoft: "#F3E3C2",
  red: "#B34B3C",
  redSoft: "#F3DCD7",
  ink: "#1B2333",
  slate: "#6B7280",
  hair: "#E7E1D2",
};

const FONT = "'Inter', 'Avenir', 'Segoe UI', ui-sans-serif, system-ui";

interface EscalatedError {
  id: string;
  owner: string;
  lob: string;
  escalationLevel: number;
  hoursSinceBreach: number;
  nextThresholdHours: number; // hours until next escalation tier fires
}

const mockRows: EscalatedError[] = [
  { id: "ERR-2291", owner: "R. Iyer", lob: "Claims Ops", escalationLevel: 3, hoursSinceBreach: 14.2, nextThresholdHours: 1.8 },
  { id: "ERR-2287", owner: "M. Fenwick", lob: "Compliance", escalationLevel: 3, hoursSinceBreach: 9.7, nextThresholdHours: 6.3 },
  { id: "ERR-2280", owner: "S. Okafor", lob: "Underwriting", escalationLevel: 2, hoursSinceBreach: 11.4, nextThresholdHours: 4.6 },
  { id: "ERR-2274", owner: "T. Alvarez", lob: "Finance Ops", escalationLevel: 2, hoursSinceBreach: 6.1, nextThresholdHours: 9.9 },
  { id: "ERR-2266", owner: "R. Iyer", lob: "Finance Ops", escalationLevel: 1, hoursSinceBreach: 3.5, nextThresholdHours: 12.5 },
  { id: "ERR-2261", owner: "J. Whitfield", lob: "Policy Admin", escalationLevel: 1, hoursSinceBreach: 1.2, nextThresholdHours: 14.8 },
];

const levelColor = (level: number) => (level >= 3 ? T.red : level === 2 ? T.amber : T.gold);
const levelSoft = (level: number) => (level >= 3 ? T.redSoft : level === 2 ? T.amberSoft : "#F3E9D6");

function formatHours(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return `${whole}h ${mins.toString().padStart(2, "0")}m`;
}

export default function EscalationsView() {
  const [query, setQuery] = useState("");
  const [lobFilter, setLobFilter] = useState("");

  const lobs = useMemo(() => Array.from(new Set(mockRows.map((r) => r.lob))), []);

  // Default sort per spec: highest escalation level first, then longest
  // time since breach. No user-facing sort controls needed since this
  // ordering IS the point of the view — it's a triage queue, not a
  // general-purpose table.
  const rows = useMemo(() => {
    return mockRows
      .filter((r) => r.id.toLowerCase().includes(query.toLowerCase()) || r.owner.toLowerCase().includes(query.toLowerCase()))
      .filter((r) => !lobFilter || r.lob === lobFilter)
      .sort((a, b) => b.escalationLevel - a.escalationLevel || b.hoursSinceBreach - a.hoursSinceBreach);
  }, [query, lobFilter]);

  return (
    <div style={{ width: "100%", minHeight: "100%", background: T.cream, fontFamily: FONT }}>
      <main style={{ padding: "4px 4px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: T.slate }}>Operations / Escalations</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldAlert size={20} color={T.red} />
              <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.3px", color: T.ink }}>Escalations</span>
            </div>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.red, background: T.redSoft, padding: "5px 14px", borderRadius: 999 }}>
            {mockRows.length} currently escalated
          </span>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, background: T.card, border: `1px solid ${T.hair}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.cream, border: `1px solid ${T.hair}`, borderRadius: 8, padding: "8px 12px", width: 220 }}>
            <Search size={14} color={T.slate} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ID or owner…"
              style={{ border: "none", outline: "none", background: "transparent", fontFamily: FONT, fontSize: 13, width: "100%", color: T.ink }}
            />
          </div>
          <select
            value={lobFilter}
            onChange={(e) => setLobFilter(e.target.value)}
            style={{ fontFamily: FONT, fontSize: 13, color: T.ink, background: T.card, border: `1px solid ${T.hair}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
          >
            <option value="">All LOBs</option>
            {lobs.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={{ borderRadius: 16, border: `1px solid ${T.hair}`, background: T.card, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 720, fontSize: 13.5, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FAFBFC" }}>
                  <th style={th}>QA Error ID</th>
                  <th style={th}>Owner</th>
                  <th style={th}>LOB</th>
                  <th style={th}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Escalation Level <ArrowUpDown size={11} /></span>
                  </th>
                  <th style={th}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Time Since Breach <ArrowUpDown size={11} /></span>
                  </th>
                  <th style={th}>Next Threshold</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFBFC")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ ...td, fontWeight: 600, color: T.ink }}>{r.id}</td>
                    <td style={td}>{r.owner}</td>
                    <td style={{ ...td, color: T.slate }}>{r.lob}</td>
                    <td style={td}>
                      <span style={{
                        fontSize: 12.5, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
                        color: levelColor(r.escalationLevel), background: levelSoft(r.escalationLevel),
                      }}>
                        Level {r.escalationLevel}
                      </span>
                    </td>
                    <td style={{ ...td, color: T.ink, fontWeight: 500 }}>{formatHours(r.hoursSinceBreach)}</td>
                    <td style={{ ...td, color: r.nextThresholdHours < 3 ? T.red : T.slate, fontWeight: r.nextThresholdHours < 3 ? 600 : 400 }}>
                      in {formatHours(r.nextThresholdHours)}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: T.slate, padding: 32 }}>No escalated errors match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left", fontSize: 12, fontWeight: 600, color: T.slate,
  padding: "12px 16px", borderBottom: `1px solid ${T.hair}`, whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "13px 16px", borderBottom: `1px solid ${T.hair}`, whiteSpace: "nowrap",
};