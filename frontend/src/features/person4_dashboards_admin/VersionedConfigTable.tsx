import React, { useState } from "react";
import { Plus, X, Check, History } from "lucide-react";

/* ---------------------------------------------------------------
   Shared tokens, matching Ops/Team/Leadership Dashboards
--------------------------------------------------------------- */
const T = {
  navy: "#101A2E",
  cream: "#FAF7F1",
  card: "#FFFFFF",
  gold: "#B08B4F",
  goldSoft: "#E7D6AE",
  green: "#3E7A5A",
  greenSoft: "#DCEBDF",
  red: "#B34B3C",
  redSoft: "#F3DCD7",
  ink: "#1B2333",
  slate: "#6B7280",
  hair: "#E7E1D2",
};

const FONT = "'Inter', 'Avenir', 'Segoe UI', ui-sans-serif, system-ui";

export interface ConfigColumn {
  key: string;
  label: string;
}

export interface VersionedConfigTableProps {
  title: string;
  description: string;
  columns: ConfigColumn[];
  rows: Record<string, any>[];
  /** Called with the new row's field values on "Save New Version" */
  onAddVersion: (values: Record<string, string>) => void;
}

/**
 * Shared pattern for every versioned config screen (SLA Rules,
 * Ownership Mapping, Escalation Matrix) — per your doc: "Edit" never
 * updates in place, it always inserts a new version. This component
 * only handles the UI part of that contract; the actual insert-new
 * / close-old logic already lives in your backend endpoints
 * (admin/sla_rules.py etc.) — onAddVersion should call your real
 * POST endpoint, not mutate state locally in production.
 *
 * NOTE: form fields below render as plain text inputs for every
 * column, regardless of real type. Fields that are actually UUIDs
 * (lob_id, category_id) should become real dropdowns fetched from
 * Person 1's /lobs and /categories endpoints — this is a functional
 * stub, not the final form.
 */
export default function VersionedConfigTable({ title, description, columns, rows, onAddVersion }: VersionedConfigTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const handleChange = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    onAddVersion(values);
    setValues({});
    setShowForm(false);
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{title}</div>
          <div style={{ fontSize: 12.5, marginTop: 2, color: T.slate }}>{description}</div>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#3A2B10", background: T.gold, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "Add New Version"}
        </button>
      </div>

      {showForm && (
        <div style={{ border: `1px solid ${T.hair}`, borderRadius: 12, padding: 18, marginBottom: 18, background: T.cream }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: T.red, background: T.redSoft, padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
            <History size={14} />
            This inserts a new version and closes out the currently active row — it never edits a row in place.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 14 }}>
            {columns.map((c) => (
              <div key={c.key}>
                <label style={{ display: "block", fontSize: 12, color: T.slate, marginBottom: 4 }}>{c.label}</label>
                <input
                  value={values[c.key] || ""}
                  onChange={(e) => handleChange(c.key, e.target.value)}
                  style={{ width: "100%", fontFamily: FONT, fontSize: 13, color: T.ink, background: T.card, border: `1px solid ${T.hair}`, borderRadius: 7, padding: "8px 10px", outline: "none" }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fff", background: T.navy, border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}
          >
            <Check size={14} /> Save New Version
          </button>
        </div>
      )}

      <div style={{ border: `1px solid ${T.hair}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 600, fontSize: 13.5, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFC" }}>
                {columns.map((c) => (
                  <th key={c.key} style={{ textAlign: "left", fontSize: 12, fontWeight: 600, color: T.slate, padding: "11px 14px", borderBottom: `1px solid ${T.hair}`, whiteSpace: "nowrap" }}>
                    {c.label}
                  </th>
                ))}
                <th style={{ textAlign: "left", fontSize: 12, fontWeight: 600, color: T.slate, padding: "11px 14px", borderBottom: `1px solid ${T.hair}` }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ padding: "12px 14px", borderBottom: `1px solid ${T.hair}`, color: T.ink, whiteSpace: "nowrap" }}>
                      {row[c.key] ?? "—"}
                    </td>
                  ))}
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.hair}` }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                      color: row.effective_to ? T.slate : T.green,
                      background: row.effective_to ? "#F1F1EF" : T.greenSoft,
                    }}>
                      {row.effective_to ? "Superseded" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={columns.length + 1} style={{ padding: 24, textAlign: "center", color: T.slate, fontSize: 13 }}>No versions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}