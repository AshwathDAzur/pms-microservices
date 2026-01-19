import { Routes, Route } from 'react-router-dom';
import routes from './constant/routes.json';
import AppLayout from './container/applayout/index';
import PageNotFound from './container/pagenotfound/index';
import Home from './container/home/index';

function AppRouter() {
    return (
        <Routes>
            <Route
                path={routes?.HOME}
                element={
                    <AppLayout screen={<Home />} />
                }
            />
            <Route path="*" element={
                <AppLayout screen={<PageNotFound />} />
            }
            />
        </Routes>
    );
}

export default AppRouter;