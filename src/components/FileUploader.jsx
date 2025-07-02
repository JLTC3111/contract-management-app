import React, { useRef, useState } from 'react';
import { supabase } from '../utils/supaBaseClient';
import toast from 'react-hot-toast';


const sanitizeFileName = (name) =>
  name.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '');

const FileUploader = ({ onUploadComplete, onUploadSuccess, contract, currentPath }) => {
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef();
  
  const handleUpload = async (event) => {
    const files = event.target?.files;
    if (!files || files.length === 0) {
      toast.error('Please select at least one file to upload.');
      return;
    }

    const uploads = [];

    for (const file of files) {
      const sanitizedFileName = sanitizeFileName(file.name);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = `uploads/${contract.id}`;
      const cleanedPath = (currentPath?.startsWith('uploads/') ? currentPath : `${defaultPath}/${currentPath}`).replace(/^\/+|\/+$/g, '');
      const filePath = `${cleanedPath}/${timestamp}-${sanitizedFileName}`;


      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('contracts')
        .createSignedUploadUrl(filePath);

      if (signedUrlError) {
        console.error('Error getting signed URL:', signedUrlError);
        toast.error(`❌ Failed to upload ${file.name}`);
        continue;
      }

  const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrlData.signedUrl, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(prev => ({ ...prev, [file.name]: percent }));
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          const { data: publicUrlData } = supabase
            .storage
            .from('contracts')
            .getPublicUrl(filePath);
      
          uploads.push({
            url: publicUrlData.publicUrl,
            name: file.name,
            type: file.type,
          });
      
          toast.success(`✅ ${file.name} uploaded!`);
      
          const { error: updateError } = await supabase
            .from('contracts')
            .update({ file_name: filePath })
            .eq('id', contract.id);
      
          if (updateError) {
            console.error('Error saving file path to DB:', updateError.message);
            toast.error(`⚠️ File uploaded but DB not updated`);
          }
      
          // ✅ Immediately refresh the file list UI
          if (onUploadSuccess) onUploadSuccess();
      
        } else {
          console.error(`Failed to upload ${file.name}:`, xhr.responseText);
          toast.error(`❌ Failed to upload ${file.name}`);
        }
      };
      

      xhr.onerror = () => {
        toast.error(`❌ Upload error for ${file.name}`);
      };

      xhr.send(file); // Send after events are wired up
    }


    if (onUploadComplete) {
      onUploadComplete(uploads);
    }
  };

  return (
    <>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
     <p style={{ fontSize: '0.8rem', color: '#555' }}>
        Uploading to: <code>{currentPath || `uploads/${contract.id}`}</code>
     </p>
     <button
        onClick={() => fileInputRef.current.click()}
        style={{
          backgroundColor: '#ddd', 
          color: '#000',
          padding: '0.5rem 1rem',
          marginTop: '1rem',
          borderRadius: '8px',
          border: 'none',
          fontSize: '.8rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(234, 255, 0, 0.1)',
          transition: 'background-color 0.3s ease',
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = 'rgba(15, 225, 33, 0.1)')} // Tailwind "blue-600"
        onMouseOut={(e) => (e.target.style.backgroundColor = '#ddd')}
      >
        ⬆️ UPLOAD FILE
      </button>

      {Object.entries(uploadProgress).map(([filename, progress]) => (
        <div key={filename} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <strong>{filename}</strong>: {progress}%
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#ddd',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '4px',
            }}>
              <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #000000, #3b82f6)', // black to Tailwind blue-600
              transition: 'width 0.2s',
            }}></div>
            </div>
          </div>

        {/* ✅ Green checkmark when complete */}
        {progress === 100 && (
          <div
            style={{
              border: '1px solid blue',
              marginTop: '24px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'linear-gradient(90deg,rgb(255, 252, 173),rgb(0, 255, 30))',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#000',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
            title="Upload complete"
          >
            ✓
          </div>
              )}
            </div>
          ))}

    </>
  );
};

export default FileUploader;
