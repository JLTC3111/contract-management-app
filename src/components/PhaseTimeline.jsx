import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getI18nOrFallback } from '../utils/formatters';
import { useTheme } from '../hooks/useTheme';

/**
 * PhaseTimeline - Displays a visual timeline of 6 project phases
 * Based on Vietnamese contract management workflow
 */
const PhaseTimeline = ({ 
  phases = [], 
  currentPhaseNumber = 1, 
  onPhaseClick = null,
  compact = false 
}) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();

  // Default 6 phases matching the photo
  const DEFAULT_6_PHASES = [
    {
      number: 1,
      nameKey: 'phaseTimeline.phase1.name',
      name: 'Tender Documents',
      descriptionKey: 'phaseTimeline.phase1.description',
      description: 'Proposal, bidding documents, and tender submissions'
    },
    {
      number: 2,
      nameKey: 'phaseTimeline.phase2.name',
      name: 'Legal Documents',
      descriptionKey: 'phaseTimeline.phase2.description',
      description: 'Decisions, assignments, and legal documentation'
    },
    {
      number: 3,
      nameKey: 'phaseTimeline.phase3.name',
      name: 'Joint Venture Documents',
      descriptionKey: 'phaseTimeline.phase3.description',
      description: 'Consortium agreements and linked documentation'
    },
    {
      number: 4,
      nameKey: 'phaseTimeline.phase4.name',
      name: 'Contract & Appendices',
      descriptionKey: 'phaseTimeline.phase4.description',
      description: 'Main contract, amendments, and supplemental agreements'
    },
    {
      number: 5,
      nameKey: 'phaseTimeline.phase5.name',
      name: 'Project Group Files',
      descriptionKey: 'phaseTimeline.phase5.description',
      description: 'Project team assignments and documentation'
    },
    {
      number: 6,
      nameKey: 'phaseTimeline.phase6.name',
      name: 'Owner Payment Documents',
      descriptionKey: 'phaseTimeline.phase6.description',
      description: 'Settlement proposals, invoices, and payment records'
    }
  ];

  // Map incoming phases to 6-phase model or use defaults
  const timelinePhases = phases.length >= 6 
    ? phases.slice(0, 6).map((p, idx) => ({
        ...DEFAULT_6_PHASES[idx],
        ...p,
        number: idx + 1
      }))
    : DEFAULT_6_PHASES.map((defaultPhase, idx) => {
        const existingPhase = phases.find(p => p.phase_number === idx + 1 || p.number === idx + 1);
        return existingPhase ? { ...defaultPhase, ...existingPhase } : defaultPhase;
      });

  const getPhaseStatus = (phaseNumber) => {
    const phase = phases.find(p => p.phase_number === phaseNumber || p.number === phaseNumber);
    if (phase?.status === 'completed') return 'completed';
    if (phase?.status === 'active' || phaseNumber === currentPhaseNumber) return 'active';
    if (phaseNumber < currentPhaseNumber) return 'completed';
    return 'pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return darkMode 
          ? 'bg-green-600 border-green-500 text-green-100' 
          : 'bg-green-500 border-green-600 text-white';
      case 'active':
        return darkMode 
          ? 'bg-blue-600 border-blue-500 text-blue-100' 
          : 'bg-blue-500 border-blue-600 text-white';
      default:
        return darkMode 
          ? 'bg-gray-700 border-gray-600 text-gray-400' 
          : 'bg-gray-200 border-gray-300 text-gray-600';
    }
  };

  const getConnectorColor = (fromStatus, toStatus) => {
    if (fromStatus === 'completed') {
      return darkMode ? 'bg-green-600' : 'bg-green-500';
    }
    return darkMode ? 'bg-gray-700' : 'bg-gray-300';
  };

  const renderPhaseIcon = (status) => {
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5" />;
    } else if (status === 'active') {
      return <Clock className="w-5 h-5 animate-pulse" />;
    }
    return <Circle className="w-5 h-5" />;
  };

  if (compact) {
    // Compact horizontal timeline
    return (
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex items-center justify-between min-w-[600px] px-4">
          {timelinePhases.map((phase, index) => {
            const status = getPhaseStatus(phase.number);
            const isClickable = onPhaseClick && status !== 'pending';

            return (
              <React.Fragment key={phase.number}>
                <div 
                  className={`flex flex-col items-center ${isClickable ? 'cursor-pointer group' : ''}`}
                  onClick={() => isClickable && onPhaseClick(phase)}
                >
                  {/* Phase circle */}
                  <div 
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 
                      transition-all duration-300 
                      ${getStatusColor(status)}
                      ${isClickable ? 'group-hover:scale-110 group-hover:shadow-lg' : ''}
                    `}
                  >
                    {renderPhaseIcon(status)}
                  </div>
                  {/* Phase number */}
                  <div className={`mt-1 text-xs font-semibold ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {phase.number}
                  </div>
                </div>

                {/* Connector line */}
                {index < timelinePhases.length - 1 && (
                  <div 
                    className={`flex-1 h-1 mx-2 rounded transition-all duration-300 ${
                      getConnectorColor(status, getPhaseStatus(timelinePhases[index + 1].number))
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // Full vertical/horizontal timeline
  return (
    <div className={`w-full ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
      <h3 className={`text-lg font-semibold mb-6 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
        {t('phaseTimeline.title', 'Contract Lifecycle Timeline')}
      </h3>
      
      <div className="space-y-4">
        {timelinePhases.map((phase, index) => {
          const status = getPhaseStatus(phase.number);
          const isClickable = onPhaseClick && status !== 'pending';
          const isLast = index === timelinePhases.length - 1;

          return (
            <div key={phase.number} className="relative">
              <div 
                className={`flex items-start gap-4 ${
                  isClickable ? 'cursor-pointer group' : ''
                }`}
                onClick={() => isClickable && onPhaseClick(phase)}
              >
                {/* Left side: Icon and connector */}
                <div className="flex flex-col items-center">
                  <div 
                    className={`
                      flex items-center justify-center w-12 h-12 rounded-full border-2 
                      transition-all duration-300 flex-shrink-0
                      ${getStatusColor(status)}
                      ${isClickable ? 'group-hover:scale-110 group-hover:shadow-lg' : ''}
                    `}
                  >
                    {renderPhaseIcon(status)}
                  </div>
                  
                  {/* Vertical connector line */}
                  {!isLast && (
                    <div 
                      className={`w-0.5 h-12 my-1 transition-all duration-300 ${
                        getConnectorColor(status, getPhaseStatus(timelinePhases[index + 1].number))
                      }`}
                    />
                  )}
                </div>

                {/* Right side: Phase details */}
                <div className={`flex-1 pb-4 ${isClickable ? 'group-hover:translate-x-1 transition-transform' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                      darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {t('phaseManagement.phase', 'Phase')} {phase.number}
                    </span>
                    <h4 className={`font-semibold text-base ${
                      status === 'active' 
                        ? darkMode ? 'text-blue-400' : 'text-blue-600'
                        : darkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {getI18nOrFallback(t, phase.nameKey, phase.name)}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      status === 'completed' 
                        ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                        : status === 'active'
                        ? darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                        : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {t(`phaseTimeline.status.${status}`, status)}
                    </span>
                  </div>
                  
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getI18nOrFallback(t, phase.descriptionKey, phase.description)}
                  </p>

                  {/* Progress bar if phase has progress */}
                  {phase.progress !== undefined && status !== 'pending' && (
                    <div className="mt-2">
                      <div className={`h-2 rounded-full overflow-hidden ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        <div 
                          className={`h-full transition-all duration-500 ${
                            status === 'completed' 
                              ? 'bg-green-500' 
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${phase.progress || 0}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {phase.progress || 0}% {t('phaseTimeline.complete', 'complete')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhaseTimeline;
