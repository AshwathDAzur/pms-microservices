
function Loader() {

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                background:"linear-gradient(180deg, #0f172a 0%, #111827 100%)",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
                justifyContent: "center",
                alignItems: "center",
                display: "flex",
                fontSize: "24px"
            }}
        >  
        Loading... 
        </div>
    );
}

export default Loader;