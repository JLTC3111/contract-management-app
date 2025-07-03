import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supaBaseClient';
import FileUploader from '../components/FileUploader';
import { ArrowLeft } from 'lucide-react';

const NewContract = () => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [version, setVersion] = useState('v1.0');
  const [contract, setContract] = useState(null); // Will hold the created contract
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleCreateContract = async () => {
    if (!title) return alert('Title is required');
    // Insert contract without file info
    const { data, error } = await supabase.from('contracts').insert([
      {
        title,
        status,
        version,
        updated_at: new Date().toISOString(),
      },
    ]).select().single();

    if (error) {
      alert('Error saving contract');
      console.error(error);
    } else {
      setContract(data); // Save the created contract (with id)
    }
  };

  // Called after file upload
  const handleUploadComplete = async (uploads) => {
    if (!uploads || uploads.length === 0 || !contract) return;
    setUploading(true);
    const uploadedFile = uploads[0];
    // Update contract with file info
    const { error } = await supabase.from('contracts').update({
      file_url: uploadedFile.url,
      file_name: uploadedFile.name,
      file_type: uploadedFile.type,
      updated_at: new Date().toISOString(),
    }).eq('id', Number(contract.id));
    setUploading(false);
    if (error) {
      alert('Error updating contract with file');
      console.error(error);
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{ padding: '1.5rem'}}>
      <h2>New Contract</h2>
      {!contract ? (
        <><div style={{display:'flex', gap:'10px', marginBottom: '.5rem'}}>
          <input 
            type="text"
            placeholder="Contract Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Version (e.g. v1.0)"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>
          <button onClick={handleCreateContract} style={{ background:'#ddd' }}>Create Contract</button>
          </div>
        </>
      ) : (
        <>
          <p>Contract created! Now upload a file:</p>
          <div style={{ marginBottom: '1rem' }}>
            <FileUploader contract={contract} onUploadComplete={handleUploadComplete} />
            {uploading && <p>Updating contract with file...</p>}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: '0.5rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#ddd',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '0.5rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#ddd',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'normal',
                fontSize: '1rem',
              }}
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default NewContract;
