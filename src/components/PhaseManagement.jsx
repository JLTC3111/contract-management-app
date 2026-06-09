import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getI18nOrFallback } from '../utils/formatters';
import { supabase } from '../utils/supaBaseClient';
import PhaseTimeline from './PhaseTimeline';
import toast from 'react-hot-toast';
import gsap from 'gsap';
import {
  DEFAULT_PHASES,
} from './phase-management/constants';
import PhaseProgressOverview from './phase-management/PhaseProgressOverview';
import PhaseCard from './phase-management/PhaseCard';
import PhaseConfirmModal from './phase-management/PhaseConfirmModal';

const PhaseManagement = ({ contractId, contract, onUpdate }) => {
  const { t } = useTranslation();
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [newTaskInputs, setNewTaskInputs] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(null);

  const containerRef = useRef(null);
  const phaseRefs = useRef([]);
  const progressRef = useRef(null);

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
        if (existingPhases.length < 6) {
          const missingPhaseNumbers = [];
          for (let i = 1; i <= 6; i += 1) {
            if (!existingPhases.find((p) => p.phase_number === i)) {
              missingPhaseNumbers.push(i);
            }
          }

          if (missingPhaseNumbers.length > 0) {
            const missingPhases = missingPhaseNumbers.map((phaseNum) => {
              const template = DEFAULT_PHASES.find((p) => p.number === phaseNum);
              return {
                contract_id: contractId,
                phase_number: phaseNum,
                name: template.name,
                description: template.description,
                status: 'pending',
                tasks: template.tasks.map((task) => ({
                  id: crypto.randomUUID(),
                  text: task.text,
                  textKey: task.textKey,
                  completed: false,
                  assigned_to: null,
                  due_date: null,
                  notes: '',
                  created_at: new Date().toISOString(),
                })),
                start_date: null,
                end_date: null,
                progress: 0,
              };
            });

            const { data: insertedPhases, error: insertError } = await supabase
              .from('contract_phases')
              .insert(missingPhases)
              .select();

            if (insertError) {
              console.error('Error adding missing phases:', insertError);
            } else {
              const allPhases = [...existingPhases, ...insertedPhases].sort((a, b) => a.phase_number - b.phase_number);
              setPhases(allPhases);
              const activePhase = allPhases.find((p) => p.status === 'active');
              if (activePhase) setExpandedPhases(new Set([activePhase.id]));
              return;
            }
          }
        }

        setPhases(existingPhases);
        const activePhase = existingPhases.find((p) => p.status === 'active');
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
        tasks: phaseTemplate.tasks.map((task) => ({
          id: crypto.randomUUID(),
          text: task.text,
          textKey: task.textKey,
          completed: false,
          assigned_to: null,
          due_date: null,
          notes: '',
          created_at: new Date().toISOString(),
        })),
        start_date: phaseTemplate.number === 1 ? new Date().toISOString() : null,
        end_date: null,
        progress: 0,
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

      setPhases((prev) => prev.map((phase) => (
        phase.id === phaseId ? { ...phase, ...updates } : phase
      )));

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
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;

    const updatedTasks = phase.tasks.map((task) => (
      task.id === taskId
        ? { ...task, completed: !task.completed, completed_at: !task.completed ? new Date().toISOString() : null }
        : task
    ));

    const completedCount = updatedTasks.filter((task) => task.completed).length;
    const progress = Math.round((completedCount / updatedTasks.length) * 100);

    let updates = { tasks: updatedTasks, progress };
    if (progress === 100 && phase.status === 'active') {
      updates = {
        ...updates,
        status: 'completed',
        end_date: new Date().toISOString(),
      };

      const nextPhase = phases.find((p) => p.phase_number === phase.phase_number + 1);
      if (nextPhase?.status === 'pending') {
        await updatePhase(nextPhase.id, { status: 'active', start_date: new Date().toISOString() }, false);
      }
    }

    await updatePhase(phaseId, updates, false);
  };

  const addTask = async (phaseId) => {
    const taskText = newTaskInputs[phaseId]?.trim();
    if (!taskText) return;

    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;

    const newTask = {
      id: crypto.randomUUID(),
      text: taskText,
      completed: false,
      assigned_to: null,
      due_date: null,
      notes: '',
      custom: true,
      created_at: new Date().toISOString(),
    };

    const updatedTasks = [...phase.tasks, newTask];
    const progress = Math.round((updatedTasks.filter((task) => task.completed).length / updatedTasks.length) * 100);

    await updatePhase(phaseId, { tasks: updatedTasks, progress }, false);
    setNewTaskInputs((prev) => ({ ...prev, [phaseId]: '' }));
    toast.success(t('phaseManagement.taskAdded', 'Task added'));
  };

  const deleteTask = async (phaseId, taskId) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;

    const updatedTasks = phase.tasks.filter((task) => task.id !== taskId);
    if (updatedTasks.length === 0) {
      toast.error(t('phaseManagement.errors.atLeastOneTask', 'Phase must have at least one task'));
      return;
    }

    const progress = Math.round((updatedTasks.filter((task) => task.completed).length / updatedTasks.length) * 100);
    await updatePhase(phaseId, { tasks: updatedTasks, progress }, false);
    toast.success(t('phaseManagement.taskDeleted', 'Task deleted'));
  };

  const startPhase = async (phaseId) => {
    await updatePhase(phaseId, { status: 'active', start_date: new Date().toISOString() });
  };

  const completePhase = async (phaseId) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;

    const updatedTasks = phase.tasks.map((task) => ({
      ...task,
      completed: true,
      completed_at: new Date().toISOString(),
    }));

    await updatePhase(phaseId, {
      status: 'completed',
      end_date: new Date().toISOString(),
      progress: 100,
      tasks: updatedTasks,
    });

    const nextPhase = phases.find((p) => p.phase_number === phase.phase_number + 1);
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
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const overallProgress = phases.length > 0
    ? Math.round(phases.reduce((acc, p) => acc + p.progress, 0) / phases.length)
    : 0;

  const activePhase = phases.find((p) => p.status === 'active');
  const firstPending = phases.find((p) => p.status === 'pending');
  const currentPhaseNumber = activePhase?.phase_number
    || firstPending?.phase_number
    || (phases[0]?.phase_number ?? 1);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--text)', margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
            {t('phaseManagement.title', 'Contract Phase Management')}
          </h1>
          {contract?.title && (
            <p style={{ color: 'var(--text)', opacity: 0.7, margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
              {getI18nOrFallback(t, contract, 'title_i18n', 'title')}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {saving && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', opacity: 0.7 }}>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.85rem' }}>{t('common.saving', 'Saving...')}</span>
            </div>
          )}
        </div>
      </div>

      <PhaseProgressOverview
        progressRef={progressRef}
        phases={phases}
        currentPhaseNumber={currentPhaseNumber}
        overallProgress={overallProgress}
        onPhaseClick={(phase) => togglePhaseExpand(phase.id)}
      />

      <div style={{ marginBottom: '2rem' }}>
        <PhaseTimeline
          phases={phases}
          currentPhaseNumber={currentPhaseNumber}
          onPhaseClick={(phase) => togglePhaseExpand(phase.id)}
        />
      </div>

      {phases.map((phase, index) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          index={index}
          phaseRef={(el) => { phaseRefs.current[index] = el; }}
          isExpanded={expandedPhases.has(phase.id)}
          onToggleExpand={togglePhaseExpand}
          onToggleTask={toggleTaskCompletion}
          onDeleteTask={deleteTask}
          onAddTask={addTask}
          newTaskInput={newTaskInputs[phase.id]}
          onNewTaskInputChange={(phaseId, value) => setNewTaskInputs((prev) => ({ ...prev, [phaseId]: value }))}
          onStartPhase={startPhase}
          onCompletePhase={(phaseId) => setShowConfirmModal({ type: 'complete', phaseId })}
          onReopenPhase={(phaseId) => setShowConfirmModal({ type: 'reopen', phaseId })}
        />
      ))}

      <PhaseConfirmModal
        modal={showConfirmModal}
        onCancel={() => setShowConfirmModal(null)}
        onConfirm={() => (
          showConfirmModal.type === 'complete'
            ? completePhase(showConfirmModal.phaseId)
            : reopenPhase(showConfirmModal.phaseId)
        )}
      />
    </div>
  );
};

export default PhaseManagement;
