import React from 'react';
import { useRef } from 'react';
import { supabase } from '../utils/supaBaseClient'; // Adjust the path if needed
import toast from 'react-hot-toast';

const sanitizeFileName = (name) =>
  name.normalize("NFD") // normalize accents
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .replace(/\s+/g, '-') // replace spaces with dashes
      .replace(/[^a-zA-Z0-9.\-_]/g, ''); // remove unsafe chars

const FileUploader = ({ onUploadComplete, contract }) => {
  const handleUpload = async (event) => {
    const files = event.target?.files;
  
    if (!files || files.length === 0) {
      toast.error('Please select at least one file to upload.');
      return;
    }
  
    const uploads = [];
  
    for (const file of files) {
      const sanitizedFileName = sanitizeFileName(file.name);
      const filePath = `uploads/${contract.id}/${Date.now()}-${sanitizedFileName}`;
  
      const { error } = await supabase.storage
        .from('contracts')
        .upload(filePath, file);
  
      if (error) {
        console.error(`Upload failed for ${file.name}:`, error.message);
        toast.error(`❌ Failed to upload ${file.name}`);
      } else {
        const { data: publicUrl } = supabase
          .storage
          .from('contracts')
          .getPublicUrl(filePath);
  
        uploads.push({
          url: publicUrl.publicUrl,
          name: file.name,
          type: file.type,
        });
  
        toast.success(`✅ ${file.name} uploaded!`);
      }
    }
  
    if (onUploadComplete) {
      onUploadComplete(uploads); // Send array back
    }
  };
  

  const fileInputRef = useRef();

return (
  <>
    <input
      type="file"
      multiple
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
