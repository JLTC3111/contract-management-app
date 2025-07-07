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
    <div style={{ padding: 'clamp(1rem, 4vw, 1.5rem)'}}>
      {/* Back Button */}
      <div style={{ marginBottom: 'clamp(0.5rem, 3vw, 1rem)' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '6px',
            padding: 'clamp(0.3rem, 2vw, 0.5rem)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--card-bg)';
          }}
        >
          <ArrowLeft size={20} />
        </button>
      </div>
      
      <h2 style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)', marginBottom: 'clamp(1rem, 4vw, 2rem)' }}>New Contract</h2>
      {!contract ? (
        <><div style={{display:'flex', flexWrap:'wrap', gap:'clamp(0.5rem, 2vw, 1rem)', marginBottom: 'clamp(1rem, 4vw, 1.5rem)'}}>
          <input 
            type="text"
            placeholder="Contract Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1rem)',
              padding: 'clamp(0.5rem, 2vw, 0.75rem)',
              borderRadius: '8px',
              border: '1.5px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              outline: 'none',
              flex: 1,
              minWidth: 'clamp(120px, 30vw, 200px)',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="text"
            placeholder="Version (e.g. v1.0)"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1rem)',
              padding: 'clamp(0.5rem, 2vw, 0.75rem)',
              borderRadius: '8px',
              border: '1.5px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              outline: 'none',
              flex: 1,
              minWidth: 'clamp(100px, 20vw, 160px)',
              boxSizing: 'border-box',
            }}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1rem)',
              padding: 'clamp(0.5rem, 2vw, 0.75rem)',
              borderRadius: '8px',
              border: '1.5px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              outline: 'none',
              flex: 1,
              minWidth: 'clamp(100px, 20vw, 160px)',
              boxSizing: 'border-box',
            }}
          >
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>
          <button onClick={handleCreateContract} style={{ background:'#ddd', fontSize: 'clamp(0.95rem, 2vw, 1rem)', padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)', borderRadius: '6px' }}>Create Contract</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>Contract created! Now upload a file:</p>
          <div style={{ marginBottom: 'clamp(1rem, 4vw, 1.5rem)' }}>
            <FileUploader contract={contract} onUploadComplete={handleUploadComplete} />
            {uploading && <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>Updating contract with file...</p>}
          </div>
          <div style={{ display: 'flex', flexWrap:'wrap', gap: 'clamp(0.5rem, 2vw, 1rem)', marginBottom: 'clamp(1rem, 4vw, 1.5rem)' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#ddd',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: 'clamp(0.95rem, 2vw, 1rem)',
              }}
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#ddd',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'normal',
                fontSize: 'clamp(0.95rem, 2vw, 1rem)',
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
