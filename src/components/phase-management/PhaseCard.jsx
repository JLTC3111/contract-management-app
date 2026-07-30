import {
  Calendar, Check, CheckCheck, CheckCircle, ChevronDown, ChevronRight,
  Play, Plus, RotateCcw, Trash2, User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getTaskTranslationKey, phaseState } from './constants';

/**
 * One row of the flat phase list: number, title, description and an inline bar on
 * the left; percentage and chevron on the right. The row is the control - clicking
 * it opens that phase's tasks underneath.
 */
const PhaseCard = ({
  phase,
  phaseRef,
  isExpanded,
  onToggleExpand,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  newTaskInput,
  onNewTaskInputChange,
  onStartPhase,
  onCompletePhase,
  onReopenPhase,
}) => {
  const { t } = useTranslation();
  const state = phaseState(phase);
  const progress = phase.progress ?? 0;
  const done = phase.tasks.filter((task) => task.completed).length;

  const taskText = (task) => {
    if (task.textKey) return t(task.textKey, task.text);
    const key = getTaskTranslationKey(task.text);
    return key ? t(key, task.text) : task.text;
  };

  return (
    <div ref={phaseRef} className="phase-item">
      <button
        type="button"
        className="phase-item__row"
        onClick={() => onToggleExpand(phase.id)}
        aria-expanded={isExpanded}
      >
        <span className={`phase-item__num phase-item__num--${state}`}>
          {state === 'done' ? <Check size={14} aria-hidden="true" /> : phase.phase_number}
        </span>

        <span className="phase-item__body">
          <span className="phase-item__name">
            {t('phaseManagement.phase', 'Phase')} {phase.phase_number}
            {': '}
            {t(phase.nameKey || `phaseTimeline.phase${phase.phase_number}.name`, phase.name)}
          </span>
          <span className="phase-item__desc">
            {t(
              phase.descriptionKey || `phaseTimeline.phase${phase.phase_number}.description`,
              phase.description
            )}
          </span>
          <span className="phase-bar phase-bar--slim">
            <span className="phase-bar__fill" style={{ width: `${progress}%` }} />
          </span>
        </span>

        <span className="phase-item__end">
          <span className="phase-item__pct">{progress}%</span>
          <span className="phase-item__chev">
            {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </span>
        </span>
      </button>

      {isExpanded && (
        <div className="phase-item__panel">
          {(phase.start_date || phase.end_date) && (
            <p className="phase-item__meta">
              {phase.start_date && (
                <span>
                  <Calendar size={13} aria-hidden="true" />
                  {t('phaseManagement.started', 'Started')}
                  {': '}
                  {new Date(phase.start_date).toLocaleDateString()}
                </span>
              )}
              {phase.end_date && (
                <span>
                  <CheckCircle size={13} aria-hidden="true" />
                  {t('phaseManagement.completed', 'Completed')}
                  {': '}
                  {new Date(phase.end_date).toLocaleDateString()}
                </span>
              )}
            </p>
          )}

          <h3 className="phase-item__section">
            {t('phaseManagement.tasksDeliverables', 'Tasks & deliverables')} ({done}/{phase.tasks.length})
          </h3>

          <ul className="phase-tasks">
            {phase.tasks.map((task) => (
              <li key={task.id} className={`phase-task${task.completed ? ' phase-task--done' : ''}`}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(phase.id, task.id)}
                  disabled={phase.status === 'pending'}
                  aria-label={taskText(task)}
                />
                <span className="phase-task__text">
                  {taskText(task)}
                  {task.custom && (
                    <span className="phase-task__sub">
                      <span>{t('phaseManagement.custom', 'Custom')}</span>
                    </span>
                  )}
                  {(task.due_date || task.assigned_to) && (
                    <span className="phase-task__sub">
                      {task.due_date && (
                        <span>
                          <Calendar size={12} aria-hidden="true" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {task.assigned_to && (
                        <span><User size={12} aria-hidden="true" />{task.assigned_to}</span>
                      )}
                    </span>
                  )}
                </span>
                {task.custom && phase.status !== 'completed' && (
                  <button
                    type="button"
                    className="phase-task__del"
                    onClick={() => onDeleteTask(phase.id, task.id)}
                    aria-label={t('buttons.delete', 'Delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {phase.status !== 'completed' && (
            <div className="phase-item__add">
              <input
                className="input"
                type="text"
                value={newTaskInput || ''}
                onChange={(e) => onNewTaskInputChange(phase.id, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onAddTask(phase.id); }}
                placeholder={t('phaseManagement.addCustomTask', 'Add custom task...')}
                aria-label={t('phaseManagement.addCustomTask', 'Add custom task...')}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onAddTask(phase.id)}
                disabled={!newTaskInput?.trim()}
              >
                <Plus size={15} aria-hidden="true" />
                {t('phaseManagement.addTask', 'Add task')}
              </button>
            </div>
          )}

          <div className="phase-item__actions">
            {phase.status === 'pending' && (
              <button type="button" className="btn-secondary" onClick={() => onStartPhase(phase.id)}>
                <Play size={15} aria-hidden="true" />
                {t('phaseManagement.startPhase', 'Start phase')}
              </button>
            )}
            {phase.status === 'active' && (
              <button type="button" className="btn-secondary" onClick={() => onCompletePhase(phase.id)}>
                <CheckCheck size={15} aria-hidden="true" />
                {t('phaseManagement.markComplete', 'Mark complete')}
              </button>
            )}
            {phase.status === 'completed' && (
              <button type="button" className="btn-secondary" onClick={() => onReopenPhase(phase.id)}>
                <RotateCcw size={15} aria-hidden="true" />
                {t('phaseManagement.reopenPhase', 'Reopen phase')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhaseCard;
