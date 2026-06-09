import React from 'react';
import {
  CheckCircle, Clock, ChevronRight, ChevronDown,
  Plus, Trash2, Calendar, User, Play, CheckCheck, RotateCcw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import {
  STATUS_CONFIG,
  getTaskTranslationKey,
  buttonStyle,
} from './constants';

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
  const { darkMode } = useTheme();
  const StatusIcon = STATUS_CONFIG[phase.status]?.icon || Clock;
  const statusColor = STATUS_CONFIG[phase.status]?.color || '#6b7280';

  const cardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    marginBottom: '1rem',
    boxShadow: darkMode ? '0 2px 8px rgba(255,255,255,0.05)' : '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  };

  return (
    <div
      ref={phaseRef}
      style={{ ...cardStyle, borderLeft: `4px solid ${statusColor}` }}
    >
      <div
        onClick={() => onToggleExpand(phase.id)}
        style={{
          padding: '1.25rem 1.5rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isExpanded ? `${statusColor}08` : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <StatusIcon size={24} color={statusColor} />
          <div>
            <h3 style={{ color: 'var(--text)', margin: 0, fontSize: 'clamp(1rem, 3vw, 1.15rem)' }}>
              {t('phaseManagement.phase', 'Phase')} {phase.phase_number}: {t(phase.nameKey || `phaseTimeline.phase${phase.phase_number}.name`, phase.name)}
            </h3>
            <p style={{ color: 'var(--text)', opacity: 0.6, margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
              {t(phase.descriptionKey || `phaseTimeline.phase${phase.phase_number}.description`, phase.description)}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: statusColor, fontWeight: 'bold' }}>{phase.progress}%</span>
          {isExpanded ? <ChevronDown size={20} color="var(--text)" /> : <ChevronRight size={20} color="var(--text)" />}
        </div>
      </div>

      <div style={{ padding: '0 1.5rem 1rem 1.5rem' }}>
        <div style={{ background: darkMode ? '#374151' : '#e5e7eb', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{ background: statusColor, height: '100%', width: `${phase.progress}%`, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {phase.start_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={14} color="var(--text)" style={{ opacity: 0.6 }} />
                <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                  {t('phaseManagement.started', 'Started')}: {new Date(phase.start_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {phase.end_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={14} color="#10b981" />
                <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                  {t('phaseManagement.completed', 'Completed')}: {new Date(phase.end_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <h4 style={{ color: 'var(--text)', margin: '0 0 1rem 0', fontSize: '0.95rem' }}>
            {t('phaseManagement.tasksDeliverables', 'Tasks & Deliverables')}
            <span style={{ opacity: 0.6, marginLeft: '0.5rem' }}>
              ({phase.tasks.filter((task) => task.completed).length}/{phase.tasks.length})
            </span>
          </h4>

          <div style={{ marginBottom: '1rem' }}>
            {phase.tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  background: task.completed ? '#10b98110' : 'var(--hover-bg)',
                  borderRadius: '8px',
                  border: `1px solid ${task.completed ? '#10b98130' : 'var(--card-border)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(phase.id, task.id)}
                  disabled={phase.status === 'pending'}
                  style={{ cursor: phase.status === 'pending' ? 'not-allowed' : 'pointer', marginTop: '0.2rem' }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      color: 'var(--text)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.6 : 1,
                    }}>
                      {task.textKey
                        ? t(task.textKey, task.text)
                        : (getTaskTranslationKey(task.text)
                          ? t(getTaskTranslationKey(task.text), task.text)
                          : task.text)}
                    </span>

                    {task.custom && (
                      <span style={{ fontSize: '0.65rem', color: '#8b5cf6', background: '#8b5cf620', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        {t('phaseManagement.custom', 'Custom')}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {task.due_date && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} /> {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.assigned_to && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={12} /> {task.assigned_to}
                      </span>
                    )}
                  </div>
                </div>

                {task.custom && phase.status !== 'completed' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTask(phase.id, task.id); }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', opacity: 0.5, transition: 'opacity 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.5; }}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {phase.status !== 'completed' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                value={newTaskInput || ''}
                onChange={(e) => onNewTaskInputChange(phase.id, e.target.value)}
                placeholder={t('phaseManagement.addTask', 'Add custom task...')}
                onKeyDown={(e) => { if (e.key === 'Enter') onAddTask(phase.id); }}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                }}
              />
              <button
                onClick={() => onAddTask(phase.id)}
                disabled={!newTaskInput?.trim()}
                style={buttonStyle('#3b82f6', !newTaskInput?.trim())}
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
            {phase.status === 'pending' && (
              <button onClick={() => onStartPhase(phase.id)} style={buttonStyle('#3b82f6')}>
                <Play size={16} /> {t('phaseManagement.startPhase', 'Start Phase')}
              </button>
            )}

            {phase.status === 'active' && (
              <button onClick={() => onCompletePhase(phase.id)} style={buttonStyle('#10b981')}>
                <CheckCheck size={16} /> {t('phaseManagement.markComplete', 'Mark Complete')}
              </button>
            )}

            {phase.status === 'completed' && (
              <button onClick={() => onReopenPhase(phase.id)} style={buttonStyle('#f59e0b')}>
                <RotateCcw size={16} /> {t('phaseManagement.reopenPhase', 'Reopen Phase')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhaseCard;
