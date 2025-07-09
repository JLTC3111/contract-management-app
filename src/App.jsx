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

function App() {
  useEffect(() => {
    // Remove any old magnifier
    let old = document.getElementById('custom-magnifier');
    if (old) old.remove();

    // Create magnifier
    const magnifier = document.createElement('div');
    magnifier.id = 'custom-magnifier';
    const size = 10;
    magnifier.style.position = 'fixed';
    magnifier.style.width = `${size}px`;
    magnifier.style.height = `${size}px`;
    magnifier.style.borderRadius = '50%';
    magnifier.style.border = '2.5px solidrgb(255, 255, 255)';
    magnifier.style.boxShadow = '0 0 16px 2pxrgba(255, 255, 255, 0.33)';
    magnifier.style.pointerEvents = 'none';
    magnifier.style.zIndex = 9999;
    magnifier.style.opacity = '0.5';
    magnifier.style.transition = 'opacity 0.2s, transform 0.2s';
    magnifier.style.backdropFilter = 'blur(0px) saturate(1.2)';
    magnifier.style.background = 'rgba(255,255,200,0.15)';
    magnifier.style.mixBlendMode = 'multiply';
    magnifier.style.transform = 'scale(1)';
    document.body.appendChild(magnifier);

    // Move magnifier with mouse
    function handleMove(e) {
      magnifier.style.left = `${e.clientX - size / 2}px`;
      magnifier.style.top = `${e.clientY - size / 2}px`;
    }

    // Show/hide on interactive elements
    function handleOver(e) {
      if (
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'A' ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.classList.contains('magnify-target')
      ) {
        magnifier.style.opacity = '1';
        magnifier.style.transform = 'scale(1.25)';
      }
    }
    function handleOut(e) {
      magnifier.style.opacity = '0';
      magnifier.style.transform = 'scale(1)';
    }

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseover', handleOver);
    document.addEventListener('mouseout', handleOut);

    // Clean up
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseover', handleOver);
      document.removeEventListener('mouseout', handleOut);
      magnifier.remove();
    };
  }, []);

  const { user, loading } = useUser();

  if (loading) return <p>Loading...</p>;
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
