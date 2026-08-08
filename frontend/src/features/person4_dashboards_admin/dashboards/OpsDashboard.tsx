import React, { useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell, BarChart, Bar, ReferenceDot,
} from "recharts";
import {
  ChevronDown, AlertTriangle, ListChecks,
  Clock, Siren, RotateCcw, ArrowUpRight, ArrowDownRight, Flame,
} from "lucide-react";


interface SlaRailProps { pct: number; state: "red" | "amber" | "green"; }
interface ComplianceRingProps { pct: number; }
interface KpiCardProps {
  label: string; value: string; delta: string; up: boolean;
  icon: React.ElementType; warn: boolean;
}
interface FilterChipProps { label: string; }

const T = {
  navy: "#101A2E",
  navySoft: "#17223B",
  cream: "#FAF7F1",
  beige: "#F1EBDD",
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

const slaCompliance = { pct: 76, delta: "+2.3%", breachedShare: "9%" };

const kpis: KpiCardProps[] = [
  { label: "Escalated Issues", value: "18", delta: "+5.9%", up: true, icon: Siren, warn: true },
  { label: "Overdue Errors", value: "23", delta: "+12.5%", up: true, icon: AlertTriangle, warn: true },
  { label: "Open Errors", value: "162", delta: "-4.2%", up: false, icon: ListChecks, warn: false },
  { label: "Avg. Resolution Time", value: "3.6 days", delta: "-8.7%", up: false, icon: Clock, warn: false },
  { label: "Closed Errors", value: "1,284", delta: "+8.1%", up: true, icon: RotateCcw, warn: false },
];

const monthlyTrend = [
  { m: "Jan", logged: 40, closed: 36, reopened: 4 },
  { m: "Feb", logged: 52, closed: 44, reopened: 5 },
  { m: "Mar", logged: 58, closed: 55, reopened: 3 },
  { m: "Apr", logged: 64, closed: 60, reopened: 6 },
  { m: "May", logged: 61, closed: 63, reopened: 4 },
  { m: "Jun", logged: 68, closed: 65, reopened: 5 },
  { m: "Jul", logged: 66, closed: 70, reopened: 3 },
  { m: "Aug", logged: 66, closed: 68, reopened: 4 },
];

const severity = [
  { name: "Critical", value: 14, color: T.red },
  { name: "High", value: 22, color: T.amber },
  { name: "Medium", value: 46, color: "#7FA8C9" },
  { name: "Low", value: 80, color: T.navy },
];

const criticalErrors: Array<{ id: string; desc: string; dept: string; owner: string; pct: number; state: "red" | "amber" | "green"; due: string; }> = [
  { id: "ERR-2291", desc: "Duplicate payout on claim batch #4471", dept: "Claims Ops", owner: "R. Iyer", pct: 96, state: "red", due: "1h 12m" },
  { id: "ERR-2287", desc: "Missing KYC attestation, retail onboarding", dept: "Compliance", owner: "Fenwick", pct: 91, state: "red", due: "2h 40m" },
  { id: "ERR-2280", desc: "Rate mismatch on renewal quote set", dept: "Underwriting", owner: "S. Okafor", pct: 84, state: "amber", due: "6h 05m" },
  { id: "ERR-2274", desc: "Data lag, nightly reconciliation feed", dept: "Finance Ops", owner: "T. Alvarez", pct: 78, state: "amber", due: "9h 20m" },
  { id: "ERR-2266", desc: "Incorrect tax code on invoice run", dept: "Finance Ops", owner: "R. Iyer", pct: 71, state: "amber", due: "13h 50m" },
];

const departments = [
  { name: "Claims Ops", value: 46 },
  { name: "Compliance", value: 38 },
  { name: "Underwriting", value: 31 },
  { name: "Finance Ops", value: 27 },
  { name: "Policy Admin", value: 19 },
  { name: "Servicing", value: 12 },
];

const owners = [
  { name: "R. Iyer", value: 21 },
  { name: "M. Fenwick", value: 18 },
  { name: "S. Okafor", value: 15 },
  { name: "T. Alvarez", value: 13 },
  { name: "J. Whitfield", value: 9 },
];

const escalations = [
  { id: "ERR-2291", level: "Level 3 · VP Ops", owner: "R. Iyer", waiting: "42m" },
  { id: "ERR-2287", level: "Level 2 · Compliance Lead", owner: "M. Fenwick", waiting: "1h 05m" },
  { id: "ERR-2280", level: "Level 1 · Team Lead", owner: "S. Okafor", waiting: "2h 18m" },
];

const stateColor = (s: string): string => (s === "red" ? T.red : s === "amber" ? T.amber : T.green);
const stateSoft = (s: string): string => (s === "red" ? T.redSoft : s === "amber" ? T.amberSoft : T.greenSoft);


function SlaRail({ pct, state }: SlaRailProps) {
  return (
    <div style={{ width: 112 }}>
      <div style={{ position: "relative", height: 6, borderRadius: 999, overflow: "hidden", background: T.hair }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "60%", background: T.greenSoft }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "60%", width: "25%", background: T.amberSoft }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "85%", width: "15%", background: T.redSoft }} />
        <div style={{
          position: "absolute", top: -3, height: 12, width: 3, borderRadius: 999,
          left: `calc(${Math.min(pct, 100)}% - 1.5px)`, background: stateColor(state),
        }} />
      </div>
    </div>
  );
}

function ComplianceRing({ pct }: ComplianceRingProps) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg width="86" height="86" viewBox="0 0 86 86">
      <circle cx="43" cy="43" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="8" />
      <circle
        cx="43" cy="43" r={r} fill="none" stroke="#7FC4E8" strokeWidth="8"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" transform="rotate(-90 43 43)"
      />
      <text x="43" y="48" textAnchor="middle" fill="#fff" fontSize="18" fontWeight={600}>{pct}%</text>
    </svg>
  );
}

function KpiCard({ label, value, delta, up, icon: Icon, warn }: KpiCardProps) {
  return (
    <div style={{ borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16, background: T.card, border: `1px solid ${T.hair}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          height: 36, width: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
          background: warn ? T.redSoft : T.beige, color: warn ? T.red : T.gold,
        }}>
          <Icon size={17} strokeWidth={1.8} />
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500,
          padding: "4px 8px", borderRadius: 999,
          color: up ? T.red : T.green, background: up ? T.redSoft : T.greenSoft,
        }}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {delta}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 600, color: T.ink }}>{value}</div>
        <div style={{ fontSize: 12.5, marginTop: 6, color: T.slate }}>{label}</div>
      </div>
    </div>
  );
}

function FilterChip({ label }: FilterChipProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 12px",
      borderRadius: 8, cursor: "pointer", background: T.card, border: `1px solid ${T.hair}`, color: T.ink,
    }}>
      {label} <ChevronDown size={13} color={T.slate} />
    </div>
  );
}


export default function OpsDashboard() {
  const maxDept = useMemo(() => Math.max(...departments.map((d) => d.value)), []);
  const peakMonth = useMemo(
    () => monthlyTrend.reduce((max, cur) => (cur.logged > max.logged ? cur : max), monthlyTrend[0]),
    []
  );

  // NOTE: no <header> here on purpose. AppShell (Person 1's shared shell) already
  // renders the app's real top nav + sidebar around every routed page — this
  // component only needs to return its own page CONTENT, not a second nav bar.
  // If you ever need this dashboard to render standalone (e.g. outside AppShell,
  // for a design preview), that's what the earlier full-header version was for.

  return (
    <div style={{ width: "100%", minHeight: "100%", background: T.cream, fontFamily: FONT }}>
      <main style={{ padding: "4px 4px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: T.slate }}>Operations / Overview</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.3px", color: T.ink }}>Operations Dashboard</div>
          </div>
          <div style={{ fontSize: 12, color: T.slate }}>Last updated 4 minutes ago</div>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, background: T.card, border: `1px solid ${T.hair}` }}>
          {["Date Range", "LOB", "Category", "Subcategory", "Severity", "Status", "Assigned Team"].map((f) => (
            <FilterChip key={f} label={f} />
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginLeft: "auto", cursor: "pointer", color: T.slate }}>
            <RotateCcw size={13} /> Reset
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 8, color: "#fff", cursor: "pointer", background: T.navy }}>
            Apply Filters
          </div>
        </div>

        {/* KPI row — minmax-based grid so it reflows cleanly with the sidebar's real width taken into account, instead of assuming full viewport */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 300px) repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div style={{ borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 16, background: T.navy }}>
            <ComplianceRing pct={slaCompliance.pct} />
            <div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>SLA Compliance</div>
              <div style={{ fontSize: 11, marginBottom: 6, color: "rgba(255,255,255,0.4)" }}>Rolling 30 days</div>
              <div style={{ fontSize: 12, color: "#8FD4A8" }}>↗ {slaCompliance.delta} vs. last period</div>
              <div style={{ fontSize: 11, marginTop: 4, color: "rgba(255,255,255,0.4)" }}>{slaCompliance.breachedShare} of open errors currently breached</div>
            </div>
          </div>
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        {/* Trends & Distribution */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: T.ink }}>Trends &amp; Distribution</div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 2fr) minmax(260px, 1fr)", gap: 20 }}>
            <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Monthly Error Trend</div>
              <div style={{ fontSize: 12, marginBottom: 12, color: T.slate }}>Logged vs. closed vs. reopened, last 8 months</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyTrend} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="loggedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.gold} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={T.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={T.hair} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: T.slate }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: T.slate }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.hair}`, fontSize: 12 }} />
                  <Area type="monotone" dataKey="logged" name="Logged" stroke={T.gold} strokeWidth={2.5} fill="url(#loggedGrad)" dot={false} />
                  <Line type="monotone" dataKey="closed" name="Closed" stroke={T.green} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reopened" name="Reopened" stroke={T.red} strokeWidth={2} dot={false} />
                  <ReferenceDot
                    x={peakMonth.m}
                    y={peakMonth.logged}
                    r={4}
                    fill={T.gold}
                    stroke="#fff"
                    strokeWidth={2}
                    label={{
                      value: `${peakMonth.logged} · ${peakMonth.m}`,
                      position: "top",
                      fill: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      style: {
                        // Recharts doesn't support a real "bubble" background out of the box —
                        // this is a reasonable approximation using a stroked text outline.
                        paintOrder: "stroke",
                        stroke: T.navy,
                        strokeWidth: 6,
                        strokeLinejoin: "round",
                      },
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 12, color: T.slate }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ height: 6, width: 6, borderRadius: 999, background: T.gold }} />Logged</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ height: 6, width: 6, borderRadius: 999, background: T.green }} />Closed</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ height: 6, width: 6, borderRadius: 999, background: T.red }} />Reopened</span>
              </div>
            </div>

            <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Errors by Severity</div>
              <div style={{ fontSize: 12, marginBottom: 4, color: T.slate }}>Operational risk breakdown</div>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={severity} dataKey="value" innerRadius={52} outerRadius={74} paddingAngle={2}>
                    {severity.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <RTooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.hair}`, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", columnGap: 16, rowGap: 6, marginTop: 4, fontSize: 12, color: T.slate }}>
                {severity.map((s) => (
                  <span key={s.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ height: 6, width: 6, borderRadius: 999, background: s.color }} />{s.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Needs attention table */}
        <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Needs Immediate Attention</div>
              <div style={{ fontSize: 12.5, marginTop: 2, color: T.slate }}>Ranked by SLA elapsed time</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: T.red }}>
              <Flame size={14} /> 5 breaching within 24h
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 720, fontSize: 14, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.4px", color: T.slate }}>
                <th style={{ paddingBottom: 12, fontWeight: 500 }}>ID</th>
                <th style={{ paddingBottom: 12, fontWeight: 500 }}>Description</th>
                <th style={{ paddingBottom: 12, fontWeight: 500 }}>Department</th>
                <th style={{ paddingBottom: 12, fontWeight: 500 }}>Owner</th>
                <th style={{ paddingBottom: 12, fontWeight: 500 }}>SLA Aging</th>
                <th style={{ paddingBottom: 12, fontWeight: 500, textAlign: "right" }}>Time to Breach</th>
              </tr>
            </thead>
            <tbody>
              {criticalErrors.map((e) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${T.hair}` }}>
                  <td style={{ padding: "14px 0", fontWeight: 500, color: T.ink }}>{e.id}</td>
                  <td style={{ padding: "14px 24px 14px 0", color: T.ink }}>{e.desc}</td>
                  <td style={{ padding: "14px 0", color: T.slate }}>{e.dept}</td>
                  <td style={{ padding: "14px 0", color: T.slate }}>{e.owner}</td>
                  <td style={{ padding: "14px 0" }}><SlaRail pct={e.pct} state={e.state} /></td>
                  <td style={{ padding: "14px 0", textAlign: "right" }}>
                    <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: stateSoft(e.state), color: stateColor(e.state) }}>
                      {e.due}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Departments + Owners + Escalations */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, color: T.ink }}>Departments by Volume</div>
            <div style={{ fontSize: 12.5, marginBottom: 16, color: T.slate }}>Open errors, this quarter</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {departments.map((d) => (
                <div key={d.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ color: T.ink }}>{d.name}</span>
                    <span style={{ color: T.slate }}>{d.value}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: T.beige }}>
                    <div style={{ height: 6, borderRadius: 999, width: `${(d.value / maxDept) * 100}%`, background: T.gold }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, color: T.ink }}>Owner Workload</div>
            <div style={{ fontSize: 12.5, marginBottom: 8, color: T.slate }}>Open items assigned right now</div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={owners} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={78} tick={{ fontSize: 11.5, fill: T.ink }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.hair}`, fontSize: 12 }} cursor={{ fill: T.beige }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                  {owners.map((o, i) => <Cell key={i} fill={i === 0 ? T.red : T.navy} fillOpacity={i === 0 ? 1 : 0.82 - i * 0.12} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ borderRadius: 16, padding: 24, background: T.navy }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Siren size={15} color={T.goldSoft} />
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Escalation Queue</div>
            </div>
            <div style={{ fontSize: 12.5, marginBottom: 16, color: "rgba(255,255,255,0.5)" }}>Waiting on next-level response</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {escalations.map((e) => (
                <div key={e.id} style={{ borderRadius: 12, padding: 14, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{e.id}</span>
                    <span style={{ fontSize: 11.5, color: T.goldSoft }}>{e.waiting}</span>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: "rgba(255,255,255,0.55)" }}>{e.level} · {e.owner}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
