import { useAuth } from "../context/AuthContext";

function SideBar() {

    const { signOut } = useAuth();

    return (
        <div
            style={{
                width: "6%",
                height: "100%",
                background:"linear-gradient(180deg, #0f172a 0%, #111827 100%)",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
        >   
            <button
                style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    padding: "12px 20px",
                    color: "#e5e7eb",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                    backdropFilter: "blur(10px)",
                    position: "relative",
                    overflow: "hidden"
            }}
            onClick={signOut}>
                Logout
            </button>
        </div>
    );
}

export default SideBar;