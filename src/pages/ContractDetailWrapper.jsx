/**
 * ContractDetail.jsx
 * 
 * This file re-exports the ContractDetail component from its new modular location.
 * The component has been split into smaller, more maintainable files:
 * 
 * - ContractDetailPage.jsx - Main orchestrating component
 * - ContractHeader.jsx - Navigation and action buttons
 * - ContractInfo.jsx - Contract metadata display/editing
 * - FileBrowser.jsx - File listing and navigation
 * - FilePreviewPanel.jsx - File preview (PDF, Office, images)
 * - fileUtils.js - File utility functions
 * 
 * @see src/pages/ContractDetail/
 */

// Re-export the main component as default
export { default } from './ContractDetail';

// Re-export named components for direct access if needed
export { 
  ContractHeader,
  ContractInfo,
  FileBrowser,
  FilePreviewPanel,
  getOriginalFileName,
  getFileIcon,
  isFolder
} from './ContractDetail';
