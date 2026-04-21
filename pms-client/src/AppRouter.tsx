import { Routes, Route, Navigate } from 'react-router-dom';
import routes from './constant/routes.json';
import AppLayout from './container/applayout/index';
import PageNotFound from './container/pagenotfound/index';
import ProtectedRoute from './ProtectedRoutes';
import Admin from './container/admin';
import Projects from './container/projects';
import Unauthorized from './container/unauthorized';
import Forbidden from './container/forbidden';

function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to={routes.ADMIN} replace />} />
            <Route element={<ProtectedRoute />}>
                <Route path={routes.ADMIN} element={<AppLayout screen={<Admin />} title="Admin" />} />
                <Route path={routes.PROJECTS} element={<AppLayout screen={<Projects />} title="Projects" />} />
            </Route>
            <Route path={routes.UNAUTHORIZED} element={<Unauthorized />} />
            <Route path={routes.FORBIDDEN} element={<Forbidden />} />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
}

export default AppRouter;
