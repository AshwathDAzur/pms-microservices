import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import routes from "../constant/routes.json";

function SideBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut } = useAuth();

    const navItems = [
        { label: "Admin", path: routes.ADMIN },
        { label: "Projects", path: routes.PROJECTS },
    ];

    return (
        <nav
            style={{
                width: "5rem",
                flexShrink: 0,
                height: "100%",
                background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1.2rem 0",
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", width: "100%" }}>
                {navItems.map(item => {
                    const active = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            style={{
                                background: active ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)",
                                border: active ? "1px solid rgba(99,102,241,0.6)" : "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "10px",
                                color: active ? "#a5b4fc" : "#e5e7eb",
                                fontSize: "0.7rem",
                                fontWeight: active ? 600 : 500,
                                letterSpacing: "0.02em",
                                padding: "0.6rem 0.4rem",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                                backdropFilter: "blur(10px)",
                                width: "80%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
            <button
                onClick={signOut}
                style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "10px",
                    color: "#fca5a5",
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    padding: "0.6rem 0.4rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(10px)",
                    width: "80%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                Logout
            </button>
        </nav>
    );
}

export default SideBar;
