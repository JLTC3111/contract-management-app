import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, Clock, AlertCircle, ChevronRight, ChevronDown, 
  Plus, Trash2, GripVertical, Calendar, User, MessageSquare,
  Play, CheckCheck, RotateCcw, RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getI18nOrFallback } from '../utils/formatters';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../utils/supaBaseClient';
import PhaseTimeline from './PhaseTimeline';
import toast from 'react-hot-toast';
import gsap from 'gsap';

const DEFAULT_PHASES = [
  {
    number: 1,
    nameKey: 'phaseTimeline.phase1.name',
    name: 'Tender Documents',
    descriptionKey: 'phaseTimeline.phase1.description',
    description: 'Proposal, bidding documents, and tender submissions',
    tasks: [
      { textKey: 'phaseManagement.tasks.prepareBid', text: 'Prepare bid package' },
      { textKey: 'phaseManagement.tasks.submitBid', text: 'Submit tender documents' }
    ]
  },
  {
    number: 2,
    nameKey: 'phaseTimeline.phase2.name',
    name: 'Legal Documents',
    descriptionKey: 'phaseTimeline.phase2.description',
    description: 'Decisions, assignments, and legal documentation',
    tasks: [
      { textKey: 'phaseManagement.tasks.legalApprovals', text: 'Obtain legal approvals' },
      { textKey: 'phaseManagement.tasks.assignmentDecision', text: 'Issue assignment decisions' }
    ]
  },
  {
    number: 3,
    nameKey: 'phaseTimeline.phase3.name',
    name: 'Joint Venture Documents',
    descriptionKey: 'phaseTimeline.phase3.description',
    description: 'Consortium agreements and linked documentation',
    tasks: [
      { textKey: 'phaseManagement.tasks.jvAgreement', text: 'Draft joint venture agreement' },
      { textKey: 'phaseManagement.tasks.jvSignoff', text: 'Collect partner signatures' }
    ]
  },
  {
    number: 4,
    nameKey: 'phaseTimeline.phase4.name',
    name: 'Contract & Appendices',
    descriptionKey: 'phaseTimeline.phase4.description',
    description: 'Main contract, amendments, and supplemental agreements',
    tasks: [
      { textKey: 'phaseManagement.tasks.contractDraft', text: 'Draft contract and appendices' },
      { textKey: 'phaseManagement.tasks.contractSign', text: 'Sign contract & amendments' }
    ]
  },
  {
    number: 5,
    nameKey: 'phaseTimeline.phase5.name',
    name: 'Project Group Files',
    descriptionKey: 'phaseTimeline.phase5.description',
    description: 'Project team assignments and documentation',
    tasks: [
      { textKey: 'phaseManagement.tasks.assignTeam', text: 'Assign project team' },
      { textKey: 'phaseManagement.tasks.internalDeliverables', text: 'Collect internal deliverables' }
    ]
  },
  {
    number: 6,
    nameKey: 'phaseTimeline.phase6.name',
    name: 'Owner Payment Documents',
    descriptionKey: 'phaseTimeline.phase6.description',
    description: 'Settlement proposals, invoices, and payment records',
    tasks: [
      { textKey: 'phaseManagement.tasks.paymentProposal', text: 'Submit payment proposal' },
      { textKey: 'phaseManagement.tasks.invoiceAndHandover', text: 'Issue invoices and handover' }
    ]
  }
];

const STATUS_CONFIG = {
  completed: { color: '#10b981', icon: CheckCircle, labelKey: 'phaseManagement.status.completed' },
  active: { color: '#3b82f6', icon: Clock, labelKey: 'phaseManagement.status.active' },
  pending: { color: '#6b7280', icon: Clock, labelKey: 'phaseManagement.status.pending' },
  delayed: { color: '#ef4444', icon: AlertCircle, labelKey: 'phaseManagement.status.delayed' }
};

const ContractPhaseManager = ({ contractId, contract, onUpdate }) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [newTaskInputs, setNewTaskInputs] = useState({});
  const [editingTask, setEditingTask] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(null);

  // Refs for animations
  const containerRef = useRef(null);
  const phaseRefs = useRef([]);
  const progressRef = useRef(null);

  // GSAP animations
  useEffect(() => {
    if (loading || !containerRef.current) return;

    gsap.fromTo(progressRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
    );

    gsap.fromTo(phaseRefs.current.filter(Boolean),
      { x: -30, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 0.2 }
    );
  }, [loading]);

  useEffect(() => {
    if (contractId) fetchContractPhases();
  }, [contractId]);

  const fetchContractPhases = async () => {
    try {
      setLoading(true);
      
      const { data: existingPhases, error } = await supabase
        .from('contract_phases')
        .select('*')
        .eq('contract_id', contractId)
        .order('phase_number');

      if (error) throw error;

      if (existingPhases?.length > 0) {
        setPhases(existingPhases);
        // Auto-expand active phase
        const activePhase = existingPhases.find(p => p.status === 'active');
        if (activePhase) setExpandedPhases(new Set([activePhase.id]));
      } else {
        await initializeDefaultPhases();
      }
    } catch (error) {
      console.error('Error fetching contract phases:', error);
      toast.error(t('phaseManagement.errors.failedToLoad', 'Failed to load phases'));
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPhases = async () => {
    try {
      const defaultPhases = DEFAULT_PHASES.map((phaseTemplate) => ({
        contract_id: contractId,
        phase_number: phaseTemplate.number,
        name: phaseTemplate.name,
        description: phaseTemplate.description,
        status: phaseTemplate.number === 1 ? 'active' : 'pending',
        tasks: phaseTemplate.tasks.map(task => ({
          id: crypto.randomUUID(),
          text: task.text,
          completed: false,
          assigned_to: null,
          due_date: null,
          notes: '',
          created_at: new Date().toISOString()
        })),
        start_date: phaseTemplate.number === 1 ? new Date().toISOString() : null,
        end_date: null,
        progress: 0
      }));

      const { data, error } = await supabase
        .from('contract_phases')
        .insert(defaultPhases)
        .select();

      if (error) throw error;
      
      setPhases(data);
      if (data?.[0]) setExpandedPhases(new Set([data[0].id]));
      toast.success(t('phaseManagement.initialized', 'Phases initialized'));
    } catch (error) {
      console.error('Error initializing phases:', error);
      toast.error(t('phaseManagement.errors.failedToInitialize', 'Failed to initialize phases'));
    }
  };

  const updatePhase = async (phaseId, updates, showToast = true) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('contract_phases')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', phaseId);

      if (error) throw error;

      setPhases(prev => prev.map(phase => 
        phase.id === phaseId ? { ...phase, ...updates } : phase
      ));

      if (showToast) toast.success(t('phaseManagement.updated', 'Phase updated'));
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating phase:', error);
      toast.error(t('phaseManagement.errors.failedToUpdate', 'Failed to update phase'));
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskCompletion = async (phaseId, taskId) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;

    const updatedTasks = phase.tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed, completed_at: !task.completed ? new Date().toISOString() : null } : task
    );
    
    const completedCount = updatedTasks.filter(t => t.completed).length;
    const progress = Math.round((completedCount / updatedTasks.length) * 100);
    
    let newStatus = phase.status;
    let updates = { tasks: updatedTasks, progress };

    // Auto-complete phase when all tasks done
    if (progress === 100 && phase.status === 'active') {
      newStatus = 'completed';
      updates.status = 'completed';
      updates.end_date = new Date().toISOString();
      
      // Auto-activate next phase
      const nextPhase = phases.find(p => p.phase_number === phase.phase_number + 1);
      if (nextPhase?.status === 'pending') {
        await updatePhase(nextPhase.id, { status: 'active', start_date: new Date().toISOString() }, false);
      }
    }

    await updatePhase(phaseId, updates, false);
  };

  const addTask = async (phaseId) => {
    const taskText = newTaskInputs[phaseId]?.trim();
    if (!taskText) return;

    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;

    const newTask = {
      id: crypto.randomUUID(),
      text: taskText,
      completed: false,
      assigned_to: null,
      due_date: null,
      notes: '',
      custom: true,
      created_at: new Date().toISOString()
    };

    const updatedTasks = [...phase.tasks, newTask];
    const progress = Math.round((updatedTasks.filter(t => t.completed).length / updatedTasks.length) * 100);

    await updatePhase(phaseId, { tasks: updatedTasks, progress }, false);
    setNewTaskInputs(prev => ({ ...prev, [phaseId]: '' }));
    toast.success(t('phaseManagement.taskAdded', 'Task added'));
  };

  const deleteTask = async (phaseId, taskId) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;

    const updatedTasks = phase.tasks.filter(t => t.id !== taskId);
    if (updatedTasks.length === 0) {
      toast.error(t('phaseManagement.errors.atLeastOneTask', 'Phase must have at least one task'));
      return;
    }

    const progress = updatedTasks.length > 0 
      ? Math.round((updatedTasks.filter(t => t.completed).length / updatedTasks.length) * 100)
      : 0;

    await updatePhase(phaseId, { tasks: updatedTasks, progress }, false);
    toast.success(t('phaseManagement.taskDeleted', 'Task deleted'));
  };

  const updateTaskDetails = async (phaseId, taskId, updates) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;

    const updatedTasks = phase.tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );

    await updatePhase(phaseId, { tasks: updatedTasks }, false);
    setEditingTask(null);
  };

  const startPhase = async (phaseId) => {
    await updatePhase(phaseId, { status: 'active', start_date: new Date().toISOString() });
  };

  const completePhase = async (phaseId) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;

    // Mark all tasks as complete
    const updatedTasks = phase.tasks.map(t => ({ ...t, completed: true, completed_at: new Date().toISOString() }));
    
    await updatePhase(phaseId, { 
      status: 'completed', 
      end_date: new Date().toISOString(), 
      progress: 100,
      tasks: updatedTasks 
    });

    // Activate next phase
    const nextPhase = phases.find(p => p.phase_number === phase.phase_number + 1);
    if (nextPhase?.status === 'pending') {
      await updatePhase(nextPhase.id, { status: 'active', start_date: new Date().toISOString() }, false);
    }

    setShowConfirmModal(null);
  };

  const reopenPhase = async (phaseId) => {
    await updatePhase(phaseId, { status: 'active', end_date: null });
    setShowConfirmModal(null);
  };

  const togglePhaseExpand = (phaseId) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const overallProgress = phases.length > 0 
    ? Math.round(phases.reduce((acc, p) => acc + p.progress, 0) / phases.length)
    : 0;

  const activePhase = phases.find(p => p.status === 'active');
  const firstPending = phases.find(p => p.status === 'pending');
  const currentPhaseNumber = activePhase?.phase_number
    || firstPending?.phase_number
    || (phases[0]?.phase_number ?? 1);

  const cardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    marginBottom: '1rem',
    boxShadow: darkMode ? '0 2px 8px rgba(255,255,255,0.05)' : '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  };

  const buttonStyle = (color = 'var(--primary)', disabled = false) => ({
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    background: disabled ? '#9ca3af' : color,
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    transition: 'transform 0.2s, opacity 0.2s',
    opacity: disabled ? 0.6 : 1
  });

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <RefreshCw size={40} style={{ color: 'var(--text)', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text)', marginTop: '1rem' }}>{t('phaseManagement.loading', 'Loading phases...')}</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--text)', margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
            {t('phaseManagement.title', 'Contract Phase Management')}
          </h1>
          {contract?.title && (
            <p style={{ color: 'var(--text)', opacity: 0.7, margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>{getI18nOrFallback(t, contract, 'title_i18n', 'title')}</p>
          )}
        </div>
        {saving && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', opacity: 0.7 }}>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.85rem' }}>{t('common.saving', 'Saving...')}</span>
          </div>
        )}
      </div>

      {/* Overall Progress Card with timeline */}
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
        
        {/* Main progress bar */}
        <div style={{ background: darkMode ? '#374151' : '#e5e7eb', borderRadius: '8px', height: '12px', overflow: 'hidden', marginBottom: '1.5rem' }}>
          <div style={{
            background: overallProgress === 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            height: '100%',
            width: `${overallProgress}%`,
            transition: 'width 0.5s ease',
            borderRadius: '8px'
          }} />
        </div>

        {/* Timeline visualization */}
        <PhaseTimeline 
          phases={phases}
          currentPhaseNumber={currentPhaseNumber}
          compact
          onPhaseClick={(phase) => togglePhaseExpand(phase.id)}
        />
      </div>

      {/* Full timeline view for clarity */}
      <div style={{ marginBottom: '2rem' }}>
        <PhaseTimeline 
          phases={phases}
          currentPhaseNumber={currentPhaseNumber}
          onPhaseClick={(phase) => togglePhaseExpand(phase.id)}
        />
      </div>

      {/* Phase Details */}
      {phases.map((phase, index) => {
        const isExpanded = expandedPhases.has(phase.id);
        const StatusIcon = STATUS_CONFIG[phase.status]?.icon || Clock;
        const statusColor = STATUS_CONFIG[phase.status]?.color || '#6b7280';

        return (
          <div 
            key={phase.id} 
            ref={el => phaseRefs.current[index] = el}
            style={{ ...cardStyle, borderLeft: `4px solid ${statusColor}` }}
          >
            {/* Phase Header */}
            <div
              onClick={() => togglePhaseExpand(phase.id)}
              style={{
                padding: '1.25rem 1.5rem',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: isExpanded ? `${statusColor}08` : 'transparent',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <StatusIcon size={24} color={statusColor} />
                <div>
                  <h3 style={{ color: 'var(--text)', margin: 0, fontSize: 'clamp(1rem, 3vw, 1.15rem)' }}>
                    {t('phaseManagement.phase', 'Phase')} {phase.phase_number}: {phase.name}
                  </h3>
                  <p style={{ color: 'var(--text)', opacity: 0.6, margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                    {phase.description}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: statusColor, fontWeight: 'bold' }}>{phase.progress}%</span>
                {isExpanded ? <ChevronDown size={20} color="var(--text)" /> : <ChevronRight size={20} color="var(--text)" />}
              </div>
            </div>

            {/* Phase Progress Bar (always visible) */}
            <div style={{ padding: '0 1.5rem 1rem 1.5rem' }}>
              <div style={{ background: darkMode ? '#374151' : '#e5e7eb', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                <div style={{ background: statusColor, height: '100%', width: `${phase.progress}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--card-border)' }}>
                {/* Phase Dates */}
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

                {/* Tasks */}
                <h4 style={{ color: 'var(--text)', margin: '0 0 1rem 0', fontSize: '0.95rem' }}>
                  {t('phaseManagement.tasksDeliverables', 'Tasks & Deliverables')} 
                  <span style={{ opacity: 0.6, marginLeft: '0.5rem' }}>
                    ({phase.tasks.filter(t => t.completed).length}/{phase.tasks.length})
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
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTaskCompletion(phase.id, task.id)}
                        disabled={phase.status === 'pending'}
                        style={{ cursor: phase.status === 'pending' ? 'not-allowed' : 'pointer', marginTop: '0.2rem' }}
                      />
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            color: 'var(--text)',
                            textDecoration: task.completed ? 'line-through' : 'none',
                            opacity: task.completed ? 0.6 : 1
                          }}>
                            {task.text}
                          </span>
                          
                          {task.custom && (
                            <span style={{ fontSize: '0.65rem', color: '#8b5cf6', background: '#8b5cf620', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {t('phaseManagement.custom', 'Custom')}
                            </span>
                          )}
                        </div>

                        {/* Task metadata */}
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

                      {/* Delete button for custom tasks */}
                      {task.custom && phase.status !== 'completed' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTask(phase.id, task.id); }}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', opacity: 0.5, transition: 'opacity 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Task Input */}
                {phase.status !== 'completed' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input
                      type="text"
                      value={newTaskInputs[phase.id] || ''}
                      onChange={(e) => setNewTaskInputs(prev => ({ ...prev, [phase.id]: e.target.value }))}
                      placeholder={t('phaseManagement.addTask', 'Add custom task...')}
                      onKeyDown={(e) => { if (e.key === 'Enter') addTask(phase.id); }}
                      style={{
                        flex: 1,
                        padding: '0.6rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid var(--card-border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text)',
                        fontSize: '0.9rem'
                      }}
                    />
                    <button
                      onClick={() => addTask(phase.id)}
                      disabled={!newTaskInputs[phase.id]?.trim()}
                      style={buttonStyle('#3b82f6', !newTaskInputs[phase.id]?.trim())}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                )}

                {/* Phase Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
                  {phase.status === 'pending' && (
                    <button onClick={() => startPhase(phase.id)} style={buttonStyle('#3b82f6')}>
                      <Play size={16} /> {t('phaseManagement.startPhase', 'Start Phase')}
                    </button>
                  )}

                  {phase.status === 'active' && (
                    <button 
                      onClick={() => setShowConfirmModal({ type: 'complete', phaseId: phase.id })} 
                      style={buttonStyle('#10b981')}
                    >
                      <CheckCheck size={16} /> {t('phaseManagement.markComplete', 'Mark Complete')}
                    </button>
                  )}

                  {phase.status === 'completed' && (
                    <button 
                      onClick={() => setShowConfirmModal({ type: 'reopen', phaseId: phase.id })} 
                      style={buttonStyle('#f59e0b')}
                    >
                      <RotateCcw size={16} /> {t('phaseManagement.reopenPhase', 'Reopen Phase')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ color: 'var(--text)', margin: '0 0 1rem 0' }}>
              {showConfirmModal.type === 'complete' 
                ? t('phaseManagement.confirmComplete', 'Complete this phase?')
                : t('phaseManagement.confirmReopen', 'Reopen this phase?')
              }
            </h3>
            <p style={{ color: 'var(--text)', opacity: 0.7, margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>
              {showConfirmModal.type === 'complete'
                ? t('phaseManagement.completeWarning', 'All tasks will be marked as complete and the next phase will be activated.')
                : t('phaseManagement.reopenWarning', 'This will set the phase back to active status.')
              }
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowConfirmModal(null)}
                style={{ ...buttonStyle('var(--card-bg)'), color: 'var(--text)', border: '1px solid var(--card-border)' }}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button 
                onClick={() => showConfirmModal.type === 'complete' ? completePhase(showConfirmModal.phaseId) : reopenPhase(showConfirmModal.phaseId)}
                style={buttonStyle(showConfirmModal.type === 'complete' ? '#10b981' : '#f59e0b')}
              >
                {t('common.confirm', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractPhaseManager;