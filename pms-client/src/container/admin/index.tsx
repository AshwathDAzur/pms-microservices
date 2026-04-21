import { useEffect, useRef, useState } from "react";
import {
    getEmployees, createEmployee, updateEmployee, deleteEmployee,
} from "../../services/api";
import type { Employee, EmployeePayload } from "../../services/api";

const DEPARTMENTS = ["Engineering", "Quality Assurance", "Design", "Infrastructure", "Product", "Operations"];
const ROLES = ["Engineering Manager", "Senior Developer", "Junior Developer", "QA Engineer", "UI/UX Designer", "DevOps Engineer", "Product Manager"];

const emptyForm = (): EmployeePayload => ({ name: "", email: "", role: "", department: "", status: "active" });

const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px", color: "#f1f5f9", padding: "0.5rem 0.75rem", fontSize: "0.85rem",
    boxSizing: "border-box", outline: "none",
};
const selectStyle: React.CSSProperties = { ...inputStyle, background: "#1e293b" };
const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" };
const cellStyle: React.CSSProperties = { padding: "0.75rem 1rem", color: "#e5e7eb", fontSize: "0.85rem", borderBottom: "1px solid rgba(255,255,255,0.06)" };
const hcellStyle: React.CSSProperties = { ...cellStyle, color: "#94a3b8", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", background: "rgba(15,23,42,0.6)", textAlign: "left" as const };

function Admin() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Employee | null>(null);
    const [form, setForm] = useState<EmployeePayload>(emptyForm());
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
        getEmployees()
            .then((data: any) => setEmployees(data))
            .catch(() => setError("Failed to load employees"))
            .finally(() => setLoading(false));
    };

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setFormError(""); setShowModal(true); };
    const openEdit = (e: Employee) => {
        setEditing(e);
        setForm({ name: e.name, email: e.email, role: e.role, department: e.department, status: e.status });
        setFormError("");
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); setFormError(""); };

    const handleSave = () => {
        if (!form.name || !form.email || !form.role || !form.department) {
            setFormError("All fields are required.");
            return;
        }
        setSaving(true);
        const call = editing ? updateEmployee(editing.id, form) : createEmployee(form);
        call
            .then((saved: any) => {
                setEmployees(prev => editing
                    ? prev.map(e => e.id === editing.id ? saved : e)
                    : [saved, ...prev]
                );
                closeModal();
            })
            .catch((err: any) => setFormError(err?.message || "Save failed"))
            .finally(() => setSaving(false));
    };

    const handleDelete = (id: number) => {
        setDeleting(id);
        deleteEmployee(id)
            .then(() => setEmployees(prev => prev.filter(e => e.id !== id)))
            .catch(() => setError("Delete failed"))
            .finally(() => setDeleting(null));
    };

    return (
        <div style={{ padding: "1.5rem", height: "100%", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h1 style={{ color: "#f1f5f9", fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Employee Management</h1>
                    <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>{employees.length} employee{employees.length !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={openAdd} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.5)", borderRadius: "8px", color: "#a5b4fc", padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    + Add Employee
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
                ) : employees.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>No employees found.</div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                {["Name", "Email", "Role", "Department", "Status", "Actions"].map(h => (
                                    <th key={h} style={hcellStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                    <td style={cellStyle}><span style={{ fontWeight: 500, color: "#f1f5f9" }}>{emp.name}</span></td>
                                    <td style={cellStyle}>{emp.email}</td>
                                    <td style={cellStyle}>{emp.role}</td>
                                    <td style={cellStyle}>{emp.department}</td>
                                    <td style={cellStyle}>
                                        <span style={{
                                            padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600,
                                            background: emp.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(148,163,184,0.15)",
                                            color: emp.status === "active" ? "#4ade80" : "#94a3b8",
                                            border: `1px solid ${emp.status === "active" ? "rgba(34,197,94,0.3)" : "rgba(148,163,184,0.3)"}`,
                                        }}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td style={cellStyle}>
                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                            <button onClick={() => openEdit(emp)} style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", color: "#a5b4fc", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.75rem" }}>Edit</button>
                                            <button onClick={() => handleDelete(emp.id)} disabled={deleting === emp.id} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", color: "#fca5a5", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.75rem", opacity: deleting === emp.id ? 0.5 : 1 }}>
                                                {deleting === emp.id ? "..." : "Delete"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}
                    onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "2rem", width: "min(480px, 90vw)", boxShadow: "0 25px 50px rgba(0,0,0,0.8)" }}>
                        <h2 style={{ color: "#f1f5f9", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1.5rem" }}>
                            {editing ? "Edit Employee" : "Add Employee"}
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div>
                                <label style={labelStyle}>Name</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Email</label>
                                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} type="email" />
                            </div>
                            <div>
                                <label style={labelStyle}>Role</label>
                                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={selectStyle}>
                                    <option value="">Select role</option>
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Department</label>
                                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={selectStyle}>
                                    <option value="">Select department</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Status</label>
                                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as "active" | "inactive" }))} style={selectStyle}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
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

export default Admin;
