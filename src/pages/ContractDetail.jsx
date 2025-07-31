import FileUploader from '../components/FileUploader';
import toast from 'react-hot-toast';
import Approvals from '../components/Approvals';
import ImagePreview from '../components/ImagePreview';
import OfficeViewer from '../components/OfficeViewer';
import { useUser} from '../hooks/useUser';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supaBaseClient';
import { File, FileText, FileImage, ArrowLeft} from 'lucide-react'; 
import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';

// Ensure GSAP is properly initialized
if (typeof window !== 'undefined' && !window.gsap) {
  window.gsap = gsap;
}
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import JSZip from 'jszip';
import CommentSection from '../components/CommentSection';

// Function to extract original file name from stored name (removes timestamp prefix)
function getOriginalFileName(storedFileName) {
  // Pattern: timestamp-originalname.ext
  // Example: 2024-01-15T10-30-45-123Z-document.pdf -> document.pdf
  const match = storedFileName.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-(.+)$/);
  return match ? match[1] : storedFileName;
}

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
  const dateInputRef = useRef(null);
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const [hoveredFile, setHoveredFile] = useState(null);
  const headerRef = useRef(null);
  const infoRefs = useRef([]);
  const fileListRef = useRef(null);
  const fileItemRefs = useRef([]);


useEffect(() => {
    if (showFolderInput) {
      // Use a small delay to ensure the input is rendered
      const timer = setTimeout(() => {
        if (folderInputRef.current) {
          console.log("Focusing input");
          folderInputRef.current.focus();
          // Select all text if there's any
          folderInputRef.current.select();
        } else {
          console.warn("Input not available yet!");
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
          { opacity: 1, duration: .25, stagger: 0.15, ease: 'power2.out' }
        );
      } catch (error) {
        console.warn('GSAP animation error:', error);
      }
    }
  }, [editMode, showFolderInput, files, currentPath, contract]);

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
      
      {/* All buttons in a single row */}
      {!editMode && user && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '.5rem',
          }}
        >
          {/* Left side - Back and Download buttons */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* Back button */}
            <button className="btn-hover-preview"
              onClick={() => navigate(-1)}
              style={{
                padding: '0.25rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: 0,
                backgroundColor: darkMode ? '#fff' : 'transparent',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              }}
            >
              <ArrowLeft size={24} /> 
            </button>

            {/* Download button - next to back button (visible to admins, editors, and approver users) */}
            {['admin', 'editor', 'approver'].includes(user.role) && (
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
                  alignItems: 'center',
                  display: 'flex',
                  gap: '0.5rem',
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                }}
                disabled={selectedFiles.length === 0}
              >
                <svg width="20px" height="20px" viewBox="0 0 48 48" version="1" xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 48 48">
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
            )}
          </div>

          {/* Right side - Create Folder and Delete buttons (visible only to admins and editors) */}
          {canEdit && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '5px' }}>
              <button className="btn-hover-effect"
                onClick={() => {
                  setNewFolderName('');
                  setShowFolderInput(true);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                }}>
                📁 {t('create_folder')}
              </button>

              {showFolderInput && (
                <div
                  className="create-folder-container"
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                  }}
                >
                  <input
                    ref={folderInputRef}
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
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #ccc',
                      minWidth: '100px',
                      width: '100px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      height: 'auto',
                      lineHeight: '1.5',
                      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#ccc';
                      e.target.style.boxShadow = 'none';
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
                      backgroundColor: newFolderName.trim() ? '#c6f9ff' : '#ccc',
                      color: newFolderName.trim() ? '#000' : '#fff',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: newFolderName.trim() ? 'pointer' : 'not-allowed',
                      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 50 50" width="20px" height="20px">
                      <line style={{fill: 'none', stroke: newFolderName.trim() ? '#000000' : '#ffffff', strokeWidth: 2, strokeMiterlimit: 10}} x1="13" y1="25" x2="37" y2="25"/>
                      <line style={{fill: 'none', stroke: newFolderName.trim() ? '#000000' : '#ffffff', strokeWidth: 2, strokeMiterlimit: 10}} x1="25" y1="13" x2="25" y2="37"/>
                      <circle style={{fill: 'none', stroke: newFolderName.trim() ? '#000000' : '#ffffff', strokeWidth: 2, strokeMiterlimit: 10}} cx="25" cy="25" r="22"/>
                    </svg>
                    {t('contract_detail_add')}
                  </button>
                </div>
              )}

              <button className="btn-hover-effect"
                onClick={() => handleDeleteItems(selectedFiles)}
                style={{
                  backgroundColor: selectedFiles.length === 0 
                    ? (document.body.classList.contains('dark') ? '#374151' : '#fff')
                    : (document.body.classList.contains('dark') ? '#fcffa3' : '#fcffa3'),
                  color: selectedFiles.length === 0 
                    ? (document.body.classList.contains('dark') ? '#9ca3af' : '#999')
                    : (document.body.classList.contains('dark') ? '#000' : '#000'),
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
                  filter: selectedFiles.length === 0 ? 'blur(0.5px) grayscale(60%)' : 'none',
                  opacity: selectedFiles.length === 0 ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                disabled={selectedFiles.length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px" baseProfile="basic">
                  <linearGradient id="sYkP-pvQRBi-D-7I2ZY-za" x1="10" x2="39" y1="42.114" y2="42.114" gradientUnits="userSpaceOnUse">
                    <stop offset=".462" stopColor="#c4c4c4"/>
                    <stop offset=".546" stopColor="#cdcdcd"/>
                    <stop offset=".635" stopColor="#808991"/>
                  </linearGradient>
                  <path fill="url(#sYkP-pvQRBi-D-7I2ZY-za)" d="M39,39.64v1.416c0,0.422-0.266,0.799-0.663,0.942L27.97,45.703	c-0.629,0.225-1.314,0.233-1.949,0.024l-15.334-5.051C10.277,40.541,10,40.158,10,39.727V38.35l17,5.6L39,39.64z"/>
                  <linearGradient id="sYkP-pvQRBi-D-7I2ZY-zb" x1="6" x2="43.7" y1="24.32" y2="24.32" gradientUnits="userSpaceOnUse">
                    <stop offset=".529" stopColor="#e6e6e6" stopOpacity=".7"/>
                    <stop offset=".577" stopColor="#b5b5b5" stopOpacity=".7"/>
                  </linearGradient>
                  <polygon fill="url(#sYkP-pvQRBi-D-7I2ZY-zb)" points="27,16 6,9 10,38.35 22.18,34.22 27,35.77 39,39.64 43.7,10.4"/>
                  <linearGradient id="sYkP-pvQRBi-D-7I2ZY-zc" x1="6" x2="43.7" y1="9.645" y2="9.645" gradientUnits="userSpaceOnUse">
                    <stop offset=".4" stopColor="#b5b5b5" stopOpacity=".6"/>
                    <stop offset=".471" stopColor="#e6e6e6" stopOpacity=".5"/>
                  </linearGradient>
                  <polygon fill="url(#sYkP-pvQRBi-D-7I2ZY-zc)" points="43.7,10.4 27,16 6,9 22.18,3.29"/>
                  <linearGradient id="sYkP-pvQRBi-D-7I2ZY-zd" x1="10" x2="39" y1="39.085" y2="39.085" gradientUnits="userSpaceOnUse">
                    <stop offset=".55" stopColor="#d5d8dc"/>
                    <stop offset=".615" stopColor="#bcbcbc"/>
                  </linearGradient>
                  <polygon fill="url(#sYkP-pvQRBi-D-7I2ZY-zd)" points="39,39.64 27,43.95 10,38.35 22.18,34.22 27,35.77"/>
                  <path fill="#0471c7" d="M21.666,25.711l-2.557,0.73l2.018,4.169l1.106,0.402c0.367,0.126,0.596-0.027,0.876-0.397	c0.25-0.415,0.358-1.082,0.013-1.921l-0.025-0.077L21.666,25.711"/>
                  <path fill="#0471c7" d="M14.88,19.089c-0.571-0.208-1.234-0.217-1.602,0.271l-0.031,0.049l-1.123,1.976l2.771,2.669	l1.68-2.721l-0.709-1.447c-0.238-0.453-0.523-0.62-0.705-0.694l-0.228-0.083C14.916,19.103,14.898,19.096,14.88,19.089"/>
                  <path fill="#0471c7" d="M16.752,29.054l-3.911-1.423l-0.465,0.814L12.3,28.614c-0.077,0.262,0.004,0.587,0.216,1.065	l-0.147-0.303c0.242,0.679,0.855,1.606,1.771,2.041l0.064,0.031l2.559,0.931L16.752,29.054"/>
                  <path fill="#1594de" d="M18.708,28.559l-1.338,2.366l1.689,3.437l-0.061-1.192l1.795,0.653	c0.025,0.012,0.05,0.022,0.075,0.031c0.182,0.066,0.344,0.042,0.454-0.224l1.796-3.029c-0.003,0.004-0.007,0.008-0.01,0.013	c-0.28,0.37-0.509,0.523-0.876,0.397l-1.106-0.402l-2.344-0.853L18.708,28.559"/>
                  <path fill="#1594de" d="M15.11,19.172c-0.038-0.014-0.069-0.023-0.091-0.032l0.144,0.052	C15.143,19.185,15.126,19.178,15.11,19.172 M18.86,20.533c-0.033-0.012-0.067-0.023-0.104-0.032l-3.593-1.308	c0.182,0.075,0.467,0.242,0.705,0.694l0.709,1.447l1.217,2.484l-0.895,0.263l3.049,1.095l1.332-2.345l-0.909,0.25l-0.998-2.031	C19.279,20.826,19.143,20.636,18.86,20.533"/>
                  <path fill="#1594de" d="M13.135,23.285l-3.029-1.102l0.978,0.952l-0.797,1.386c-0.1,0.152-0.136,0.343,0.081,0.739	l2.001,4.117l0.147,0.303c-0.212-0.478-0.293-0.803-0.216-1.065c0.013-0.044,0.03-0.086,0.052-0.127l0.024-0.042l0.465-0.814	l1.035-1.812l0.984,0.939L13.135,23.285"/>
                  <path fill="#d5d8dc" d="M22.185,3.818l19.932,6.585L27,15.473L7.541,8.987L22.185,3.818 M22.18,3.29L6,9l21,7l16.7-5.6	L22.18,3.29L22.18,3.29z"/>
                </svg>
                {t('contract_detail_delete')} ({selectedFiles.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main content - Full width, aligned to far left */}
      <div style={{ 
        padding: 'clamp(1rem, 4vw, 2rem)', 
        maxWidth: '100%', 
        width: '100%',
        textAlign: 'left',
        marginLeft: '0',
        marginRight: 'auto'
      }}>
        <h2 ref={headerRef}>
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
  
        <p ref={el => infoRefs.current[0] = el}>
          <strong>{t('contract_detail_status')}:</strong>{' '}
          {editMode ? (
            <>
              <select
                className="table-filter-input"
                value={updated.status}
                onChange={(e) => handleChange('status', e.target.value)}
                style={{
                  fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                  background: updated.status === 'pending' && user.role === 'editor' ? '#e5e7eb' : undefined,
                  color: updated.status === 'pending' && user.role === 'editor' ? '#888' : undefined,
                  cursor: updated.status === 'pending' && user.role === 'editor' ? 'not-allowed' : undefined,
                  pointerEvents: updated.status === 'pending' && user.role === 'editor' ? 'none' : undefined,
                  opacity: updated.status === 'pending' && user.role === 'editor' ? 0.7 : 1,
                }}
                disabled={updated.status === 'pending' && user.role === 'editor'}
                title={updated.status === 'pending' && user.role === 'editor' ? t('status_locked_pending') : ''}
              >
                <option value="draft">{t('contract_detail_draft')}</option>
                <option value="pending">{t('contract_detail_pending')}</option>
                <option value="approved">{t('contract_detail_approved')}</option>
                <option value="rejected">{t('contract_detail_rejected')}</option>
                <option value="expiring">{t('contract_detail_expiring')}</option>
                <option value="expired">{t('contract_detail_expired')}</option>
              </select>
              {updated.status === 'pending' && user.role === 'editor' && (
                <span style={{ color: '#888', fontSize: '0.95em', marginLeft: '0.5rem' }}>
                  {t('status_locked_pending')}
                </span>
              )}
            </>
          ) : (
            contract.status
          )}
        </p>
  
        <p ref={el => infoRefs.current[1] = el}>
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
  
        <p ref={el => infoRefs.current[2] = el}>
          <strong>{t('contract_detail_last_updated')}:</strong>{' '}
          <span style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>{new Date(contract.updated_at).toLocaleString()}</span>
        </p>
  
        <div ref={el => infoRefs.current[3] = el}>
          <strong>{t('contract_detail_expiry_date')}:</strong>{' '}
          {editMode ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input
                ref={dateInputRef}
                className="table-filter-input"
                type="date"
                value={updated.expiry_date ? updated.expiry_date.slice(0, 10) : ''}
                onChange={e => handleChange('expiry_date', e.target.value)}
                style={{ 
                  fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                  paddingRight: '2.5rem',
                  background: 'transparent'
                }}
              />
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  zIndex: 1,
                  padding: '0.25rem'
                }}
                onClick={() => {
                  if (dateInputRef.current) {
                    dateInputRef.current.showPicker();
                  }
                }}
                title="Open date picker"
              >
                <svg width="23.5px" height="23.5px" viewBox="0 0 1024 1024" className="icon" version="1.1" xmlns="http://www.w3.org/2000/svg">
                  <path d="M897.9 369.2H205c-33.8 0-61.4-27.6-61.4-61.4s27.6-61.4 61.4-61.4h692.9c33.8 0 61.4 27.6 61.4 61.4s-27.6 61.4-61.4 61.4z" fill="#FFB89A" />
                  <path d="M807 171H703.3c-16.6 0-30 13.4-30 30s13.4 30 30 30H807c31.6 0 57.4 24 57.4 53.4v42.3H125.2v-42.3c0-29.5 25.7-53.4 57.4-53.4H293c16.6 0 30-13.4 30-30s-13.4-30-30-30H182.5c-64.7 0-117.4 50.9-117.4 113.4v527.7c0 62.5 52.7 113.4 117.4 113.4H807c64.7 0 117.4-50.9 117.4-113.4V284.5c0-62.6-52.7-113.5-117.4-113.5z m0 694.6H182.5c-31.6 0-57.4-24-57.4-53.4V386.8h739.2v425.4c0.1 29.5-25.7 53.4-57.3 53.4z" fill="#45484C" />
                  <path d="M447.6 217.1c-12.4-6.1-27-2.8-35.7 7.1-2.2-6.7-4-16.2-4-28.1 0-13 2.2-23 4.6-29.8 9.5 8.1 23.5 9.6 34.9 2.8 14.2-8.5 18.8-27 10.3-41.2-15.5-25.9-35.9-29.7-46.6-29.7-36.6 0-63.1 41.2-63.1 97.8s26.4 98 63 98c20.6 0 39-13.4 50.4-36.7 7.3-14.9 1.1-32.9-13.8-40.2zM635.9 218.5c-12.4-6.1-27-2.8-35.7 7.1-2.2-6.7-4-16.2-4-28.1 0-13 2.2-23 4.6-29.8 9.5 8.1 23.5 9.6 34.9 2.8 14.2-8.5 18.8-27 10.3-41.2-15.5-25.9-35.9-29.7-46.6-29.7-36.6 0-63.1 41.2-63.1 97.8s26.5 97.8 63.1 97.8c20.6 0 39-13.4 50.4-36.7 7.1-14.7 0.9-32.7-13.9-40z" fill="#45484C" />
                  <path d="M700.2 514.5H200.5c-16.6 0-30 13.4-30 30s13.4 30 30 30h499.7c16.6 0 30-13.4 30-30s-13.5-30-30-30zM668.4 689.8h-74c-16.6 0-30 13.4-30 30s13.4 30 30 30h74c16.6 0 30-13.4 30-30s-13.4-30-30-30zM479.3 689.8H200.5c-16.6 0-30 13.4-30 30s13.4 30 30 30h278.8c16.6 0 30-13.4 30-30s-13.4-30-30-30z" fill="#33CC99" />
                </svg>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>{contract.expiry_date ? new Date(contract.expiry_date).toLocaleDateString() : '—'}</span>
          )}
        </div>
  
        <div style={{ marginTop: '1rem', textAlign: 'left' }}>
          <p ref={el => infoRefs.current[4] = el}>
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
    
    <ul ref={fileListRef} style={{ listStyle: 'none', padding: 0 }}>
      {files.filter(file => file.name !== '.keep').map((file, idx) => {
        const isFolder = !file.metadata?.mimetype;
        const fileName = file.name;
        const originalFileName = getOriginalFileName(fileName);
        const filePath = fileName; // relative to currentPath
        const isChecked = selectedFiles.includes(filePath);
        
        // ✅ Handle folder items
        if (isFolder) {
          return (
            <li
              key={fileName}
              ref={el => fileItemRefs.current[idx] = el}
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
                  ? <>📂 {originalFileName}</>
                  : <>{getFileIcon(fileName)} {originalFileName}</>
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
        
        if (isDocx) {
          hoverColor = '#283c82'; // dark blue
          hoverStyle = {
            background: 'linear-gradient(90deg,rgb(255, 255, 255), #1e40af, #1d4ed8)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 2s ease-in-out infinite',
          };
        } else if (isExcel) {
          hoverColor = '#22c55e'; // green
          hoverStyle = {
            background: 'linear-gradient(90deg,rgb(221, 255, 233), #16a34a,rgb(0, 90, 42))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 2s ease-in-out infinite',
          };
        } else if (isPptx) {
          hoverColor = '#f59e42'; // orange
          hoverStyle = {
            background: 'linear-gradient(90deg,rgb(255, 234, 212), #ea580c,rgb(132, 66, 0))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 2s ease-in-out infinite',
          };
        } else if (isPdf) {
          hoverColor = '#f87171'; // light red
          hoverStyle = {
            background: 'linear-gradient(90deg,rgb(255, 198, 198), #ef4444,rgb(123, 19, 0))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 2s ease-in-out infinite',
          };
        } else if (isImage) {
          hoverColor = '#67e8f9'; // light cyan
          hoverStyle = {
            background: 'linear-gradient(90deg,rgb(188, 242, 249), #22d3ee,rgb(0, 62, 93))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 2s ease-in-out infinite',
          };
        } else if (isArchive) {
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
          ...(hoveredFile === fileName ? hoverStyle : {}),
        };

        if (isPdf) {
          return (
            <li ref={el => fileItemRefs.current[idx] = el} key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <button
                onClick={() => { setPreviewUrl(publicUrl); setPreviewType('pdf'); }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {originalFileName}
              </button>
            </li>
          );
        } else if (isExcel) {
          return (
            <li ref={el => fileItemRefs.current[idx] = el} key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <button
                onClick={() => { setPreviewUrl(publicUrl); setPreviewType('excel'); }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {originalFileName}
              </button>
            </li>
          );
        } else if (isDocx) {
          return (
            <li ref={el => fileItemRefs.current[idx] = el} key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <button
                onClick={() => { setPreviewUrl(publicUrl); setPreviewType('docx'); }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {originalFileName}
              </button>
            </li>
          );
        } else if (isPptx) {
          return (
            <li ref={el => fileItemRefs.current[idx] = el} key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <button
                onClick={() => { setPreviewUrl(publicUrl); setPreviewType('pptx'); }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {originalFileName}
              </button>
            </li>
          );
        } else if (isImage) {
          return (
            <li ref={el => fileItemRefs.current[idx] = el} key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <button
                onClick={() => { setPreviewUrl(publicUrl); setPreviewType('image'); }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {originalFileName}
              </button>
            </li>
          );
        } else {
          return (
            <li ref={el => fileItemRefs.current[idx] = el} key={fileName} style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: highlightedFiles.includes(fileName) ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))' : 'transparent', transition: 'background-color 0.6s ease', }}>
              <input type="checkbox" checked={isSelected} onChange={() => { setSelectedFiles(prev => isSelected ? prev.filter(name => name !== fileName) : [...prev, fileName]); }} />
              <a
                href={publicUrl}
                download
                onClick={(e) => { if (!window.confirm(`Download "${originalFileName}"?`)) { e.preventDefault(); } }}
                style={style}
                onMouseEnter={() => setHoveredFile(fileName)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                {getFileIcon(fileName)} {originalFileName}
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
          <button className="btn-hover-preview"
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
        <OfficeViewer 
          fileUrl={previewUrl} 
          fileType="xlsx" 
          fileName="excel-file.xlsx" 
        />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button className="btn-hover-preview"
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
        <OfficeViewer 
          fileUrl={previewUrl} 
          fileType="docx" 
          fileName="document.docx" 
        />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button className="btn-hover-preview"
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
    {previewUrl && previewType === 'pptx' && (
      <div style={{ marginTop: '2rem', width: '95%' }}>
        <OfficeViewer 
          fileUrl={previewUrl} 
          fileType="pptx" 
          fileName="presentation.pptx" 
        />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button className="btn-hover-preview"
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
          <button className="btn-hover-preview"
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
      ['admin', 'editor'].includes(user.role) && (
        <Approvals 
          contractId={contractId} 
          contract={contract} 
          onStatusUpdate={handleStatusUpdate}
        />
      )
    )}

    {/* Comments Section: Always visible for all roles */}
    {!editMode && (
      <div style={{ marginTop: '2rem' }}>
        <CommentSection contractId={contractId} />
      </div>
    )}

{/* Admin/editor-only controls - Approvers cannot edit */}
    {['admin', 'editor'].includes(user.role) && (
        <div style={{marginLeft: '2rem', marginTop: '2rem', display: 'flex', gap: '0.5rem' }}>
          {editMode ? (
            <>
              <button className="btn-hover-effect"
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
              <button className="btn-hover-effect"
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
              <button className="btn-hover-effect"
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
            <button className="btn-hover-effect"
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
