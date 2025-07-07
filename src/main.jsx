import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { UserProvider } from './hooks/useUser.jsx'; // or adjust path if needed
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './hooks/useTheme.jsx';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <UserProvider>
        <App />
        <Toaster position="top-right" />
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>
);
