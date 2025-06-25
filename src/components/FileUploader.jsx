import { useState } from 'react';
import { supabase } from '../utils/supaBaseClient';

const FileUploader = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const filePath = `contracts/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('contracts').upload(filePath, file);

    if (error) {
      alert('Upload failed');
      console.error(error);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('contracts').getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    setUploading(false);
    onUploadComplete({
      url: publicUrl,
      name: file.name,
      type: file.type,
    });
  };

  return (
    <div>
      <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileChange} />
      {uploading && <p>Uploading...</p>}
    </div>
  );
};

export default FileUploader;
