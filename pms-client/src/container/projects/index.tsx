import { useEffect, useRef, useState } from "react";
import {
    getProjects, createProject, updateProject, deleteProject,
} from "../../services/api";
import type { Project, ProjectPayload } from "../../services/api";

const STATUS_OPTIONS: Project["status"][] = ["active", "on-hold", "completed"];

const statusColor: Record<Project["status"], { bg: string; text: string; border: string }> = {
    active: { bg: "rgba(34,197,94,0.15)", text: "#4ade80", border: "rgba(34,197,94,0.3)" },
    "on-hold": { bg: "rgba(234,179,8,0.15)", text: "#facc15", border: "rgba(234,179,8,0.3)" },
    completed: { bg: "rgba(99,102,241,0.15)", text: "#a5b4fc", border: "rgba(99,102,241,0.3)" },
};

const emptyForm = (): ProjectPayload => ({ name: "", description: "", status: "active", assigned_to: "", deadline: "" });

const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px", color: "#f1f5f9", padding: "0.5rem 0.75rem", fontSize: "0.85rem",
    boxSizing: "border-box", outline: "none",
};
const selectStyle: React.CSSProperties = { ...inputStyle, background: "#1e293b" };
const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" };
const cellStyle: React.CSSProperties = { padding: "0.75rem 1rem", color: "#e5e7eb", fontSize: "0.85rem", borderBottom: "1px solid rgba(255,255,255,0.06)" };
const hcellStyle: React.CSSProperties = { ...cellStyle, color: "#94a3b8", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", background: "rgba(15,23,42,0.6)", textAlign: "left" as const };

function Projects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Project | null>(null);
    const [form, setForm] = useState<ProjectPayload>(emptyForm());
    const [formError, setFormError] = useState("");
    const [deleting, setDeleting] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;
        load();
    }, []);

    const load = () => {
        setLoading(true);
        getProjects()
            .then((data: any) => setProjects(data))
            .catch(() => setError("Failed to load projects"))
            .finally(() => setLoading(false));
    };

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setFormError(""); setShowModal(true); };
    const openEdit = (p: Project) => {
        setEditing(p);
        setForm({
            name: p.name,
            description: p.description || "",
            status: p.status,
            assigned_to: p.assigned_to || "",
            deadline: p.deadline ? p.deadline.slice(0, 10) : "",
        });
        setFormError("");
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); setFormError(""); };

    const handleSave = () => {
        if (!form.name) {
            setFormError("Project name is required.");
            return;
        }
        setSaving(true);
        const payload = { ...form, deadline: form.deadline || undefined, assigned_to: form.assigned_to || undefined };
        const call = editing ? updateProject(editing.id, payload) : createProject(payload);
        call
            .then((saved: any) => {
                setProjects(prev => editing
                    ? prev.map(p => p.id === editing.id ? saved : p)
                    : [saved, ...prev]
                );
                closeModal();
            })
            .catch((err: any) => setFormError(err?.message || "Save failed"))
            .finally(() => setSaving(false));
    };

    const handleDelete = (id: number) => {
        setDeleting(id);
        deleteProject(id)
            .then(() => setProjects(prev => prev.filter(p => p.id !== id)))
            .catch(() => setError("Delete failed"))
            .finally(() => setDeleting(null));
    };

    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <div style={{ padding: "1.5rem", height: "100%", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h1 style={{ color: "#f1f5f9", fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Project Management</h1>
                    <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={openAdd} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.5)", borderRadius: "8px", color: "#a5b4fc", padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    + Add Project
                </button>
            </div>

            {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#fca5a5", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
                    {error}
                </div>
            )}

            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden" }}>
                {loading ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading...</div>
                ) : projects.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>No projects found.</div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                {["Name", "Description", "Status", "Assigned To", "Deadline", "Actions"].map(h => (
                                    <th key={h} style={hcellStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map(proj => {
                                const sc = statusColor[proj.status];
                                return (
                                    <tr key={proj.id}
                                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                        <td style={cellStyle}><span style={{ fontWeight: 500, color: "#f1f5f9" }}>{proj.name}</span></td>
                                        <td style={{ ...cellStyle, maxWidth: "220px" }}>
                                            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#94a3b8" }}>
                                                {proj.description || "—"}
                                            </span>
                                        </td>
                                        <td style={cellStyle}>
                                            <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                                {proj.status}
                                            </span>
                                        </td>
                                        <td style={cellStyle}>{proj.assigned_to || "—"}</td>
                                        <td style={cellStyle}>{formatDate(proj.deadline)}</td>
                                        <td style={cellStyle}>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button onClick={() => openEdit(proj)} style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", color: "#a5b4fc", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.75rem" }}>Edit</button>
                                                <button onClick={() => handleDelete(proj.id)} disabled={deleting === proj.id} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", color: "#fca5a5", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.75rem", opacity: deleting === proj.id ? 0.5 : 1 }}>
                                                    {deleting === proj.id ? "..." : "Delete"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}
                    onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "2rem", width: "min(520px, 90vw)", boxShadow: "0 25px 50px rgba(0,0,0,0.8)", maxHeight: "90vh", overflowY: "auto" }}>
                        <h2 style={{ color: "#f1f5f9", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1.5rem" }}>
                            {editing ? "Edit Project" : "Add Project"}
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div>
                                <label style={labelStyle}>Name *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={3}
                                    style={{ ...inputStyle, resize: "vertical" as const }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Status</label>
                                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Project["status"] }))} style={selectStyle}>
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Assigned To</label>
                                <input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} style={inputStyle} placeholder="email or name" />
                            </div>
                            <div>
                                <label style={labelStyle}>Deadline</label>
                                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                                    style={{ ...inputStyle, colorScheme: "dark" }} />
                            </div>
                        </div>
                        {formError && <p style={{ color: "#fca5a5", fontSize: "0.8rem", margin: "0.75rem 0 0" }}>{formError}</p>}
                        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
                            <button onClick={closeModal} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#94a3b8", padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.85rem" }}>Cancel</button>
                            <button onClick={handleSave} disabled={saving} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.5)", borderRadius: "8px", color: "#a5b4fc", padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                                {saving ? "Saving..." : editing ? "Update" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Projects;
