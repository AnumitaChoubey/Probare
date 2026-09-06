import React, { useState } from "react";
import { ChevronDown, Download, Check, FileText } from "lucide-react";

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

const lobOptions = ["Claims Ops", "Underwriting", "Compliance", "Finance Ops", "Policy Admin"];
const categoryOptions = ["Data Entry", "Documentation", "Compliance", "System Config", "Underwriting"];
const severityOptions = ["Critical", "High", "Medium", "Low"];
const statusOptions = ["Open", "Pending Response", "Closed", "Escalated"];

function SingleSelect({ label, options, width = 150 }: { label: string; options: string[]; width?: number }) {
  return (
    <div style={{ position: "relative", width }}>
      <select defaultValue="" style={{ width: "100%", appearance: "none", fontFamily: FONT, fontSize: 13, color: T.ink, background: T.card, border: `1px solid ${T.hair}`, borderRadius: 8, padding: "8px 28px 8px 11px", cursor: "pointer", outline: "none" }}>
        <option value="">{label}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} color={T.slate} style={{ position: "absolute", right: 9, top: 10, pointerEvents: "none" }} />
    </div>
  );
}

import { useAuth } from "../person1_foundation/useAuth";

export default function ReportsExport() {
  const [format, setFormat] = useState("CSV");
  const [exportState, setExportState] = useState<"idle" | "running" | "done">("idle");
  const { token } = useAuth();

  const runExport = async () => {
    setExportState("running");
    try {
      const response = await fetch("http://localhost:8000/reports/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          dashboard: "reports",
          filters: {},
          format: "csv"
        })
      });

      if (!response.ok) {
        console.error("Export failed");
        setExportState("idle");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qems_report_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setExportState("done");
      setTimeout(() => setExportState("idle"), 3000);
    } catch (error) {
      console.error("Export error:", error);
      setExportState("idle");
    }
  };

  return (
    <div style={{ width: "100%", minHeight: "100%", background: T.cream, fontFamily: FONT }}>
      <main style={{ padding: "4px 4px 32px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 780 }}>

        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: T.slate }}>Reports</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={20} color={T.gold} />
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.3px", color: T.ink }}>Reports & Export</span>
          </div>
        </div>

        <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 2 }}>Filters</div>
          <div style={{ fontSize: 12.5, color: T.slate, marginBottom: 16 }}>Select the data you need and generate a report.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <SingleSelect label="Date Range" options={["Last 7 days", "Last 30 days", "Last quarter", "YTD"]} />
            <SingleSelect label="LOB" options={lobOptions} />
            <SingleSelect label="Category" options={categoryOptions} />
            <SingleSelect label="Severity" options={severityOptions} />
            <SingleSelect label="Status" options={statusOptions} />
          </div>
        </div>

        <div style={{ borderRadius: 16, padding: 24, background: T.card, border: `1px solid ${T.hair}` }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 2 }}>Export</div>
          <div style={{ fontSize: 12.5, color: T.slate, marginBottom: 18 }}>
            {exportState === "idle" && "Generates a report using the filters above."}
            {exportState === "running" && "Preparing your export — large date ranges run in the background and notify you when ready."}
            {exportState === "done" && "Export ready."}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SingleSelect label="Format" options={["CSV"]} width={140} />
            {exportState !== "running" ? (
              <button
                onClick={runExport}
                style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, color: "#3A2B10", background: T.gold, border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}
              >
                <Download size={15} /> Export Report
              </button>
            ) : (
              <button disabled style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, color: T.slate, background: T.hair, border: "none", borderRadius: 8, padding: "10px 18px" }}>
                Preparing…
              </button>
            )}
            {exportState === "done" && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: T.green, background: T.greenSoft, padding: "8px 14px", borderRadius: 999 }}>
                <Check size={14} /> Ready to download
              </span>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}