import Sidebar from '../components/Sidebar';
import DashboardMetrics from '../components/DashboardMetrics';
import ContractTable from '../components/ContractTable';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supaBaseClient';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const metrics = [
    { label: 'Active', count: contracts.filter(c => c.status === 'approved').length },
    { label: 'Pending', count: contracts.filter(c => c.status === 'pending').length },
    { label: 'Drafts', count: contracts.filter(c => c.status === 'draft').length },
    { label: 'Rejected', count: contracts.filter(c => c.status === 'rejected').length },
  ];

  useEffect(() => {
    const fetchContracts = async () => {
      const { data, error } = await supabase.from('contracts').select('*');
      if (error) {
        console.error('Supabase error:', error.message);
      } else {
        console.log('Fetched contracts:', data); // ✅ Add this!
        setContracts(data);
      }
      setLoading(false);
    };
  
    fetchContracts();
  }, []);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ padding: '2rem', flex: 1 }}>
        <h1>Dashboard</h1>
        {loading ? <p>Loading...</p> : <>
          <DashboardMetrics data={metrics} />
          <ContractTable contracts={contracts} />
          <button
  style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '1rem' }}
  onClick={() => navigate('/new')}
>
  + New Contract
</button>
        </>}
      </main>
    </div>
  );
};

export default Dashboard;
