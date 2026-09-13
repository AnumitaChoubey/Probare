import React, { useMemo, useState } from "react";
import { ChevronDown, History, Plus, ArrowRight } from "lucide-react";

const T = {
  navy: "#101A2E",
  cream: "#FAF7F1",
  card: "#FFFFFF",
  gold: "#B08B4F",
  green: "#3E7A5A",
  greenSoft: "#DCEBDF",
  ink: "#1B2333",
  slate: "#6B7280",
  hair: "#E7E1D2",
};

const FONT = "'Inter', 'Avenir', 'Segoe UI', ui-sans-serif, system-ui";

/* 
   MOCK DATA
*/
interface ChangeRecord {
  id: string;
  config_entity: "SLA_RULE" | "OWNERSHIP_MAPPING" | "ESCALATION_MATRIX";
  old_value: Record<string, string> | null;
  new_value: Record<string, string>;
  changed_by: string;
  changed_at: string;
}

const mockHistory: ChangeRecord[] = [
  {
    id: "1",
    config_entity: "SLA_RULE",
    old_value: { rebuttal_window_hours: "24", decision_window_hours: "48" },
    new_value: { rebuttal_window_hours: "48", decision_window_hours: "72" },
    changed_by: "Yasaswini P.",
    changed_at: "2026-08-09T10:12:00Z",
  },
  {
    id: "2",
    config_entity: "OWNERSHIP_MAPPING",
    old_value: null,
    new_value: { lob_id: "Claims Ops", category_id: "Data Entry", default_owner_user_id: "R. Iyer" },
    changed_by: "Yasaswini P.",
    changed_at: "2026-08-08T15:40:00Z",
  },
  {
    id: "3",
    config_entity: "ESCALATION_MATRIX",
    old_value: null,
    new_value: { lob_id: "Claims Ops", escalation_level: "2", threshold_hours_after_breach: "12" },
    changed_by: "Charan C.",
    changed_at: "2026-08-08T09:05:00Z",
  },
  {
    id: "4",
    config_entity: "SLA_RULE",
    old_value: { severity: "High", rebuttal_window_hours: "48" },
    new_value: { severity: "High", rebuttal_window_hours: "36" },
    changed_by: "Anumita C.",
    changed_at: "2026-08-06T13:22:00Z",
  },
];

const entityLabel: Record<string, string> = {
  SLA_RULE: "SLA Rule",
  OWNERSHIP_MAPPING: "Ownership Mapping",
  ESCALATION_MATRIX: "Escalation Matrix",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function DiffRow({ record }: { record: ChangeRecord }) {
  if (record.old_value === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: T.green, background: T.greenSoft, padding: "3px 10px", borderRadius: 999 }}>
          <Plus size={12} /> Created
        </span>
        {Object.entries(record.new_value).map(([k, v]) => (
          <span key={k} style={{ fontSize: 12.5, color: T.slate }}>{k}: <span style={{ color: T.ink, fontWeight: 500 }}>{v}</span></span>
        ))}
      </div>
    );
  }

  const changedKeys = Object.keys(record.new_value).filter((k) => record.old_value?.[k] !== record.new_value[k]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {changedKeys.length === 0 ? (
        <span style={{ fontSize: 12.5, color: T.slate }}>No field-level changes detected.</span>
      ) : (
        changedKeys.map((k) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ color: T.slate, minWidth: 140 }}>{k}</span>
            <span style={{ color: T.slate, textDecoration: "line-through" }}>{record.old_value?.[k]}</span>
            <ArrowRight size={12} color={T.slate} />
            <span style={{ color: T.ink, fontWeight: 600 }}>{record.new_value[k]}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function ConfigHistory() {
  const [entityFilter, setEntityFilter] = useState("");

  const rows = useMemo(
    () => mockHistory
      .filter((r) => !entityFilter || r.config_entity === entityFilter)
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()),
    [entityFilter]
  );

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <History size={16} color={T.gold} />
            <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Configuration Change History</span>
          </div>
          <div style={{ fontSize: 12.5, marginTop: 2, color: T.slate }}>Read-only audit trail of every versioned config change</div>
        </div>

        <div style={{ position: "relative", width: 190 }}>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{ width: "100%", appearance: "none", fontFamily: FONT, fontSize: 13, color: T.ink, background: T.card, border: `1px solid ${T.hair}`, borderRadius: 8, padding: "8px 28px 8px 11px", cursor: "pointer", outline: "none" }}
          >
            <option value="">All entity types</option>
            <option value="SLA_RULE">SLA Rule</option>
            <option value="OWNERSHIP_MAPPING">Ownership Mapping</option>
            <option value="ESCALATION_MATRIX">Escalation Matrix</option>
          </select>
          <ChevronDown size={13} color={T.slate} style={{ position: "absolute", right: 9, top: 10, pointerEvents: "none" }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: `1px solid ${T.hair}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.navy, background: "#EEF0F4", padding: "3px 10px", borderRadius: 999 }}>
                {entityLabel[r.config_entity]}
              </span>
              <span style={{ fontSize: 12, color: T.slate }}>{r.changed_by} · {formatDate(r.changed_at)}</span>
            </div>
            <DiffRow record={r} />
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: T.slate }}>No changes match this filter.</div>
        )}
      </div>
    </div>
  );
}