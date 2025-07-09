import FileUploader from '../components/FileUploader';
import toast from 'react-hot-toast';
import Approvals from '../components/Approvals';
import ExcelPreview from '../components/ExcelPreview';
import DocxPreview from '../components/DocxPreview';
import ImagePreview from '../components/ImagePreview';
import { useUser} from '../hooks/useUser';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supaBaseClient';
import { File, FileText, FileImage, ArrowLeft} from 'lucide-react'; 
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import JSZip from 'jszip';

function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const iconStyle = { marginRight: '2.5px', verticalAlign: 'middle' };
  switch (ext) {
    case 'pdf':
      return <img width="20px" height="20px" src="/img/pdf.png" style={iconStyle} />
    case 'doc':
    case 'docx':
      return <img width="20px" height="20px" src="/img/word.png" style={iconStyle} />
    case 'xls':
    case 'xlsx':
      return <img width="20px" height="20px" src="/img/excel.png" style={iconStyle} />
    case 'ppt':
    case 'pptx':
      return <img width="20px" height="20px" src="/img/powerpoint.png" style={iconStyle} />
    case 'zip':
    case 'rar':
    case '7z':
      return <img width="20px" height="20px" src="/img/zip.png" style={iconStyle} />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
    case 'webp':
    case 'tiff':
    case 'tif':
    case 'ico':
    case 'avif':
      return <img width="20px" height="20px" src="/img/image.png" style={iconStyle} />;
    case 'txt':
      return <img width="20px" height="20px" src="/img/txt.png" style={iconStyle} />;
    default:
      return <File size={20} color="#607d8b" style={iconStyle} />;
  }
}

const ContractDetail = () => {
  const { user, loading: userLoading } = useUser(); // from context
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [updated, setUpdated] = useState({});
  const canEdit = user && ['admin', 'editor'].includes(user.role);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [highlightedFiles, setHighlightedFiles] = useState([]);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const folderInputRef = useRef('');
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const [hoveredFile, setHoveredFile] = useState(null);


useEffect(() => {
    if (showFolderInput) {
      requestAnimationFrame(() => {
        if (folderInputRef.current) {
          console.log("Focusing input");
          folderInputRef.current.focus();
        } else {
          console.warn("Input not available yet!");
        }
      });
    }
  }, [showFolderInput]);

useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showFolderInput &&
        folderInputRef.current &&
        !folderInputRef.current.contains(event.target)
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
      console.log('Creating folder with name:', newFolderName);
      if (!newFolderName.trim()) {
        toast.error('Folder name cannot be empty.');
        return;
      }
      // Block slashes, allow Unicode, but replace spaces with underscores
      if (/[\\/]/.test(newFolderName)) {
        toast.error('Folder name cannot contain slashes ("/" or "\\").');
        return;
      }
      const cleanName = newFolderName
        .trim()
        .replace(/[\\/]/g, '') // Remove slashes
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .normalize('NFD').replace(/[ -\u007F]/g, function(c) {
          // ASCII chars, keep as is
          return c;
        }).replace(/[đĐ]/g, function(c) {
          // Replace Vietnamese d with ASCII d
          return c === 'đ' ? 'd' : 'D';
        })
        .replace(/[^a-zA-Z0-9_-]/g, '') // Remove all non-ASCII except _ and -
        .replace(/^\/+|\/+$/g, '');

      if (!cleanName) {
        toast.error('Folder name must contain at least one English letter or number.');
        return;
      }
      const newFolderPath = `${currentPath}/${cleanName}/.keep`;
    
      const { error } = await supabase
        .storage
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

      // ✅ Always reset input and refresh view
      setNewFolderName('');
      setShowFolderInput(false);
      listFiles(currentPath);
    };
    
  useEffect(() => {
    if (loading || !contract?.id) return;
  
    const initialPath = `uploads/${contract.id}`;
    setCurrentPath(initialPath); // This triggers the next useEffect
    setLoading(false);
  }, [contract?.id, loading]);
  
  useEffect(() => {
    if (currentPath) {
      listFiles(currentPath);
    }
    }, [currentPath]);
  
    const renderBreadcrumb = () => {
      const parts = currentPath.split('/').filter(Boolean); // remove empty strings
      if (!contract?.id) return null; // or return a loading state
      // Remove 'uploads' from the breadcrumb
      const displayParts = parts[0] === 'uploads' ? parts.slice(1) : parts;
      return (
        <div style={{marginLeft: '1rem', marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img width="25" height="25" src="https://img.icons8.com/stickers/100/folder-tree.png" alt="folder-tree"/>{''}

          {displayParts.map((part, index) => {
            const isContractId = part === String(contract.id);
            const isLast = index === displayParts.length - 1;
    
            const displayLabel = isContractId
              ? ` ${contract.title || 'Contract'}`
              : part;
    
            const pathSlice = parts.slice(0, (parts[0] === 'uploads' ? 1 : 0) + index + 1).join('/');
    
            return (
              <span key={pathSlice}>
                <span
                  style={{
                    cursor: isLast ? 'default' : 'pointer',
                    color: isLast ? 'var(--text)' : 'var(--primary)',
                    textDecoration: isLast ? 'none' : 'underline',
                    marginRight: '0.5rem',
                  }}
                  onClick={() => {
                    if (!isLast) {
                      setCurrentPath(pathSlice);
                    }
                  }}
                >
                  {displayLabel}
                </span>
                {!isLast && <span style={{ marginRight: '0.5rem' }}>/</span>}
              </span>
            );
          })}
        </div>
      );
    };
    
  const getAllPathsInFolder = async (basePath) => {
      let paths = [];
    
      const { data: items, error } = await supabase
        .storage
        .from('contracts')
        .list(basePath, { limit: 1000 });
    
      if (error) {
        console.error(`Error listing folder ${basePath}:`, error.message);
        return paths;
      }
    
      for (const item of items) {
        const fullPath = `${basePath}/${item.name}`;
        if (!item.metadata?.mimetype) {
          // It's a folder
          const subPaths = await getAllPathsInFolder(fullPath);
          paths.push(...subPaths);
          paths.push(`${fullPath}/.keep`);
        } else {
          // It's a file
          paths.push(fullPath);
        }
      }
    
      return paths;
   };
    
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
        console.log('📂 Files from:', cleanedPath, data); // helpful debug
        setFiles(data || []);
      }
    };
  
  
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
        setUpdated(data); // initialize editable state
      } else {
        console.error('Error fetching contract:', error);
      }
      setLoading(false);
    };

    fetchContract();
  }, [contractId]);

  const handleSave = async () => {
    if (actionLoading) return; // Prevent spamming
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

  const handleChange = (field, value) => {
    setUpdated((prev) => ({ ...prev, [field]: value }));
  };

  // Handle status update from Approvals component
  const handleStatusUpdate = (newStatus) => {
    setContract(prev => ({ ...prev, status: newStatus }));
  };

  // Keyboard event handlers for edit mode
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!editMode) return;
      
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSave();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setEditMode(false);
        setUpdated(contract); // Reset to original values
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editMode, contract]);

  const isPDF = updated.file_type === 'application/pdf';

  if (userLoading) return <p>Loading user...</p>;
  if (!user) return <p>User not available</p>;
  if (loading) return <p>Loading contract...</p>;
  if (!contract) return <p>Contract not found</p>;
  
  const handleDeleteItems = async (filesToDelete = []) => {
    if (!Array.isArray(filesToDelete)) {
      filesToDelete = [filesToDelete];
    }
  
    const folder = `uploads/${contract.id}`;
  
    let folders = 0;
    let filesCount = 0;
  
    // Distinguish folders vs files
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
  
          // Check if it's a folder by listing inside it
          const fileObj = files.find((f) => f.name === itemName);

          if (!fileObj || !fileObj.metadata?.mimetype) {
            // It's a folder — delete all contents recursively
            const allPaths = await getAllPathsInFolder(fullPath);
            if (allPaths.length > 0) {
              deletePaths.push(...allPaths);
            }
            // Always try to delete the .keep file
            deletePaths.push(`${fullPath}/.keep`);
          } else {
            // It's a regular file
            deletePaths.push(fullPath);
          }
        }
      } else {
        // No specific files — delete everything
        const { data: allFiles, error: listError } = await supabase
          .storage
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
  
        deletePaths = allFiles.map(f => `${folder}/${f.name}`);
      }
  
      const { error: deleteError } = await supabase
        .storage
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

      // Collect all files to download
      const filesToProcess = [];

      for (const itemName of filesToDownload) {
        const fileObj = files.find((f) => f.name === itemName);
        if (!fileObj) continue;

        const isFolder = !fileObj.metadata?.mimetype;
        
        if (isFolder) {
          // For folders, recursively get all files
          const allPaths = await getAllPathsInFolder(`${folder}/${itemName}`);
          
          for (const filePath of allPaths) {
            if (filePath.endsWith('/.keep')) continue; // Skip .keep files
            
            const fileName = filePath.split('/').pop();
            const relativePath = filePath.replace(`${folder}/`, ''); // Remove base path for zip structure
            
            filesToProcess.push({
              path: filePath,
              name: fileName,
              zipPath: relativePath,
              isFolder: false
            });
          }
        } else {
          // For individual files
          const relativePath = `${itemName}`;
          
          filesToProcess.push({
            path: `${folder}/${itemName}`,
            name: itemName,
            zipPath: relativePath,
            isFolder: false
          });
        }
      }

      // Download and add files to zip
      let processedCount = 0;
      const totalFiles = filesToProcess.length;

      for (const fileInfo of filesToProcess) {
        try {
          // Get the file data from Supabase
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('contracts')
            .download(fileInfo.path);

          if (downloadError) {
            console.error(`Error downloading ${fileInfo.name}:`, downloadError);
            continue; // Skip this file but continue with others
          }

          // Add file to zip
          zip.file(fileInfo.zipPath, fileData);
          processedCount++;

          // Update progress
          if (totalFiles > 5) { // Only show progress for larger downloads
            toast.loading(`📦 ${t('contract_detail_processing_files', { count: processedCount, total: totalFiles })}`, { id: 'download-progress' });
          }
        } catch (fileError) {
          console.error(`Error processing ${fileInfo.name}:`, fileError);
          continue; // Skip this file but continue with others
        }
      }

      if (processedCount === 0) {
        toast.error(`❌ ${t('contract_detail_no_files_downloaded')}`, { id: 'download-progress' });
        return;
      }

      // Generate zip file
      toast.loading(`📦 ${t('contract_detail_generating_zip')}`, { id: 'download-progress' });
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'icuefiles.zip';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      toast.success(`📥 ${t('contract_detail_downloaded_zip', { count: processedCount })}`, { id: 'download-progress' });
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`❌ ${t('contract_detail_failed_zip')}`, { id: 'download-progress' });
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('contract_detail_delete_contract_and_file'))) return;
  
    try {
      // First, delete the file from Supabase Storage
      const { error: fileError } = await supabase.storage
        .from('contracts') // 👈 bucket name
        .remove([contract.file_name]); // assumes file_name is the key used in upload
  
      if (fileError) {
        console.error('Error deleting file:', fileError.message);
        alert(t('contract_detail_failed_to_delete_file_from_storage'));
        return;
      }
  
      // Now delete the metadata from the contracts table
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
  

return (
    <div style={{ width: 'clamp(280px, 95vw, 800px)', margin: '0 auto', border: '1px solid var(--card-border)', padding: '1rem' }}>
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
      
      {/* Back button in top-right when NOT editing */}
      {!editMode && canEdit && (
        <div
          style={{
            gap: '10px',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '.5rem',
          }}
        >
        <button
            onClick={() => navigate(-1)}
            style={{
              padding: 'clamp(0.3rem, 2vw, 0.5rem) clamp(0.7rem, 2vw, 1rem)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin:0,
              backgroundColor: '#ddd',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={20} /> 
          </button>
          
          <button className="btn-hover-effect"
            onClick={() => {
              setNewFolderName('');
              setShowFolderInput(true);
            }}>
            📁 {t('create_folder')}
          </button>

    {showFolderInput && (
      <div
        ref={folderInputRef} // ✅ apply ref here instead of the <input>
        style={{
          marginTop: '.25rem',
          marginLeft: '.5rem',
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              await handleCreateFolder(); // 👌 Works
            }
          }}
          placeholder={t('folder_name_example')}
          style={{
            padding: '0.4rem',
            borderRadius: '6px',
            border: '1px solid #ccc',
            minWidth: '150px',
          }}
        />
        <button className="btn-hover-effect"
          type="button"
          disabled={!newFolderName.trim()}
          onClick={async () => {
            console.log("Add button clicked!");
            await handleCreateFolder();
          }}
          style={{
            backgroundColor: newFolderName.trim() ? '#3b82f6' : '#ccc',
            color: '#fff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: newFolderName.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          ➕ {t('contract_detail_add')}
        </button>
      </div>
    )}

      <button className="btn-hover-effect"
        onClick={() => handleDownloadItems(selectedFiles)}
        style={{
          backgroundColor: selectedFiles.length === 0 ? '#eee' : 'rgba(1, 82, 255, 0.8)',
          color: selectedFiles.length === 0 ? '#999' : '#fff',
          padding: '0.5rem 1rem',
          border: 'none',
          borderRadius: '6px',
          cursor: selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
          filter: selectedFiles.length === 0 ? 'blur(0.5px) grayscale(60%)' : 'none',
          opacity: selectedFiles.length === 0 ? 0.6 : 1,
          transition: 'all 0.2s ease',
          marginRight: '0.5rem',
          alignItems: 'center',
          display: 'flex',
          gap: '0.5rem',
        }}
        disabled={selectedFiles.length === 0}
      >
      <svg width="20px" height="20px" viewBox="0 0 48 48" version="1" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 48 48">
          <g fill={selectedFiles.length === 0 ? "#1565C0" : "#ffffff"}>
              <polygon points="24,37.1 13,24 35,24"/>
              <rect x="20" y="4" width="8" height="4"/>
              <rect x="20" y="10" width="8" height="4"/>
              <rect x="20" y="16" width="8" height="11"/>
              <rect x="6" y="40" width="36" height="4"/>
          </g>
      </svg> 
      {t('contract_detail_download')} ({selectedFiles.length})
      </button>
      <button className="btn-hover-effect"
        onClick={() => handleDeleteItems(selectedFiles)}
          style={{
                backgroundColor: selectedFiles.length === 0 ? '#eee' : '#ddd',
                color: selectedFiles.length === 0 ? '#999' : '#000',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
                filter: selectedFiles.length === 0 ? 'blur(0.5px) grayscale(60%)' : 'none',
                opacity: selectedFiles.length === 0 ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
              disabled={selectedFiles.length === 0}
          >
              🗑️ {t('contract_detail_delete')} ({selectedFiles.length})
      </button>
    </div>)}

      {/* Main content - Full width, aligned to far left */}
      <div style={{ 
        padding: 'clamp(1rem, 4vw, 2rem)', 
        maxWidth: '100%', 
        width: '100%',
        textAlign: 'left',
        marginLeft: '0',
        marginRight: 'auto'
      }}>
        <h2>
          {editMode ? (
            <input
              className="table-filter-input"
              type="text"
              value={updated.title}
              onChange={(e) => handleChange('title', e.target.value)}
              style={{ fontSize: 'clamp(1.1rem, 4vw, 2rem)' }}
            />
          ) : (
            <span style={{ fontSize: 'clamp(1.1rem, 3vw, 1.8rem)' }}>{contract.title}</span>
          )}
        </h2>
  
        <p>
          <strong>{t('contract_detail_status')}:</strong>{' '}
          {editMode ? (
            <select
              className="table-filter-input"
              value={updated.status}
              onChange={(e) => handleChange('status', e.target.value)}
              style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}
            >
              <option value="draft">{t('contract_detail_draft')}</option>
              <option value="pending">{t('contract_detail_pending')}</option>
              <option value="approved">{t('contract_detail_approved')}</option>
              <option value="rejected">{t('contract_detail_rejected')}</option>
              <option value="expiring">{t('contract_detail_expiring')}</option>
              <option value="expired">{t('contract_detail_expired')}</option>
            </select>
          ) : (
            contract.status
          )}
        </p>
  
        <p>
          <strong>{t('contract_detail_version')}:</strong>{' '}
          {editMode ? (
            <input
              className="table-filter-input"
              type="text"
              value={updated.version}
              onChange={(e) => handleChange('version', e.target.value)}
              style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}
            />
          ) : (
            contract.version
          )}
        </p>
  
        <p>
          <strong>{t('contract_detail_last_updated')}:</strong>{' '}
          <span style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>{new Date(contract.updated_at).toLocaleString()}</span>
        </p>
  
        <p>
          <strong>{t('contract_detail_expiry_date')}:</strong>{' '}
          {editMode ? (
            <input
              className="table-filter-input"
              type="date"
              value={updated.expiry_date ? updated.expiry_date.slice(0, 10) : ''}
              onChange={e => handleChange('expiry_date', e.target.value)}
              style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}
            />
          ) : (
            <span style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>{contract.expiry_date ? new Date(contract.expiry_date).toLocaleDateString() : '—'}</span>
          )}
        </p>
  
        <div style={{ marginTop: '1rem', textAlign: 'left' }}>
          
          <p>
          <strong>{t('contract_detail_author')}:</strong>{' '}
          {editMode ? (
            <input
              className="table-filter-input"
              type="text"
              value={updated.author}
              onChange={(e) => handleChange('author', e.target.value)}
              style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}
            />
          ) : (
            <span style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>{contract.author}</span>
          )}
        </p>
        
        {editMode && (
          <FileUploader
            contract={contract}
            currentPath={currentPath}
            align="left"
            onUploadComplete={(files) => {
              const latestFile = files?.[0];
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
              // 👇 highlight new files for 2s
              setTimeout(() => setHighlightedFiles([]), 2000);
              supabase
                .storage
                .from('contracts')
                .list(`uploads/${contract.id}`)
                .then(({ data }) => {
                  if (data?.length) {
                    const names = data.map(f => f.name);
                    setHighlightedFiles(names);
                  }
                });
            }}
          />                   
        )}

{!editMode && (
  <div>
    {renderBreadcrumb()}
    {/* Back button if not at root folder */}
    {currentPath !== `uploads/${contract.id}` && (
      <button
        onClick={() => {
          const parts = currentPath.split('/');
          parts.pop(); // Go up one level
          setCurrentPath(parts.join('/'));
        }}
        style={{
          backgroundColor: '#eee',
          border: 'none',
          padding: '0.5rem',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '1rem',
        }}
      >
        🔙 {t('contract_detail_prev_folder')}
      </button>
    )}
    
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {files.filter(file => file.name !== '.keep').map((file) => {
        const isFolder = !file.metadata?.mimetype;
        const fileName = file.name;
        const filePath = fileName; // relative to currentPath
        const isChecked = selectedFiles.includes(filePath);
        
        // ✅ Handle folder items
        if (isFolder) {
          return (
            <li
            key={fileName}
            style={{
              marginLeft: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0',
            }}>
            {/* Checkbox to select file/folder */}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFiles((prev) => [...prev, filePath]);
                  } else {
                    setSelectedFiles((prev) =>
                      prev.filter((path) => path !== filePath)
                    );
                  }
                }}
              />

              {/* Name and click-to-open if folder */}
              <span
                style={{
                  fontSize: '1.1rem',
                  cursor: isFolder ? 'pointer' : 'default',
                  color: isFolder ? darkMode ? '#fff' : '#000' : darkMode ? '#fff' : '#000',
                  textDecoration: isFolder ? 'none' : 'none',
                  fontWeight: 'normal',
                  transition: 'font-weight 0.2s ease',
                }}
                onClick={() => {
                  if (isFolder) {
                    const depth = currentPath.split('/').length - 2;
                    if (depth >= 4) {
                      toast.error('📁 Max folder depth (4) reached.');
                      return;
                    }
                    const newPath = `${currentPath}/${fileName}`;
                    setCurrentPath(newPath);
                    listFiles(newPath);
                  }
                }}
                onMouseEnter={(e) => {
                  if (isFolder) {
                    e.currentTarget.style.fontWeight = 'bold';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isFolder) {
                    e.currentTarget.style.fontWeight = 'normal';
                  }
                }}
              >
                {isFolder
                  ? <>📂 {fileName}</>
                  : <>{getFileIcon(fileName)} {fileName}</>
                }
              </span>
            </li>
            
          );
          
        }

    // 📄 File section   
    const publicUrl = supabase
        .storage
        .from('contracts')
        .getPublicUrl(`${currentPath}/${fileName}`).data.publicUrl;

        const isPdf = fileName.toLowerCase().endsWith('.pdf');
        const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
        const isDocx = fileName.toLowerCase().endsWith('.docx');
        const isPptx = fileName.toLowerCase().endsWith('.pptx') || fileName.toLowerCase().endsWith('.ppt');
        const isImage = /\.(png|jpe?g|gif|bmp|webp|svg|tiff?|ico|avif)$/i.test(fileName);
        const isArchive = /\.(zip|7z|rar)$/i.test(fileName);
        const isSelected = selectedFiles.includes(fileName);

        let hoverColor = undefined;
        let hoverStyle = {};
        
        if (isDocx) hoverColor = '#283c82'; // dark blue
        else if (isExcel) hoverColor = '#22c55e'; // green
        else if (isPptx) hoverColor = '#f59e42'; // orange
        else if (isPdf) hoverColor = '#f87171'; // light red
        else if (isImage) hoverColor = '#67e8f9'; // light cyan
        else if (isArchive) {
          // Gradient effect for archive files
          hoverStyle = {
            background: 'linear-gradient(90deg, #ef4444, #3b82f6, #f59e0b)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 2s ease-in-out infinite',
          };
        }

        const baseColor = darkMode ? '#fff' : '#000';
        const style = {
          background: 'none',
          border: 'none',
          color: hoveredFile === fileName && hoverColor ? hoverColor : baseColor,
          textDecoration: 'none',
          cursor: 'pointer',
          padding: 0,
          font: 'inherit',
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.2s',
          ...(hoveredFile === fileName && isArchive ? hoverStyle : {}),
        };

        if (isPdf) {
          return (
            <li key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <button
                onClick={() => { setPreviewUrl(publicUrl); setPreviewType('pdf'); }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {fileName}
              </button>
            </li>
          );
        } else if (isExcel) {
          return (
            <li key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <button
                onClick={() => { setPreviewUrl(publicUrl); setPreviewType('excel'); }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {fileName}
              </button>
            </li>
          );
        } else if (isDocx) {
          return (
            <li key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <button
                onClick={() => { setPreviewUrl(publicUrl); setPreviewType('docx'); }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {fileName}
              </button>
            </li>
          );
        } else if (isPptx) {
          return (
            <li key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <a
                href={publicUrl}
                download
                onClick={(e) => { if (!window.confirm(`Download "${fileName}"?`)) { e.preventDefault(); } }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {fileName}
              </a>
            </li>
          );
        } else if (isImage) {
          return (
            <li key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <button
                onClick={() => { setPreviewUrl(publicUrl); setPreviewType('image'); }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {fileName}
              </button>
            </li>
          );
        } else {
          return (
            <li key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <a
                href={publicUrl}
                download
                onClick={(e) => { if (!window.confirm(`Download "${fileName}"?`)) { e.preventDefault(); } }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {fileName}
              </a>
            </li>
          );
        }
      })}
    </ul>

    {/* PDF/Excel/DOCX Previewer */}
    {previewUrl && previewType === 'pdf' && (
      <div
        style={{
          marginRight: '5rem',
          marginTop: '2rem',
          opacity: 1,
          transition: 'opacity 0.4s ease-in-out',
        }}
      >
        <iframe
          src={previewUrl}
          title="PDF Preview"
          width="100%"
          height="600px"
          style={{ border: '1px solid #ccc', borderRadius: '8px' }}
        />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button
            onClick={() => setPreviewUrl(null)}
            style={{
              backgroundColor: darkMode ? '#fff' : '#000',
              color: darkMode ? '#000' : '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
          >
            ❌ {t('contract_detail_close_preview')}
          </button>
        </div>
      </div>
    )}
    {previewUrl && previewType === 'excel' && (
      <div style={{ marginTop: '2rem', width: '95%' }}>
        <ExcelPreview fileUrl={previewUrl} />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button
            onClick={() => setPreviewUrl(null)}
            style={{
              backgroundColor: darkMode ? '#fff' : '#000',
              color: darkMode ? '#000' : '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
          >
            ❌ {t('contract_detail_close_preview')}
          </button>
        </div>
      </div>
    )}
    {previewUrl && previewType === 'docx' && (
      <div style={{ marginTop: '2rem', width: '95%' }}>
        <DocxPreview fileUrl={previewUrl} />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button
            onClick={() => setPreviewUrl(null)}
            style={{
              backgroundColor: darkMode ? '#fff' : '#000',
              color: darkMode ? '#000' : '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
          >
            ❌ {t('contract_detail_close_preview')}
          </button>
        </div>
      </div>
    )}
    {previewUrl && previewType === 'image' && (
      <div style={{ marginTop: '2rem', width: '95%' }}>
        <ImagePreview fileUrl={previewUrl} />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button
            onClick={() => setPreviewUrl(null)}
            style={{
              backgroundColor: darkMode ? '#fff' : '#000',
              color: darkMode ? '#000' : '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
          >
            ❌ {t('contract_detail_close_preview')}
          </button>
        </div>
      </div>
    )}
  </div>
)}        </div></div>

    {/* Approvals Component for Admin/Editor */}
    {!editMode && (
          <Approvals 
            contractId={contractId} 
            contract={contract} 
            onStatusUpdate={handleStatusUpdate}
          />
        )}

{/* Admin/editor-only controls - Approvers cannot edit */}
    {['admin', 'editor'].includes(user.role) && (
        <div style={{marginLeft: '2rem', marginTop: '2rem', display: 'flex', gap: '0.5rem' }}>
          {editMode ? (
            <>
              <button
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
  );}

export default ContractDetail;
