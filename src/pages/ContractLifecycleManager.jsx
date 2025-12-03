import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ArrowLeft, BarChart3, Calendar, Clock, Users, 
  FileText, Settings, Download, Share2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useUser } from '../hooks/useUser';
import { supabase } from '../utils/supaBaseClient';
import ContractPhaseManager from '../components/ContractPhaseManager';
import ContractAnalytics from '../components/ContractAnalytics';
import toast from 'react-hot-toast';

const ContractLifecycleManager = () => {
  const { contractId } = useParams();
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const { user } = useUser();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('phases');
  const [allContracts, setAllContracts] = useState([]);

  useEffect(() => {
    if (contractId) {
      fetchContractDetails();
      setActiveTab('phases'); // Default to phases for specific contracts
    } else {
      setActiveTab('analytics'); // Default to analytics for general page
      setLoading(false); // No need to load specific contract
    }
  }, [contractId]);

  useEffect(() => {
    // Only fetch all contracts when analytics tab is active or no specific contract
    if (activeTab === 'analytics' || !contractId) {
      fetchAllContracts();
    }
  }, [activeTab, contractId, user]);

  const fetchContractDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast.error(t('lifecycle.failedToLoadContractDetails'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAllContracts = async () => {
    try {
      // Only fetch contracts if user has permission
      if (!user) {
        console.warn('No user found, skipping contract fetch');
        return;
      }

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      setAllContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      // Don't show error toast for analytics page, just log it
      if (contractId) {
        toast.error(t('lifecycle.failedToLoadContractsForAnalytics'));
      }
    }
  };

  const tabs = [
    { 
      id: 'phases', 
      label: t('phaseManagement.title'), 
      icon: Clock,
      description: t('phaseManagement.trackProjectPhases')
    },
    { 
      id: 'analytics', 
      label: t('analytics.title'), 
      icon: BarChart3,
      description: t('phaseManagement.viewContractPerformance')
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'expiring': return '#f97316';
      case 'expired': return '#dc2626';
      case 'completed': return '#8b5cf6';
      case 'in_progress': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const cardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: darkMode 
      ? '0 4px 6px rgba(255, 255, 255, 0.1)' 
      : '0 4px 6px rgba(0, 0, 0, 0.1)'
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <Clock size={48} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text)', fontSize: '1.1rem' }}>
            {t('Loading contract lifecycle data...')}
          </p>
        </div>
      </div>
    );
  }

  if (!contract && contractId) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <FileText size={48} style={{ color: 'var(--text)', opacity: 0.6, marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>
            {t('Contract Not Found')}
          </h2>
          <p style={{ color: 'var(--text)', opacity: 0.8 }}>
            {t('The requested contract could not be found or you may not have access to it.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--background-color)',
      paddingBottom: '2rem'
    }}>
      {/* Header Section */}
      <div style={{
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--card-border)',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <button
                  onClick={() => window.history.back()}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginRight: '1rem',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    background: 'var(--hover-bg)'
                  }}
                >
                  <ArrowLeft size={20} color="var(--text)" />
                </button>
                <h1 style={{ color: 'var(--text)', margin: 0, fontSize: '1.8rem' }}>
                  {t('lifecycle.contractLifecycleManagement', 'Quản Lý Vòng Đời Hợp Đồng')}
                </h1>
              </div>
              
              {contract && (
                <div>
                  <h2 style={{ 
                    color: 'var(--text)', 
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.3rem',
                    fontWeight: '600'
                  }}>
                    {contract.title}
                  </h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <span style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      backgroundColor: getStatusColor(contract.status) + '20',
                      color: getStatusColor(contract.status),
                      border: `1px solid ${getStatusColor(contract.status)}40`
                    }}>
                      {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                    </span>
                    {contract.expiry_date && (
                      <span style={{
                        color: 'var(--text)',
                        opacity: 0.8,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <Calendar size={16} />
                        {t('Expires')}: {new Date(contract.expiry_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {contract.description && (
                    <p style={{ 
                      color: 'var(--text)', 
                      opacity: 0.8, 
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      {contract.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary-color)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Share2 size={16} />
                {t('Share')}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem',
            borderBottom: '1px solid var(--card-border)',
            paddingBottom: '0',
            marginBottom: '0'
          }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '1rem 1.5rem',
                    borderRadius: '8px 8px 0 0',
                    border: 'none',
                    background: activeTab === tab.id 
                      ? 'var(--primary-color)' 
                      : 'transparent',
                    color: activeTab === tab.id 
                      ? 'white' 
                      : 'var(--text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    fontSize: '0.95rem',
                    fontWeight: activeTab === tab.id ? '600' : 'normal',
                    opacity: activeTab === tab.id ? 1 : 0.8,
                    borderBottom: activeTab === tab.id 
                      ? '2px solid var(--primary-color)' 
                      : '2px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.target.style.background = 'var(--hover-bg)';
                      e.target.style.opacity = '1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.target.style.background = 'transparent';
                      e.target.style.opacity = '0.8';
                    }
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
        {activeTab === 'phases' && contract && (
          <ContractPhaseManager 
            contractId={contract.id} 
            contract={contract}
            onUpdate={fetchContractDetails}
          />
        )}
        
        {activeTab === 'analytics' && (
          <ContractAnalytics contracts={allContracts} />
        )}
      </div>
    </div>
  );
};

export default ContractLifecycleManager;
