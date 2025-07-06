import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUser } from './hooks/useUser';
import Dashboard from './pages/Dashboard';
import ContractDetail from './pages/ContractDetail';
import Login from './pages/Login';
import Home from './pages/Home';
import NewContract from './pages/NewContract';
import Approvals from './pages/Approvals';

import Layout from './components/Layout'; // 👈 Add this
import './index.css';
import './App.css';

function App() {
  const { user, loading } = useUser();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      
      <Routes>
        {/* Routes with Sidebar */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/home" element={<Home />} />
          <Route path="/new" element={<NewContract />} />
          <Route path="/contracts/:contractId" element={<ContractDetail user={user} />} />
          <Route path="/approvals" element={<Approvals />} />
        </Route>

        {/* Optional: Login Route - if you want to support logout redirect */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
