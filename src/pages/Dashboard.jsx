//src\pages\Dashboard.jsx
// ❌ HASHED OUT - SSO Dashboard
// This entire component is for SSO token extraction
// Not needed for local development with hardcoded users

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import useAuth from '../hooks/useAuth';
// import apiClient from '../services/apiClient';
// import { isTokenValid } from '../utils/isTokenValid';

const Dashboard = () => {
  const navigate = useNavigate();
  // const { token, updateToken, loginUser, storeLoginSessionId } = useAuth();

  useEffect(() => {
    // ❌ HASHED OUT - SSO Token Extraction
    // const queryParams = new URLSearchParams(window.location.search);
    // const tokenFromURL = queryParams.get('token');

    // if (tokenFromURL && isTokenValid(tokenFromURL)) {
    //   updateToken(tokenFromURL);
    // } else {
    //   navigate('/');
    // }

    // ✅ For local dev, just redirect to login page
    navigate('/');
  }, [navigate]);

  // ❌ HASHED OUT - SSO User Data Fetching
  // useEffect(() => {
  //   const fetchUserData = async () => {
  //     if (window.__hasLoggedInOnce) {
  //       return;
  //     }
  //     window.__hasLoggedInOnce = true;

  //     try {
  //       let res;
  //       let userName = '';
  //       let userGroup = '';
  //       let userJobTitle = null;

  //       if (import.meta.env.VITE_TOKEN_EXTRACT) {
  //         res = await apiClient.post(import.meta.env.VITE_TOKEN_EXTRACT, {
  //           token,
  //         });
  //         console.log('res data=> ', res.data);

  //         if (res.status === 200) {
  //           userName = Array.isArray(res.data.name)
  //             ? res.data.name[0]
  //             : res.data.name;
  //           userGroup = Array.isArray(res.data.group)
  //             ? res.data.group[0]
  //             : res.data.group;
  //           userJobTitle = Array.isArray(res.data.job_title)
  //             ? res.data.job_title[0]
  //             : res.data.job_title;

  //           loginUser({ 
  //             name: userName, 
  //             group: userGroup, 
  //             job_title: userJobTitle, 
  //             token 
  //           });
  //           navigate('/home');
  //         }
  //       } else {
  //         res = await apiClient.post('/saml/token/extract', null, {
  //           params: { token },
  //         });
  //         console.log('res data=> ', res.data);

  //         if (res.status === 200) {
  //           userName = Array.isArray(res.data.user_data.name)
  //             ? res.data.user_data.name[0]
  //             : res.data.user_data.name;
  //           userGroup = Array.isArray(res.data.user_data.group)
  //             ? res.data.user_data.group[0]
  //             : res.data.user_data.group;
  //           userJobTitle = Array.isArray(res.data.user_data.job_title)
  //             ? res.data.user_data.job_title[0]
  //             : res.data.user_data.job_title;

  //           loginUser({ 
  //             name: userName, 
  //             group: userGroup, 
  //             job_title: userJobTitle, 
  //             token 
  //           });
  //           navigate('/home');
  //         }
  //       }

  //       const logResponse = await apiClient.post('/log/user', {
  //         user_name: userName,
  //       });

  //       if (logResponse.data && logResponse.data.login_session_id) {
  //         storeLoginSessionId(logResponse.data.login_session_id);
  //         console.log('Login data logged successfully:', logResponse.data);
  //       } else {
  //         console.warn(
  //           'Login log response did not contain login_session_id:',
  //           logResponse.data
  //         );
  //       }

  //       navigate('/home');
  //     } catch (error) {
  //       console.error('Error fetching user data:', error);
  //       navigate('/');
  //     }
  //   };

  //   token && fetchUserData();
  // }, [token, loginUser, navigate, updateToken, storeLoginSessionId]);

  return (
    <div className='min-h-screen flex items-center flex-col gap-4 justify-center'>
      <div className='h-10 w-10 bg-[#021A32] rounded-full animate-bounce'></div>
      <h1>Redirecting...</h1>
    </div>
  );
};

export default Dashboard;