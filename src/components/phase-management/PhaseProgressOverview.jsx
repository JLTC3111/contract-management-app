import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import PhaseTimeline from '../PhaseTimeline';

const PhaseProgressOverview = ({
  progressRef,
  phases,
  currentPhaseNumber,
  overallProgress,
  onPhaseClick,
}) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();

  const cardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    marginBottom: '1rem',
    boxShadow: darkMode ? '0 2px 8px rgba(255,255,255,0.05)' : '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  };

  return (
    <div ref={progressRef} style={{ ...cardStyle, padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ color: 'var(--text)', margin: 0 }}>{t('phaseManagement.overallProgress', 'Overall Progress')}</h3>
          <p style={{ color: 'var(--text)', opacity: 0.65, margin: 0, fontSize: '0.9rem' }}>
            {t('phaseManagement.trackProjectPhases', 'Track project phases and deliverables')}
          </p>
        </div>
        <span style={{ color: overallProgress === 100 ? '#10b981' : 'var(--text)', fontWeight: 'bold', fontSize: '1.25rem' }}>
          {overallProgress}%
        </span>
      </div>

      <div style={{ background: darkMode ? '#374151' : '#e5e7eb', borderRadius: '8px', height: '12px', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{
          background: overallProgress === 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          height: '100%',
          width: `${overallProgress}%`,
          transition: 'width 0.5s ease',
          borderRadius: '8px',
        }} />
      </div>

      <PhaseTimeline
        phases={phases}
        currentPhaseNumber={currentPhaseNumber}
        compact
        onPhaseClick={onPhaseClick}
      />
    </div>
  );
};

export default PhaseProgressOverview;
