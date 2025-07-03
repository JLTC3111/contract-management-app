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
    { label: 'Expiring Soon', count: contracts.filter(c => c.status === 'expiring').length },
    { label: 'Drafts', count: contracts.filter(c => c.status === 'draft').length },
    { label: 'Rejected', count: contracts.filter(c => c.status === 'rejected').length },
  ];

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true); // move this up for safety
  
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('updated_at', { ascending: false });
  
      if (error) {
        console.error('Supabase error:', error.message);
        setLoading(false);
        return;
      }
  
      if (!data || !Array.isArray(data)) {
        console.error('Unexpected data format:', data);
        setLoading(false);
        return;
      }
  
      setContracts(prevContracts => {
        if (prevContracts.length === 0) {
          // First load
          return data;
        }
  
        // Update only modified contracts, keep order
        return prevContracts.map(existing => {
          const updated = data.find(d => d.id === existing.id);
          return updated ? updated : existing;
        });
      });
  
      setLoading(false);
    };
  
    fetchContracts();
  }, []);
  const handleRunCron = async () => {
    try {
      const response = await fetch('https://idkfmgdfzcsydrqnjcla.functions.supabase.co/contract-status-cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': import.meta.env.VITE_CRON_SECRET,
        },
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result?.message || 'Unknown error');
      }
  
      alert(`✅ Cron Success: ${result.message}`);
    } catch (error) {
      console.error('🚨 Cron failed:', error);
      alert(`Cron failed: ${error.message}`);
    }
  };
  
  return (
    <>
      <button
    style={{
      background: '#00b894',
      color: '#fff',
      padding: '0.5rem 1rem',
      fontSize: '1rem',
      marginBottom: '1rem',
    }}
    onClick={async () => {
      try {
        const response = await fetch('https://idkfmgdfzcsydrqnjcla.functions.supabase.co/contract-status-cron', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_CRON_SECRET}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('❌ Cron failed:', result);
          alert(`❌ Cron failed: ${result.error || result.message || 'Unknown error'}`);
        } else {
          alert(`✅ Cron ran successfully! ${result.updatedCount ? `(${result.updatedCount} contract(s) updated)` : ''}`);
        }
      } catch (error) {
        console.error('🚨 Error triggering cron:', error);
        alert('🚨 Failed to trigger cron job. Check network or CORS settings.');
      }
    }}
  >
    🔁 Update Contract Status
  </button>
  
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ padding: '2rem', flex: 1 }}>
          <h1>Dashboard</h1>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <DashboardMetrics data={metrics} />
              <ContractTable contracts={contracts} />
              <button
                style={{
                  background: '#088eee',
                  color: '#fff',
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  fontSize: '1rem',
                }}
                onClick={() => navigate('/new')}
              >
                + New Contract
              </button>
            </>
          )}
        </main>
      </div>
    </>
  );
  
};

export default Dashboard;
