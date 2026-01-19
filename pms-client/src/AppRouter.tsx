import { Routes, Route } from 'react-router-dom';
import routes from './constant/routes.json';
import AppLayout from './container/applayout/index';
import PageNotFound from './container/pagenotfound/index';
import Home from './container/home/index';
import Login from './container/login';

function AppRouter() {
    return (
        <Routes>
            <Route
                path={routes?.HOME}
                element={
                    <AppLayout screen={<Home />} title="Home" />
                }
            />
            <Route
                path={routes?.LOGIN}
                element={
                    <AppLayout screen={<Login />} title="Login" />
                }
            />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
}

export default AppRouter;