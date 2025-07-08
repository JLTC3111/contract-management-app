import React, { useState } from 'react';

// Note: Most browsers do not natively support .heic images for preview.
// For HEIC, you would need to use a conversion library like heic2any.

const ImagePreview = () => {
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ marginBottom: '1rem' }}
      />
      {imagePreviewUrl && (
        <img
          src={imagePreviewUrl}
          alt="Preview"
          style={{
            maxWidth: '100%',
            maxHeight: 400,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
          }}
        />
      )}
    </div>
  );
};

export default ImagePreview;
