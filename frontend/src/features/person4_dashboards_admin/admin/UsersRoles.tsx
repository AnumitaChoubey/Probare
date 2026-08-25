import React, { useMemo, useState } from "react";
import { Search, X, Check, Plus } from "lucide-react";

const T = {
  navy: "#101A2E",
  cream: "#FAF7F1",
  card: "#FFFFFF",
  gold: "#B08B4F",
  goldSoft: "#E7D6AE",
  green: "#3E7A5A",
  greenSoft: "#DCEBDF",
  slate: "#6B7280",
  ink: "#1B2333",
  hair: "#E7E1D2",
};

const FONT = "'Inter', 'Avenir', 'Segoe UI', ui-sans-serif, system-ui";

const ALL_ROLES = ["AUD", "QAL", "OPS_AGT", "OPS_MGR", "ADMIN", "QA_GOV", "AUDITOR_RO"];

/*
   MOCK DATA */
interface User {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles: string[];
}

const initialUsers: User[] = [
  { id: "u1", name: "Yasaswini Prathipati", email: "yasaswini@probare.com", active: true, roles: ["OPS_MGR", "ADMIN"] },
  { id: "u2", name: "Charan Chandra", email: "charan@probare.com", active: true, roles: ["ADMIN"] },
  { id: "u3", name: "Anumita Choubey", email: "anumita@probare.com", active: true, roles: ["QAL"] },
  { id: "u4", name: "Sahasra Reddy", email: "sahasra@probare.com", active: true, roles: ["AUD"] },
  { id: "u5", name: "R. Iyer", email: "riyer@probare.com", active: true, roles: ["AUD", "OPS_AGT"] },
  { id: "u6", name: "M. Fenwick", email: "mfenwick@probare.com", active: false, roles: ["QAL"] },
];

function RoleChip({ role }: { role: string }) {
  return (
    <span style={{ fontSize: 11.5, fontWeight: 600, color: T.navy, background: T.goldSoft, padding: "2px 9px", borderRadius: 999 }}>
      {role}
    </span>
  );
}

function ManageRolesModal({ user, onSave, onClose }: { user: User; onSave: (roles: string[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(user.roles);

  const toggle = (r: string) => setSelected((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(16,26,46,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: T.card, borderRadius: 14, padding: 24, width: 400, fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Manage Roles</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.slate }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 13, color: T.slate, marginBottom: 16 }}>{user.name} · {user.email}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {ALL_ROLES.map((r) => (
            <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: T.ink, padding: "8px 10px", border: `1px solid ${T.hair}`, borderRadius: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={selected.includes(r)} onChange={() => toggle(r)} />
              {r}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ fontSize: 13, color: T.slate, background: "transparent", border: `1px solid ${T.hair}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>Cancel</button>
          <button
            onClick={() => onSave(selected)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#fff", background: T.navy, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}
          >
            <Check size={14} /> Save Roles
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersRoles() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [managingUser, setManagingUser] = useState<User | null>(null);

  const filtered = useMemo(
    () => users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())),
    [users, query]
  );

  const saveRoles = (roles: string[]) => {
    if (!managingUser) return;
    setUsers((prev) => prev.map((u) => (u.id === managingUser.id ? { ...u, roles } : u)));
    setManagingUser(null);
  };

  const th: React.CSSProperties = { textAlign: "left", fontSize: 12, fontWeight: 600, color: T.slate, padding: "11px 14px", borderBottom: `1px solid ${T.hair}` };
  const td: React.CSSProperties = { padding: "12px 14px", borderBottom: `1px solid ${T.hair}`, fontSize: 13.5, color: T.ink };

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Users & Roles</div>
          <div style={{ fontSize: 12.5, marginTop: 2, color: T.slate }}>Admin-only screen. Built on top of Person 1's users/roles table via his API.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.cream, border: `1px solid ${T.hair}`, borderRadius: 8, padding: "8px 12px", width: 240 }}>
          <Search size={14} color={T.slate} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            style={{ border: "none", outline: "none", background: "transparent", fontFamily: FONT, fontSize: 13, width: "100%", color: T.ink }}
          />
        </div>
      </div>

      <div style={{ border: `1px solid ${T.hair}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFC" }}>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Status</th>
                <th style={th}>Roles</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ opacity: u.active ? 1 : 0.55 }}>
                  <td style={{ ...td, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ ...td, color: T.slate }}>{u.email}</td>
                  <td style={td}>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                      color: u.active ? T.green : T.slate, background: u.active ? T.greenSoft : "#F1F1EF",
                    }}>
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {u.roles.map((r) => <RoleChip key={r} role={r} />)}
                    </div>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => setManagingUser(u)}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: T.navy, background: "transparent", border: `1px solid ${T.hair}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
                    >
                      <Plus size={12} /> Manage Roles
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: T.slate, padding: 28 }}>No users match this search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {managingUser && (
        <ManageRolesModal user={managingUser} onSave={saveRoles} onClose={() => setManagingUser(null)} />
      )}
    </div>
  );
}