import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { UserProvider } from './hooks/useUser.jsx'; // or adjust path if needed
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './hooks/useTheme.jsx';
import './i18n';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <UserProvider>
        <ErrorBoundary>
          <App />
          <Toaster position="top-right" />
        </ErrorBoundary>
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>
);
