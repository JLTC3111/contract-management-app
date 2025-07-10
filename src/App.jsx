import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUser } from './hooks/useUser';
import Dashboard from './pages/Dashboard';
import ContractDetail from './pages/ContractDetail';
import Login from './pages/Login';
import NewContract from './pages/NewContract';
import ApprovalsBoard from './pages/ApprovalsBoard';
import ManualViewer from './components/ManualViewer';

import Layout from './components/Layout'; // 👈 Add this
import './index.css';
import './App.css';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();
  
  // Remove the entire useEffect that creates and manages the custom-magnifier

  const { user, loading } = useUser();

  if (loading) return <p>{t('common.loading')}</p>;
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      
      <Routes>
        {/* Routes with Sidebar */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewContract />} />
          <Route path="/contracts/:contractId" element={<ContractDetail user={user} />} />
          <Route path="/approvals" element={<ApprovalsBoard />} />
          <Route path="/approvals/:id" element={<ApprovalsBoard />} />
        </Route>

        {/* Manual route outside sidebar layout */}
        <Route path="/manual" element={<ManualViewer />} />

        {/* Optional: Login Route - if you want to support logout redirect */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
