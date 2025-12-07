import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { UserProvider } from './hooks/useUser.jsx';
import { DemoProvider } from './context/DemoContext.jsx';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './hooks/useTheme.jsx';
import './i18n';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <DemoProvider>
          <UserProvider>
            <ErrorBoundary>
              <App />
              <Toaster position="top-right" />
            </ErrorBoundary>
          </UserProvider>
        </DemoProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
