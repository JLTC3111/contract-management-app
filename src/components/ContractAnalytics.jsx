import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Clock, 
  CheckCircle, XCircle, AlertTriangle, Calendar,
  Filter, Download, Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ContractAnalytics = ({ contracts = [] }) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('status');
  const [showDetailedView, setShowDetailedView] = useState(false);

  // Filter contracts based on selected period
  const filteredContracts = useMemo(() => {
    if (!Array.isArray(contracts)) return [];
    
    const now = new Date();
    const periods = {
      '1month': 30,
      '3months': 90,
      '6months': 180,
      '1year': 365,
      'all': Infinity
    };
    
    const daysBack = periods[selectedPeriod];
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    return contracts.filter(contract => 
      contract && contract.updated_at && new Date(contract.updated_at) >= cutoffDate
    );
  }, [contracts, selectedPeriod]);

  // Status Distribution Data
  const statusData = useMemo(() => {
    if (!Array.isArray(filteredContracts) || filteredContracts.length === 0) {
      return [];
    }

    const statusCounts = filteredContracts.reduce((acc, contract) => {
      if (contract && contract.status) {
        acc[contract.status] = (acc[contract.status] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      percentage: ((count / filteredContracts.length) * 100).toFixed(1)
    }));
  }, [filteredContracts]);

  // Monthly Trend Data
  const monthlyTrends = useMemo(() => {
    if (!Array.isArray(filteredContracts) || filteredContracts.length === 0) {
      return [];
    }

    const monthlyData = {};
    
    filteredContracts.forEach(contract => {
      if (!contract || !contract.updated_at) return;
      
      try {
        const month = new Date(contract.updated_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        
        if (!monthlyData[month]) {
          monthlyData[month] = {
            month,
            total: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
            draft: 0,
            expired: 0,
            expiring: 0
          };
        }
        
        monthlyData[month].total++;
        if (contract.status) {
          monthlyData[month][contract.status]++;
        }
      } catch (error) {
        console.warn('Error processing contract date:', contract.updated_at, error);
      }
    });

    return Object.values(monthlyData).sort((a, b) => 
      new Date(a.month) - new Date(b.month)
    );
  }, [filteredContracts]);

  // Key Metrics
  const keyMetrics = useMemo(() => {
    if (!Array.isArray(filteredContracts)) {
      return { total: 0, approved: 0, rejected: 0, pending: 0, expiring: 0, approvalRate: 0, rejectionRate: 0 };
    }

    const total = filteredContracts.length;
    const approved = filteredContracts.filter(c => c && c.status === 'approved').length;
    const rejected = filteredContracts.filter(c => c && c.status === 'rejected').length;
    const pending = filteredContracts.filter(c => c && c.status === 'pending').length;
    const expiring = filteredContracts.filter(c => c && c.status === 'expiring').length;
    
    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : 0;
    const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : 0;
    
    return {
      total,
      approved,
      rejected,
      pending,
      expiring,
      approvalRate,
      rejectionRate
    };
  }, [filteredContracts]);

  // Contract Value Analysis (if contract values are available)
  const valueAnalysis = useMemo(() => {
    const contractsWithValue = filteredContracts.filter(c => c.value && c.value > 0);
    
    if (contractsWithValue.length === 0) return null;
    
    const totalValue = contractsWithValue.reduce((sum, c) => sum + (c.value || 0), 0);
    const avgValue = totalValue / contractsWithValue.length;
    const approvedValue = contractsWithValue
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.value || 0), 0);
    
    return {
      totalValue,
      avgValue,
      approvedValue,
      pendingValue: contractsWithValue
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (c.value || 0), 0)
    };
  }, [filteredContracts]);

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

  const MetricCard = ({ title, value, icon: Icon, trend, color = '#3b82f6' }) => (
    <div style={{
      ...cardStyle,
      background: `linear-gradient(135deg, ${color}15, var(--card-bg))`,
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '0.9rem', opacity: 0.8 }}>
            {title}
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color }}>
            {value}
          </p>
          {trend && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginTop: '0.5rem',
              color: trend > 0 ? '#10b981' : '#ef4444',
              fontSize: '0.85rem'
            }}>
              {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span style={{ marginLeft: '0.25rem' }}>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <Icon size={32} style={{ color, opacity: 0.7 }} />
      </div>
    </div>
  );

  // Early return if no contracts provided (after all hooks are called)
  if (!Array.isArray(contracts)) {
    console.warn('ContractAnalytics: contracts prop is not an array:', contracts);
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text)' }}>
          {t('analytics.errorLoadingContractData')}
        </p>
      </div>
    );
  }

  // Show message when no contracts are available (after all hooks are called)
  if (contracts.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '1rem' }}>
          {t('analytics.title')}
        </h2>
        <p style={{ color: 'var(--text)', opacity: 0.7 }}>
          {t('analytics.noContractsAvailable')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{ color: 'var(--text)', margin: 0 }}>
          {t('analytics.contractAnalyticsHistory')}
        </h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text)'
            }}
          >
            <option value="1month">{t('analytics.lastMonth')}</option>
            <option value="3months">{t('analytics.last3Months')}</option>
            <option value="6months">{t('analytics.last6Months')}</option>
            <option value="1year">{t('analytics.lastYear')}</option>
            <option value="all">{t('analytics.allTime')}</option>
          </select>
          
          <button
            onClick={() => setShowDetailedView(!showDetailedView)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--card-border)',
              background: 'var(--primary-color)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Eye size={16} />
            {showDetailedView ? t('analytics.simpleView') : t('analytics.detailedView')}
          </button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <MetricCard
          title={t('analytics.totalContracts')}
          value={keyMetrics.total}
          icon={Calendar}
          color="#3b82f6"
        />
        <MetricCard
          title={t('analytics.approvalRate')}
          value={`${keyMetrics.approvalRate}%`}
          icon={CheckCircle}
          color="#10b981"
        />
        <MetricCard
          title={t('analytics.pendingReview')}
          value={keyMetrics.pending}
          icon={Clock}
          color="#f59e0b"
        />
        <MetricCard
          title={t('analytics.expiringSoon')}
          value={keyMetrics.expiring}
          icon={AlertTriangle}
          color="#ef4444"
        />
      </div>

      {/* Value Metrics (if available) */}
      {valueAnalysis && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <MetricCard
            title={t('Total Contract Value')}
            value={`$${valueAnalysis.totalValue.toLocaleString()}`}
            icon={DollarSign}
            color="#8b5cf6"
          />
          <MetricCard
            title={t('Approved Value')}
            value={`$${valueAnalysis.approvedValue.toLocaleString()}`}
            icon={CheckCircle}
            color="#10b981"
          />
          <MetricCard
            title={t('Average Contract Value')}
            value={`$${valueAnalysis.avgValue.toLocaleString()}`}
            icon={TrendingUp}
            color="#06b6d4"
          />
        </div>
      )}

      {/* Charts Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: showDetailedView ? '1fr 1fr' : '1fr', 
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Status Distribution */}
        <div style={cardStyle}>
          <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>
            {t('Status Distribution')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trends */}
        {showDetailedView && (
          <div style={cardStyle}>
            <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>
              {t('Monthly Trends')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="approved" stackId="1" stroke="#10b981" fill="#10b981" />
                <Area type="monotone" dataKey="pending" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="rejected" stackId="1" stroke="#ef4444" fill="#ef4444" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detailed Charts (if detailed view is enabled) */}
      {showDetailedView && (
        <div style={cardStyle}>
          <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>
            {t('Contract Status Timeline')}
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="approved" fill="#10b981" name={t('Approved')} />
              <Bar dataKey="pending" fill="#f59e0b" name={t('Pending')} />
              <Bar dataKey="rejected" fill="#ef4444" name={t('Rejected')} />
              <Bar dataKey="draft" fill="#6b7280" name={t('Draft')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Contract History Table */}
      <div style={cardStyle}>
        <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>
          {t('Recent Contract History')}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text)' }}>
                  {t('Contract')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text)' }}>
                  {t('Status')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text)' }}>
                  {t('Created')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text)' }}>
                  {t('Expiry')}
                </th>
                {valueAnalysis && (
                  <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text)' }}>
                    {t('Value')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredContracts.slice(0, 10).map((contract) => (
                <tr key={contract.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text)' }}>
                    {contract.title}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      backgroundColor: 
                        contract.status === 'approved' ? '#10b98120' :
                        contract.status === 'rejected' ? '#ef444420' :
                        contract.status === 'pending' ? '#f59e0b20' :
                        contract.status === 'expiring' ? '#ef444420' :
                        '#6b728020',
                      color:
                        contract.status === 'approved' ? '#10b981' :
                        contract.status === 'rejected' ? '#ef4444' :
                        contract.status === 'pending' ? '#f59e0b' :
                        contract.status === 'expiring' ? '#ef4444' :
                        '#6b7280'
                    }}>
                      {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text)' }}>
                    {contract.updated_at ? new Date(contract.updated_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text)' }}>
                    {contract.expiry_date ? new Date(contract.expiry_date).toLocaleDateString() : '-'}
                  </td>
                  {valueAnalysis && (
                    <td style={{ padding: '1rem', color: 'var(--text)' }}>
                      {contract.value ? `$${contract.value.toLocaleString()}` : '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContractAnalytics;
