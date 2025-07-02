import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supaBaseClient';
import FileUploader from '../components/FileUploader';
import { useUser } from '../hooks/useUser';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const ContractDetail = () => {
  const { user, loading: userLoading } = useUser(); // from context
  const { id } = useParams();
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
  const canDelete = user && ['admin', 'editor'].includes(user.role);
  const [highlightedFiles, setHighlightedFiles] = useState([]);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [currentPath, setCurrentPath] = useState('');

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
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
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
  }, [id]);

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
        })
        .eq('id', id);
  
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

  const isPDF = updated.file_type === 'application/pdf';

  if (userLoading) return <p>Loading user...</p>;
  if (!user) return <p>User not available</p>;
  if (loading) return <p>Loading contract...</p>;
  if (!contract) return <p>Contract not found</p>;
  
  const getDeleteLabel = () => {
    if (selectedFiles.length === 0) return 'Delete';
  
    let folders = 0;
    let filesCount = 0;
  
    for (const itemName of selectedFiles) {
      const fileObj = files.find((f) => f.name === itemName);
  
      if (!fileObj || !fileObj.metadata?.mimetype) {
        folders += 1;
      } else {
        filesCount += 1;
      }
    }
  
    if (folders > 0 && filesCount === 0) return `Delete Folder${folders > 1 ? 's' : ''}`;
    if (filesCount > 0 && folders === 0) return `Delete File${filesCount > 1 ? 's' : ''}`;
    return `Delete Item${selectedFiles.length > 1 ? 's' : ''}`;
  };
  
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
      promptMessage = `Delete ${folders} folder${folders > 1 ? 's' : ''}?`;
    } else if (filesCount > 0 && folders === 0) {
      promptMessage = `Delete ${filesCount} file${filesCount > 1 ? 's' : ''}?`;
    } else {
      promptMessage = `Delete ${filesToDelete.length} item${filesToDelete.length > 1 ? 's' : ''}?`;
    }
  
    const confirmed = confirm(
      filesToDelete.length > 0
        ? promptMessage
        : 'Delete all files for this contract?'
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
  

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contract and its file?')) return;
  
    try {
      // First, delete the file from Supabase Storage
      const { error: fileError } = await supabase.storage
        .from('contracts') // 👈 bucket name
        .remove([contract.file_name]); // assumes file_name is the key used in upload
  
      if (fileError) {
        console.error('Error deleting file:', fileError.message);
        alert('Failed to delete file from storage.');
        return;
      }
  
      // Now delete the metadata from the contracts table
      const { error: dbError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id);
  
      if (dbError) {
        console.error('Error deleting contract:', dbError.message);
        alert('Failed to delete contract.');
        return;
      }
  
      alert('Contract and file deleted successfully.');
      navigate('/');
    } catch (err) {
      console.error('Unexpected error during deletion:', err);
      alert('Something went wrong.');
    }
  };
  

  return (
    <div>
      {/* Back button in top-right when NOT editing */}
      {!editMode && canDelete && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '.5rem',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.5rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginRight:'2.5%',
              backgroundColor: '#ddd',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <button onClick={() => setShowFolderInput(!showFolderInput)}>
  📁 Create Folder
</button>

{showFolderInput && (
  <div style={{ marginTop: '.25rem', marginLeft: '.5rem', display: 'flex', gap: '0.5rem' }}>
    <input
      type="text"
      value={newFolderName}
      onChange={(e) => setNewFolderName(e.target.value)}
      placeholder="Folder name (e.g. specs)"
      style={{
        padding: '0.4rem',
        borderRadius: '6px',
        border: '1px solid #ccc',
        minWidth: '150px',
      }}
    />
    <button
      onClick={async () => {
        if (!newFolderName.trim()) {
          toast.error('Folder name cannot be empty.');
          return;
        }

        // 🧠 Build the folder path dynamically
        const cleanName = newFolderName.trim().replace(/^\/+|\/+$/g, '');
        const newFolderPath = `${currentPath}/${cleanName}/.keep`;

        const { error } = await supabase
          .storage
          .from('contracts')
          .upload(newFolderPath, new Blob(['keep'], { type: 'text/plain' }));

        if (error) {
          toast.error('❌ Failed to create folder.');
          console.error(error.message);
        } else {
          toast.success(`📁 Folder "${cleanName}" created.`);
          setNewFolderName('');
          setShowFolderInput(false);
          listFiles(currentPath); // refresh current folder
        }
      }}
      style={{
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
      }}
    >
      ➕ Add
    </button>
  </div>
)}

    <button 
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
            🗑️ {getDeleteLabel()} ({selectedFiles.length})
    </button>
  </div>)}

      {/* Main content */}
      <div style={{ padding: '2rem' }}>
        <h2>
          {editMode ? (
            <input
              type="text"
              value={updated.title}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          ) : (
            contract.title
          )}
        </h2>
  
        <p>
          <strong>Status:</strong>{' '}
          {editMode ? (
            <select
              value={updated.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          ) : (
            contract.status
          )}
        </p>
  
        <p>
          <strong>Version:</strong>{' '}
          {editMode ? (
            <input
              type="text"
              value={updated.version}
              onChange={(e) => handleChange('version', e.target.value)}
            />
          ) : (
            contract.version
          )}
        </p>
  
        <p>
          <strong>Last Updated:</strong>{' '}
          {new Date(contract.updated_at).toLocaleString()}
        </p>
  
        <div style={{ marginTop: '1rem' }}>
          
          <p>
          <strong>Author:</strong>{' '}
          {editMode ? (
            <input
              type="text"
              value={updated.author}
              onChange={(e) => handleChange('author', e.target.value)}
            />
          ) : (
            contract.author
          )}
        </p>
        
        {editMode && (
          <FileUploader
            contract={contract}
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
        🔙 Prev Folder
      </button>
    )}
    
    

    <ul style={{ listStyle: 'none', padding: 0 }}>
      {files.map((file) => {
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
                  cursor: isFolder ? 'pointer' : 'default',
                  color: isFolder ? '#1d4ed8' : '#000',
                  textDecoration: isFolder ? 'underline' : 'none',
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
              >
                {isFolder ? '📁' : '📄'} {fileName}
              </span>
            </li>
            
          );
        }

        // ✅ Handle file items
        const publicUrl = supabase
          .storage
          .from('contracts')
          .getPublicUrl(`${currentPath}/${fileName}`).data.publicUrl;

        const isPdf = fileName.toLowerCase().endsWith('.pdf');
        const isSelected = selectedFiles.includes(fileName);

        return (
          <li
            key={fileName}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              background: highlightedFiles.includes(fileName)
                ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))'
                : 'transparent',
              transition: 'background-color 0.6s ease',
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {
                setSelectedFiles(prev =>
                  isSelected
                    ? prev.filter(name => name !== fileName)
                    : [...prev, fileName]
                );
              }}
            />

            {isPdf ? (
              <button
                onClick={() => {
                  setPreviewUrl(publicUrl);
                  setPreviewType('pdf');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'blue',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  font: 'inherit'
                }}
              >
                📄 {fileName}
              </button>
            ) : (
              <a
                href={publicUrl}
                download
                onClick={(e) => {
                  if (!window.confirm(`Download "${fileName}"?`)) {
                    e.preventDefault();
                  }
                }}
                style={{
                  color: '#0077cc',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                 {fileName}
              </a>
            )}
          </li>
        );
      })}
    </ul>

    {/* PDF Previewer */}
    {previewUrl && previewType === 'pdf' && (
      <div
        style={{
          marginTop: '2rem',
          opacity: 1,
          transition: 'opacity 0.4s ease-in-out',
        }}
      >
        <iframe
          src={previewUrl}
          title="PDF Preview"
          width="100%"
          height="500px"
          style={{ border: '1px solid #ccc', borderRadius: '8px' }}
        />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button
            onClick={() => setPreviewUrl(null)}
            style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
          >
            ❌ Close Preview
          </button>
        </div>
      </div>
    )}
  </div>
)}</div></div>

{/* Admin/editor-only controls */}
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
                💾 Save
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
                Cancel
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
                ❌ Delete Contract
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              style={{
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                marginLeft: '3%',
              }}
            >
              ✏️ Edit
            </button>
           
          )}
        </div>
      )}

    
    </div>
  );}

export default ContractDetail;
