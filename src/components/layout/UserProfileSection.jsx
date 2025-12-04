import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

/**
 * User Profile Section Component
 * Displays user email and role information in the sidebar
 */
const UserProfileSection = ({ user, collapsed, isMobile }) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();

  if (!user || isMobile || collapsed) return null;

  const roleDescriptions = {
    admin: t('sidebar.role_description.admin', 'Full access: create, edit, approve, comment and delete contracts.'),
    editor: t('sidebar.role_description.editor', 'Can create, edit and delete contracts but not approve.'),
    approver: t('sidebar.role_description.approver', 'Can review and approve contracts. No editing access.'),
    viewer: t('sidebar.role_description.viewer', 'Read-only access to all contracts.'),
  };

  return (
    <>
      {/* Email Card */}
      <div
        style={{
          border: '1px solid var(--card-border)',
          padding: '0.25rem 0.5rem',
          textAlign: 'left',
          boxShadow: darkMode
            ? '0 2px 4px rgba(255, 255, 255, 0.25)'
            : '0 2px 4px rgba(0, 0, 0, 0.25)',
          borderRadius: '12px',
          backgroundColor: 'var(--special-card-bg)',
          transition: 'box-shadow 0.3s ease-in-out'
        }}
      >
        <span
          className="text-secondary"
          style={{
            fontSize: 'clamp(0.7rem, 1.25vw, 0.9rem)',
            display: 'inline-block',
          }}
        >
          <span>{t('sidebar.logged_in_as', 'Logged in as')}</span>{' '}
          <strong>{user.email}</strong>
        </span>
      </div>

      {/* Role Card */}
      <div
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = darkMode
            ? '0 4px 12px rgba(255, 255, 255, 0.1)'
            : '0 4px 12px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
        style={{
          fontSize: '0.85rem',
          marginTop: '4rem',
          marginBottom: 'calc(1rem + 15px)',
          color: 'var(--sidebar-text)',
          textAlign: 'left',
          padding: '0.75rem',
          paddingLeft: '0.75rem',
          borderRadius: '8px',
          transition: 'box-shadow 0.3s ease-in-out',
          backgroundColor: 'var(--card-bg)',
        }}
      >
        <div>
          <strong>{t('sidebar.role', 'Role')}:</strong>{' '}
          {t(`sidebar.role_label.${user.role}`, user.role ?? 'unknown')}
        </div>
        <div
          style={{
            fontSize: '0.8rem',
            color: darkMode ? '#9ca3af' : '#64748b',
            marginTop: '0.25rem',
          }}
        >
          {roleDescriptions[user.role] || t('sidebar.role_description.unknown', 'Role not recognized.')}
        </div>
      </div>
    </>
  );
};

export default UserProfileSection;
