// File viewer utilities for determining which component to use based on file type

export const getFileExtension = (filename) => {
  if (!filename) return '';
  return filename.split('.').pop().toLowerCase();
};

export const isOfficeFile = (filename) => {
  const extension = getFileExtension(filename);
  const officeExtensions = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'pdf'];
  return officeExtensions.includes(extension);
};

export const isImageFile = (filename) => {
  const extension = getFileExtension(filename);
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  return imageExtensions.includes(extension);
};

export const isTextFile = (filename) => {
  const extension = getFileExtension(filename);
  const textExtensions = ['txt', 'md', 'json', 'xml', 'csv', 'log'];
  return textExtensions.includes(extension);
};

export const getViewerComponent = (filename) => {
  const extension = getFileExtension(filename);
  
  switch (extension) {
    case 'xlsx':
    case 'xls':
    case 'docx':
    case 'doc':
    case 'pptx':
    case 'ppt':
      return 'OfficeViewer'; // Use OfficeViewer for all Office files
    case 'pdf':
      return 'PdfPreview';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
    case 'svg':
      return 'ImagePreview';
    default:
      return 'OfficeViewer'; // Fallback to comprehensive Office viewer
  }
};

export const getFileTypeCategory = (filename) => {
  const extension = getFileExtension(filename);
  
  if (['docx', 'doc'].includes(extension)) return 'document';
  if (['xlsx', 'xls'].includes(extension)) return 'spreadsheet';
  if (['pptx', 'ppt'].includes(extension)) return 'presentation';
  if (['pdf'].includes(extension)) return 'pdf';
  if (isImageFile(filename)) return 'image';
  if (isTextFile(filename)) return 'text';
  
  return 'other';
};

export const getFileIcon = (filename) => {
  const extension = getFileExtension(filename);
  
  switch (extension) {
    case 'docx':
    case 'doc':
      return '📄';
    case 'xlsx':
    case 'xls':
      return '📊';
    case 'pptx':
    case 'ppt':
      return '📈';
    case 'pdf':
      return '📋';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
    case 'svg':
      return '🖼️';
    case 'txt':
    case 'md':
      return '📝';
    case 'zip':
    case 'rar':
    case '7z':
      return '📦';
    default:
      return '📁';
  }
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFileType = (file, allowedTypes = []) => {
  if (!allowedTypes.length) return true;
  
  const extension = getFileExtension(file.name);
  return allowedTypes.includes(extension);
};

export const getFilePreviewProps = (file) => {
  return {
    fileUrl: file.url || file.path,
    fileType: getFileExtension(file.name),
    fileName: file.name,
    fileSize: file.size ? formatFileSize(file.size) : null,
    fileIcon: getFileIcon(file.name)
  };
}; 