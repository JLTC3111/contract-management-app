import React, { useState } from 'react';

const PdfPreview = ({ fileUrl, fileName }) => {
  const [viewMode, setViewMode] = useState('embedded'); // 'embedded', 'download'

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* View Mode Toggle */}
      <div style={{ 
        marginBottom: '1rem', 
        display: 'flex', 
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setViewMode('embedded')}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: viewMode === 'embedded' ? '#2563eb' : '#fff',
            color: viewMode === 'embedded' ? '#fff' : '#374151',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Embedded Viewer
        </button>
        <button
          onClick={() => setViewMode('download')}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: viewMode === 'download' ? '#2563eb' : '#fff',
            color: viewMode === 'download' ? '#fff' : '#374151',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Download
        </button>
      </div>

      {/* Content Display */}
      {viewMode === 'embedded' && (
        <div style={{ height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            width="100%"
            height="100%"
            frameBorder="0"
            title={`${fileName} - PDF Viewer`}
            style={{ borderRadius: '8px' }}
          />
        </div>
      )}

      {viewMode === 'download' && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem',
          background: '#f8fafc',
          border: '2px dashed #d1d5db',
          borderRadius: '8px'
        }}>
          <p style={{ marginBottom: '1rem', color: '#374151' }}>
            Click below to download the PDF file:
          </p>
          <a
            href={fileUrl}
            download={fileName}
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#2563eb',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.background = '#2563eb'}
          >
            Download {fileName}
          </a>
        </div>
      )}
    </div>
  );
};

export default PdfPreview; 