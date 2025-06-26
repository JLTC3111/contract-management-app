import React from 'react';
import { useRef } from 'react';
import { supabase } from '../utils/supaBaseClient'; // Adjust the path if needed


const FileUploader = ({ onUploadComplete }) => {
  const handleUpload = async (event) => {
    const files = event.target?.files;

    if (!files || files.length === 0) {
      alert('Please select a file before uploading.');
      return;
    }

    const file = files[0];
    const filePath = `uploads/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from('contracts')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error.message);
      alert('❌ Upload failed. Check console.');
    } else {
      const { data: publicUrl } = supabase
        .storage
        .from('contracts')
        .getPublicUrl(filePath);

      if (onUploadComplete) {
        onUploadComplete({
          url: publicUrl.publicUrl,
          name: file.name,
          type: file.type,
        });
      }

      alert('✅ File uploaded successfully!');
    }
  };

  const fileInputRef = useRef();

return (
  <>
    <input
      type="file"
      ref={fileInputRef}
      style={{ display: 'none' }}
      onChange={handleUpload}
    />
    <button onClick={() => fileInputRef.current.click()}>
      Upload File
    </button>
  </>
);
};

export default FileUploader;
