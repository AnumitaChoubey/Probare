import React, { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";
import {
  ChevronDown, AlertOctagon, ShieldAlert, TrendingDown, ListChecks,
  ArrowUpRight, ArrowDownRight, Download, Check, X,
} from "lucide-react";

/* ---------------------------------------------------------------
   Same tokens as OpsDashboard.tsx / TeamDashboard.tsx — kept in
   sync deliberately so all three read as one product.
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
   MOCK DATA — swap for GET /dashboards/leadership once live.
   Backend pre-aggregates all of this server-side (per your own
   DASH-4 spec) — the frontend should never recompute aging math
   or SLA state itself. Aging distribution below is shaped to match
   Person 1's real sla_state {elapsed_pct, state} output exactly,
   so swapping mock -> real data is a drop-in, not a rewrite.
--------------------------------------------------------------- */

const lobOptions = ["Claims Ops", "Underwriting", "Compliance", "Finance Ops", "Policy Admin"];
const categoryOptions = ["Data Entry", "Documentation", "Compliance", "System Config", "Underwriting"];
const severityOptions = ["Critical", "High", "Medium", "Low"];

const slaCompliance = { pct: 79, delta: "+1.1%" };

const kpis = [
  { label: "Client-Impact Flagged", value: "11", delta: "+22%", up: true, worseIfUp: true, icon: ShieldAlert },
  { label: "Escalation Rate", value: "7.4%", delta: "+1.6%", up: true, worseIfUp: true, icon: AlertOctagon },
  { label: "Overturn Rate", value: "13%", delta: "-1.9%", up: false, worseIfUp: false, icon: TrendingDown },
  { label: "Total Errors", value: "1,942", delta: "+4.3%", up: true, worseIfUp: false, icon: ListChecks },
];

const trendData = [
  { m: "Jan", total: 210 }, { m: "Feb", total: 245 }, { m: "Mar", total: 268 },
  { m: "Apr", total: 251 }, { m: "May", total: 288 }, { m: "Jun", total: 302 },
  { m: "Jul", total: 294 }, { m: "Aug", total: 318 },
];

const byLob = [
  { name: "Claims Ops", value: 512 },
  { name: "Underwriting", value: 438 },
  { name: "Compliance", value: 361 },
  { name: "Finance Ops", value: 340 },
  { name: "Policy Admin", value: 291 },
];

const byCategory = [
  { name: "Data Entry", value: 34, color: T.gold },
  { name: "Documentation", value: 26, color: "#7FA8C9" },
  { name: "Compliance", value: 21, color: T.navy },
  { name: "System Config", value: 12, color: T.amber },
  { name: "Underwriting", value: 7, color: T.red },
];

// Shaped to match Person 1's real per-error sla_state output:
// { elapsed_pct: number, state: "green" | "amber" | "red" }
// aggregated into counts here — this is exactly what the backend
// will hand back pre-aggregated once GET /dashboards/leadership exists.
const agingDistribution = [
  { name: "On track", state: "green", count: 1428 },
  { name: "Near breach", state: "amber", count: 356 },
  { name: "Breached", state: "red", count: 158 },
];
const agingColor: Record<string, string> = { green: T.green, amber: T.amber, red: T.red };

/* ---------------------------------------------------------------
   SUBCOMPONENTS
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

function SingleSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div style={{ position: "relative", width: 150 }}>
      <select defaultValue="" style={{ width: "100%", appearance: "none", fontFamily: FONT, fontSize: 13, color: T.ink, background: T.card, border: `1px solid ${T.hair}`, borderRadius: 8, padding: "8px 28px 8px 11px", cursor: "pointer", outline: "none" }}>
        <option value="">{label}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} color={T.slate} style={{ position: "absolute", right: 9, top: 10, pointerEvents: "none" }} />
    </div>
  );
}

/* Multi-select LOB filter — your doc specifically calls this one out
   as multi-select, unlike the single-selects elsewhere in the filter
   bar, so it's built as a real dropdown with checkboxes rather than
   a native <select multiple>, which is famously unusable as UI. */
function MultiSelectLob({ selected, onToggle }: { selected: string[]; onToggle: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const label = selected.length === 0 ? "LOB" : selected.length === 1 ? selected[0] : `${selected.length} LOBs`;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT, fontSize: 13, color: T.ink, background: T.card, border: `1px solid ${T.hair}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
      >
        {label} <ChevronDown size={13} color={T.slate} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 10, background: T.card, border: `1px solid ${T.hair}`, borderRadius: 10, padding: 10, minWidth: 180, boxShadow: "0 8px 20px rgba(16,26,46,0.12)" }}>
          {lobOptions.map((l) => (
            <label key={l} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink, padding: "6px 4px", cursor: "pointer" }}>
              <input type="checkbox" checked={selected.includes(l)} onChange={() => onToggle(l)} />
              {l}
            </label>
          ))}
          <button onClick={() => setOpen(false)} style={{ marginTop: 6, width: "100%", fontFamily: FONT, fontSize: 12.5, fontWeight: 600, background: T.navy, color: "#fff", border: "none", borderRadius: 7, padding: "6px 0", cursor: "pointer" }}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   MAIN
--------------------------------------------------------------- */

export default function LeadershipDashboard() {
  const [selectedLobs, setSelectedLobs] = useState<string[]>([]);
  const [exportState, setExportState] = useState<"idle" | "running" | "done">("idle");
  const [format, setFormat] = useState("CSV");

  const toggleLob = (l: string) =>
    setSelectedLobs((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const totalAging = useMemo(() => agingDistribution.reduce((s, a) => s + a.count, 0), []);

  const runExport = () => {
    // TODO: wire to real POST /reports/export with { dashboard: "leadership", filters, format }.
    // Small/fast exports return a download link synchronously; large ones run in the
    // background and fire Person 3's in-app notification when ready — this stub just
    // simulates that async gap so the UI has somewhere real to land the state.
    setExportState("running");
    setTimeout(() => setExportState("done"), 1800);
  };

  return (
    <div style={{ width: "100%", minHeight: "100%", background: T.cream, fontFamily: FONT }}>
      <main style={{ padding: "4px 4px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: T.slate }}>Leadership / Overview</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.3px", color: T.ink }}>Leadership Dashboard</div>
          </div>
          <span style={{ fontSize: 12, color: T.slate }}>Last updated 4 minutes ago</span>
        </div>

        {/* Full filter bar — date range, multi-select LOB, category, severity,
            client-impact flag toggle, per your DASH-4 spec */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 9, padding: 14, borderRadius: 12, background: T.card, border: `1px solid ${T.hair}` }}>
          <SingleSelect label="Date Range" options={["Last 7 days", "Last 30 days", "Last quarter", "YTD"]} />
          <MultiSelectLob selected={selectedLobs} onToggle={toggleLob} />
          <SingleSelect label="Category" options={categoryOptions} />
          <SingleSelect label="Severity" options={severityOptions} />
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: T.ink, padding: "8px 12px", border: `1px solid ${T.hair}`, borderRadius: 8, cursor: "pointer" }}>
            <input type="checkbox" /> Client-impact flagged only
          </label>
          <div style={{ flex: 1 }} />
          <button style={{ fontSize: 13, color: T.slate, background: "transparent", border: "none", cursor: "pointer" }}>Reset</button>
          <button style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: T.navy, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>Apply Filters</button>
        </div>

        {/* KPI row — hero SLA card (consistent with Ops/Team) + supporting
            tiles ordered by leadership priority: client-impact risk leads,
            not the raw total count your doc lists it after */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 300px) repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
          <div style={{ borderRadius: 16, padding: 20, background: T.navy, color: "#fff" }}>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>SLA Compliance</div>
            <div style={{ fontSize: 11, marginBottom: 10, color: "rgba(255,255,255,0.4)" }}>Org-wide · Rolling 30 days</div>
            <div style={{ fontSize: 32, fontWeight: 600, lineHeight: 1 }}>{slaCompliance.pct}%</div>
            <div style={{ fontSize: 12, marginTop: 8, color: "#8FD4A8" }}>↗ {slaCompliance.delta} vs. last period</div>
          </div>
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        {/* Errors by LOB + Category distribution */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1.4fr) minmax(260px, 1fr)", gap: 20 }}>
          <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Errors by LOB</div>
            <div style={{ fontSize: 12.5, marginBottom: 14, color: T.slate }}>Total volume, current filter selection</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byLob}>
                <CartesianGrid vertical={false} stroke={T.hair} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.slate }} axisLine={{ stroke: T.hair }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.slate }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.hair}`, fontSize: 12 }} />
                <Bar dataKey="value" fill={T.navy} radius={[6, 6, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Category Distribution</div>
            <div style={{ fontSize: 12.5, marginBottom: 4, color: T.slate }}>Share of total errors</div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" innerRadius={52} outerRadius={76} paddingAngle={2}>
                  {byCategory.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <RTooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.hair}`, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Share"]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", columnGap: 14, rowGap: 6, marginTop: 4, fontSize: 12, color: T.slate }}>
              {byCategory.map((c) => (
                <span key={c.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: c.color }} /> {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Trend + Aging distribution */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1.6fr) minmax(260px, 1fr)", gap: 20 }}>
          <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Error Volume Trend</div>
            <div style={{ fontSize: 12.5, marginBottom: 12, color: T.slate }}>Total errors logged, last 8 months</div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trendData} margin={{ top: 6, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.gold} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={T.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={T.hair} />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: T.slate }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.slate }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.hair}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="total" name="Total errors" stroke={T.gold} strokeWidth={2.5} fill="url(#leadGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Aging Distribution</div>
            <div style={{ fontSize: 12.5, marginBottom: 14, color: T.slate }}>Live SLA state across all open errors</div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={agingDistribution} dataKey="count" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2}>
                  {agingDistribution.map((a) => <Cell key={a.state} fill={agingColor[a.state]} />)}
                </Pie>
                <RTooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.hair}`, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {agingDistribution.map((a) => (
                <div key={a.state} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: T.slate }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: agingColor[a.state] }} /> {a.name}
                  </span>
                  <span style={{ fontWeight: 600, color: T.ink }}>{Math.round((a.count / totalAging) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export Report */}
        <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Export Report</div>
            <div style={{ fontSize: 12.5, marginTop: 2, color: T.slate }}>
              {exportState === "idle" && "Exports the current filtered view."}
              {exportState === "running" && "Preparing your export — this can take a moment for large date ranges."}
              {exportState === "done" && "Export ready. You'll also get a notification once this is wired to Person 3's system."}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SingleSelect label={format} options={["CSV"]} />
            {exportState !== "running" ? (
              <button
                onClick={runExport}
                style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "#3A2B10", background: T.gold, border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}
              >
                <Download size={14} /> Export
              </button>
            ) : (
              <button disabled style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: T.slate, background: T.hair, border: "none", borderRadius: 8, padding: "9px 16px" }}>
                Preparing…
              </button>
            )}
            {exportState === "done" && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: T.green }}>
                <Check size={14} /> Ready
              </span>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}