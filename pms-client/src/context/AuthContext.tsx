import { createContext, useContext, useEffect, useRef, useState } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: string[];
  email: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  roles: [],
  email: null,
  signOut: async () => {},
});

const BFF_URL = import.meta.env.VITE_API_URL as string; // /bff

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Ask the BFF if there is an active session.
    // The BFF reads the HttpOnly cookie — JS never touches the token.
    fetch(`${BFF_URL}/session`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { isAuthenticated: boolean; email?: string; roles?: string[] }) => {
        if (data.isAuthenticated) {
          setIsAuthenticated(true);
          setEmail(data.email ?? null);
          setRoles(data.roles ?? []);
        } else {
          // No active session — redirect to BFF login which kicks off OIDC
          window.location.href = `${BFF_URL}/login`;
        }
      })
      .catch(() => {
        // BFF unreachable — redirect to login
        window.location.href = `${BFF_URL}/login`;
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signOut = async () => {
    await fetch(`${BFF_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
    // After BFF clears the session and cookie, redirect to login
    window.location.href = `${BFF_URL}/login`;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, roles, email, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
