import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUser } from './hooks/useUser';
import Dashboard from './pages/Dashboard';
import ContractDetail from './pages/ContractDetail';
import Login from './pages/Login';
import Home from './pages/Home';
import NewContract from './pages/NewContract';
import NavBar from './components/NavBar';
import { Toaster } from 'react-hot-toast';

function App() {
  const { user, loading } = useUser();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Login />;

  return (
    
    <BrowserRouter>
     <NavBar />
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewContract />} /> {/* ✅ New route */}
        <Route path="/contracts/:id" element={<ContractDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
