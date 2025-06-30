import React, { useRef, useState } from 'react';
import { supabase } from '../utils/supaBaseClient';
import toast from 'react-hot-toast';

const sanitizeFileName = (name) =>
  name.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '');

const FileUploader = ({ onUploadComplete, contract }) => {
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
  const filePath = `uploads/${contract.id}/${timestamp}-${sanitizedFileName}`;

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

      // ✅ Add to uploads list
      uploads.push({
        url: publicUrlData.publicUrl,
        name: file.name,
        type: file.type,
      });

      toast.success(`✅ ${file.name} uploaded!`);

      // ✅ Only update DB when upload is successful
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ file_name: filePath })
        .eq('id', contract.id);

      if (updateError) {
        console.error('Error saving file path to DB:', updateError.message);
        toast.error(`⚠️ File uploaded but DB not updated`);
      }

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
      <button onClick={() => fileInputRef.current.click()}>
        Upload File
      </button>

      {Object.entries(uploadProgress).map(([filename, progress]) => (
        <div key={filename} style={{ marginTop: '8px' }}>
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
              backgroundColor: '#4caf50',
              transition: 'width 0.2s'
            }}></div>
          </div>
        </div>
      ))}
    </>
  );
};

export default FileUploader;
