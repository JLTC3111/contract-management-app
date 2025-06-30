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

  useEffect(() => {
    if (contract?.id) {
      listFiles(contract.id);
    }
  }, [contract?.id]);

  const listFiles = async (contractId) => {
    const folder = `uploads/${contractId}`.replace(/^\/+|\/+$/g, '');
  
    const { data, error } = await supabase
      .storage
      .from('contracts')
      .list(folder);
  
    if (error) {
      console.error('Error fetching files:', error.message);
      setFiles([]); // Reset files on error
    } else {
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

  const handleDeleteFiles = async (filesToDelete = []) => {
    // Normalize input: single string or file object -> array
    if (!Array.isArray(filesToDelete)) {
      filesToDelete = [filesToDelete];
    }
  
    const folder = `uploads/${contract.id}`;
  
    // If no files specified, confirm deleting all
    const confirmed = confirm(
      filesToDelete.length > 0
        ? `Delete ${filesToDelete.length} selected file(s)?`
        : 'Delete all files for this contract?'
    );
  
    if (!confirmed) return;
  
    try {
      let deletePaths = [];
  
      if (filesToDelete.length > 0) {
        deletePaths = filesToDelete.map(file =>
          typeof file === 'string'
            ? `${folder}/${file}`
            : `${folder}/${file.name}`
        );
      } else {
        const { data: allFiles, error: listError } = await supabase
          .storage
          .from('contracts')
          .list(folder);
  
        if (listError) {
          console.error('Error listing files:', listError.message);
          toast.error('Failed to list files.');
          return;
        }
  
        if (!allFiles || allFiles.length === 0) {
          toast.error('No files found to delete.');
          return;
        }
  
        deletePaths = allFiles.map(f => `${folder}/${f.name}`);
      }
  
      const { error: deleteError } = await supabase
        .storage
        .from('contracts')
        .remove(deletePaths);
  
      if (deleteError) {
        console.error('Supabase deletion error:', deleteError.message);
        toast.error('❌ Failed to delete file(s).');
      } else {
        toast.success(`✅ Deleted ${deletePaths.length} file(s).`);
        await listFiles(contract.id); // Refresh after delete
        setSelectedFiles([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('🚨 Something went wrong.');
      setSelectedFiles([]); // Clear selection after deletion
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
          <button 
            onClick={() => handleDeleteFiles(selectedFiles)}
            style={{
              backgroundColor: '#ddd',
              color: '#000',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            disabled={selectedFiles.length === 0}
          >
            🗑️ Delete File{selectedFiles.length > 1 ? 's' : ''} ({selectedFiles.length})
          </button>
        </div>
      )}
  
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
              listFiles(contract.id);
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
          <h3>📂 Files ({files.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {files.map((file) => {
              const fileName = file.name;
              const publicUrl = supabase
                .storage
                .from('contracts')
                .getPublicUrl(`uploads/${contract.id}/${fileName}`).data.publicUrl;

              const isPdf = fileName.toLowerCase().endsWith('.pdf');
              const isSelected = selectedFiles.includes(fileName);

    return (
      <li key={fileName} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '6px',
        background: highlightedFiles.includes(fileName)
          ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))'
          : 'transparent',
        transition: 'background-color 0.6s ease',
        }}>
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
            📥 {fileName}
          </a>
        )}
      </li>
    );
  })}
</ul>


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
        </div>)}
        </div>

      </div>
  
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
