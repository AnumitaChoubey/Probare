import React, { useEffect, useState } from "react";
import VersionedConfigTable from "../VersionedConfigTable";


const API_URL = "http://localhost:8000";

export default function OwnershipMapping() {
  const [data, setData] = useState<any[]>([]);
  const [lobs, setLobs] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/errors/lobs`).then(res => res.json()).then(setLobs).catch(console.error);
    fetch(`${API_URL}/errors/categories`).then(res => res.json()).then(setCats).catch(console.error);
    fetchData();
  }, []);

  const fetchData = () => {
    fetch(`${API_URL}/admin/ownership-mapping`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  };

  const getLobName = (id: string) => lobs.find((l: any) => l.id === id)?.name || id;
  const getCatName = (id: string) => cats.find((c: any) => c.id === id)?.name || id;

  const rows = data.map((r: any) => ({
    ...r,
    lob_name: getLobName(r.lob_id),
    cat_name: getCatName(r.category_id),
    default_owner_user_id: r.default_owner_user_id || "-",
    default_owner_team_ref: r.default_owner_team_ref || "-",
    default_owner_manager_user_id: r.default_owner_manager_user_id || "-",
  }));

  const columns = [
    { key: "lob_name", label: "LOB" },
    { key: "cat_name", label: "Category" },
    { key: "default_owner_user_id", label: "Default Owner (User ID)" },
    { key: "default_owner_team_ref", label: "Default Team (Team ID)" },
    { key: "default_owner_manager_user_id", label: "Default Manager (User ID)" }
  ];

  const handleAdd = (values: Record<string, string>) => {
    fetch(`${API_URL}/admin/ownership-mapping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lob_id: values.lob_name, // Assuming the user pastes UUID for MVP
        category_id: values.cat_name, 
        default_owner_user_id: values.default_owner_user_id || null,
        default_owner_team_ref: values.default_owner_team_ref || null,
        default_owner_manager_user_id: values.default_owner_manager_user_id || null,
      })
    })
    .then(fetchData)
    .catch(console.error);
  };

  return (
    <VersionedConfigTable 
      title="Ownership Mapping" 
      description="Configure default owners and managers for each LOB and Category. Editing will create a new configuration version."
      columns={columns}
      rows={rows}
      onAddVersion={handleAdd}
    />
  );
}
