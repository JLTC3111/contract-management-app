import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUser } from './hooks/useUser';
import Dashboard from './pages/Dashboard';
import ContractDetail from './pages/ContractDetail';
import Login from './pages/Login';

function App() {
  const { user, loading } = useUser();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contracts/:id" element={<ContractDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
