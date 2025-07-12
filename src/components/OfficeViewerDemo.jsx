import React, { useState } from 'react';
import FilePreview from './FilePreview';
import { getFileIcon, getFileTypeCategory } from '../utils/fileViewerUtils';

const OfficeViewerDemo = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Sample files for demonstration
  const sampleFiles = [
    {
      name: 'sample-contract.docx',
      url: 'https://example.com/sample-contract.docx',
      size: 245760,
      type: 'docx'
    },
    {
      name: 'financial-report.xlsx',
      url: 'https://example.com/financial-report.xlsx',
      size: 512000,
      type: 'xlsx'
    },
    {
      name: 'presentation.pptx',
      url: 'https://example.com/presentation.pptx',
      size: 1024000,
      type: 'pptx'
    },
    {
      name: 'contract.pdf',
      url: 'https://example.com/contract.pdf',
      size: 307200,
      type: 'pdf'
    },
    {
      name: 'document-image.png',
      url: 'https://example.com/document-image.png',
      size: 153600,
      type: 'png'
    }
  ];

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setSelectedFile(null);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ 
        textAlign: 'center', 
        marginBottom: '2rem',
        color: '#1f2937',
        fontSize: '2rem'
      }}>
        Office Viewer Demo
      </h1>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {sampleFiles.map((file, index) => (
          <div
            key={index}
            onClick={() => handleFileSelect(file)}
            style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              background: '#fff',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '2rem' }}>{getFileIcon(file.name)}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#1f2937' }}>
                {file.name}
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                {getFileTypeCategory(file.name)} • {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* File Preview Modal */}
      {showPreview && selectedFile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            width: '90%',
            height: '90%',
            maxWidth: '1200px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <FilePreview file={selectedFile} onClose={closePreview} />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        background: '#f8fafc',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>
          How to Use Office Viewer
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#374151' }}>
          <li>Click on any file card above to preview it</li>
          <li>Use the toggle buttons to switch between viewing modes</li>
          <li>Microsoft Office: Uses Microsoft Office Online for best compatibility</li>
          <li>Google Docs: Uses Google Docs Viewer as an alternative</li>
        </ul>
      </div>
    </div>
  );
};

export default OfficeViewerDemo; 