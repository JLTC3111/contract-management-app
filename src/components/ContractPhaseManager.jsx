import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, Clock, AlertCircle, FileText, Users, DollarSign,
  ChevronRight, ChevronDown, Plus, Edit3, Save, X, Calendar,
  MessageSquare, Paperclip, Download, Upload
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../utils/supaBaseClient';
import toast from 'react-hot-toast';

const CONTRACT_PHASES = {
  1: {
    name: 'Design & Planning',
    description: 'Initial drawings, client meetings, feedback collection',
    tasks: [
      'Initial client meeting',
      'Requirements gathering',
      'Preliminary drawings',
      'Client feedback session',
      'Design revisions',
      'Final design approval'
    ]
  },
  2: {
    name: 'Execution & Quality Control',
    description: 'Work completion, quality checks, reporting',
    tasks: [
      'Work commencement',
      'Progress monitoring',
      'Quality control checks',
      'Client progress updates',
      'Issue resolution',
      'Final delivery & inspection'
    ]
  },
  3: {
    name: 'Billing & Closure',
    description: 'Financial processing, documentation, lessons learned',
    tasks: [
      'Invoice generation',
      'Payment tracking',
      'Documentation compilation',
      'Client satisfaction survey',
      'Lessons learned session',
      'Contract closure'
    ]
  }
};

const ContractPhaseManager = ({ contractId, contract, onUpdate }) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [phaseComments, setPhaseComments] = useState({});

  useEffect(() => {
    fetchContractPhases();
  }, [contractId]);

  const fetchContractPhases = async () => {
    try {
      setLoading(true);
      
      // Check if phases exist for this contract
      const { data: existingPhases, error } = await supabase
        .from('contract_phases')
        .select('*')
        .eq('contract_id', contractId)
        .order('phase_number');

      if (error) throw error;

      if (existingPhases && existingPhases.length > 0) {
        setPhases(existingPhases);
      } else {
        // Initialize default phases
        await initializeDefaultPhases();
      }
    } catch (error) {
      console.error('Error fetching contract phases:', error);
      toast.error(t('Failed to load contract phases'));
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPhases = async () => {
    try {
      const defaultPhases = Object.entries(CONTRACT_PHASES).map(([phaseNumber, phaseData]) => ({
        contract_id: contractId,
        phase_number: parseInt(phaseNumber),
        name: phaseData.name,
        description: phaseData.description,
        status: phaseNumber === '1' ? 'active' : 'pending',
        tasks: phaseData.tasks.map(task => ({
          text: task,
          completed: false,
          assigned_to: null,
          due_date: null,
          notes: ''
        })),
        start_date: phaseNumber === '1' ? new Date().toISOString() : null,
        end_date: null,
        progress: 0
      }));

      const { data, error } = await supabase
        .from('contract_phases')
        .insert(defaultPhases)
        .select();

      if (error) throw error;
      setPhases(data);
    } catch (error) {
      console.error('Error initializing phases:', error);
      toast.error(t('Failed to initialize contract phases'));
    }
  };

  const updatePhaseProgress = async (phaseId, updates) => {
    try {
      const { error } = await supabase
        .from('contract_phases')
        .update(updates)
        .eq('id', phaseId);

      if (error) throw error;

      setPhases(prev => prev.map(phase => 
        phase.id === phaseId ? { ...phase, ...updates } : phase
      ));

      toast.success(t('Phase updated successfully'));
    } catch (error) {
      console.error('Error updating phase:', error);
      toast.error(t('Failed to update phase'));
    }
  };

  const toggleTaskCompletion = async (phaseId, taskIndex) => {
    const phase = phases.find(p => p.id === phaseId);
    const updatedTasks = [...phase.tasks];
    updatedTasks[taskIndex].completed = !updatedTasks[taskIndex].completed;
    
    const completedTasks = updatedTasks.filter(task => task.completed).length;
    const progress = Math.round((completedTasks / updatedTasks.length) * 100);
    
    // Auto-advance phase if all tasks completed
    let newStatus = phase.status;
    if (progress === 100 && phase.status === 'active') {
      newStatus = 'completed';
      
      // Activate next phase
      const nextPhase = phases.find(p => p.phase_number === phase.phase_number + 1);
      if (nextPhase && nextPhase.status === 'pending') {
        await updatePhaseProgress(nextPhase.id, {
          status: 'active',
          start_date: new Date().toISOString()
        });
      }
    }

    await updatePhaseProgress(phaseId, {
      tasks: updatedTasks,
      progress,
      status: newStatus,
      end_date: newStatus === 'completed' ? new Date().toISOString() : phase.end_date
    });
  };

  const addCustomTask = async (phaseId) => {
    if (!newTaskText.trim()) return;

    const phase = phases.find(p => p.id === phaseId);
    const updatedTasks = [...phase.tasks, {
      text: newTaskText.trim(),
      completed: false,
      assigned_to: null,
      due_date: null,
      notes: '',
      custom: true
    }];

    await updatePhaseProgress(phaseId, { tasks: updatedTasks });
    setNewTaskText('');
  };

  const getPhaseStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'active': return '#3b82f6';
      case 'pending': return '#6b7280';
      case 'delayed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPhaseIcon = (status, progress) => {
    if (status === 'completed') return <CheckCircle size={20} color="#10b981" />;
    if (status === 'active') return <Clock size={20} color="#3b82f6" />;
    if (status === 'delayed') return <AlertCircle size={20} color="#ef4444" />;
    return <Clock size={20} color="#6b7280" />;
  };

  const cardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    marginBottom: '1rem',
    boxShadow: darkMode 
      ? '0 2px 4px rgba(255, 255, 255, 0.1)' 
      : '0 2px 4px rgba(0, 0, 0, 0.1)'
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Clock size={32} style={{ color: 'var(--text)', opacity: 0.6 }} />
        <p style={{ color: 'var(--text)', marginTop: '1rem' }}>
          {t('Loading contract phases...')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ color: 'var(--text)', margin: 0 }}>
          {t('Contract Phase Management')}
        </h1>
        <div style={{ fontSize: '0.9rem', color: 'var(--text)', opacity: 0.8 }}>
          {contract?.title}
        </div>
      </div>

      {/* Overall Progress */}
      <div style={{
        ...cardStyle,
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>
          {t('Overall Contract Progress')}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{
              background: '#e5e7eb',
              borderRadius: '8px',
              height: '12px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                height: '100%',
                width: `${phases.reduce((acc, phase) => acc + phase.progress, 0) / phases.length}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          <span style={{ color: 'var(--text)', fontWeight: 'bold' }}>
            {Math.round(phases.reduce((acc, phase) => acc + phase.progress, 0) / phases.length)}%
          </span>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          marginTop: '1rem'
        }}>
          {phases.map(phase => (
            <div key={phase.id} style={{
              padding: '1rem',
              background: 'var(--hover-bg)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                {getPhaseIcon(phase.status, phase.progress)}
                <span style={{ marginLeft: '0.5rem', color: 'var(--text)', fontWeight: 'bold' }}>
                  {t('Phase')} {phase.phase_number}
                </span>
              </div>
              <div style={{ color: 'var(--text)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {phase.name}
              </div>
              <div style={{ 
                color: getPhaseStatusColor(phase.status), 
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                {phase.progress}% {t('Complete')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Details */}
      {phases.map(phase => (
        <div key={phase.id} style={cardStyle}>
          <div 
            style={{
              padding: '1.5rem',
              cursor: 'pointer',
              borderBottom: expandedPhase === phase.id ? '1px solid var(--card-border)' : 'none'
            }}
            onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {getPhaseIcon(phase.status, phase.progress)}
                <div>
                  <h3 style={{ color: 'var(--text)', margin: 0, fontSize: '1.1rem' }}>
                    {t('Phase')} {phase.phase_number}: {phase.name}
                  </h3>
                  <p style={{ color: 'var(--text)', opacity: 0.7, margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                    {phase.description}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  background: getPhaseStatusColor(phase.status) + '20',
                  color: getPhaseStatusColor(phase.status),
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}
                </div>
                <div style={{ color: 'var(--text)', fontWeight: 'bold' }}>
                  {phase.progress}%
                </div>
                {expandedPhase === phase.id ? 
                  <ChevronDown size={20} color="var(--text)" /> : 
                  <ChevronRight size={20} color="var(--text)" />
                }
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                background: '#e5e7eb',
                borderRadius: '6px',
                height: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: getPhaseStatusColor(phase.status),
                  height: '100%',
                  width: `${phase.progress}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedPhase === phase.id && (
            <div style={{ padding: '1.5rem' }}>
              {/* Phase Dates */}
              <div style={{ 
                display: 'flex', 
                gap: '2rem', 
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
              }}>
                {phase.start_date && (
                  <div>
                    <span style={{ color: 'var(--text)', opacity: 0.7, fontSize: '0.85rem' }}>
                      {t('Started')}: 
                    </span>
                    <span style={{ color: 'var(--text)', marginLeft: '0.5rem' }}>
                      {new Date(phase.start_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {phase.end_date && (
                  <div>
                    <span style={{ color: 'var(--text)', opacity: 0.7, fontSize: '0.85rem' }}>
                      {t('Completed')}: 
                    </span>
                    <span style={{ color: 'var(--text)', marginLeft: '0.5rem' }}>
                      {new Date(phase.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Tasks List */}
              <h4 style={{ color: 'var(--text)', marginBottom: '1rem' }}>
                {t('Tasks & Deliverables')}
              </h4>
              <div style={{ marginBottom: '1rem' }}>
                {phase.tasks.map((task, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    background: task.completed ? '#10b98110' : 'var(--hover-bg)',
                    borderRadius: '8px',
                    border: task.completed ? '1px solid #10b98130' : '1px solid var(--card-border)'
                  }}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTaskCompletion(phase.id, index)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{
                      flex: 1,
                      color: 'var(--text)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.7 : 1
                    }}>
                      {task.text}
                    </span>
                    {task.custom && (
                      <span style={{
                        fontSize: '0.7rem',
                        color: 'var(--primary-color)',
                        background: 'var(--primary-color)20',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px'
                      }}>
                        {t('Custom')}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Task */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                alignItems: 'center',
                marginTop: '1rem'
              }}>
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder={t('Add custom task...')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addCustomTask(phase.id);
                    }
                  }}
                />
                <button
                  onClick={() => addCustomTask(phase.id)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--primary-color)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Phase Actions */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--card-border)'
              }}>
                {phase.status === 'pending' && (
                  <button
                    onClick={() => updatePhaseProgress(phase.id, {
                      status: 'active',
                      start_date: new Date().toISOString()
                    })}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--primary-color)',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {t('Start Phase')}
                  </button>
                )}
                {phase.status === 'active' && phase.progress < 100 && (
                  <button
                    onClick={() => updatePhaseProgress(phase.id, {
                      status: 'completed',
                      end_date: new Date().toISOString(),
                      progress: 100
                    })}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#10b981',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {t('Mark Complete')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ContractPhaseManager;
