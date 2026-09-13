import React, { useState } from "react";
import { Plus, Trash2, Clock, CalendarDays } from "lucide-react";

const T = {
  navy: "#101A2E",
  cream: "#FAF7F1",
  card: "#FFFFFF",
  gold: "#B08B4F",
  red: "#B34B3C",
  ink: "#1B2333",
  slate: "#6B7280",
  hair: "#E7E1D2",
};

const FONT = "'Inter', 'Avenir', 'Segoe UI', ui-sans-serif, system-ui";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WorkingHoursRow {
  region_code: string;
  business_start_time: string;
  business_end_time: string;
  business_days_of_week: string[];
}
interface HolidayRow {
  region_code: string;
  date: string;
  label: string;
}

const initialHours: WorkingHoursRow[] = [
  { region_code: "US-EAST", business_start_time: "09:00", business_end_time: "17:00", business_days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { region_code: "IN-HYD", business_start_time: "09:30", business_end_time: "18:30", business_days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
];

const initialHolidays: HolidayRow[] = [
  { region_code: "US-EAST", date: "2026-09-07", label: "Labor Day" },
  { region_code: "IN-HYD", date: "2026-08-15", label: "Independence Day" },
  { region_code: "IN-HYD", date: "2026-10-21", label: "Diwali" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: T.slate, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", fontFamily: FONT, fontSize: 13, color: T.ink, background: T.card,
  border: `1px solid ${T.hair}`, borderRadius: 7, padding: "8px 10px", outline: "none",
};

export default function WorkingHoursHolidays() {
  const [hours, setHours] = useState<WorkingHoursRow[]>(initialHours);
  const [holidays, setHolidays] = useState<HolidayRow[]>(initialHolidays);

  const [showHoursForm, setShowHoursForm] = useState(false);
  const [newHours, setNewHours] = useState<WorkingHoursRow>({ region_code: "", business_start_time: "09:00", business_end_time: "17:00", business_days_of_week: [] });

  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [newHoliday, setNewHoliday] = useState<HolidayRow>({ region_code: "", date: "", label: "" });

  const toggleDay = (d: string) =>
    setNewHours((prev) => ({
      ...prev,
      business_days_of_week: prev.business_days_of_week.includes(d)
        ? prev.business_days_of_week.filter((x) => x !== d)
        : [...prev.business_days_of_week, d],
    }));

  const saveHours = () => {
    if (!newHours.region_code) return;
    setHours((prev) => [...prev, newHours]);
    setNewHours({ region_code: "", business_start_time: "09:00", business_end_time: "17:00", business_days_of_week: [] });
    setShowHoursForm(false);
  };

  const saveHoliday = () => {
    if (!newHoliday.region_code || !newHoliday.date || !newHoliday.label) return;
    setHolidays((prev) => [...prev, newHoliday].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHoliday({ region_code: "", date: "", label: "" });
    setShowHolidayForm(false);
  };

  const th: React.CSSProperties = { textAlign: "left", fontSize: 12, fontWeight: 600, color: T.slate, padding: "10px 14px", borderBottom: `1px solid ${T.hair}` };
  const td: React.CSSProperties = { padding: "11px 14px", borderBottom: `1px solid ${T.hair}`, fontSize: 13.5, color: T.ink };

  return (
    <div style={{ fontFamily: FONT, display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Business Hours */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={16} color={T.gold} />
            <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Business Hours</span>
          </div>
          <button
            onClick={() => setShowHoursForm((s) => !s)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "#3A2B10", background: T.gold, border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}
          >
            <Plus size={13} /> Add Region
          </button>
        </div>

        {showHoursForm && (
          <div style={{ background: T.cream, border: `1px solid ${T.hair}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
              <Field label="Region Code"><input style={inputStyle} value={newHours.region_code} onChange={(e) => setNewHours({ ...newHours, region_code: e.target.value })} placeholder="e.g. US-WEST" /></Field>
              <Field label="Start Time"><input type="time" style={inputStyle} value={newHours.business_start_time} onChange={(e) => setNewHours({ ...newHours, business_start_time: e.target.value })} /></Field>
              <Field label="End Time"><input type="time" style={inputStyle} value={newHours.business_end_time} onChange={(e) => setNewHours({ ...newHours, business_end_time: e.target.value })} /></Field>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: T.slate, marginBottom: 6 }}>Business Days</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DAYS.map((d) => (
                  <label key={d} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: T.ink, border: `1px solid ${T.hair}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>
                    <input type="checkbox" checked={newHours.business_days_of_week.includes(d)} onChange={() => toggleDay(d)} />
                    {d}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={saveHours} style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", background: T.navy, border: "none", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Save</button>
          </div>
        )}

        <div style={{ border: `1px solid ${T.hair}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFC" }}>
                <th style={th}>Region</th>
                <th style={th}>Start</th>
                <th style={th}>End</th>
                <th style={th}>Business Days</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h.region_code}>
                  <td style={{ ...td, fontWeight: 600 }}>{h.region_code}</td>
                  <td style={td}>{h.business_start_time}</td>
                  <td style={td}>{h.business_end_time}</td>
                  <td style={{ ...td, color: T.slate }}>{h.business_days_of_week.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Holidays */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarDays size={16} color={T.gold} />
            <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Holiday Calendar</span>
          </div>
          <button
            onClick={() => setShowHolidayForm((s) => !s)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "#3A2B10", background: T.gold, border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}
          >
            <Plus size={13} /> Add Holiday
          </button>
        </div>

        {showHolidayForm && (
          <div style={{ background: T.cream, border: `1px solid ${T.hair}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
              <Field label="Region Code"><input style={inputStyle} value={newHoliday.region_code} onChange={(e) => setNewHoliday({ ...newHoliday, region_code: e.target.value })} placeholder="e.g. IN-HYD" /></Field>
              <Field label="Date"><input type="date" style={inputStyle} value={newHoliday.date} onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })} /></Field>
              <Field label="Label"><input style={inputStyle} value={newHoliday.label} onChange={(e) => setNewHoliday({ ...newHoliday, label: e.target.value })} placeholder="e.g. Diwali" /></Field>
            </div>
            <button onClick={saveHoliday} style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", background: T.navy, border: "none", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Save</button>
          </div>
        )}

        <div style={{ border: `1px solid ${T.hair}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFC" }}>
                <th style={th}>Region</th>
                <th style={th}>Date</th>
                <th style={th}>Label</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 600 }}>{h.region_code}</td>
                  <td style={td}>{h.date}</td>
                  <td style={{ ...td, color: T.slate }}>{h.label}</td>
                  <td style={td}>
                    <button
                      onClick={() => setHolidays((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: T.red, display: "flex" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {holidays.length === 0 && (
                <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: T.slate, padding: 24 }}>No holidays added yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}