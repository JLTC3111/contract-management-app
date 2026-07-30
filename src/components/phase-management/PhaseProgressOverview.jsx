import { useTranslation } from 'react-i18next';

/**
 * Overall progress: the average across every phase, as one big accent number and
 * one flush bar.
 */
const PhaseProgressOverview = ({ progressRef, overallProgress = 0 }) => {
  const { t } = useTranslation();

  return (
    <section ref={progressRef} className="phase-panel">
      <div className="phase-panel__head">
        <div>
          <h2 className="phase-panel__title">
            {t('phaseManagement.overallProgress', 'Overall progress')}
          </h2>
          <p className="phase-panel__sub">
            {t('phaseManagement.trackProjectPhases', 'Track project phases and deliverables')}
          </p>
        </div>
        <span className="phase-panel__pct">{overallProgress}%</span>
      </div>

      <div
        className="phase-bar"
        role="progressbar"
        aria-valuenow={overallProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="phase-bar__fill" style={{ width: `${overallProgress}%` }} />
      </div>
    </section>
  );
};

export default PhaseProgressOverview;
