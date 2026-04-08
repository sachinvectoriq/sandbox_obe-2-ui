{/* Will be used for SSO in future , for now hashed ..
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useEffect } from 'react';
// import { isTokenValid } from '../utils/isTokenValid'; // ❌ HASHED OUT - SSO

const Login = () => {
  // const { token } = useAuth(); // ❌ HASHED OUT - SSO
  const { loginUser, storeLoginSessionId } = useAuth(); // ✅ Keep these for hardcoded login
  const navigate = useNavigate();

  useEffect(() => {
    // ❌ HASHED OUT - SSO Login Logic
    // console.log('token: ', token);
    // if (token) console.log('is token valid: ', isTokenValid(token));
    // if (token && isTokenValid(token)) {
    //   navigate('/home');
    // } else {
    //   localStorage.clear();
    //   window.location.href =
    //     import.meta.env.VITE_LOGIN_URI ||
    //     'https://qa-azure-search.azurewebsites.net/saml/login';
    // }

    // ✅ HARDCODED USER FOR LOCAL DEVELOPMENT
    const hardcodedUser = {
      name: 'User1',
      group: 'user', // Options: 'admin', 'user'
      job_title: 'Tester',
      email: 'Testing123@tester.com',
      token: 'hardcoded-local-dev-token-12345', // Fake token for local dev
    };

    const hardcodedLoginSessionId = 'local-session-' + Date.now();

    // Login user with hardcoded data
    loginUser(hardcodedUser);
    storeLoginSessionId(hardcodedLoginSessionId);

    // Navigate to home immediately
    navigate('/home');
  }, [navigate, loginUser, storeLoginSessionId]);

  return (
    <div className='min-h-screen flex items-center flex-col gap-4 justify-center'>
      <div className='h-10 w-10 bg-[#021A32] rounded-full animate-bounce'></div>
      <h1>Loading...</h1>
    </div>
  );
};

export default Login;*/}

import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useEffect, useRef } from 'react';

const Login = () => {
  const { loginUser, storeLoginSessionId } = useAuth();
  const navigate = useNavigate();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const hardcodedUser = {
      name: 'User1',
      group: 'user',
      job_title: 'Tester',
      email: 'Testing123@tester.com',
      token: 'hardcoded-local-dev-token-12345',
    };

    const sessionId = 'local-session-' + Date.now();

    loginUser(hardcodedUser);
    storeLoginSessionId(sessionId);

    navigate('/home', { replace: true });
  }, []); // ✅ remove deps

  return (
    <div className='min-h-screen flex items-center flex-col gap-4 justify-center'>
      <div className='h-10 w-10 bg-[#021A32] rounded-full animate-bounce'></div>
      <h1>Loading...</h1>
    </div>
  );
};

export default Login;
