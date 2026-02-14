import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import routes from "../constant/routes.json";
import Button from "./button";

function SideBar() {

    const Navigate = useNavigate();
    const { signOut } = useAuth();


    return (
        <nav
            style={{
                width: "5rem",
                flexShrink: 0,
                height: "100%",
                background:"linear-gradient(180deg, #0f172a 0%, #111827 100%)",
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
                <Button text="Home" onClickFunction={() => {
                    Navigate(routes.HOME);
                }} />
                <Button text="Admin" onClickFunction={() => {
                    Navigate(routes.ADMIN);
                }} />
                <Button text="Insights" onClickFunction={() => {
                    Navigate(routes.DASHBOARD);
                }} />
            </div>
            <Button text="Logout" onClickFunction={signOut} />
        </nav>
    );
}

export default SideBar;