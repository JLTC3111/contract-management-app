// src/components/Layout.jsx
import React from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { useTranslation } from 'react-i18next';
import RetryNotice from './common/RetryNotice';

const Layout = () => {
  const { user, retrySession } = useUser();
  const { t } = useTranslation();
  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <div className="content-area" style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          {user?.recoveryPending && <RetryNotice onRetry={retrySession}>
            {t('recovery.sessionPaused', 'Your session needs to be checked. Your work is kept here; saving will resume after verification.')}
          </RetryNotice>}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
