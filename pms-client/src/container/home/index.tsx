import { useAuth } from "../../context/AuthContext";

function Home() {
    const { email } = useAuth();
    return (
        <div>
            {email && <p>Welcome, {email}</p>}
        </div>
    );
}

export default Home;
