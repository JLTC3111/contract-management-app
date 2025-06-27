import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { UserProvider } from './hooks/useUser.jsx'; // or adjust path if needed
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <App />
      <Toaster position="top-right" />
    </UserProvider>
  </React.StrictMode>
);
