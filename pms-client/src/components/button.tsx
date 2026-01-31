
function Button({text, onClickFunction}: {text: string, onClickFunction: () => void}) {

    return (
            <button
                style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    color: "#e5e7eb",
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    padding: "0.6rem 0.4rem",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                    backdropFilter: "blur(10px)",
                    position: "relative",
                    overflow: "hidden",
                    width: "80%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
            }}
            onClick={onClickFunction}>
                {text}
            </button>
    );
}

export default Button;