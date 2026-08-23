import React, { useState } from "react";
import {
  Layers, GitBranch, Timer, ShieldAlert, Clock, Users, History as HistoryIcon,
} from "lucide-react";
import VersionedConfigTable from "../VersionedConfigTable";
import ConfigHistory from "./ConfigHistory";
const T = {
  navy: "#101A2E",
  cream: "#FAF7F1",
  card: "#FFFFFF",
  gold: "#B08B4F",
  goldSoft: "#E7D6AE",
  ink: "#1B2333",
  slate: "#6B7280",
  hair: "#E7E1D2",
};

const FONT = "'Inter', 'Avenir', 'Segoe UI', ui-sans-serif, system-ui";

type TabKey = "lobs" | "ownership" | "sla" | "escalation" | "hours" | "users" | "history";

const tabs: { key: TabKey; label: string; icon: React.ElementType; live: boolean }[] = [
  { key: "lobs",       label: "LOBs & Categories",     icon: Layers,      live: false },
  { key: "ownership",  label: "Ownership Mapping",     icon: GitBranch,   live: true },
  { key: "sla",        label: "SLA Rules",             icon: Timer,       live: true },
  { key: "escalation", label: "Escalation Matrix",     icon: ShieldAlert, live: true },
  { key: "hours",      label: "Working Hours & Holidays", icon: Clock,    live: false },
  { key: "users",      label: "Users & Roles",         icon: Users,       live: false },
  { key: "history",    label: "Config History",        icon: HistoryIcon, live: false },
];



interface OwnershipRow {
  lob_id: string;
  category_id: string;
  default_owner_user_id: string;
  default_owner_manager_user_id: string;
  effective_from: string;
  effective_to: string | null;
}

interface SlaRow {
  lob_id: string;
  category_id: string;
  severity: string;
  rebuttal_window_hours: string;
  decision_window_hours: string;
  effective_from: string;
  effective_to: string | null;
}

interface EscalationRow {
  lob_id: string;
  escalation_level: string;
  threshold_hours_after_breach: string;
  recipient_role_id: string;
  recipient_user_id: string;
}

const ownershipRows: OwnershipRow[] = [
  { lob_id: "Claims Ops", category_id: "Data Entry", default_owner_user_id: "R. Iyer", default_owner_manager_user_id: "T. Alvarez", effective_from: "2026-06-01", effective_to: null },
  { lob_id: "Underwriting", category_id: "Compliance", default_owner_user_id: "M. Fenwick", default_owner_manager_user_id: "S. Okafor", effective_from: "2026-05-15", effective_to: null },
];

const slaRows: SlaRow[] = [
  { lob_id: "Claims Ops", category_id: "All Categories", severity: "Critical", rebuttal_window_hours: "24", decision_window_hours: "48", effective_from: "2026-06-01", effective_to: null },
  { lob_id: "Underwriting", category_id: "Compliance", severity: "High", rebuttal_window_hours: "48", decision_window_hours: "72", effective_from: "2026-05-15", effective_to: null },
];

const escalationRows: EscalationRow[] = [
  { lob_id: "Claims Ops", escalation_level: "1", threshold_hours_after_breach: "4", recipient_role_id: "Team Lead", recipient_user_id: "—" },
  { lob_id: "Claims Ops", escalation_level: "2", threshold_hours_after_breach: "12", recipient_role_id: "QA Lead", recipient_user_id: "—" },
];

function ComingSoonPanel({ label }: { label: string }) {
  return (
    <div style={{ border: `1px dashed ${T.hair}`, borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 6 }}>{label} isn't wired up yet</div>
      <div style={{ fontSize: 13, color: T.slate, maxWidth: 420, margin: "0 auto" }}>
        This tab is waiting on its backend endpoint. Check your own doc's Task Sequence table for where this sits in your priority order.
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [active, setActive] = useState<TabKey>("ownership");

  const [ownership, setOwnership] = useState<OwnershipRow[]>(ownershipRows);
  const [slaRules, setSlaRules] = useState<SlaRow[]>(slaRows);
  const [escalation, setEscalation] = useState<EscalationRow[]>(escalationRows);

  return (
    <div style={{ width: "100%", minHeight: "100%", background: T.cream, fontFamily: FONT }}>
      <main style={{ padding: "4px 4px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: T.slate }}>Admin / {tabs.find((t) => t.key === active)?.label}</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.3px", color: T.ink }}>Admin</div>
        </div>

        {/* Tab strip — one Admin nav entry in the sidebar leads here,
            everything else stays internal to this page rather than
            cluttering the global sidebar with 7 separate entries */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, borderBottom: `1px solid ${T.hair}`, paddingBottom: 2 }}>
          {tabs.map(({ key, label, icon: Icon, live }) => {
            const isActive = key === active;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 7, fontFamily: FONT, fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500, color: isActive ? T.ink : T.slate,
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "10px 12px", borderBottom: isActive ? `2px solid ${T.gold}` : "2px solid transparent",
                  marginBottom: -2, opacity: live ? 1 : 0.65,
                }}
              >
                <Icon size={15} strokeWidth={1.8} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
          {active === "lobs" && <ComingSoonPanel label="LOBs & Categories" />}

          {active === "ownership" && (
            <VersionedConfigTable
              title="Ownership Mapping"
              description="Which team/owner default-resolves errors for each LOB + category combination"
              columns={[
                { key: "lob_id", label: "LOB" },
                { key: "category_id", label: "Category" },
                { key: "default_owner_user_id", label: "Default Owner" },
                { key: "default_owner_manager_user_id", label: "Owner's Manager" },
                { key: "effective_from", label: "Effective From" },
              ]}
              rows={ownership}
              onAddVersion={(values) =>
                setOwnership((prev) => [
                  ...prev.map((r) => ({ ...r, effective_to: r.effective_to ?? "2026-08-09" })),
                  { ...(values as unknown as OwnershipRow), effective_from: "2026-08-09", effective_to: null },
                ])
              }
            />
          )}

          {active === "sla" && (
            <VersionedConfigTable
              title="SLA Rules"
              description="Rebuttal and decision windows per LOB, category, and severity"
              columns={[
                { key: "lob_id", label: "LOB" },
                { key: "category_id", label: "Category" },
                { key: "severity", label: "Severity" },
                { key: "rebuttal_window_hours", label: "Rebuttal Window (hrs)" },
                { key: "decision_window_hours", label: "Decision Window (hrs)" },
              ]}
              rows={slaRules}
              onAddVersion={(values) =>
                setSlaRules((prev) => [
                  ...prev.map((r) => ({ ...r, effective_to: r.effective_to ?? "2026-08-09" })),
                  { ...(values as unknown as SlaRow), effective_from: "2026-08-09", effective_to: null },
                ])
              }
            />
          )}

          {active === "escalation" && (
            <VersionedConfigTable
              title="Escalation Matrix"
              description="Per-LOB escalation ladder — threshold hours after breach, and who gets notified at each level"
              columns={[
                { key: "lob_id", label: "LOB" },
                { key: "escalation_level", label: "Level" },
                { key: "threshold_hours_after_breach", label: "Threshold (hrs after breach)" },
                { key: "recipient_role_id", label: "Recipient Role" },
                { key: "recipient_user_id", label: "Recipient User" },
              ]}
              rows={escalation}
              onAddVersion={(values) => setEscalation((prev) => [...prev, values as any])}
            />
          )}

          {active === "hours" && <ComingSoonPanel label="Working Hours & Holidays" />}
          {active === "users" && <ComingSoonPanel label="Users & Roles" />}
          {active === "history" && <ConfigHistory />}
        </div>

      </main>
    </div>
  );
}