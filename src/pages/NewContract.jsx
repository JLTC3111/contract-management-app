import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supaBaseClient';
import FileUploader from '../components/FileUploader';

const NewContract = () => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [version, setVersion] = useState('v1.0');
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!file || !title) return alert('Title and file required');

    const { error } = await supabase.from('contracts').insert([
      {
        title,
        status,
        version,
        file_url: file.url,
        file_name: file.name,
        file_type: file.type,
        updated_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert('Error saving contract');
      console.error(error);
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>New Contract</h2>
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
      </select>
      <FileUploader onUploadComplete={setFile} />
      <button onClick={handleSubmit}>Save Contract</button>
    </div>
  );
};

export default NewContract;
