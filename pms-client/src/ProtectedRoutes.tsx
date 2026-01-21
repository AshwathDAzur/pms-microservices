import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Loader from "./components/loader";

type ProtectedRouteProps = {
  requiredRoles?: string[];
};

const ProtectedRoute = ({ requiredRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, roles } = useAuth();

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (
    requiredRoles &&
    !requiredRoles.some((role) => roles.includes(role))
  ) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
