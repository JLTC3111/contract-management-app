import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Clock, 
  CheckCircle, AlertTriangle, Calendar,
  Filter, Download, Eye, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { getI18nOrFallback } from '../utils/formatters';
import gsap from 'gsap';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6', '#06b6d4'];
const STATUS_COLORS = {
  approved: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',
  draft: '#6b7280',
  expiring: '#f97316',
  expired: '#dc2626'
};

const ContractAnalytics = ({ contracts = [], loading = false, onRefresh }) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [tablePage, setTablePage] = useState(0);
  const [sortField, setSortField] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const itemsPerPage = 10;

  // Refs for GSAP animations
  const containerRef = useRef(null);
  const metricsRef = useRef([]);
  const chartsRef = useRef([]);

  // GSAP entrance animations
  useEffect(() => {
    if (!containerRef.current || loading) return;
    
    gsap.fromTo(
      metricsRef.current.filter(Boolean),
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
    );
    
    gsap.fromTo(
      chartsRef.current.filter(Boolean),
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power2.out', delay: 0.3 }
    );
  }, [loading, contracts.length]);

  // Filter contracts based on period and status
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
    
    return contracts.filter(contract => {
      if (!contract || !contract.updated_at) return false;
      const dateValid = new Date(contract.updated_at) >= cutoffDate;
      const statusValid = selectedStatus === 'all' || contract.status === selectedStatus;
      return dateValid && statusValid;
    });
  }, [contracts, selectedPeriod, selectedStatus]);

  // Sorted contracts for table
  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'updated_at' || sortField === 'expiry_date') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [filteredContracts, sortField, sortDir]);

  // Paginated contracts
  const paginatedContracts = useMemo(() => {
    const start = tablePage * itemsPerPage;
    return sortedContracts.slice(start, start + itemsPerPage);
  }, [sortedContracts, tablePage]);

  const totalPages = Math.ceil(sortedContracts.length / itemsPerPage);

  // Status Distribution Data
  const statusData = useMemo(() => {
    if (filteredContracts.length === 0) return [];

    const statusCounts = filteredContracts.reduce((acc, contract) => {
      if (contract?.status) {
        acc[contract.status] = (acc[contract.status] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: t(`contractTable.status.${status}`, status.charAt(0).toUpperCase() + status.slice(1)),
      value: count,
      status,
      percentage: ((count / filteredContracts.length) * 100).toFixed(1)
    }));
  }, [filteredContracts, t]);

  // Monthly Trend Data
  const monthlyTrends = useMemo(() => {
    if (filteredContracts.length === 0) return [];

    const monthlyData = {};
    
    filteredContracts.forEach(contract => {
      if (!contract?.updated_at) return;
      
      const month = new Date(contract.updated_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      if (!monthlyData[month]) {
        monthlyData[month] = { month, total: 0, approved: 0, rejected: 0, pending: 0, draft: 0, expired: 0, expiring: 0 };
      }
      
      monthlyData[month].total++;
      if (contract.status) monthlyData[month][contract.status]++;
    });

    return Object.values(monthlyData).sort((a, b) => new Date(a.month) - new Date(b.month));
  }, [filteredContracts]);

  // Key Metrics
  const keyMetrics = useMemo(() => {
    const total = filteredContracts.length;
    const approved = filteredContracts.filter(c => c?.status === 'approved').length;
    const rejected = filteredContracts.filter(c => c?.status === 'rejected').length;
    const pending = filteredContracts.filter(c => c?.status === 'pending').length;
    const expiring = filteredContracts.filter(c => c?.status === 'expiring').length;
    
    return {
      total,
      approved,
      rejected,
      pending,
      expiring,
      approvalRate: total > 0 ? ((approved / total) * 100).toFixed(1) : 0,
      rejectionRate: total > 0 ? ((rejected / total) * 100).toFixed(1) : 0
    };
  }, [filteredContracts]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Title', 'Status', 'Version', 'Author', 'Updated', 'Expiry'];
    const rows = filteredContracts.map(c => [
      c.title || '',
      c.status || '',
      c.version || '',
      c.author || '',
      c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '',
      c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const cardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: darkMode ? '0 4px 6px rgba(255, 255, 255, 0.05)' : '0 4px 6px rgba(0, 0, 0, 0.08)'
  };

  const MetricCard = React.forwardRef(({ title, value, icon: Icon, color = '#3b82f6', onClick }, ref) => (
    <div 
      ref={ref}
      onClick={onClick}
      style={{
        ...cardStyle,
        background: `linear-gradient(135deg, ${color}15, var(--card-bg))`,
        borderLeft: `4px solid ${color}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '0.9rem', opacity: 0.8 }}>{title}</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color }}>{value}</p>
        </div>
        <Icon size={32} style={{ color, opacity: 0.7 }} />
      </div>
    </div>
  ));

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <RefreshCw size={48} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text)', marginTop: '1rem' }}>{t('common.loading', 'Loading...')}</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // No data state
  if (!Array.isArray(contracts) || contracts.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <Calendar size={64} style={{ color: 'var(--text)', opacity: 0.3, marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--text)' }}>{t('analytics.title', 'Contract Analytics')}</h2>
        <p style={{ color: 'var(--text)', opacity: 0.7 }}>{t('analytics.noContractsAvailable', 'No contracts available for analysis')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header with controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ color: 'var(--text)', margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
          {t('analytics.contractAnalyticsHistory', 'Contract Analytics & History')}
        </h1>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period filter */}
          <select 
            value={selectedPeriod}
            onChange={(e) => { setSelectedPeriod(e.target.value); setTablePage(0); }}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '0.9rem' }}
          >
            <option value="1month">{t('analytics.lastMonth', 'Last Month')}</option>
            <option value="3months">{t('analytics.last3Months', 'Last 3 Months')}</option>
            <option value="6months">{t('analytics.last6Months', 'Last 6 Months')}</option>
            <option value="1year">{t('analytics.lastYear', 'Last Year')}</option>
            <option value="all">{t('analytics.allTime', 'All Time')}</option>
          </select>
          
          {/* Status filter */}
          <select 
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setTablePage(0); }}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: '0.9rem' }}
          >
            <option value="all">{t('analytics.allStatuses', 'All Statuses')}</option>
            <option value="approved">{t('contractTable.status.approved', 'Approved')}</option>
            <option value="pending">{t('contractTable.status.pending', 'Pending')}</option>
            <option value="rejected">{t('contractTable.status.rejected', 'Rejected')}</option>
            <option value="draft">{t('contractTable.status.draft', 'Draft')}</option>
            <option value="expiring">{t('contractTable.status.expiring', 'Expiring')}</option>
            <option value="expired">{t('contractTable.status.expired', 'Expired')}</option>
          </select>

          {/* View toggle */}
          <button
            onClick={() => setShowDetailedView(!showDetailedView)}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: showDetailedView ? 'var(--primary)' : 'var(--card-bg)', color: showDetailedView ? '#fff' : 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
          >
            <Eye size={16} />
            {showDetailedView ? t('analytics.simpleView', 'Simple') : t('analytics.detailedView', 'Detailed')}
          </button>
          
          {/* Export button */}
          <button
            onClick={handleExportCSV}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#10b981', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
          >
            <Download size={16} />
            {t('analytics.exportCSV', 'Export CSV')}
          </button>

          {/* Refresh button */}
          {onRefresh && (
            <button onClick={onRefresh} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: 'pointer' }}>
              <RefreshCw size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <MetricCard ref={el => metricsRef.current[0] = el} title={t('analytics.totalContracts', 'Total Contracts')} value={keyMetrics.total} icon={Calendar} color="#3b82f6" />
        <MetricCard ref={el => metricsRef.current[1] = el} title={t('analytics.approvalRate', 'Approval Rate')} value={`${keyMetrics.approvalRate}%`} icon={CheckCircle} color="#10b981" onClick={() => setSelectedStatus('approved')} />
        <MetricCard ref={el => metricsRef.current[2] = el} title={t('analytics.pendingReview', 'Pending Review')} value={keyMetrics.pending} icon={Clock} color="#f59e0b" onClick={() => setSelectedStatus('pending')} />
        <MetricCard ref={el => metricsRef.current[3] = el} title={t('analytics.expiringSoon', 'Expiring Soon')} value={keyMetrics.expiring} icon={AlertTriangle} color="#ef4444" onClick={() => setSelectedStatus('expiring')} />
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: showDetailedView ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Status Distribution Pie */}
        <div ref={el => chartsRef.current[0] = el} style={cardStyle}>
          <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>{t('analytics.statusDistribution', 'Status Distribution')}</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  dataKey="value"
                  onClick={(data) => setSelectedStatus(data.status)}
                  style={{ cursor: 'pointer' }}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text)', opacity: 0.6, textAlign: 'center', padding: '4rem 0' }}>{t('analytics.noData', 'No data available')}</p>
          )}
        </div>

        {/* Monthly Trends Area Chart */}
        {showDetailedView && (
          <div ref={el => chartsRef.current[1] = el} style={cardStyle}>
            <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>{t('analytics.monthlyTrends', 'Monthly Trends')}</h3>
            {monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="month" stroke="var(--text)" fontSize={12} />
                  <YAxis stroke="var(--text)" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="approved" stackId="1" stroke="#10b981" fill="#10b981" name={t('contractTable.status.approved', 'Approved')} />
                  <Area type="monotone" dataKey="pending" stackId="1" stroke="#f59e0b" fill="#f59e0b" name={t('contractTable.status.pending', 'Pending')} />
                  <Area type="monotone" dataKey="rejected" stackId="1" stroke="#ef4444" fill="#ef4444" name={t('contractTable.status.rejected', 'Rejected')} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text)', opacity: 0.6, textAlign: 'center', padding: '4rem 0' }}>{t('analytics.noData', 'No data available')}</p>
            )}
          </div>
        )}
      </div>

      {/* Bar Chart (Detailed View) */}
      {showDetailedView && monthlyTrends.length > 0 && (
        <div ref={el => chartsRef.current[2] = el} style={cardStyle}>
          <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>{t('analytics.statusTimeline', 'Contract Status Timeline')}</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="month" stroke="var(--text)" fontSize={12} />
              <YAxis stroke="var(--text)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="approved" fill="#10b981" name={t('contractTable.status.approved', 'Approved')} />
              <Bar dataKey="pending" fill="#f59e0b" name={t('contractTable.status.pending', 'Pending')} />
              <Bar dataKey="rejected" fill="#ef4444" name={t('contractTable.status.rejected', 'Rejected')} />
              <Bar dataKey="draft" fill="#6b7280" name={t('contractTable.status.draft', 'Draft')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Contract History Table with pagination & sorting */}
      <div ref={el => chartsRef.current[3] = el} style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ color: 'var(--text)', margin: 0 }}>{t('analytics.recentHistory', 'Contract History')}</h3>
          <span style={{ color: 'var(--text)', opacity: 0.7, fontSize: '0.9rem' }}>
            {t('analytics.showing', 'Showing')} {paginatedContracts.length} {t('analytics.of', 'of')} {sortedContracts.length}
          </span>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                {[
                  { key: 'title', label: t('analytics.contract', 'Contract') },
                  { key: 'status', label: t('analytics.status', 'Status') },
                  { key: 'updated_at', label: t('analytics.updated', 'Updated') },
                  { key: 'expiry_date', label: t('analytics.expiry', 'Expiry') }
                ].map(col => (
                  <th 
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{ padding: '1rem', textAlign: 'left', color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}
                  >
                    {col.label} {sortField === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedContracts.map((contract) => (
                <tr 
                  key={contract.id} 
                  style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.2s', cursor: 'pointer' }} 
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'} 
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => navigate(`/lifecycle/${contract.id}`)}
                  title={t('analytics.clickToViewTimeline', 'Click to view timeline')}
                >
                  <td style={{ padding: '1rem', color: 'var(--text)' }}>{getI18nOrFallback(t, contract, 'title_i18n', 'title')}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', backgroundColor: `${STATUS_COLORS[contract.status] || '#6b7280'}20`, color: STATUS_COLORS[contract.status] || '#6b7280' }}>
                      {t(`contractTable.status.${contract.status}`, contract.status)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text)' }}>{contract.updated_at ? new Date(contract.updated_at).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: '1rem', color: 'var(--text)' }}>{contract.expiry_date ? new Date(contract.expiry_date).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={() => setTablePage(p => Math.max(0, p - 1))} disabled={tablePage === 0} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: tablePage === 0 ? 'not-allowed' : 'pointer', opacity: tablePage === 0 ? 0.5 : 1 }}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{tablePage + 1} / {totalPages}</span>
            <button onClick={() => setTablePage(p => Math.min(totalPages - 1, p + 1))} disabled={tablePage >= totalPages - 1} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: tablePage >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: tablePage >= totalPages - 1 ? 0.5 : 1 }}>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractAnalytics;