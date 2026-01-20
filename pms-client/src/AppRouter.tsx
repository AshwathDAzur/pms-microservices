import { Routes, Route } from 'react-router-dom';
import routes from './constant/routes.json';
import AppLayout from './container/applayout/index';
import PageNotFound from './container/pagenotfound/index';
import Home from './container/home/index';
import useAuth from './hooks/useAuth';
import UnAuth from './container/unauth';

function AppRouter() {

    const isAuthenticated = useAuth();

    return (
        <Routes>
            <Route
                path={routes?.HOME}
                element={
                    isAuthenticated ? (
                        <AppLayout screen={<Home />} title="Home" />
                    ) : (<UnAuth />)
                }
            />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
}

export default AppRouter;