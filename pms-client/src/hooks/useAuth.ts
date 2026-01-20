import { useState, useEffect, useRef } from "react";
import keycloak from "../keycloak";

const useAuth = () => {

  const isRun = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    
    if (isRun.current) return;

    isRun.current = true;
    keycloak.init({ onLoad: 'login-required' }).then((authenticated) => {
        setIsAuthenticated(authenticated);
     }).catch((err) => {
        console.error("Keycloak initialization error:", err);
        setIsAuthenticated(false);
     });

    }, []);

  return isAuthenticated;
};

export default useAuth;