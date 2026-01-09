/**
 * Contract Info Section Component
 * Displays and edits contract metadata (title, status, version, etc.)
 */

import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { STATUS_COLORS } from '../../utils/constants';
import { StatusBadge } from '../../components/common';

const ContractInfo = ({
  contract,
  updated,
  editMode,
  onFieldChange,
  infoRefs,
  darkMode
}) => {
  const { t } = useTranslation();
  const dateInputRef = useRef(null);

  const labelStyle = {
    fontSize: '0.85rem',
    color: 'var(--text)',
    opacity: 0.7,
    marginBottom: '0.25rem',
    display: 'block'
  };

  const valueStyle = {
    fontSize: '1rem',
    color: 'var(--text)',
    fontWeight: 500
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--card-border)',
    background: 'var(--card-bg)',
    color: 'var(--text)',
    fontSize: '0.95rem',
    outline: 'none'
  };

  const cardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: darkMode 
      ? '0 2px 8px rgba(255,255,255,0.05)' 
      : '0 2px 8px rgba(0,0,0,0.08)'
  };

  const setInfoRef = (el, index) => {
    if (el && infoRefs?.current) {
      infoRefs.current[index] = el;
    }
  };

  const statusOptions = [
    { value: 'draft', label: t('contractTable.status.draft', 'Draft') },
    { value: 'pending', label: t('contractTable.status.pending', 'Pending') },
    { value: 'approved', label: t('contractTable.status.approved', 'Approved') },
    { value: 'rejected', label: t('contractTable.status.rejected', 'Rejected') },
    { value: 'expiring', label: t('contractTable.status.expiring', 'Expiring') },
    { value: 'expired', label: t('contractTable.status.expired', 'Expired') }
  ];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '1rem',
      marginBottom: '2rem'
    }}>
      {/* Title */}
      <div ref={(el) => setInfoRef(el, 0)} style={cardStyle}>
        <label style={labelStyle}>{t('contractTable.title', 'Title')}</label>
        {editMode ? (
          <input
            type="text"
            value={updated.title || ''}
            onChange={(e) => onFieldChange('title', e.target.value)}
            style={inputStyle}
          />
        ) : (
          <span style={valueStyle}>{t(contract.title_i18n, contract.title)}</span>
        )}
      </div>

      {/* Status */}
      <div ref={(el) => setInfoRef(el, 1)} style={cardStyle}>
        <label style={labelStyle}>{t('contractTable.status.label', 'Status')}</label>
        {editMode ? (
          <select
            value={updated.status || 'draft'}
            onChange={(e) => onFieldChange('status', e.target.value)}
            style={inputStyle}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <StatusBadge status={contract.status} size="md" />
        )}
      </div>

      {/* Version */}
      <div ref={(el) => setInfoRef(el, 2)} style={cardStyle}>
        <label style={labelStyle}>{t('contractTable.version', 'Version')}</label>
        {editMode ? (
          <input
            type="text"
            value={updated.version || ''}
            onChange={(e) => onFieldChange('version', e.target.value)}
            style={inputStyle}
          />
        ) : (
          <span style={valueStyle}>{contract.version || '-'}</span>
        )}
      </div>

      {/* Author */}
      <div ref={(el) => setInfoRef(el, 3)} style={cardStyle}>
        <label style={labelStyle}>{t('contractTable.author', 'Author')}</label>
        {editMode ? (
          <input
            type="text"
            value={updated.author || ''}
            onChange={(e) => onFieldChange('author', e.target.value)}
            style={inputStyle}
          />
        ) : (
          <span style={valueStyle}>{contract.author || '-'}</span>
        )}
      </div>

      {/* Expiry Date */}
      <div ref={(el) => setInfoRef(el, 4)} style={cardStyle}>
        <label style={labelStyle}>{t('contractTable.expiry', 'Expiry Date')}</label>
        {editMode ? (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              ref={dateInputRef}
              type="date"
              value={updated.expiry_date?.split('T')[0] || ''}
              onChange={(e) => onFieldChange('expiry_date', e.target.value)}
              style={{
                ...inputStyle,
                paddingRight: '2.5rem',
                /* Hide native calendar icon */
                WebkitAppearance: 'none',
                MozAppearance: 'textfield'
              }}
            />
            <Calendar 
              size={18} 
              style={{ 
                position: 'absolute', 
                right: '0.75rem', 
                pointerEvents: 'none',
                color: 'var(--text)',
                opacity: 0.6
              }} 
            />
            <style>{`
              input[type="date"]::-webkit-calendar-picker-indicator {
                opacity: 0;
                position: absolute;
                right: 0;
                width: 100%;
                height: 100%;
                cursor: pointer;
              }
            `}</style>
          </div>
        ) : (
          <span style={valueStyle}>
            {contract.expiry_date 
              ? new Date(contract.expiry_date).toLocaleDateString() 
              : '-'}
          </span>
        )}
      </div>

      {/* Last Updated */}
      <div ref={(el) => setInfoRef(el, 5)} style={cardStyle}>
        <label style={labelStyle}>{t('contractTable.updated', 'Last Updated')}</label>
        <span style={valueStyle}>
          {contract.updated_at 
            ? new Date(contract.updated_at).toLocaleString() 
            : '-'}
        </span>
      </div>
    </div>
  );
};

export default ContractInfo;
