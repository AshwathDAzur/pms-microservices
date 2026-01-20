
function UnAuth() {
    const environment : string = import.meta.env.VITE_ENV;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                width: "100vw",
                padding: "5px",
                justifyContent: "center",
                alignItems: "center",
                border: "1px solid white",
            }}
            >
            <p>App is running in {environment} environment</p>
            <p>UnAuthorized...</p>
        </div>
    );
}

export default UnAuth;