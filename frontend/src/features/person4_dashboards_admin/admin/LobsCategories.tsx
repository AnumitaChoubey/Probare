import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Power, X, Check, AlertTriangle } from "lucide-react";

const T = {
  navy: "#101A2E",
  cream: "#FAF7F1",
  card: "#FFFFFF",
  gold: "#B08B4F",
  green: "#3E7A5A",
  greenSoft: "#DCEBDF",
  red: "#B34B3C",
  redSoft: "#F3DCD7",
  ink: "#1B2333",
  slate: "#6B7280",
  hair: "#E7E1D2",
};

const FONT = "'Inter', 'Avenir', 'Segoe UI', ui-sans-serif, system-ui";
const severityOptions = ["Critical", "High", "Medium", "Low"] as const;

/*
   MOCK DATA
*/
interface SubCategory {
  id: string;
  name: string;
  active: boolean;
}
interface Category {
  id: string;
  name: string;
  active: boolean;
  requiresEvidenceAt: string[];
  subCategories: SubCategory[];
}
interface Lob {
  id: string;
  name: string;
  active: boolean;
  categories: Category[];
}

const initialData: Lob[] = [
  {
    id: "lob-1", name: "Claims Ops", active: true,
    categories: [
      { id: "cat-1", name: "Data Entry", active: true, requiresEvidenceAt: ["Critical", "High"], subCategories: [
        { id: "sub-1", name: "Policy Number", active: true },
        { id: "sub-2", name: "DOB Mismatch", active: true },
      ]},
      { id: "cat-2", name: "Documentation", active: true, requiresEvidenceAt: ["Critical"], subCategories: [
        { id: "sub-3", name: "Signature Missing", active: true },
      ]},
    ],
  },
  {
    id: "lob-2", name: "Underwriting", active: true,
    categories: [
      { id: "cat-3", name: "Risk Assessment", active: true, requiresEvidenceAt: ["Critical", "High", "Medium"], subCategories: [
        { id: "sub-4", name: "Risk Class Error", active: false },
      ]},
    ],
  },
];

/*
   Confirm-deactivate modal */
function DeactivateConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(16,26,46,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: T.card, borderRadius: 14, padding: 24, width: 380, fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={18} color={T.red} />
          <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Deactivate "{name}"?</span>
        </div>
        <p style={{ fontSize: 13.5, color: T.slate, marginBottom: 20, lineHeight: 1.5 }}>
          Deactivating this category will not affect already-logged errors referencing it.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{ fontSize: 13, color: T.slate, background: "transparent", border: `1px solid ${T.hair}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: T.red, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>Deactivate</button>
        </div>
      </div>
    </div>
  );
}


function CategoryEditForm({ category, onSave, onCancel }: { category: Category; onSave: (evidenceLevels: string[]) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<string[]>(category.requiresEvidenceAt);

  const toggle = (s: string) => setSelected((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <div style={{ background: T.cream, border: `1px solid ${T.hair}`, borderRadius: 10, padding: 14, marginTop: 6 }}>
      <div style={{ fontSize: 12.5, color: T.slate, marginBottom: 8 }}>Requires evidence at severity:</div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
        {severityOptions.map((s) => (
          <label key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.ink, cursor: "pointer" }}>
            <input type="checkbox" checked={selected.includes(s)} onChange={() => toggle(s)} />
            {s}
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onSave(selected)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "#fff", background: T.navy, border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer" }}>
          <Check size={13} /> Save
        </button>
        <button onClick={onCancel} style={{ fontSize: 12.5, color: T.slate, background: "transparent", border: "none", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

export default function LobsCategories() {
  const [data, setData] = useState<Lob[]>(initialData);
  const [expandedLobs, setExpandedLobs] = useState<Set<string>>(new Set(["lob-1"]));
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<{ type: "lob" | "category" | "sub"; id: string; name: string } | null>(null);

  const toggleLob = (id: string) => setExpandedLobs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCat = (id: string) => setExpandedCats((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const confirmDeactivate = () => {
    if (!deactivateTarget) return;
    setData((prev) =>
      prev.map((lob) => {
        if (deactivateTarget.type === "lob" && lob.id === deactivateTarget.id) return { ...lob, active: false };
        return {
          ...lob,
          categories: lob.categories.map((cat) => {
            if (deactivateTarget.type === "category" && cat.id === deactivateTarget.id) return { ...cat, active: false };
            return {
              ...cat,
              subCategories: cat.subCategories.map((sub) =>
                deactivateTarget.type === "sub" && sub.id === deactivateTarget.id ? { ...sub, active: false } : sub
              ),
            };
          }),
        };
      })
    );
    setDeactivateTarget(null);
  };

  const saveEvidenceLevels = (catId: string, levels: string[]) => {
    setData((prev) => prev.map((lob) => ({
      ...lob,
      categories: lob.categories.map((cat) => (cat.id === catId ? { ...cat, requiresEvidenceAt: levels } : cat)),
    })));
    setEditingCat(null);
  };

  const rowBase: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8 };
  const actionBtn: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", color: T.slate, display: "flex", alignItems: "center" };

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>LOBs & Categories</div>
          <div style={{ fontSize: 12.5, marginTop: 2, color: T.slate }}>LOB → Category → Sub-Category hierarchy. Deactivate only — never hard-delete.</div>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#3A2B10", background: T.gold, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
          <Plus size={14} /> Add LOB
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.map((lob) => (
          <div key={lob.id} style={{ border: `1px solid ${T.hair}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ ...rowBase, background: "#FAFBFC", opacity: lob.active ? 1 : 0.5 }}>
              <div onClick={() => toggleLob(lob.id)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }}>
                {expandedLobs.has(lob.id) ? <ChevronDown size={15} color={T.slate} /> : <ChevronRight size={15} color={T.slate} />}
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{lob.name}</span>
                {!lob.active && <span style={{ fontSize: 11, color: T.slate, background: "#F1F1EF", padding: "2px 8px", borderRadius: 999 }}>Inactive</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={actionBtn}><Plus size={15} /></button>
                {lob.active && <button onClick={() => setDeactivateTarget({ type: "lob", id: lob.id, name: lob.name })} style={actionBtn}><Power size={15} /></button>}
              </div>
            </div>

            {expandedLobs.has(lob.id) && (
              <div style={{ padding: "4px 12px 10px 30px", display: "flex", flexDirection: "column", gap: 4 }}>
                {lob.categories.map((cat) => (
                  <div key={cat.id}>
                    <div style={{ ...rowBase, opacity: cat.active ? 1 : 0.5 }}>
                      <div onClick={() => toggleCat(cat.id)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }}>
                        {expandedCats.has(cat.id) ? <ChevronDown size={13} color={T.slate} /> : <ChevronRight size={13} color={T.slate} />}
                        <span style={{ fontSize: 13.5, color: T.ink }}>{cat.name}</span>
                        {!cat.active && <span style={{ fontSize: 11, color: T.slate, background: "#F1F1EF", padding: "2px 8px", borderRadius: 999 }}>Inactive</span>}
                        <span style={{ fontSize: 11, color: T.slate }}>· evidence: {cat.requiresEvidenceAt.join(", ") || "none"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditingCat(editingCat === cat.id ? null : cat.id)} style={actionBtn}><Pencil size={14} /></button>
                        {cat.active && <button onClick={() => setDeactivateTarget({ type: "category", id: cat.id, name: cat.name })} style={actionBtn}><Power size={14} /></button>}
                      </div>
                    </div>

                    {editingCat === cat.id && (
                      <CategoryEditForm category={cat} onSave={(levels) => saveEvidenceLevels(cat.id, levels)} onCancel={() => setEditingCat(null)} />
                    )}

                    {expandedCats.has(cat.id) && (
                      <div style={{ paddingLeft: 26, display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                        {cat.subCategories.map((sub) => (
                          <div key={sub.id} style={{ ...rowBase, padding: "6px 10px", opacity: sub.active ? 1 : 0.5 }}>
                            <span style={{ fontSize: 13, color: T.ink }}>
                              {sub.name} {!sub.active && <span style={{ fontSize: 11, color: T.slate }}>(inactive)</span>}
                            </span>
                            {sub.active && (
                              <button onClick={() => setDeactivateTarget({ type: "sub", id: sub.id, name: sub.name })} style={actionBtn}><Power size={13} /></button>
                            )}
                          </div>
                        ))}
                        <button style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.gold, background: "transparent", border: "none", cursor: "pointer", padding: "6px 10px" }}>
                          <Plus size={12} /> Add Sub-Category
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: T.gold, background: "transparent", border: "none", cursor: "pointer", padding: "6px 10px" }}>
                  <Plus size={13} /> Add Category
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {deactivateTarget && (
        <DeactivateConfirm
          name={deactivateTarget.name}
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}
    </div>
  );
}