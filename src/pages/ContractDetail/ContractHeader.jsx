import React from 'react';
import { ArrowLeft, Trash, Download, FolderPlus, Trash2, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ContractHeader = ({
  contract,
  editMode,
  canEdit,
  onBack,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  actionLoading,
  headerRef,
  darkMode,
  // File actions
  selectedFiles = [],
  showFolderInput,
  newFolderName,
  folderInputRef,
  onDownload,
  onDeleteFiles,
  onShowFolderInput,
  onFolderNameChange,
  onCreateFolder
}) => {
  const { t } = useTranslation();

  return (
    <div ref={headerRef} style={{ marginBottom: '2rem' }}>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="btn-hover-effect"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'none',
          border: 'none',
          color: 'var(--text)',
          cursor: 'pointer',
          marginBottom: '1rem',
          padding: '0.5rem',
          borderRadius: '8px',
          transition: 'background 0.2s'
        }}
      >
        <ArrowLeft size={22} stroke="var(--text)" />
        <span>{t('buttons.back', 'Back')}</span>
      </button>

      {/* Title and Actions Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{
          color: 'var(--text)',
          margin: 0,
          fontSize: 'clamp(1.25rem, 4vw, 2rem)',
          wordBreak: 'break-word'
        }}>
          {contract?.title || 'Untitled Contract'}
        </h1>

        {/* Contract Action Buttons */}
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {editMode ? (
              <>
                <button
                  onClick={onCancel}
                  className="btn-hover-effect"
                  disabled={actionLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                >
                  {t('buttons.cancel', 'Cancel')}
                </button>
                <button
                  onClick={onSave}
                  className="btn-hover-effect"
                  disabled={actionLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#3b82f6',
                    color: '#fff',
                    cursor: actionLoading ? 'wait' : 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {actionLoading && (
                    <span style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  )}
                  {t('buttons.save', 'Save')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onEdit}
                  className="btn-hover-effect"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#3b82f6',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {t('buttons.edit', 'Edit')}
                </button>
                <button
                  onClick={onDelete}
                  className="btn-hover-effect"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Trash size={16} />
                  {t('buttons.delete', 'Delete')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* File Actions Toolbar */}
      {!editMode && (
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* New Folder Button */}
          {canEdit && !showFolderInput && (
            <button
              onClick={onShowFolderInput}
              className="btn-hover-effect"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'var(--card-border)'}`,
                background: darkMode ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                color: darkMode ? 'var(--text)' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              <FolderPlus size={16} />
              <span>{t('contractHeader.newFolder', 'New Folder')}</span>
            </button>
          )}

          {/* Selected Files Actions */}
          {selectedFiles.length > 0 && (
            <>
              <div style={{ width: '1px', height: '24px', background: 'var(--card-border)', margin: '0 0.25rem' }} />
              
              <button
                onClick={onDownload}
                className="btn-hover-effect"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                <Download size={16} />
                <span>Download ({selectedFiles.length})</span>
              </button>

              {canEdit && (
                <button
                  onClick={onDeleteFiles}
                  className="btn-hover-effect"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete Files ({selectedFiles.length})</span>
                </button>
              )}
            </>
          )}

          {/* Folder Input */}
          {showFolderInput && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                ref={folderInputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => onFolderNameChange(e.target.value)}
                placeholder="Folder name..."
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCreateFolder();
                  if (e.key === 'Escape') onFolderNameChange(''); // Should probably have a cancel handler
                }}
              />
              <button
                onClick={onCreateFolder}
                className="btn-hover-effect"
                style={{
                  padding: '0.4rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => onFolderNameChange('')} // Hacky cancel, ideally pass a cancel handler
                className="btn-hover-effect"
                style={{
                  padding: '0.4rem',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ContractHeader;
