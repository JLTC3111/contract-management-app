import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUser } from './hooks/useUser';
import Dashboard from './pages/Dashboard';
import ContractDetail from './pages/ContractDetail';
import Login from './pages/Login';
import Home from './pages/Home';
import NewContract from './pages/NewContract';
import Approvals from './pages/Approvals'; // 👈 Import this!
import NavBar from './components/NavBar';
import { Toaster } from 'react-hot-toast';
import './index.css';

function App() {
  const { user, loading } = useUser();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <NavBar />
      <Toaster />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/home" element={<Home />} />
        <Route path="/new" element={<NewContract />} />
        <Route path="/contracts/:contractId" element={<ContractDetail user={user} />} />
        <Route path="/contracts/:contractId/approvals" element={<Approvals user={user} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
