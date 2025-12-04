import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import gsap from 'gsap';
import JSZip from 'jszip';

import { supabase } from '../../utils/supaBaseClient';
import { useUser } from '../../hooks/useUser';
import { useTheme } from '../../hooks/useTheme';

import FileUploader from '../../components/FileUploader';
import Approvals from '../../components/Approvals';
import CommentSection from '../../components/CommentSection';

import ContractHeader from './ContractHeader';
import ContractInfo from './ContractInfo';
import FileBrowser from './FileBrowser';
import FilePreviewPanel from './FilePreviewPanel';
import { getOriginalFileName } from './fileUtils';

// Ensure GSAP is properly initialized
if (typeof window !== 'undefined' && !window.gsap) {
  window.gsap = gsap;
}

const ContractDetailPage = () => {
  const { user, loading: userLoading } = useUser();
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { darkMode } = useTheme();

  // Contract state
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [updated, setUpdated] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // File browser state
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [highlightedFiles, setHighlightedFiles] = useState([]);

  // Folder creation state
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const folderInputRef = useRef(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);

  // Animation refs
  const headerRef = useRef(null);
  const infoRefs = useRef([]);
  const fileItemRefs = useRef([]);

  // Computed values
  const canEdit = user && ['admin', 'editor'].includes(user.role);

  // ========== Data Fetching ==========

  useEffect(() => {
    const fetchContract = async () => {
      if (!contractId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', Number(contractId))
        .single();

      if (!error) {
        setContract(data);
        setUpdated(data);
      } else {
        console.error('Error fetching contract:', error);
      }
      setLoading(false);
    };

    fetchContract();
  }, [contractId]);

  // Initialize file path when contract loads
  useEffect(() => {
    if (loading || !contract?.id) return;
    const initialPath = `uploads/${contract.id}`;
    setCurrentPath(initialPath);
  }, [contract?.id, loading]);

  // List files when path changes
  useEffect(() => {
    if (currentPath) {
      listFiles(currentPath);
    }
  }, [currentPath]);

  const listFiles = async (path = currentPath) => {
    const cleanedPath = path.replace(/^\/+|\/+$/g, '');

    const { data, error } = await supabase
      .storage
      .from('contracts')
      .list(cleanedPath, { limit: 100 });

    if (error) {
      console.error('Error fetching files:', error.message);
      setFiles([]);
    } else {
      setFiles(data || []);
    }
  };

  // ========== Folder Management ==========

  useEffect(() => {
    if (showFolderInput) {
      const timer = setTimeout(() => {
        if (folderInputRef.current) {
          folderInputRef.current.focus();
          folderInputRef.current.select();
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [showFolderInput]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showFolderInput &&
        folderInputRef.current &&
        !folderInputRef.current.contains(event.target) &&
        !event.target.closest('.create-folder-container')
      ) {
        setNewFolderName('');
        setShowFolderInput(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setNewFolderName('');
        setShowFolderInput(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showFolderInput]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty.');
      return;
    }

    if (/[\\/]/.test(newFolderName)) {
      toast.error('Folder name cannot contain slashes ("/" or "\\").');
      return;
    }

    const cleanName = newFolderName
      .trim()
      .replace(/[\\/]/g, '')
      .replace(/\s+/g, '_')
      .normalize('NFD')
      .replace(/[ -\u007F]/g, (c) => c)
      .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .replace(/^\/+|\/+$/g, '');

    if (!cleanName) {
      toast.error('Folder name must contain at least one English letter or number.');
      return;
    }

    const newFolderPath = `${currentPath}/${cleanName}/.keep`;

    const { error } = await supabase.storage
      .from('contracts')
      .upload(newFolderPath, new Blob(['keep'], { type: 'text/plain' }));

    if (error) {
      if (error.message.includes('The resource already exists')) {
        toast(`⚠️ Folder "${cleanName}" already exists.`);
      } else {
        toast.error('❌ Failed to create folder.');
        console.error(error.message);
      }
    } else {
      toast.success(`📁 Folder "${cleanName}" created.`);
    }

    setNewFolderName('');
    setShowFolderInput(false);
    listFiles(currentPath);
  };

  // ========== File Operations ==========

  const getAllPathsInFolder = async (basePath) => {
    let paths = [];

    const { data: items, error } = await supabase.storage
      .from('contracts')
      .list(basePath, { limit: 1000 });

    if (error) {
      console.error(`Error listing folder ${basePath}:`, error.message);
      return paths;
    }

    for (const item of items) {
      const fullPath = `${basePath}/${item.name}`;
      if (!item.metadata?.mimetype) {
        const subPaths = await getAllPathsInFolder(fullPath);
        paths.push(...subPaths);
        paths.push(`${fullPath}/.keep`);
      } else {
        paths.push(fullPath);
      }
    }

    return paths;
  };

  const handleDeleteItems = async (filesToDelete = []) => {
    if (!Array.isArray(filesToDelete)) {
      filesToDelete = [filesToDelete];
    }

    const folder = `uploads/${contract.id}`;

    let folders = 0;
    let filesCount = 0;

    for (const itemName of filesToDelete) {
      const fileObj = files.find((f) => f.name === itemName);
      if (!fileObj || !fileObj.metadata?.mimetype) {
        folders++;
      } else {
        filesCount++;
      }
    }

    let promptMessage = '';
    if (folders > 0 && filesCount === 0) {
      promptMessage = t('contract_detail_delete_folder') + (folders > 1 ? t('contract_detail_delete_folders') : '') + '?';
    } else if (filesCount > 0 && folders === 0) {
      promptMessage = t('contract_detail_delete_file') + (filesCount > 1 ? t('contract_detail_delete_files') : '') + '?';
    } else {
      promptMessage = t('contract_detail_delete_item') + (filesToDelete.length > 1 ? t('contract_detail_delete_items') : '') + '?';
    }

    const confirmed = confirm(
      filesToDelete.length > 0
        ? promptMessage
        : t('contract_detail_delete_all_files_for_this_contract') + '?'
    );

    if (!confirmed) return;

    try {
      let deletePaths = [];

      if (filesToDelete.length > 0) {
        for (const item of filesToDelete) {
          const itemName = typeof item === 'string' ? item : item.name;
          const fullPath = `${folder}/${itemName}`;
          const fileObj = files.find((f) => f.name === itemName);

          if (!fileObj || !fileObj.metadata?.mimetype) {
            const allPaths = await getAllPathsInFolder(fullPath);
            if (allPaths.length > 0) {
              deletePaths.push(...allPaths);
            }
            deletePaths.push(`${fullPath}/.keep`);
          } else {
            deletePaths.push(fullPath);
          }
        }
      } else {
        const { data: allFiles, error: listError } = await supabase.storage
          .from('contracts')
          .list(folder, { limit: 1000 });

        if (listError) {
          console.error('Error listing all files:', listError.message);
          toast.error('❌ Failed to list files.');
          return;
        }

        if (!allFiles || allFiles.length === 0) {
          toast.error('🚫 No files found to delete.');
          return;
        }

        deletePaths = allFiles.map((f) => `${folder}/${f.name}`);
      }

      const { error: deleteError } = await supabase.storage
        .from('contracts')
        .remove(deletePaths);

      if (deleteError) {
        console.error('Deletion error:', deleteError.message);
        toast.error('❌ Failed to delete one or more items.');
      } else {
        toast.success(`🗑️ Deleted ${deletePaths.length} item(s).`);
        await listFiles(currentPath);
        setSelectedFiles([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('🚨 Something went wrong.');
      setSelectedFiles([]);
    }
  };

  const handleDownloadItems = async (filesToDownload = []) => {
    if (!Array.isArray(filesToDownload)) {
      filesToDownload = [filesToDownload];
    }

    if (filesToDownload.length === 0) {
      toast.error('No files selected for download.');
      return;
    }

    const folder = `uploads/${contract.id}`;
    const zip = new JSZip();

    try {
      toast.loading(`📦 ${t('contract_detail_creating_zip')}`, { id: 'download-progress' });

      const filesToProcess = [];

      for (const itemName of filesToDownload) {
        const fileObj = files.find((f) => f.name === itemName);
        if (!fileObj) continue;

        const isFolder = !fileObj.metadata?.mimetype;

        if (isFolder) {
          const allPaths = await getAllPathsInFolder(`${folder}/${itemName}`);

          for (const filePath of allPaths) {
            if (filePath.endsWith('/.keep')) continue;

            const fileName = filePath.split('/').pop();
            const relativePath = filePath.replace(`${folder}/`, '');

            filesToProcess.push({
              path: filePath,
              name: fileName,
              zipPath: relativePath,
              isFolder: false,
            });
          }
        } else {
          const relativePath = `${itemName}`;

          filesToProcess.push({
            path: `${folder}/${itemName}`,
            name: itemName,
            zipPath: relativePath,
            isFolder: false,
          });
        }
      }

      let processedCount = 0;
      const totalFiles = filesToProcess.length;

      for (const fileInfo of filesToProcess) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('contracts')
            .download(fileInfo.path);

          if (downloadError) {
            console.error(`Error downloading ${fileInfo.name}:`, downloadError);
            continue;
          }

          zip.file(fileInfo.zipPath, fileData);
          processedCount++;

          if (totalFiles > 5) {
            toast.loading(
              `📦 ${t('contract_detail_processing_files', { count: processedCount, total: totalFiles })}`,
              { id: 'download-progress' }
            );
          }
        } catch (fileError) {
          console.error(`Error processing ${fileInfo.name}:`, fileError);
          continue;
        }
      }

      if (processedCount === 0) {
        toast.error(`❌ ${t('contract_detail_no_files_downloaded')}`, { id: 'download-progress' });
        return;
      }

      toast.loading(`📦 ${t('contract_detail_generating_zip')}`, { id: 'download-progress' });
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'icuefiles.zip';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast.success(`📥 ${t('contract_detail_downloaded_zip', { count: processedCount })}`, {
        id: 'download-progress',
      });
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`❌ ${t('contract_detail_failed_zip')}`, { id: 'download-progress' });
    }
  };

  // ========== Contract CRUD ==========

  const handleChange = (field, value) => {
    setUpdated((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          title: updated.title?.trim(),
          version: updated.version?.trim(),
          status: updated.status,
          file_url: updated.file_url,
          file_name: updated.file_name,
          file_type: updated.file_type,
          updated_at: new Date().toISOString(),
          author: updated.author?.trim(),
          expiry_date: updated.expiry_date,
        })
        .eq('id', contract.id);

      if (error) {
        toast.error('❌ Failed to update contract.');
        console.error(error);
      } else {
        setContract(updated);
        setEditMode(false);
        toast.success('✅ Contract updated!');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('🚨 Something went wrong.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('contract_detail_delete_contract_and_file'))) return;

    try {
      const { error: fileError } = await supabase.storage
        .from('contracts')
        .remove([contract.file_name]);

      if (fileError) {
        console.error('Error deleting file:', fileError.message);
        alert(t('contract_detail_failed_to_delete_file_from_storage'));
        return;
      }

      const { error: dbError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id);

      if (dbError) {
        console.error('Error deleting contract:', dbError.message);
        alert(t('contract_detail_failed_to_delete_contract'));
        return;
      }

      alert(t('contract_detail_contract_and_file_deleted_successfully'));
      navigate('/');
    } catch (err) {
      console.error('Unexpected error during deletion:', err);
      alert(t('contract_detail_something_went_wrong'));
    }
  };

  const handleStatusUpdate = (newStatus) => {
    setContract((prev) => ({ ...prev, status: newStatus }));
  };

  // ========== Edit Mode Keyboard Handlers ==========

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!editMode) return;

      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSave();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setEditMode(false);
        setUpdated(contract);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editMode, contract]);

  // ========== Animations ==========

  useEffect(() => {
    if (!loading && contract && headerRef.current && infoRefs.current.length && gsap) {
      try {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0.5, y: 50 },
          { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }
        );
        gsap.fromTo(
          infoRefs.current,
          { opacity: 0.5, y: 50 },
          { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out', stagger: 0.05, delay: 0.05 }
        );
      } catch (error) {
        console.warn('GSAP animation error:', error);
      }
    }
  }, [loading, contract]);

  useEffect(() => {
    if (fileItemRefs.current && fileItemRefs.current.length > 0 && gsap) {
      try {
        const validRefs = fileItemRefs.current.filter(Boolean);
        if (validRefs.length > 0) {
          gsap.fromTo(
            validRefs,
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.2 }
          );
        }
      } catch (error) {
        console.warn('GSAP animation error:', error);
      }
    }
  }, [files, currentPath]);

  useEffect(() => {
    const buttons = document.querySelectorAll('.btn-hover-effect');
    if (buttons.length > 0 && gsap) {
      try {
        gsap.fromTo(
          buttons,
          { opacity: 0 },
          { opacity: 1, duration: 0.25, stagger: 0.15, ease: 'power2.out' }
        );
      } catch (error) {
        console.warn('GSAP animation error:', error);
      }
    }
  }, [editMode, showFolderInput, files, currentPath, contract]);

  // ========== Loading States ==========

  if (userLoading) return <p>Loading user...</p>;
  if (!user) return <p>User not available</p>;
  if (loading) return <p>Loading contract...</p>;
  if (!contract) return <p>Contract not found</p>;

  // ========== Render ==========

  return (
    <div
      style={{
        width: 'clamp(350px, 95vw, 800px)',
        margin: '0 auto',
        border: '1px solid var(--card-border)',
        padding: '1rem',
      }}
    >
      {/* CSS Animation for gradient effect */}
      <style>
        {`
          @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>

      {/* Header with navigation and actions */}
      <ContractHeader
        contract={contract}
        user={user}
        canEdit={canEdit}
        editMode={editMode}
        selectedFiles={selectedFiles}
        showFolderInput={showFolderInput}
        newFolderName={newFolderName}
        folderInputRef={folderInputRef}
        darkMode={darkMode}
        headerRef={headerRef}
        actionLoading={actionLoading}
        onBack={() => navigate(-1)}
        onEdit={() => setEditMode(true)}
        onSave={handleSave}
        onCancel={() => {
          setUpdated(contract);
          setEditMode(false);
        }}
        onDelete={handleDelete}
        onDownload={() => handleDownloadItems(selectedFiles)}
        onDeleteFiles={() => handleDeleteItems(selectedFiles)}
        onShowFolderInput={() => {
          setNewFolderName('');
          setShowFolderInput(true);
        }}
        onFolderNameChange={setNewFolderName}
        onCreateFolder={handleCreateFolder}
        t={t}
      />

      {/* Main content */}
      <div
        style={{
          padding: 'clamp(1rem, 4vw, 2rem)',
          maxWidth: '100%',
          width: '100%',
          textAlign: 'left',
          marginLeft: '0',
          marginRight: 'auto',
        }}
      >
        {/* Contract Info */}
        <ContractInfo
          contract={contract}
          updated={updated}
          editMode={editMode}
          user={user}
          headerRef={headerRef}
          infoRefs={infoRefs}
          onFieldChange={handleChange}
          t={t}
        />

        {/* File Uploader (edit mode only) */}
        {editMode && (
          <FileUploader
            contract={contract}
            currentPath={currentPath}
            align="left"
            onUploadComplete={(uploadedFiles) => {
              const latestFile = uploadedFiles?.[0];
              if (latestFile) {
                setUpdated((prev) => ({
                  ...prev,
                  file_url: latestFile.url,
                  file_name: latestFile.name,
                  file_type: latestFile.type,
                }));
              }
            }}
            onUploadSuccess={() => {
              listFiles(currentPath);
              setTimeout(() => setHighlightedFiles([]), 2000);
              supabase.storage
                .from('contracts')
                .list(`uploads/${contract.id}`)
                .then(({ data }) => {
                  if (data?.length) {
                    const names = data.map((f) => f.name);
                    setHighlightedFiles(names);
                  }
                });
            }}
          />
        )}

        {/* File Browser (view mode only) */}
        {!editMode && (
          <FileBrowser
            files={files}
            currentPath={currentPath}
            contract={contract}
            selectedFiles={selectedFiles}
            highlightedFiles={highlightedFiles}
            fileItemRefs={fileItemRefs}
            darkMode={darkMode}
            onPathChange={setCurrentPath}
            onFileSelect={(filePath, isSelected) => {
              setSelectedFiles((prev) =>
                isSelected ? [...prev, filePath] : prev.filter((p) => p !== filePath)
              );
            }}
            onPreview={(url, type) => {
              setPreviewUrl(url);
              setPreviewType(type);
            }}
            t={t}
          />
        )}

        {/* File Preview */}
        {!editMode && (
          <FilePreviewPanel
            previewUrl={previewUrl}
            previewType={previewType}
            onClose={() => setPreviewUrl(null)}
          />
        )}
      </div>

      {/* Approvals Component for Admin/Editor */}
      {!editMode && ['admin', 'editor'].includes(user.role) && (
        <Approvals contractId={contractId} contract={contract} onStatusUpdate={handleStatusUpdate} />
      )}

      {/* Comments Section */}
      {!editMode && (
        <div style={{ marginTop: '2rem' }}>
          <CommentSection contractId={contractId} />
        </div>
      )}

      {/* Edit Controls */}
      {['admin', 'editor'].includes(user.role) && (
        <div style={{ marginLeft: '2rem', marginTop: '2rem', display: 'flex', gap: '0.5rem' }}>
          {editMode ? (
            <>
              <button
                className="btn-hover-effect"
                onClick={handleSave}
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                💾 {t('contract_detail_save')}
              </button>
              <button
                className="btn-hover-effect"
                onClick={() => setEditMode(false)}
                style={{
                  backgroundColor: '#e5e7eb',
                  color: '#111827',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {t('contract_detail_cancel')}
              </button>
              <button
                className="btn-hover-effect"
                onClick={handleDelete}
                style={{
                  backgroundColor: '#000',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                ❌ {t('contract_detail_delete')}
              </button>
            </>
          ) : (
            <button
              className="btn-hover-effect"
              onClick={() => setEditMode(true)}
              style={{
                alignItems: 'center',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                marginLeft: '3%',
              }}
            >
              {t('contract_detail_edit')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractDetailPage;
