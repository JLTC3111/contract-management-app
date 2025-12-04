import { useUser } from '../hooks/useUser';
import ApprovalRequestForm from './ApprovalRequestForm';
import { useTheme } from '../hooks/useTheme';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Send, Activity} from 'lucide-react';

const Approvals = ({ contractId, contract, onStatusUpdate }) => {
  const { user } = useUser();
  const { darkMode } = useTheme();
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();
  if (!user || !['admin', 'editor'].includes(user.role)) {
    return null;
  }

  return (
    <div
      style={{
        width: '95%',
        maxWidth: '1300px',
        minWidth: 'min(90vw, 640px)',
        padding: 'clamp(1rem, 3vw, 1.5rem)',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'clamp(8px, 2vw, 16px)',
        boxShadow: hovered
          ? darkMode
            ? '0 4px 24px 0 rgba(255,255,255,0.18)'
            : '0 4px 24px 0 rgba(0,0,0,0.18)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        marginLeft: 'auto',
        marginRight: 'auto',
        marginBottom: 'clamp(1rem, 4vw, 2rem)',
        fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
        boxSizing: 'border-box',
        transition: 'box-shadow 0.3s',
        cursor: hovered ? 'pointer' : 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <h3 style={{ marginBottom: 'clamp(0.5rem, 2vw, 1rem)', color: 'var(--text)', fontSize: 'clamp(1.1rem, 3vw, 1.5rem)' }}>
        {t('ac_actions')} <Activity size={20} style={{ marginLeft: '0.5rem' }} />
      </h3>
      
      {/* Approval Request Section - Only for Editor and Admin */}
      {(user.role === 'editor' || user.role === 'admin') && (
        <ApprovalRequestForm 
          contractId={contractId} 
          contract={contract} 
          onStatusUpdate={onStatusUpdate} 
        />
      )}

      {/* Comments Section */}
    </div>
  );
};

export default Approvals;
