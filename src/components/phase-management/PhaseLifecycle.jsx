import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { phaseState, stateLabel, stateTagClass } from './constants';

/**
 * The stepper stood on its end: one node per phase down the left, each paired with
 * that phase's name, state, progress bar and caption.
 */
const PhaseLifecycle = ({ phases = [] }) => {
  const { t } = useTranslation();

  if (phases.length === 0) {
    return <p className="phase-empty">{t('phaseManagement.noOpenPhases', 'No phases yet.')}</p>;
  }

  return (
    <div className="phase-lifecycle">
      {phases.map((phase) => {
        const state = phaseState(phase);
        const progress = phase.progress ?? 0;
        return (
          <div key={phase.id ?? phase.phase_number} className="phase-lifecycle__row">
            <div className="phase-lifecycle__rail" aria-hidden="true">
              <span className={`phase-lifecycle__node phase-lifecycle__node--${state}`}>
                {state === 'done' && <Check size={11} />}
              </span>
              <span
                className={`phase-lifecycle__line${state === 'done' ? ' phase-lifecycle__line--done' : ''}`}
              />
            </div>

            <div className="phase-lifecycle__body">
              <div className="phase-lifecycle__line-row">
                <span className="phase-lifecycle__name">
                  {t('phaseManagement.phase', 'Phase')} {phase.phase_number}
                  {': '}
                  {t(
                    phase.nameKey || `phaseTimeline.phase${phase.phase_number}.name`,
                    phase.name
                  )}
                </span>
                <span className={`tag ${stateTagClass(state)}`}>{stateLabel(t, state)}</span>
              </div>

              <div className="phase-bar phase-bar--slim">
                <div className="phase-bar__fill" style={{ width: `${progress}%` }} />
              </div>

              <p className="phase-lifecycle__caption">
                {progress}% {t('phaseTimeline.percentDone', 'done')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PhaseLifecycle;
