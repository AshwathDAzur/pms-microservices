

function Admin() {
    const environment : string = import.meta.env.VITE_ENV;

    return (
        <div>
            <p>App is running in {environment} environment</p>
            <p>Admin page...</p>
        </div>
    );
}

export default Admin;