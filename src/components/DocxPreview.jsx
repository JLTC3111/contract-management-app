import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';

const DocxPreview = ({ fileUrl }) => {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fileUrl) return;
    setLoading(true);
    setError(null);
    setHtml('');
    fetch(fileUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch DOCX file');
        return res.arrayBuffer();
      })
      .then(arrayBuffer =>
        mammoth.convertToHtml({ arrayBuffer })
      )
      .then(result => {
        setHtml(result.value);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load DOCX file.');
        setLoading(false);
      });
  }, [fileUrl]);

  if (loading) return <div style={{ color: '#888' }}>Loading DOCX...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div
      style={{
        background: '#f8fafc',
        color: '#1e293b',
        padding: '1rem',
        borderRadius: '8px',
        maxHeight: 600,
        overflowY: 'auto',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '1rem',
        lineHeight: 1.6,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default DocxPreview;
