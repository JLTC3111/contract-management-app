/**
 * File utilities for ContractDetail
 * Contains helpers for file icons, names, and path handling
 */

import { File } from 'lucide-react';

/**
 * Extract original file name from stored name (removes timestamp prefix)
 * @param {string} storedFileName - The stored file name with timestamp
 * @returns {string} Original file name
 */
export function getOriginalFileName(storedFileName) {
  // Pattern: timestamp-originalname.ext
  // Example: 2024-01-15T10-30-45-123Z-document.pdf -> document.pdf
  const match = storedFileName.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-(.+)$/);
  return match ? match[1] : storedFileName;
}

/**
 * Get file icon based on file extension
 * @param {string} fileName - Name of the file
 * @returns {JSX.Element} Icon element
 */
export function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const iconStyle = { marginRight: '2.5px', verticalAlign: 'middle' };
  
  const iconMap = {
    pdf: '/img/pdf.png',
    doc: '/img/word.png',
    docx: '/img/word.png',
    xls: '/img/excel.png',
    xlsx: '/img/excel.png',
    ppt: '/img/powerpoint.png',
    pptx: '/img/powerpoint.png',
    zip: '/img/zip.png',
    rar: '/img/zip.png',
    '7z': '/img/zip.png',
    txt: '/img/txt.png',
  };

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'tif', 'ico', 'avif'];
  
  if (imageExtensions.includes(ext)) {
    return <img width="20px" height="20px" src="/img/image.png" style={iconStyle} alt="image" />;
  }
  
  if (iconMap[ext]) {
    return <img width="20px" height="20px" src={iconMap[ext]} style={iconStyle} alt={ext} />;
  }
  
  return <File size={20} color="#607d8b" style={iconStyle} />;
}

/**
 * Clean folder name for storage
 * @param {string} name - Raw folder name
 * @returns {string} Cleaned folder name
 */
export function cleanFolderName(name) {
  return name
    .trim()
    .replace(/[\\/]/g, '') // Remove slashes
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .normalize('NFD')
    .replace(/[ -\u007F]/g, (c) => c) // ASCII chars, keep as is
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D')) // Vietnamese d
    .replace(/[^a-zA-Z0-9_-]/g, '') // Remove non-ASCII except _ and -
    .replace(/^\/+|\/+$/g, '');
}

/**
 * Check if a file object is a folder
 * @param {object} fileObj - File object from Supabase
 * @returns {boolean} True if folder
 */
export function isFolder(fileObj) {
  return !fileObj?.metadata?.mimetype;
}

/**
 * Get file extension
 * @param {string} fileName - File name
 * @returns {string} Extension in lowercase
 */
export function getFileExtension(fileName) {
  return fileName?.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if file is previewable
 * @param {string} fileName - File name
 * @returns {object} { canPreview: boolean, type: string }
 */
export function getPreviewType(fileName) {
  const ext = getFileExtension(fileName);
  
  const previewTypes = {
    pdf: 'pdf',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    webp: 'image',
    svg: 'image',
    bmp: 'image',
    doc: 'office',
    docx: 'office',
    xls: 'office',
    xlsx: 'office',
    ppt: 'office',
    pptx: 'office',
  };

  const type = previewTypes[ext];
  return {
    canPreview: !!type,
    type: type || null
  };
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
