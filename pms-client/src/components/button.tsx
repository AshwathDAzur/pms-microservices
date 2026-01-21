
function Button({text, onClickFunction}: {text: string, onClickFunction: () => void}) {

    return (
            <button
                style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    color: "#e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                    backdropFilter: "blur(10px)",
                    position: "relative",
                    overflow: "hidden",
                    minHeight: "5%",
                    maxHeight: "5%",
                    minWidth: "90%",
                    maxWidth: "90%",
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