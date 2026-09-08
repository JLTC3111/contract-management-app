import React, { useState, useEffect } from 'react';
import {
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  Folder,
  Presentation,
  X,
} from 'lucide-react';
import { getViewerComponent, getFilePreviewProps } from '../utils/fileViewerUtils';
import ImagePreview from './ImagePreview';
import PdfPreview from './PdfPreview';
import OfficeViewer from './OfficeViewer';

const FILE_TYPE_ICONS = {
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  ppt: Presentation,
  pptx: Presentation,
  pdf: FileText,
  jpg: FileImage,
  jpeg: FileImage,
  png: FileImage,
  gif: FileImage,
  bmp: FileImage,
  webp: FileImage,
  svg: FileImage,
  txt: FileType,
  md: FileType,
  zip: FileArchive,
  rar: FileArchive,
  '7z': FileArchive,
};

const FileTypeIcon = ({ fileType, size = 20 }) => {
  const Icon = FILE_TYPE_ICONS[fileType] || Folder;
  return <Icon size={size} aria-hidden="true" />;
};

const FilePreview = ({ file, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (file) {
      setLoading(false);
    }
  }, [file]);

  if (!file) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        color: '#888'
      }}>
        No file selected
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        color: '#888'
      }}>
        Loading file preview...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        color: 'red', 
        padding: '1rem', 
        textAlign: 'center',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px'
      }}>
        {error}
      </div>
    );
  }

  const previewProps = getFilePreviewProps(file);
  const viewerComponent = getViewerComponent(file.name);

  // Render the appropriate preview component
  const renderPreview = () => {
    switch (viewerComponent) {
      case 'PdfPreview':
        return <PdfPreview fileUrl={previewProps.fileUrl} fileName={previewProps.fileName} />;
      
      case 'ImagePreview':
        return <ImagePreview fileUrl={previewProps.fileUrl} />;
      
      case 'OfficeViewer':
      case 'DocxPreview': // Fallback to OfficeViewer for DOCX files
      case 'PptxPreview': // Fallback to OfficeViewer for PPTX files
      
      default:
        return (
          <OfficeViewer 
            fileUrl={previewProps.fileUrl} 
            fileType={previewProps.fileType} 
            fileName={previewProps.fileName} 
          />
        );
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      position: 'relative'
    }}>
      {/* Header with file info */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        background: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileTypeIcon fileType={previewProps.fileType} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1f2937' }}>
              {previewProps.fileName}
            </h3>
            {previewProps.fileSize && (
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                {previewProps.fileSize} • {previewProps.fileType.toUpperCase()}
              </p>
            )}
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              color: '#6b7280',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#374151'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#6b7280'; }}
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Preview content */}
      <div style={{ 
        padding: '1rem',
        height: 'calc(100% - 80px)',
        overflow: 'auto'
      }}>
        {renderPreview()}
      </div>
    </div>
  );
};

export default FilePreview; 