// src/components/Layout.jsx
import React from 'react';
import Sidebar from './Sidebar';
import NavBar from './NavBar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <NavBar />
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
