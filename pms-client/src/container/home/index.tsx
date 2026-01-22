import { useState, useEffect } from "react";
import { getAllEmployees } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function Home() {
    const { email } = useAuth();
    const [employees, setEmployees] = useState<any>([]);

    useEffect(() => {
        getAllEmployees().then(response => {
        setEmployees(response);
        }).catch(error => {
            console.error("Error fetching employees:", error);
        });
    }, []);

    return (
        <div>
            {email && <p>Welcome, {email}</p>}
            {
                employees?.map((employee: any) => (
                    <div key={employee.id}>
                        <h3>{employee.Name}</h3>
                    </div>
                ))
            }
        </div>
    );
}

export default Home;