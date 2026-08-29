import React, { useEffect, useState } from "react";
import VersionedConfigTable from "../VersionedConfigTable";


const API_URL = "http://localhost:8000";

export default function SlaRules() {
  const [data, setData] = useState<any[]>([]);
  const [lobs, setLobs] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/errors/lobs`).then(res => res.json()).then(setLobs).catch(console.error);
    fetch(`${API_URL}/errors/categories`).then(res => res.json()).then(setCats).catch(console.error);
    fetchData();
  }, []);

  const fetchData = () => {
    fetch(`${API_URL}/admin/sla-rules`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  };

  const getLobName = (id: string) => lobs.find((l: any) => l.id === id)?.name || id;
  const getCatName = (id: string) => cats.find((c: any) => c.id === id)?.name || id;

  const rows = data.map((r: any) => ({
    ...r,
    lob_name: getLobName(r.lob_id),
    cat_name: r.category_id ? getCatName(r.category_id) : "All Categories"
  }));

  const columns = [
    { key: "lob_name", label: "LOB" },
    { key: "cat_name", label: "Category" },
    { key: "severity", label: "Severity" },
    { key: "rebuttal_window_hours", label: "Rebuttal Window (hrs)" },
    { key: "decision_window_hours", label: "Decision Window (hrs)" }
  ];

  const handleAdd = (values: Record<string, string>) => {
    fetch(`${API_URL}/admin/sla-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lob_id: values.lob_name,
        category_id: values.cat_name || null,
        severity: values.severity,
        rebuttal_window_hours: parseInt(values.rebuttal_window_hours),
        decision_window_hours: parseInt(values.decision_window_hours)
      })
    })
    .then(fetchData)
    .catch(console.error);
  };

  return (
    <VersionedConfigTable 
      title="SLA Rules" 
      description="Set resolution time expectations based on severity."
      columns={columns}
      rows={rows}
      onAddVersion={handleAdd}
    />
  );
}
