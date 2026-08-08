import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  ChevronDown, Siren, ListChecks, RotateCcw, TrendingDown,
  ArrowUpRight, ArrowDownRight, UserX, Check,
} from "lucide-react";

/* ---------------------------------------------------------------
   Same palette/tokens as OpsDashboard.tsx — kept in sync deliberately
   so both dashboards read as one product, not two different apps.
   If you ever centralize these into a shared theme file, update both.
--------------------------------------------------------------- */
const T = {
  navy: "#101A2E",
  cream: "#FAF7F1",
  card: "#FFFFFF",
  gold: "#B08B4F",
  goldSoft: "#E7D6AE",
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

/* ---------------------------------------------------------------
   MOCK DATA — swap for GET /dashboards/team once Person 1's
   GET /errors (filtered by lob_id) is live. Backend computes:
   SLA compliance % (closed-within-SLA / total closed), overturn
   rate by auditor, escalation counts, and the Unmapped Errors
   queue (owner_user_id IS NULL) — see your own DASH-2 spec.
--------------------------------------------------------------- */

const lobs = ["Claims Ops", "Underwriting", "Compliance", "Finance Ops"];

const slaCompliance = { pct: 84, delta: "+1.8%" };

const kpis = [
  { label: "Escalated Count", value: "6", delta: "+9.1%", up: true, worseIfUp: true, icon: Siren },
  { label: "Open Count", value: "41", delta: "-2.4%", up: false, worseIfUp: true, icon: ListChecks },
  { label: "Overturn Rate", value: "14%", delta: "+3.2%", up: true, worseIfUp: true, icon: TrendingDown },
  { label: "Avg. Time to Close", value: "2.9 days", delta: "-5.1%", up: false, worseIfUp: true, icon: RotateCcw },
];

const overturnByAuditor = [
  { name: "R. Iyer", rate: 22 },
  { name: "M. Fenwick", rate: 18 },
  { name: "S. Okafor", rate: 15 },
  { name: "T. Alvarez", rate: 11 },
  { name: "J. Whitfield", rate: 8 },
  { name: "K. Devi", rate: 5 },
];

interface UnmappedError {
  id: string;
  category: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  loggedBy: string;
  date: string;
}

const initialUnmapped: UnmappedError[] = [
  { id: "ERR-2298", category: "Data Entry", severity: "High", loggedBy: "R. Iyer", date: "2026-08-06" },
  { id: "ERR-2295", category: "Documentation", severity: "Medium", loggedBy: "M. Fenwick", date: "2026-08-06" },
  { id: "ERR-2290", category: "Compliance", severity: "Critical", loggedBy: "S. Okafor", date: "2026-08-05" },
  { id: "ERR-2283", category: "System Config", severity: "Medium", loggedBy: "T. Alvarez", date: "2026-08-04" },
];

const candidateOwners = ["R. Iyer", "M. Fenwick", "S. Okafor", "T. Alvarez", "J. Whitfield", "K. Devi"];

const severityColor = (s: UnmappedError["severity"]) =>
  s === "Critical" ? T.red : s === "High" ? T.amber : s === "Medium" ? "#7FA8C9" : T.slate;

/* ---------------------------------------------------------------
   SUBCOMPONENTS — same visual style as OpsDashboard's KpiCard/etc.
--------------------------------------------------------------- */

interface KpiCardProps {
  label: string; value: string; delta: string; up: boolean;
  worseIfUp: boolean; icon: React.ElementType;
}

function KpiCard({ label, value, delta, up, worseIfUp, icon: Icon }: KpiCardProps) {
  const isBad = worseIfUp ? up : !up;
  return (
    <div style={{ borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16, background: T.card, border: `1px solid ${T.hair}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ height: 36, width: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: isBad ? T.redSoft : T.goldSoft, color: isBad ? T.red : T.gold }}>
          <Icon size={17} strokeWidth={1.8} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, padding: "4px 8px", borderRadius: 999, color: isBad ? T.red : T.green, background: isBad ? T.redSoft : T.greenSoft }}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {delta}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 600, color: T.ink }}>{value}</div>
        <div style={{ fontSize: 12.5, marginTop: 6, color: T.slate }}>{label}</div>
      </div>
    </div>
  );
}

function LobSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", width: 200 }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", appearance: "none", fontFamily: FONT, fontSize: 13.5,
          color: T.ink, background: T.card, border: `1px solid ${T.hair}`,
          borderRadius: 8, padding: "8px 30px 8px 12px", cursor: "pointer", outline: "none",
        }}
      >
        {lobs.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <ChevronDown size={14} color={T.slate} style={{ position: "absolute", right: 9, top: 10, pointerEvents: "none" }} />
    </div>
  );
}

/* ---------------------------------------------------------------
   MAIN
--------------------------------------------------------------- */

export default function TeamDashboard() {
  const [selectedLob, setSelectedLob] = useState(lobs[0]);
  const [unmapped, setUnmapped] = useState<UnmappedError[]>(initialUnmapped);
  const [routingId, setRoutingId] = useState<string | null>(null);
  const [pendingOwner, setPendingOwner] = useState<string>(candidateOwners[0]);

  const maxOverturn = useMemo(() => Math.max(...overturnByAuditor.map((a) => a.rate)), []);

  const confirmRoute = (id: string) => {
    // TODO: wire to your real ownership reassignment call —
    // POST /admin/ownership-mapping (one-off override) or a
    // dedicated ownership-reassignment endpoint if you build one.
    setUnmapped((prev) => prev.filter((e) => e.id !== id));
    setRoutingId(null);
  };

  return (
    <div style={{ width: "100%", minHeight: "100%", background: T.cream, fontFamily: FONT }}>
      <main style={{ padding: "4px 4px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: T.slate }}>Team / Overview</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.3px", color: T.ink }}>Team Dashboard</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 12, color: T.slate }}>Last updated 4 minutes ago</span>
            {/* LOB selector — only rendered when a user is scoped to more than
                one LOB. If your auth data exposes a single-LOB user, hide this
                entirely rather than showing a disabled dropdown. */}
            <LobSelector value={selectedLob} onChange={setSelectedLob} />
          </div>
        </div>

        {/* KPI row — hero SLA card + urgency-ordered supporting tiles,
            same pattern as Ops Dashboard */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 300px) repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div style={{ borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 16, background: T.navy }}>
            <ResponsiveContainer width={86} height={86}>
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value: slaCompliance.pct }]} startAngle={90} endAngle={-270} barSize={8}>
                <RadialBar dataKey="value" background={{ fill: "rgba(255,255,255,0.14)" }} cornerRadius={6} fill="#7FC4E8" />
              </RadialBarChart>
            </ResponsiveContainer>
            <div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>SLA Compliance</div>
              <div style={{ fontSize: 11, marginBottom: 6, color: "rgba(255,255,255,0.4)" }}>{selectedLob} · Rolling 30 days</div>
              <div style={{ fontSize: 30, fontWeight: 600, color: "#fff", lineHeight: 1 }}>{slaCompliance.pct}%</div>
              <div style={{ fontSize: 12, marginTop: 6, color: "#8FD4A8" }}>↗ {slaCompliance.delta} vs. last period</div>
            </div>
          </div>
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        {/* Unmapped Errors — most urgent thing on this page: errors with
            nobody assigned yet. Prioritized above the chart deliberately. */}
        <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <UserX size={16} color={T.red} />
                <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Unmapped Errors</span>
              </div>
              <div style={{ fontSize: 12.5, marginTop: 2, color: T.slate }}>No owner assigned — route these before they age into SLA risk</div>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: T.red, background: T.redSoft, padding: "4px 12px", borderRadius: 999 }}>
              {unmapped.length} unrouted
            </span>
          </div>

          {unmapped.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13.5, color: T.slate }}>
              All errors are routed. Nothing waiting here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {unmapped.map((e) => (
                <div key={e.id} style={{ border: `1px solid ${T.hair}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{e.id}</span>
                      <span style={{ fontSize: 13, color: T.slate }}>{e.category}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 999, background: severityColor(e.severity) }} />
                        {e.severity}
                      </span>
                      <span style={{ fontSize: 12.5, color: T.slate }}>Logged by {e.loggedBy} · {e.date}</span>
                    </div>

                    {routingId === e.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ position: "relative" }}>
                          <select
                            value={pendingOwner}
                            onChange={(ev) => setPendingOwner(ev.target.value)}
                            style={{ appearance: "none", fontFamily: FONT, fontSize: 13, color: T.ink, background: T.cream, border: `1px solid ${T.hair}`, borderRadius: 7, padding: "6px 26px 6px 10px", outline: "none" }}
                          >
                            {candidateOwners.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <ChevronDown size={12} color={T.slate} style={{ position: "absolute", right: 8, top: 9, pointerEvents: "none" }} />
                        </div>
                        <button
                          onClick={() => confirmRoute(e.id)}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: T.navy, color: "#fff", border: "none", borderRadius: 7, padding: "6px 12px", fontFamily: FONT, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                        >
                          <Check size={13} /> Confirm
                        </button>
                        <button
                          onClick={() => setRoutingId(null)}
                          style={{ background: "transparent", border: "none", color: T.slate, fontFamily: FONT, fontSize: 12.5, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setRoutingId(e.id); setPendingOwner(candidateOwners[0]); }}
                        style={{ background: T.gold, color: "#3A2B10", border: "none", borderRadius: 7, padding: "7px 14px", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                      >
                        Route Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overturn Rate by Auditor — the key quality signal for a QA Lead:
            which auditors' findings are getting overturned most often */}
        <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Overturn Rate by Auditor</div>
          <div style={{ fontSize: 12.5, marginBottom: 14, color: T.slate }}>Share of each auditor's findings that were overturned on decision, this quarter</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={overturnByAuditor} layout="vertical" margin={{ top: 4, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke={T.hair} />
              <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: T.slate }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12, fill: T.ink }} axisLine={false} tickLine={false} />
              <RTooltip
                formatter={(v: any) => [`${v}%`, "Overturn rate"]}
                contentStyle={{ borderRadius: 10, border: `1px solid ${T.hair}`, fontSize: 12 }}
              />
              <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={16}>
                {overturnByAuditor.map((a, i) => (
                  <Cell key={i} fill={a.rate === maxOverturn ? T.red : a.rate >= 15 ? T.amber : T.gold} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 12, color: T.slate }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: T.red }} />Highest</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: T.amber }} />Elevated (≥15%)</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: T.gold }} />Normal</span>
          </div>
        </div>

      </main>
    </div>
  );
}