import React, { useRef, useState } from 'react';
import { supabase } from '../utils/supaBaseClient';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { Loader2, Upload, Check, X, UploadCloud } from 'lucide-react';
import { isOfficeFile, isImageFile, isTextFile, getFileTypeCategory } from '../utils/fileViewerUtils';

const sanitizeFileName = (name) =>
  name.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '');

// Enhanced file validation
const validateFile = (file) => {
  const maxSize = 50 * 1024 * 1024; // 50MB limit
  const allowedTypes = [
    // Office files
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    // PDF
    'application/pdf',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/svg+xml',
    // Text files
    'text/plain',
    'text/markdown',
    'application/json',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 50MB limit' };
  }

  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(docx?|xlsx?|pptx?|pdf|jpg|jpeg|png|gif|bmp|webp|svg|txt|md|json|csv|zip|rar|7z)$/i)) {
    return { valid: false, error: 'File type not supported' };
  }

  return { valid: true };
};

const FileUploader = ({ onUploadComplete, onUploadSuccess, contract, currentPath, align = 'center' }) => {
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const { t } = useTranslation();
  const { darkMode } = useTheme();

  const handleUpload = async (event) => {
    const files = event.target?.files;
    if (!files || files.length === 0) {
      toast.error(t('please_select_at_least_one_file_to_upload'));
      return;
    }

    setUploading(true);
    const uploads = [];
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(`❌ ${file.name}: ${validation.error}`);
        errorCount++;
        continue;
      }

      const sanitizedFileName = sanitizeFileName(file.name);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = `uploads/${contract.id}`;
      const cleanedPath = (currentPath?.startsWith('uploads/') ? currentPath : `${defaultPath}/${currentPath}`).replace(/^\/+|\/+$/g, '');
      const filePath = `${cleanedPath}/${timestamp}-${sanitizedFileName}`;

      try {
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from('contracts')
          .createSignedUploadUrl(filePath);

        if (signedUrlError) {
          console.error('Error getting signed URL:', signedUrlError);
          toast.error(`❌ ${t('failed_to_upload')} ${file.name}`);
          errorCount++;
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
              path: filePath,
              size: file.size,
              category: getFileTypeCategory(file.name)
            });
        
            toast.success(`✅ ${file.name} ${t('uploader_uploaded')}!`);
            successCount++;
        
            const { error: updateError } = await supabase
              .from('contracts')
              .update({ file_name: filePath })
              .eq('id', contract.id);
        
            if (updateError) {
              console.error('Error saving file path to DB:', updateError.message);
              toast.error(`⚠️ ${t('file_uploaded_but_db_not_updated')}`);
            }
        
            // ✅ Immediately refresh the file list UI
            if (onUploadSuccess) onUploadSuccess();
        
          } else {
            console.error(`Failed to upload ${file.name}:`, xhr.responseText);
            toast.error(`❌ ${t('failed_to_upload')} ${file.name}`);
            errorCount++;
          }
        };
        
        xhr.onerror = () => {
          toast.error(`❌ ${t('upload_error_for')} ${file.name}`);
          errorCount++;
        };

        xhr.send(file); // Send after events are wired up
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`❌ ${t('upload_error_for')} ${file.name}`);
        errorCount++;
      }
    }

    setUploading(false);
    setUploadProgress({});

    // Summary toast
    if (successCount > 0) {
      if (errorCount > 0) {
        toast.success(`✅ ${successCount} file(s) uploaded successfully. ${errorCount} failed.`);
      } else {
        toast.success(`✅ All ${successCount} file(s) uploaded successfully!`);
      }
    }

    if (onUploadComplete) {
      onUploadComplete(uploads);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: align === 'left' ? 'flex-start' : 'center',
      justifyContent: 'center'
    }}>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleUpload}
        accept=".docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.txt,.md,.json,.csv,.zip,.rar,.7z"
      />
      
      <button
        className="btn-hover-effect"
        onClick={() => fileInputRef.current.click()}
        disabled={uploading}
        style={{
          alignItems: 'center',
          display: 'flex',
          marginBottom: '1rem',
          justifyContent: 'center',
          backgroundColor: uploading ? '#9ca3af' : 'var(--card-bg)', 
          color: 'var(--text)',
          padding: '0.5rem 1rem',
          marginTop: '1rem',
          borderRadius: '8px',
          border: 'none',
          fontSize: '.8rem',
          fontWeight: 'bold',
          cursor: uploading ? 'not-allowed' : 'pointer',
          boxShadow: darkMode ? '0 2px 6px rgba(255, 255, 255, 0.5)' : '0 2px 6px rgba(0, 0, 0, 0.5)',
          transition: 'background-color 0.3s ease',
          opacity: uploading ? 0.7 : 1,
        }}
      >
        {uploading ? (
          <Loader2 size={16} style={{ marginRight: '5px' }} />
        ) : (
          <svg width="20px" height="20px" viewBox="0 0 1024 1024" className="icon"  version="1.1" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '5px'}}><path d="M736.68 435.86a173.773 173.773 0 0 1 172.042 172.038c0.578 44.907-18.093 87.822-48.461 119.698-32.761 34.387-76.991 51.744-123.581 52.343-68.202 0.876-68.284 106.718 0 105.841 152.654-1.964 275.918-125.229 277.883-277.883 1.964-152.664-128.188-275.956-277.883-277.879-68.284-0.878-68.202 104.965 0 105.842zM285.262 779.307A173.773 173.773 0 0 1 113.22 607.266c-0.577-44.909 18.09-87.823 48.461-119.705 32.759-34.386 76.988-51.737 123.58-52.337 68.2-0.877 68.284-106.721 0-105.842C132.605 331.344 9.341 454.607 7.379 607.266 5.417 759.929 135.565 883.225 285.262 885.148c68.284 0.876 68.2-104.965 0-105.841z" fill="#4A5699" /><path d="M339.68 384.204a173.762 173.762 0 0 1 172.037-172.038c44.908-0.577 87.822 18.092 119.698 48.462 34.388 32.759 51.743 76.985 52.343 123.576 0.877 68.199 106.72 68.284 105.843 0-1.964-152.653-125.231-275.917-277.884-277.879-152.664-1.962-275.954 128.182-277.878 277.879-0.88 68.284 104.964 68.199 105.841 0z" fill="#C45FA0" /><path d="M545.039 473.078c16.542 16.542 16.542 43.356 0 59.896l-122.89 122.895c-16.542 16.538-43.357 16.538-59.896 0-16.542-16.546-16.542-43.362 0-59.899l122.892-122.892c16.537-16.542 43.355-16.542 59.894 0z" fill="#F39A2B" /><path d="M485.17 473.078c16.537-16.539 43.354-16.539 59.892 0l122.896 122.896c16.538 16.533 16.538 43.354 0 59.896-16.541 16.538-43.361 16.538-59.898 0L485.17 532.979c-16.547-16.543-16.547-43.359 0-59.901z" fill="#F39A2B" /><path d="M514.045 634.097c23.972 0 43.402 19.433 43.402 43.399v178.086c0 23.968-19.432 43.398-43.402 43.398-23.964 0-43.396-19.432-43.396-43.398V677.496c0.001-23.968 19.433-43.399 43.396-43.399z" fill="#E5594F" /></svg>
        )}
        {uploading ? t('uploading_files') : t('upload_file')}
      </button>

      {/* File type info */}
      <div style={{ 
        fontSize: '0.75rem', 
        color: '#666', 
        textAlign: align === 'left' ? 'left' : 'center',
        marginBottom: '1rem',
        maxWidth: '300px'
      }}>
        {t('file_upload_supported_formats')}
      </div>

      {Object.entries(uploadProgress).map(([filename, progress]) => (
        <div key={filename} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
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
                background: 'linear-gradient(90deg, #000000, #3b82f6)',
                transition: 'width 0.2s',
              }}></div>
            </div>
          </div>
          
          {progress === 100 && (
            <Check size={16} color="#22c55e" />
          )}
        </div>
      ))}
    </div>
  );
};

export default FileUploader;
