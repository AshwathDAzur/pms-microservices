import { useState, useEffect, useRef, use } from "react";
import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
    url: import.meta.env.VITE_KEYCLOAK_URL,
    realm: import.meta.env.VITE_KEYCLOAK_REALM,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

const useAuth = () => {

  const isRun = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    
    if (isRun.current) return;

    isRun.current = true;
    keycloak.init({ onLoad: 'login-required' }).then((authenticated) => {
        console.log("Keycloak authenticated:", authenticated);
        setIsAuthenticated(authenticated);
     }).catch((err) => {
        console.error("Keycloak initialization error:", err);
        setIsAuthenticated(false);
     });

    }, []);

  return isAuthenticated;
};

export default useAuth;