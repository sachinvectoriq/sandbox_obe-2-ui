import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './app/store';
import RouterProvider from './routes/RouterProvider';
import { BrowserRouter } from 'react-router-dom';
import { authSession } from './services/authSession';
import { setToken, logout } from './app/features/auth/authSlice';

// One scheduler per tab; subscribe outside React's StrictMode effect lifecycle.
const unsubscribeSession = authSession.subscribe((token) => {
  store.dispatch(token ? setToken(token) : logout());
});
authSession.start();
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeSession();
    authSession.stop();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <RouterProvider />
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
