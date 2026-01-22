import { createContext, useContext, useEffect, useRef, useState } from "react";
import keycloak from "../keycloak";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: string[];
  email: string | null;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  roles: [],
  email: null,
  signOut: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const isRun = useRef(false);

  const signOut = () => {
        keycloak.logout({
            redirectUri: window.location.origin
        });
    };


  useEffect(() => {
    if (isRun.current) return;
    isRun.current = true;

    keycloak
      .init({
        onLoad: "login-required"
        // pkceMethod: "S256",
        // checkLoginIframe: false,
      })
      .then((authenticated) => {
        setIsAuthenticated(authenticated);

        if (authenticated && keycloak.tokenParsed) {
          const realmRoles = keycloak.tokenParsed.realm_access?.roles ?? [];
          const email = keycloak.tokenParsed?.email ?? null;
          setRoles(realmRoles);
          setEmail(email);
        }

        setIsLoading(false);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setIsLoading(false);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, roles, email, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
