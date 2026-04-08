// src/components/GlobalToastContainer.jsx
import React from 'react';
import { ToastContainer } from 'react-toastify'; //  Import ToastContainer from react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import react-toastify CSS

const GlobalToastContainer = () => {
  return (
    <ToastContainer
      position="bottom-left"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
      // Add any further customization props here
    />
  );
};

export default GlobalToastContainer;