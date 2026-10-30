import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import apiClient from '../services/apiClient';
import { isTokenValid } from '../utils/isTokenValid';

const Dashboard = () => {
  const navigate = useNavigate();
  const { updateToken, loginUser, storeLoginSessionId, clearToken } = useAuth();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    // ✅ STEP 1: Extract token from URL (Azure redirects here after SAML login)
    const queryParams = new URLSearchParams(window.location.search);
    const tokenFromURL = queryParams.get('token');

    if (!tokenFromURL || !isTokenValid(tokenFromURL)) {
      console.warn('❌ No valid token found in URL. Redirecting to login.');
      navigate('/', { replace: true });
      return;
    }
// ✅ STEP 2: Store the token FIRST
    updateToken(tokenFromURL);

    // ✅ STEP 3: Call backend to extract user data from token
    // NOTE: updateToken is called INSIDE fetchUserData only after success,
    // to prevent a stale token being stored if the API call fails
    const fetchUserData = async () => {
      try {
        let res;
        let userName = '';
        let userGroup = '';
        let userJobTitle = null;
        let userEmail = null;

        if (import.meta.env.VITE_TOKEN_EXTRACT) {
          // Custom token extract endpoint (from env)
          res = await apiClient.post(
            import.meta.env.VITE_TOKEN_EXTRACT,
            { token: tokenFromURL },
            { headers: { Authorization: `Bearer ${tokenFromURL}` } } // ✅ explicit auth header
          );

          if (res.status === 200) {
            userName = Array.isArray(res.data.name)
              ? res.data.name[0]
              : res.data.name;
            userGroup = Array.isArray(res.data.group)
              ? res.data.group[0]
              : res.data.group;
            userJobTitle = Array.isArray(res.data.job_title)
              ? res.data.job_title[0]
              : res.data.job_title;
            userEmail = Array.isArray(res.data.email)
              ? res.data.email[0]
              : res.data.email || null;
          }
        } else {
          // Default SAML token extract endpoint
          res = await apiClient.get('/saml/token/extract', {
            params: { token: tokenFromURL },
            headers: { Authorization: `Bearer ${tokenFromURL}` }, // ✅ explicit auth header
          });

          if (res.status === 200) {
            userName = Array.isArray(res.data.user_data.name)
              ? res.data.user_data.name[0]
              : res.data.user_data.name;
            userGroup = Array.isArray(res.data.user_data.group)
              ? res.data.user_data.group[0]
              : res.data.user_data.group;
            userJobTitle = Array.isArray(res.data.user_data.job_title)
              ? res.data.user_data.job_title[0]
              : res.data.user_data.job_title;
            userEmail = Array.isArray(res.data.user_data.email)
              ? res.data.user_data.email[0]
              : res.data.user_data.email || null;
          }
        }



        // ✅ STEP 4: Login user with extracted data
        loginUser({
          name: userName,
          group: userGroup,
          job_title: userJobTitle,
          email: userEmail,
          token: tokenFromURL,
        });

        // ✅ STEP 5: Log the login session (non-blocking — failure won't stop navigation)
        try {
          const logResponse = await apiClient.post('/login_log', {
            user_name: userName,
          });
          if (logResponse.data?.login_session_id) {
            storeLoginSessionId(logResponse.data.login_session_id);
            console.log('✅ Login session logged:', logResponse.data);
          }
        } catch (logErr) {
          console.warn('⚠️ Login log failed (non-critical):', logErr);
        }

        // ✅ STEP 6: Navigate to app
        navigate('/home', { replace: true });

      } catch (error) {
        console.error('❌ Error fetching user data from token:', error);
        // ✅ Clear any partially stored token to prevent redirect loops
        clearToken();
        navigate('/', { replace: true });
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className='min-h-screen flex items-center flex-col gap-4 justify-center'>
      <div className='h-10 w-10 bg-[#021A32] rounded-full animate-bounce'></div>
      <h1>Signing you in...</h1>
    </div>
  );
};

export default Dashboard;
