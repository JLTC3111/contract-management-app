import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const OfficeViewer = ({ fileUrl, fileType, fileName }) => {
  const [viewMode, setViewMode] = useState('online'); // 'online', 'google'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation();


  // Office file extensions
  const officeExtensions = {
    docx: 'document',
    doc: 'document',
    xlsx: 'spreadsheet',
    xls: 'spreadsheet',
    pptx: 'presentation',
    ppt: 'presentation',
    pdf: 'pdf'
  };

  // Get Microsoft Office Online Viewer URL
  const getOfficeOnlineUrl = (url) => {
    const encodedUrl = encodeURIComponent(url);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  };

  // Get Google Docs Viewer URL
  const getGoogleDocsUrl = (url) => {
    const encodedUrl = encodeURIComponent(url);
    return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
  };

  useEffect(() => {
    setLoading(false);
  }, [fileUrl, fileType]);



  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        color: '#888',
        fontSize: '1.1rem'
      }}>
        Loading {fileType.toUpperCase()} file...
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

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* View Mode Toggle */}
      <div style={{ 
        marginBottom: '1rem', 
        display: 'flex', 
        gap: '0.5rem',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button
          className="btn-hover-preview"
          onClick={() => setViewMode('online')}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: viewMode === 'online' ? '#2563eb' : '#fff',
            color: viewMode === 'online' ? '#fff' : '#374151',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          {t('buttons.microsoftOffice')}
        </button>
        <button
          className="btn-hover-preview"
          onClick={() => setViewMode('google')}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: viewMode === 'google' ? '#2563eb' : '#fff',
            color: viewMode === 'google' ? '#fff' : '#374151',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          {t('buttons.googleDocs')}
        </button>
      </div>

      {/* Content Display */}
      {viewMode === 'online' && (
        <div style={{ height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <iframe
            src={getOfficeOnlineUrl(fileUrl)}
            width="100%"
            height="100%"
            frameBorder="0"
            title={`${fileName} - Microsoft Office Online Viewer`}
            style={{ borderRadius: '8px' }}
          />
        </div>
      )}

      {viewMode === 'google' && (
        <div style={{ height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <iframe
            src={getGoogleDocsUrl(fileUrl)}
            width="100%"
            height="100%"
            frameBorder="0"
            title={`${fileName} - Google Docs Viewer`}
            style={{ borderRadius: '8px' }}
          />
        </div>
      )}




    </div>
  );
};

export default OfficeViewer; 