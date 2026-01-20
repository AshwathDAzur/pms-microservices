import { useState, useEffect } from "react";
import { getAllEmployees } from "../../services/api";

function Home() {
    const environment : string = import.meta.env.VITE_ENV;
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
            <p>App is running in {environment} environment</p>
            <p>Home page...</p>
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