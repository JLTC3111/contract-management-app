import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import OfficeViewer from '../../components/OfficeViewer';
import ImagePreview from '../../components/ImagePreview';

/**
 * FilePreviewPanel - Handles file preview for PDF, Office documents, and images
 * @param {Object} props
 * @param {string} props.previewUrl - URL of the file to preview
 * @param {string} props.previewType - Type of file: 'pdf', 'excel', 'docx', 'pptx', 'image'
 * @param {Function} props.onClose - Callback to close the preview
 */
const FilePreviewPanel = ({ previewUrl, previewType, onClose }) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();

  if (!previewUrl) return null;

  const closeButtonStyle = {
    backgroundColor: darkMode ? '#fff' : '#000',
    color: darkMode ? '#000' : '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  };

  const CloseButton = () => (
    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
      <button
        className="btn-hover-preview"
        onClick={onClose}
        style={closeButtonStyle}
      >
        ❌ {t('contract_detail_close_preview')}
      </button>
    </div>
  );

  // PDF Preview
  if (previewType === 'pdf') {
    return (
      <div
        style={{
          marginRight: '5rem',
          marginTop: '2rem',
          opacity: 1,
          transition: 'opacity 0.4s ease-in-out',
        }}
      >
        <iframe
          src={previewUrl}
          title="PDF Preview"
          width="100%"
          height="600px"
          style={{ border: '1px solid #ccc', borderRadius: '8px' }}
        />
        <CloseButton />
      </div>
    );
  }

  // Excel Preview
  if (previewType === 'excel') {
    return (
      <div style={{ marginTop: '2rem', width: '95%' }}>
        <OfficeViewer
          fileUrl={previewUrl}
          fileType="xlsx"
          fileName="excel-file.xlsx"
        />
        <CloseButton />
      </div>
    );
  }

  // Word Document Preview
  if (previewType === 'docx') {
    return (
      <div style={{ marginTop: '2rem', width: '95%' }}>
        <OfficeViewer
          fileUrl={previewUrl}
          fileType="docx"
          fileName="document.docx"
        />
        <CloseButton />
      </div>
    );
  }

  // PowerPoint Preview
  if (previewType === 'pptx') {
    return (
      <div style={{ marginTop: '2rem', width: '95%' }}>
        <OfficeViewer
          fileUrl={previewUrl}
          fileType="pptx"
          fileName="presentation.pptx"
        />
        <CloseButton />
      </div>
    );
  }

  // Image Preview
  if (previewType === 'image') {
    return (
      <div style={{ marginTop: '2rem', width: '95%' }}>
        <ImagePreview fileUrl={previewUrl} />
        <CloseButton />
      </div>
    );
  }

  return null;
};

export default FilePreviewPanel;
