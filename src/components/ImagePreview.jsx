import React from 'react';

const ImagePreview = ({ fileUrl }) => {
  if (!fileUrl) {
    return <div>No image URL provided</div>;
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '1rem',
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <img
        src={fileUrl}
        alt="Image Preview"
        style={{
          maxWidth: '100%',
          maxHeight: '600px',
          borderRadius: '8px',
          objectFit: 'contain',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
        onError={(e) => {
          console.error('Failed to load image:', fileUrl);
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <div 
        style={{ 
          display: 'none', 
          textAlign: 'center', 
          color: 'var(--text-secondary)',
          padding: '2rem'
        }}
      >
        <p>Failed to load image</p>
        <p style={{ fontSize: '0.875rem' }}>The image may be corrupted or in an unsupported format.</p>
      </div>
    </div>
  );
};

export default ImagePreview;
