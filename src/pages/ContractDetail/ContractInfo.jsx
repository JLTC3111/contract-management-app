/**
 * Contract Info Section Component
 * Displays and edits contract metadata (status, client, documents pointers, etc.)
 */

import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, FileText } from 'lucide-react';
import { CONTRACT_STATUSES } from '../../utils/constants';
import { StatusBadge } from '../../components/common';
import { getI18nOrFallback, formatDateTime } from '../../utils/formatters';
import { getOriginalFileName } from './fileUtils';

const formatCurrency = (value, language) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat(language || undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Resolve a creation timestamp from contract fields / primary file path.
 * Production schema historically lacked created_at — fall back to file upload
 * timestamps embedded in storage paths, then updated_at.
 */
export const resolveContractCreatedAt = (contract) => {
  if (!contract) return null;

  const direct =
    contract.created_at ||
    contract.createdAt ||
    contract.inserted_at ||
    null;
  if (direct) return direct;

  const pathCandidates = [contract.file_name, contract.file_url, contract.file_path]
    .filter(Boolean)
    .map(String);

  for (const path of pathCandidates) {
    const match = path.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
    if (match) {
      const iso = match[1].replace(
        /^(\d{4}-\d{2}-\d{2}T)(\d{2})-(\d{2})-(\d{2})-(\d{3}Z)$/,
        '$1$2:$3:$4.$5'
      );
      const parsed = new Date(iso);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
  }

  return contract.updated_at || null;
};

const ContractInfo = ({
  contract,
  updated,
  editMode,
  onFieldChange,
  infoRefs,
  darkMode
}) => {
  const { t, i18n } = useTranslation();
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
    fontWeight: 500,
    wordBreak: 'break-word'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--card-border)',
    background: 'var(--card-bg)',
    color: 'var(--text)',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box'
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

  const statusOptions = CONTRACT_STATUSES.map(({ value, labelKey }) => ({
    value,
    label: t(labelKey),
  }));

  const display = editMode ? updated : contract;
  const description =
    getI18nOrFallback(t, display, 'description_i18n', 'description') ||
    display?.content ||
    '';
  const storedFileName = display?.file_name;
  const fileBaseName = storedFileName?.includes('/')
    ? storedFileName.split('/').pop()
    : storedFileName;
  const primaryFileName = fileBaseName
    ? getOriginalFileName(fileBaseName)
    : null;
  const formattedValue = formatCurrency(display?.contract_value, i18n.language);
  const createdAt = resolveContractCreatedAt(contract);
  const updatedAt = contract?.updated_at || null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{
        color: 'var(--text)',
        fontSize: '1.15rem',
        fontWeight: 600,
        margin: '0 0 1rem 0'
      }}>
        {t('contractDetails', 'Contract Details')}
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {/* Status */}
        <div ref={(el) => setInfoRef(el, 0)} style={cardStyle}>
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
        <div ref={(el) => setInfoRef(el, 1)} style={cardStyle}>
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
        <div ref={(el) => setInfoRef(el, 2)} style={cardStyle}>
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

        {/* Category */}
        <div ref={(el) => setInfoRef(el, 3)} style={cardStyle}>
          <label style={labelStyle}>{t('contractTable.category', 'Category')}</label>
          {editMode ? (
            <input
              type="text"
              value={updated.category || ''}
              onChange={(e) => onFieldChange('category', e.target.value)}
              style={inputStyle}
              placeholder={t('contractTable.categoryPlaceholder', 'e.g. Services')}
            />
          ) : (
            <span style={valueStyle}>{contract.category || '-'}</span>
          )}
        </div>

        {/* Client */}
        <div ref={(el) => setInfoRef(el, 4)} style={cardStyle}>
          <label style={labelStyle}>{t('contractTable.client', 'Client')}</label>
          {editMode ? (
            <input
              type="text"
              value={updated.client_name || ''}
              onChange={(e) => onFieldChange('client_name', e.target.value)}
              style={inputStyle}
            />
          ) : (
            <span style={valueStyle}>{contract.client_name || '-'}</span>
          )}
        </div>

        {/* Client Email */}
        <div ref={(el) => setInfoRef(el, 5)} style={cardStyle}>
          <label style={labelStyle}>{t('contractTable.clientEmail', 'Client Email')}</label>
          {editMode ? (
            <input
              type="email"
              value={updated.client_email || ''}
              onChange={(e) => onFieldChange('client_email', e.target.value)}
              style={inputStyle}
            />
          ) : (
            <span style={valueStyle}>{contract.client_email || '-'}</span>
          )}
        </div>

        {/* Contract Value */}
        <div ref={(el) => setInfoRef(el, 6)} style={cardStyle}>
          <label style={labelStyle}>{t('contractTable.contractValue', 'Contract Value')}</label>
          {editMode ? (
            <input
              type="number"
              min="0"
              step="1"
              value={updated.contract_value ?? ''}
              onChange={(e) => onFieldChange(
                'contract_value',
                e.target.value === '' ? null : Number(e.target.value)
              )}
              style={inputStyle}
            />
          ) : (
            <span style={valueStyle}>{formattedValue || '-'}</span>
          )}
        </div>

        {/* Expiry Date */}
        <div ref={(el) => setInfoRef(el, 7)} style={cardStyle}>
          <label style={labelStyle}>{t('contractTable.expiry', 'Expiry Date')}</label>
          {editMode ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                ref={dateInputRef}
                type="date"
                value={(updated.expiry_date || updated.expiration_date)?.split?.('T')?.[0] || ''}
                onChange={(e) => onFieldChange('expiry_date', e.target.value)}
                style={{
                  ...inputStyle,
                  paddingRight: '2.5rem',
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
              {(contract.expiry_date || contract.expiration_date)
                ? new Date(contract.expiry_date || contract.expiration_date).toLocaleDateString(i18n.language)
                : '-'}
            </span>
          )}
        </div>

        {/* Created */}
        <div ref={(el) => setInfoRef(el, 8)} style={cardStyle}>
          <label style={labelStyle}>{t('contractTable.created', 'Created')}</label>
          <span style={valueStyle}>
            {createdAt ? formatDateTime(createdAt, i18n.language) : '-'}
          </span>
        </div>

        {/* Last Updated */}
        <div ref={(el) => setInfoRef(el, 9)} style={cardStyle}>
          <label style={labelStyle}>{t('contractTable.updated', 'Last Updated')}</label>
          <span style={valueStyle}>
            {updatedAt ? formatDateTime(updatedAt, i18n.language) : '-'}
          </span>
        </div>

        {/* Primary document */}
        <div ref={(el) => setInfoRef(el, 10)} style={cardStyle}>
          <label style={labelStyle}>{t('contractTable.primaryDocument', 'Primary Document')}</label>
          <span style={{ ...valueStyle, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            {primaryFileName ? (
              <>
                <FileText size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
                {primaryFileName}
              </>
            ) : (
              t('contractTable.noPrimaryDocument', 'No primary document set')
            )}
          </span>
        </div>
      </div>

      {/* Description — full width */}
      <div ref={(el) => setInfoRef(el, 11)} style={cardStyle}>
        <label style={labelStyle}>{t('contractTable.description', 'Description')}</label>
        {editMode ? (
          <textarea
            value={updated.description || updated.content || ''}
            onChange={(e) => onFieldChange('description', e.target.value)}
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: '4.5rem',
              fontFamily: 'inherit'
            }}
            placeholder={t('contractTable.descriptionPlaceholder', 'Add a short summary of this contract…')}
          />
        ) : (
          <span style={{ ...valueStyle, fontWeight: 400, whiteSpace: 'pre-wrap' }}>
            {description || '-'}
          </span>
        )}
      </div>
    </div>
  );
};

export default ContractInfo;
