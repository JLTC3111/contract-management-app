import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { phaseState } from './constants';

/**
 * The six phases as one horizontal run: a square per phase, numbered underneath,
 * joined by a line that turns accent once the phase before it is done.
 */
const PhaseStepper = ({ phases = [], onPhaseClick }) => {
  const { t } = useTranslation();
  if (phases.length === 0) return null;

  const states = phases.map(phaseState);

  return (
    <ol className="phase-stepper">
      {phases.map((phase, i) => {
        const state = states[i];
        const label = t(
          phase.nameKey || `phaseTimeline.phase${phase.phase_number}.name`,
          phase.name
        );
        return (
          <li
            key={phase.id ?? phase.phase_number}
            className={`phase-stepper__step${state === 'active' ? ' phase-stepper__step--active' : ''}`}
          >
            {/* The segment leading into this square: accent once the phase before
                it has been completed. */}
            {i > 0 && (
              <span
                className={`phase-stepper__line${states[i - 1] === 'done' ? ' phase-stepper__line--done' : ''}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`phase-stepper__square phase-stepper__square--${state}`}
              role={onPhaseClick ? 'button' : undefined}
              tabIndex={onPhaseClick ? 0 : undefined}
              title={label}
              onClick={onPhaseClick ? () => onPhaseClick(phase) : undefined}
              onKeyDown={onPhaseClick
                ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPhaseClick(phase);
                  }
                }
                : undefined}
            >
              {state === 'done' && <Check size={14} aria-hidden="true" />}
            </span>
            <span className="phase-stepper__num">{phase.phase_number}</span>
          </li>
        );
      })}
    </ol>
  );
};

export default PhaseStepper;
