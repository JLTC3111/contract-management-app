import React from 'react';
import { useTranslation } from 'react-i18next';
import { STATUS_COLORS, getStatusColor } from '../../utils/constants';

/**
 * Reusable status badge component
 * Displays contract/phase status with consistent styling
 * 
 * @param {string} status - Status value (approved, pending, draft, etc.)
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 * @param {boolean} showDot - Whether to show a colored dot before text
 * @param {string} customLabel - Custom label (overrides translation)
 * @param {object} style - Additional inline styles
 */
const StatusBadge = ({ 
  status, 
  size = 'md', 
  showDot = false, 
  customLabel = null,
  style = {} 
}) => {
  const { t } = useTranslation();
  
  if (!status) return null;
  
  const color = getStatusColor(status);
  
  const sizes = {
    sm: { fontSize: '0.7rem', padding: '0.15rem 0.5rem' },
    md: { fontSize: '0.85rem', padding: '0.25rem 0.75rem' },
    lg: { fontSize: '0.95rem', padding: '0.35rem 1rem' }
  };
  
  const sizeStyle = sizes[size] || sizes.md;
  
  const label = customLabel || t(`contractTable.status.${status}`, status.charAt(0).toUpperCase() + status.slice(1));
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        borderRadius: '12px',
        backgroundColor: `${color}20`,
        color: color,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...sizeStyle,
        ...style
      }}
    >
      {showDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: color
          }}
        />
      )}
      {label}
    </span>
  );
};

export default StatusBadge;
