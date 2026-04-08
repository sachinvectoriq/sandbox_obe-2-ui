import { Route, Routes } from 'react-router-dom';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import Dashboard from '../pages/Dashboard';
import SettingPage2 from '../pages/SettingPage2';
import QuickTour from '../pages/QuickTour'
import Report from '../pages/Report';
import Home from '../pages/Home';
import App from '../App';
import ProtectedRoute from './ProtectedRoute';

const RouterProvider = () => {
  return (
    <Routes>
      <Route path='/'>
        <Route index element={<Login />} />
        <Route path='/' element={<App />}>
          <Route path='home' element={<Home />} />
          <Route path='dashboard' element={<Dashboard />} />
          <Route path='settings2' element={<SettingPage2 />} />
          <Route path='quick-tour' element={<QuickTour />} />
          <Route
            path='reports'
            element={
              <ProtectedRoute requireReportsAccess={true}>
                <Report />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path='*' element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default RouterProvider;