//src\hooks\useAuth.js
import { useSelector, useDispatch } from 'react-redux';
import {
  login,
  logout,
  setToken,
  removeToken,
  setLoginSessionId,
} from '../app/features/auth/authSlice';

// ✅ SSO: Decode JWT to extract email and other fields if backend doesn't return them directly
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('❌ JWT decode failed:', e);
    return null;
  }
};

const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const loginSessionId = useSelector((state) => state.auth.login_session_id);
  const isLoggedIn = !!token;

  const loginUser = (userData) => {
    // ✅ Don't mutate the parameter — use a spread copy
    const enrichedUser = { ...userData };

    // ✅ SSO: Try to extract email from JWT if backend didn't send it
    if (!enrichedUser.email && enrichedUser.token) {
      const decoded = decodeJwt(enrichedUser.token);
      enrichedUser.email = decoded?.user_data?.email?.[0] || decoded?.email || null;
    }

    if (!enrichedUser.email) {
      console.warn('⚠️ No email found for user:', enrichedUser.name);
    }

    dispatch(login({ user: enrichedUser, token: enrichedUser.token }));

    localStorage.setItem('name', JSON.stringify(enrichedUser.name || ''));
    localStorage.setItem('group', JSON.stringify(enrichedUser.group || ''));
    localStorage.setItem('email', JSON.stringify(enrichedUser.email || ''));
    localStorage.setItem('job_title', JSON.stringify(enrichedUser.job_title || ''));
    localStorage.setItem('token', enrichedUser.token || '');
    // ✅ REMOVED login_session_id from here — storeLoginSessionId() handles it correctly
  };

  const logoutUser = () => {
    dispatch(logout());
    localStorage.clear();
  };

  const storeLoginSessionId = (id) => {
    localStorage.setItem('login_session_id', JSON.stringify(id));
    dispatch(setLoginSessionId(id));
  };

  const updateToken = (newToken) => {
    dispatch(setToken(newToken));
    localStorage.setItem('token', newToken);
  };

  const clearToken = () => {
    dispatch(removeToken());
    localStorage.removeItem('token');
  };

  return {
    user,
    token,
    loginSessionId,
    isLoggedIn,
    loginUser,
    logoutUser,
    updateToken,
    clearToken,
    storeLoginSessionId,
  };
};

export default useAuth;