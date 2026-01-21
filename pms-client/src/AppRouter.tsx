import { Routes, Route } from 'react-router-dom';
import routes from './constant/routes.json';
import AppLayout from './container/applayout/index';
import PageNotFound from './container/pagenotfound/index';
import Home from './container/home/index';
import ProtectedRoute from './ProtectedRoutes';
import Admin from './container/admin';
import Unauthorized from './container/unauthorized';
import Forbidden from './container/forbidden';

function AppRouter() {

    return (
        <Routes>
            <Route element={<ProtectedRoute />}>
                <Route
                    path={routes?.HOME}
                    element={<AppLayout screen={<Home />} title="Home" />}
                />
            </Route>
            <Route element={<ProtectedRoute  requiredRoles={["default-roles-peoplemanagementsystem"]}/>}>
                <Route
                    path={routes?.ADMIN}
                    element={<AppLayout screen={<Admin />} title="Admin" />}
                />
            </Route>
            <Route path="*" element={<PageNotFound />} />
            <Route path={routes?.UNAUTHORIZED} element={<Unauthorized />} />
            <Route path={routes?.FORBIDDEN} element={<Forbidden />} />
        </Routes>
    );
}

export default AppRouter;