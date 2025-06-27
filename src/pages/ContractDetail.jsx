import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supaBaseClient';
import FileUploader from '../components/FileUploader';
import { useUser } from '../hooks/useUser';
import { ArrowLeft } from 'lucide-react';

const ContractDetail = () => {
  const { user, loading: userLoading } = useUser(); // from context
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [updated, setUpdated] = useState({});
  const canEdit = user && ['admin', 'editor'].includes(user.role);
  
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
    const { error } = await supabase
      .from('contracts')
      .update({
        title: updated.title,
        version: updated.version,
        status: updated.status,
        file_url: updated.file_url,
        file_name: updated.file_name,
        file_type: updated.file_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      setContract(updated);
      setEditMode(false);
    } else {
      alert('Failed to update contract.');
      console.error(error);
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contract and its file?')) return;
  
    try {
      // First, delete the file from Supabase Storage
      const { error: fileError } = await supabase.storage
        .from('contracts') // 👈 your bucket name
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
        <p><strong>File:</strong> {contract.file_name}</p>
  
        {isPDF ? (
          <iframe
            src={updated.file_url}
            title="PDF Viewer"
            width="100%"
            height="500px"
            style={{ border: '1px solid #ccc', borderRadius: '8px' }}
          ></iframe>
        ) : (
          <a href={updated.file_url} target="_blank" rel="noopener noreferrer">
            📎 {updated.file_name}
          </a>
        )}
  
        {editMode && (
          <FileUploader onUploadComplete={(file) => {
            setUpdated((prev) => ({
              ...prev,
              file_url: file.url,
              file_name: file.name,
              file_type: file.type,
            }));
          }} />
        )}
      </div>
  
  
      <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#ddd',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
          }}>
          <ArrowLeft size={14} /> Back 
     </button>
  {['admin', 'editor'].includes(user.role) && (
    <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem' }}>
      {editMode ? (
        <>
          <button
            onClick={handleSave}
            style={{
              backgroundColor: '#3b82f6', // blue-500
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
              backgroundColor: '#e5e7eb', // gray-200
              color: '#111827',           // gray-900
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
              backgroundColor: '#000', // red-500
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ❌ Delete
          </button>
        </>
      ) : (
        <button
          onClick={() => setEditMode(true)}
          style={{
            backgroundColor: '#3b82f6', // blue-500
            color: '#fff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          ✏️ Edit
        </button>
      )}
    </div>
  )}
</div>
);};

export default ContractDetail;
