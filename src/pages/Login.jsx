import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useEffect, useRef } from 'react';
import { isTokenValid } from '../utils/isTokenValid';

const Login = () => {
  const { token, clearToken } = useAuth();
  const navigate = useNavigate();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // ✅ If Azure redirected back here with token, forward to dashboard
    const params = new URLSearchParams(window.location.search);
    const tokenFromURL = params.get('token');
    if (tokenFromURL) {
      navigate(`/dashboard?token=${tokenFromURL}`, { replace: true });
      return;
    }

    // ✅ If already logged in, skip to app
    if (token && isTokenValid(token)) {
      navigate('/home', { replace: true });
      return;
    }

    clearToken();
    // ✅ Otherwise redirect to SAML login
    window.location.href =
      import.meta.env.VITE_LOGIN_URI ||
      'https://app-azuresearch-qa-evolve.azurewebsites.net/saml/login';
  }, []);

  return (
    <div className='min-h-screen flex items-center flex-col gap-4 justify-center'>
      <div className='h-10 w-10 bg-[#021A32] rounded-full animate-bounce'></div>
      <h1>Redirecting to login...</h1>
    </div>
  );
};

export default Login;
