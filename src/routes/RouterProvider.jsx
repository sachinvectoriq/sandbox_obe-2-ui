import { Route, Routes, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';
import Home from '../pages/Home';
import QuickTour from '../pages/QuickTour';
import SettingPage from '../pages/SettingPage';
import Report from '../pages/Report';
import App from '../App';
import ProtectedRoute from './ProtectedRoute';

const RouterProvider = () => {
  return (
    <Routes>
      <Route path='/'>
        <Route index element={<Login />} />
        <Route path='dashboard' element={<Dashboard />} />
        <Route path='/' element={<App />}>
          <Route path='home' element={
            <ProtectedRoute><Home /></ProtectedRoute>
          } />
          <Route
  path='settings'
  element={
    <ProtectedRoute  requireReportsAccess={true}>
      <SettingPage />
    </ProtectedRoute>
  }
/>
          <Route path='quick-tour' element={
            <ProtectedRoute><QuickTour /></ProtectedRoute>
          } />
          <Route path='reports' element={
            <ProtectedRoute requireReportsAccess={true}><Report /></ProtectedRoute>
          } />
        </Route>
        <Route path='*' element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
export default RouterProvider;
