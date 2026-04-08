import { useSelector, useDispatch } from 'react-redux';
import {
  login,
  logout,
  setToken,
  removeToken,
  setLoginSessionId,
} from '../app/features/auth/authSlice';

// ❌ HASHED OUT - SSO JWT Decode (Only needed for real SSO tokens)
// Helper function to decode JWT safely
// const decodeJwt = (token) => {
//   try {
//     const base64Url = token.split('.')[1];
//     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//     const jsonPayload = decodeURIComponent(
//       atob(base64)
//         .split('')
//         .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
//         .join('')
//     );
//     return JSON.parse(jsonPayload);
//   } catch (e) {
//     console.error('❌ JWT decode failed:', e);
//     return null;
//   }
// };

const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const loginSessionId = useSelector((state) => state.auth.login_session_id);

  const isLoggedIn = !!token;

  const loginUser = (userData) => {
    // ❌ HASHED OUT - SSO Email Extraction from JWT
    // Only needed when using real SSO tokens
    
    // Extract email from JWT if backend didn't send it directly
    // let extractedEmail = null;
    // if (userData.token) {
    //   const decoded = decodeJwt(userData.token);
    //   extractedEmail = decoded?.user_data?.email?.[0] || null;
    // }

    // Inject decoded email into userData if missing
    // if (!userData.email && extractedEmail) {
    //   userData.email = extractedEmail;
    // }

    // Log warning if still missing
    // if (!userData.email) {
    //   console.warn('⚠️ No email found for user:', userData.name);
    // }

    // ✅ For local dev, email is already in userData object
    if (!userData.email) {
      console.warn('⚠️ No email provided for user:', userData.name);
    }

    // Dispatch to Redux
    dispatch(login({ user: userData, token: userData.token }));

    // Persist all important data
    localStorage.setItem('name', JSON.stringify(userData.name || ''));
    localStorage.setItem('group', JSON.stringify(userData.group || ''));
    localStorage.setItem('email', JSON.stringify(userData.email || ''));
    localStorage.setItem('job_title', JSON.stringify(userData.job_title || ''));
    localStorage.setItem('token', userData.token || '');
    localStorage.setItem('login_session_id', JSON.stringify(loginSessionId || ''));
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