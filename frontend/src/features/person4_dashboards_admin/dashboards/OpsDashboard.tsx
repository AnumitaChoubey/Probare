import React, { useMemo, useState } from "react";
import {
  LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell, BarChart, Bar,
} from "recharts";
import {
  Search, Bell, Settings, ChevronDown, AlertTriangle, ListChecks,
  Clock, Siren, RotateCcw, ArrowUpRight, ArrowDownRight, Flame,
} from "lucide-react";

interface SlaRailProps {
  pct: number;
  state: string;
}

interface ComplianceRingProps {
  pct: number;
}

interface TabItemProps {
  label: string;
  active?: boolean;
}

interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  icon: React.ElementType;
  warn: boolean;
}

interface FilterChipProps {
  label: string;
}

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

const slaCompliance = { pct: 76, delta: "+2.3%", breachedShare: "9%" };

const kpis = [
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
  { m: "Aug", logged: 71, closed: 68, reopened: 4 },
];

const severity = [
  { name: "Critical", value: 14, color: T.red },
  { name: "High", value: 22, color: T.amber },
  { name: "Medium", value: 46, color: "#7FA8C9" },
  { name: "Low", value: 80, color: T.navy },
];

const criticalErrors = [
  { id: "ERR-2291", desc: "Duplicate payout on claim batch #4471", dept: "Claims Ops", owner: "R. Iyer", pct: 96, state: "red", due: "1h 12m" },
  { id: "ERR-2287", desc: "Missing KYC attestation, retail onboarding", dept: "Compliance", owner: "M. Fenwick", pct: 91, state: "red", due: "2h 40m" },
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
    <div className="w-28">
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: T.hair }}>
        <div className="absolute inset-y-0 left-0" style={{ width: "60%", background: T.greenSoft }} />
        <div className="absolute inset-y-0" style={{ left: "60%", width: "25%", background: T.amberSoft }} />
        <div className="absolute inset-y-0" style={{ left: "85%", width: "15%", background: T.redSoft }} />
        <div
          className="absolute -top-[3px] h-3 w-[3px] rounded-full"
          style={{ left: `calc(${Math.min(pct, 100)}% - 1.5px)`, background: stateColor(state) }}
        />
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
      <text x="43" y="48" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="600">{pct}%</text>
    </svg>
  );
}

function TabItem({ label, active }: TabItemProps) {
  return (
    <div
      className="pb-4 -mb-px text-[13.5px] cursor-pointer"
      style={{
        color: active ? "#fff" : "rgba(255,255,255,0.55)",
        borderBottom: active ? `2px solid ${T.gold}` : "2px solid transparent",
      }}
    >
      {label}
    </div>
  );
}

function KpiCard({ label, value, delta, up, icon: Icon, warn }: KpiCardProps) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: T.card, border: `1px solid ${T.hair}` }}>
      <div className="flex items-center justify-between">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={{ background: warn ? T.redSoft : T.beige, color: warn ? T.red : T.gold }}
        >
          <Icon size={17} strokeWidth={1.8} />
        </div>
        <div
          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
          style={{ color: up ? T.red : T.green, background: up ? T.redSoft : T.greenSoft }}
        >
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {delta}
        </div>
      </div>
      <div>
        <div className="text-[24px] leading-none font-semibold tabular-nums" style={{ color: T.ink }}>{value}</div>
        <div className="text-[12.5px] mt-1.5" style={{ color: T.slate }}>{label}</div>
      </div>
    </div>
  );
}

function FilterChip({ label }: FilterChipProps) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-lg cursor-pointer"
      style={{ background: T.card, border: `1px solid ${T.hair}`, color: T.ink }}>
      {label} <ChevronDown size={13} color={T.slate} />
    </div>
  );
}

export default function OpsDashboard() {
  const maxDept = useMemo(() => Math.max(...departments.map((d) => d.value)), []);

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: T.cream, fontFamily: "'Inter', ui-sans-serif, system-ui" }}>

      {/* ================= TOP RIBBON — replaces the left sidebar ================= */}
      <header style={{ background: T.navy }}>
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-9">
            <div className="flex items-center gap-2.5">
              {/* LINE 210 — logo placeholder. Swap this block for the real mark,
                  e.g. <img src="/probare-mark.svg" className="h-7 w-7" alt="Probare" /> */}
              <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: T.gold }}>
                <span className="text-[12px] font-bold" style={{ color: T.navy }}>P</span>
              </div>
              <span className="text-white font-semibold text-[15px] tracking-tight">Probare</span>
            </div>
            <nav className="flex items-center gap-7 h-14 items-end pb-0">
              <TabItem label="Overview" active />
              <TabItem label="Escalations" />
              <TabItem label="Reports" />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-64 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }}>
              <Search size={14} color="rgba(255,255,255,0.55)" />
              <input placeholder="Search errors, IDs…" className="bg-transparent outline-none text-[13px] flex-1 text-white placeholder:text-white/40" />
            </div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center relative cursor-pointer" style={{ background: "rgba(255,255,255,0.08)" }}>
              <Bell size={15} color="#fff" />
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 text-[8.5px] flex items-center justify-center rounded-full text-white font-medium" style={{ background: T.red }}>3</span>
            </div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "rgba(255,255,255,0.08)" }}>
              <Settings size={15} color="#fff" />
            </div>
            <div className="flex items-center gap-2 pl-1">
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{ background: T.gold, color: T.navy }}>YP</div>
              <div className="leading-tight">
                <div className="text-[12.5px] text-white">Yasaswini P.</div>
                <div className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.5)" }}>Operations Manager</div>
              </div>
            </div>
          </div>
        </div>
        {/* thin sub-bar to echo the reference's two-tone ribbon */}
        <div className="h-1" style={{ background: T.navySoft }} />
      </header>

      {/*  MAIN */}
      <main className="flex-1 px-8 py-7 flex flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[12px] mb-1" style={{ color: T.slate }}>Operations / Overview</div>
            <div className="text-[22px] font-semibold tracking-tight" style={{ color: T.ink }}>Operations Dashboard</div>
          </div>
          <div className="text-[12px]" style={{ color: T.slate }}>Last updated 4 minutes ago</div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl" style={{ background: T.card, border: `1px solid ${T.hair}` }}>
          {["Date Range", "LOB", "Category", "Subcategory", "Severity", "Status", "Assigned Team"].map((f) => (
            <FilterChip key={f} label={f} />
          ))}
          <div className="flex items-center gap-1.5 text-[13px] ml-auto cursor-pointer" style={{ color: T.slate }}>
            <RotateCcw size={13} /> Reset
          </div>
          <div className="text-[13px] font-medium px-4 py-2 rounded-lg text-white cursor-pointer" style={{ background: T.navy }}>
            Apply Filters
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2 rounded-2xl p-5 flex items-center gap-4" style={{ background: T.navy }}>
            <ComplianceRing pct={slaCompliance.pct} />
            <div>
              <div className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.55)" }}>SLA Compliance</div>
              <div className="text-[11px] mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Rolling 30 days</div>
              <div className="text-[12px]" style={{ color: "#8FD4A8" }}>↗ {slaCompliance.delta} vs. last period</div>
              <div className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{slaCompliance.breachedShare} of open errors currently breached</div>
            </div>
          </div>
          {kpis.map((k) => (
            <div key={k.label} className="md:col-span-1">
              <KpiCard {...k} />
            </div>
          ))}
        </div>

        {/* Trends & Distribution */}
        <div>
          <div className="text-[15px] font-semibold mb-3" style={{ color: T.ink }}>Trends &amp; Distribution</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.hair}` }}>
              <div className="text-[14px] font-semibold" style={{ color: T.ink }}>Monthly Error Trend</div>
              <div className="text-[12px] mb-3" style={{ color: T.slate }}>Logged vs. closed vs. reopened, last 8 months</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyTrend} margin={{ top: 6, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={T.hair} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: T.slate }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: T.slate }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.hair}`, fontSize: 12 }} />
                  <Line type="monotone" dataKey="logged" name="Logged" stroke={T.navy} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="closed" name="Closed" stroke={T.green} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reopened" name="Reopened" stroke={T.red} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-2 text-[12px]" style={{ color: T.slate }}>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.navy }} />Logged</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.green }} />Closed</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.red }} />Reopened</span>
              </div>
            </div>

            <div className="rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.hair}` }}>
              <div className="text-[14px] font-semibold" style={{ color: T.ink }}>Errors by Severity</div>
              <div className="text-[12px] mb-1" style={{ color: T.slate }}>Operational risk breakdown</div>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={severity} dataKey="value" innerRadius={52} outerRadius={74} paddingAngle={2}>
                    {severity.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <RTooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.hair}`, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1 text-[12px]" style={{ color: T.slate }}>
                {severity.map((s) => (
                  <span key={s.name} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{s.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Needs attention table */}
        <div className="rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.hair}` }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[15px] font-semibold" style={{ color: T.ink }}>Needs Immediate Attention</div>
              <div className="text-[12.5px] mt-0.5" style={{ color: T.slate }}>Ranked by SLA elapsed time</div>
            </div>
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: T.red }}>
              <Flame size={14} /> 5 breaching within 24h
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide" style={{ color: T.slate }}>
                <th className="pb-3 font-medium">ID</th>
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium">Owner</th>
                <th className="pb-3 font-medium">SLA Aging</th>
                <th className="pb-3 font-medium text-right">Time to Breach</th>
              </tr>
            </thead>
            <tbody>
              {criticalErrors.map((e) => (
                <tr key={e.id} className="border-t" style={{ borderColor: T.hair }}>
                  <td className="py-3.5 font-medium" style={{ color: T.ink }}>{e.id}</td>
                  <td className="py-3.5 pr-6" style={{ color: T.ink }}>{e.desc}</td>
                  <td className="py-3.5" style={{ color: T.slate }}>{e.dept}</td>
                  <td className="py-3.5" style={{ color: T.slate }}>{e.owner}</td>
                  <td className="py-3.5"><SlaRail pct={e.pct} state={e.state} /></td>
                  <td className="py-3.5 text-right">
                    <span className="px-2.5 py-1 rounded-full text-[12px] font-medium" style={{ background: stateSoft(e.state), color: stateColor(e.state) }}>
                      {e.due}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Departments + Owners + Escalations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.hair}` }}>
            <div className="text-[15px] font-semibold mb-0.5" style={{ color: T.ink }}>Departments by Volume</div>
            <div className="text-[12.5px] mb-4" style={{ color: T.slate }}>Open errors, this quarter</div>
            <div className="flex flex-col gap-3">
              {departments.map((d) => (
                <div key={d.name}>
                  <div className="flex justify-between text-[12.5px] mb-1">
                    <span style={{ color: T.ink }}>{d.name}</span>
                    <span className="tabular-nums" style={{ color: T.slate }}>{d.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: T.beige }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${(d.value / maxDept) * 100}%`, background: T.gold }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.hair}` }}>
            <div className="text-[15px] font-semibold mb-0.5" style={{ color: T.ink }}>Owner Workload</div>
            <div className="text-[12.5px] mb-2" style={{ color: T.slate }}>Open items assigned right now</div>
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

          <div className="rounded-2xl p-6" style={{ background: T.navy }}>
            <div className="flex items-center gap-2 mb-0.5">
              <Siren size={15} color={T.goldSoft} />
              <div className="text-[15px] font-semibold text-white">Escalation Queue</div>
            </div>
            <div className="text-[12.5px] mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>Waiting on next-level response</div>
            <div className="flex flex-col gap-3">
              {escalations.map((e) => (
                <div key={e.id} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-medium text-white">{e.id}</span>
                    <span className="text-[11.5px]" style={{ color: T.goldSoft }}>{e.waiting}</span>
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>{e.level} · {e.owner}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}