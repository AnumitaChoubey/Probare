import React, { useEffect, useState } from "react";
import VersionedConfigTable from "../VersionedConfigTable";


const API_URL = "http://localhost:8000";

export default function EscalationMatrix() {
  const [data, setData] = useState<any[]>([]);
  const [lobs, setLobs] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/errors/lobs`).then(res => res.json()).then(setLobs).catch(console.error);
    fetchData();
  }, []);

  const fetchData = () => {
    fetch(`${API_URL}/admin/escalation-matrix`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  };

  const getLobName = (id: string) => lobs.find((l: any) => l.id === id)?.name || id;

  const rows = data.map((r: any) => ({
    ...r,
    lob_name: getLobName(r.lob_id),
    recipient_role_id: r.recipient_role_id || "-",
    recipient_user_id: r.recipient_user_id || "-"
  }));

  const columns = [
    { key: "lob_name", label: "LOB" },
    { key: "escalation_level", label: "Escalation Level" },
    { key: "threshold_hours_after_breach", label: "Threshold Hours After Breach" },
    { key: "recipient_role_id", label: "Recipient Role ID" },
    { key: "recipient_user_id", label: "Recipient User ID" }
  ];

  const handleAdd = (values: Record<string, string>) => {
    fetch(`${API_URL}/admin/escalation-matrix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lob_id: values.lob_name, // MVP: user pastes UUID
        escalation_level: parseInt(values.escalation_level),
        threshold_hours_after_breach: parseInt(values.threshold_hours_after_breach),
        recipient_role_id: values.recipient_role_id || null,
        recipient_user_id: values.recipient_user_id || null
      })
    })
    .then(fetchData)
    .catch(console.error);
  };

  return (
    <VersionedConfigTable 
      title="Escalation Matrix" 
      description="Configure escalation tiers and routing when SLAs are breached."
      columns={columns}
      rows={rows}
      onAddVersion={handleAdd}
    />
  );
}
