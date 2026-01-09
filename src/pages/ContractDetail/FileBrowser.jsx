import React, { useState, useEffect } from 'react';
import { FolderOpen, CornerLeftUp } from 'lucide-react';
import { supabase } from '../../utils/supaBaseClient';
import toast from 'react-hot-toast';
import gsap from 'gsap';

import { getFileIcon, getOriginalFileName } from './fileUtils';
import { getI18nOrFallback } from '../../utils/formatters';

const FileBrowser = ({
  contract,
  files,
  currentPath,
  onPathChange,
  onPreview,
  selectedFiles,
  highlightedFiles = [],
  fileItemRefs,
  onFileSelect,
  darkMode,
  t
}) => {
  const [hoveredFile, setHoveredFile] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  // keep isMobile in sync with viewport changes
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    // set initial
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animate file items
  useEffect(() => {
    if (fileItemRefs?.current && fileItemRefs.current.length > 0 && gsap) {
      try {
        const validRefs = fileItemRefs.current.filter(Boolean);
        if (validRefs.length > 0) {
          gsap.fromTo(
            validRefs,
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.2 }
          );
        }
      } catch (error) {
        console.warn('GSAP animation error:', error);
      }
    }
  }, [files, currentPath]);

  const isFolder = (file) => !file.metadata?.mimetype;

  const handleFolderClick = (fileName) => {
    const depth = currentPath.split('/').length - 2;
    if (depth >= 4) {
      toast.error('📁 Max folder depth (4) reached.');
      return;
    }
    onPathChange(`${currentPath}/${fileName}`);
  };

  const handleFileClick = async (file) => {
    const fileName = file.name;
    const publicUrl = supabase
      .storage
      .from('contracts')
      .getPublicUrl(`${currentPath}/${fileName}`).data.publicUrl;

    const isPdf = fileName.toLowerCase().endsWith('.pdf');
    const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
    const isDocx = fileName.toLowerCase().endsWith('.docx');
    const isPptx = fileName.toLowerCase().endsWith('.pptx') || fileName.toLowerCase().endsWith('.ppt');
    const isImage = /\.(png|jpe?g|gif|bmp|webp|svg|tiff?|ico|avif)$/i.test(fileName);

    if (isPdf) {
      onPreview(publicUrl, 'pdf');
    } else if (isExcel) {
      onPreview(publicUrl, 'excel');
    } else if (isDocx) {
      onPreview(publicUrl, 'docx');
    } else if (isPptx) {
      onPreview(publicUrl, 'pptx');
    } else if (isImage) {
      onPreview(publicUrl, 'image');
    } else {
      // For other files, trigger download
      if (window.confirm(`Download "${getOriginalFileName(fileName)}"?`)) {
        window.open(publicUrl, '_blank');
      }
    }
  };

  const handleCheckboxChange = (fileName, isChecked) => {
    onFileSelect(fileName, isChecked);
  };

  const renderBreadcrumb = () => {
    const parts = currentPath.split('/').filter(Boolean);
    if (!contract?.id) return null;
    const displayParts = parts[0] === 'uploads' ? parts.slice(1) : parts;

    return (
      <div style={{ marginLeft: '1rem', marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <img width="25" height="25" src="https://img.icons8.com/stickers/100/folder-tree.png" alt="folder-tree" />
        {displayParts.map((part, index) => {
          const isContractId = part === String(contract.id);
          const isLast = index === displayParts.length - 1;
          const displayLabel = isContractId ? ` ${getI18nOrFallback(t, contract, 'title_i18n', 'title') || 'Contract'}` : part;
          const pathSlice = parts.slice(0, (parts[0] === 'uploads' ? 1 : 0) + index + 1).join('/');

          return (
            <span key={pathSlice}>
              <span
                style={{
                  cursor: isLast ? 'default' : 'pointer',
                  color: isLast ? 'var(--text)' : 'var(--primary)',
                  textDecoration: isLast ? 'none' : 'underline',
                  marginRight: '0.5rem',
                }}
                onClick={() => {
                  if (!isLast) {
                    onPathChange(pathSlice);
                  }
                }}
              >
                {displayLabel}
              </span>
              {!isLast && <span style={{ marginRight: '0.5rem' }}>/</span>}
            </span>
          );
        })}
      </div>
    );
  };

  const getFileHoverStyle = (fileName) => {
    const isPdf = fileName.toLowerCase().endsWith('.pdf');
    const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
    const isDocx = fileName.toLowerCase().endsWith('.docx');
    const isPptx = fileName.toLowerCase().endsWith('.pptx') || fileName.toLowerCase().endsWith('.ppt');
    const isImage = /\.(png|jpe?g|gif|bmp|webp|svg|tiff?|ico|avif)$/i.test(fileName);
    const isArchive = /\.(zip|7z|rar)$/i.test(fileName);

    let hoverStyle = {};

    if (isDocx) {
      hoverStyle = {
        background: 'linear-gradient(90deg,rgb(255, 255, 255), #1e40af, #1d4ed8)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'gradient-shift 2s ease-in-out infinite',
      };
    } else if (isExcel) {
      hoverStyle = {
        background: 'linear-gradient(90deg,rgb(221, 255, 233), #16a34a,rgb(0, 90, 42))',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'gradient-shift 2s ease-in-out infinite',
      };
    } else if (isPptx) {
      hoverStyle = {
        background: 'linear-gradient(90deg,rgb(255, 234, 212), #ea580c,rgb(132, 66, 0))',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'gradient-shift 2s ease-in-out infinite',
      };
    } else if (isPdf) {
      hoverStyle = {
        background: 'linear-gradient(90deg,rgb(255, 198, 198), #ef4444,rgb(123, 19, 0))',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'gradient-shift 2s ease-in-out infinite',
      };
    } else if (isImage) {
      hoverStyle = {
        background: 'linear-gradient(90deg,rgb(188, 242, 249), #22d3ee,rgb(0, 62, 93))',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'gradient-shift 2s ease-in-out infinite',
      };
    } else if (isArchive) {
      hoverStyle = {
        background: 'linear-gradient(90deg, #ef4444, #3b82f6, #f59e0b)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'gradient-shift 2s ease-in-out infinite',
      };
    }

    return hoverStyle;
  };

  const visibleFiles = files.filter(file => file.name !== '.keep');
  const isAtRoot = currentPath === `uploads/${contract.id}`;

  return (
    <div>
      {renderBreadcrumb()}

      {/* Back button if not at root folder */}
      {!isAtRoot && (
        <button
          onClick={() => {
            const parts = currentPath.split('/');
            parts.pop();
            onPathChange(parts.join('/'));
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 'clamp(0.5rem, 2.5vw, 1rem)',
            backgroundColor: darkMode ? 'var(--bg-secondary)' : '#eee',
            gap: '4px',
            border: 'none',
            padding: '0.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            marginLeft: '1.25rem',
          }}
        >
          <CornerLeftUp size={isMobile ? 15 : 20} color={darkMode ? "#fff" : "#000"} className='mb-2' /> {t('contract_detail_prev_folder')}
        </button>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {visibleFiles.map((file, idx) => {
          const isFolderItem = isFolder(file);
          const fileName = file.name;
          const originalFileName = getOriginalFileName(fileName);
          const isChecked = selectedFiles.includes(fileName);
          const isHighlighted = highlightedFiles.includes(fileName);

          const baseColor = darkMode ? '#fff' : '#000';
          const style = {
            background: 'none',
            border: 'none',
            color: baseColor,
            textDecoration: 'none',
            cursor: 'pointer',
            padding: 0,
            font: 'inherit',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s',
            ...(hoveredFile === fileName ? getFileHoverStyle(fileName) : {}),
          };

          if (isFolderItem) {
            return (
              <li
                key={fileName}
                ref={el => { if (fileItemRefs?.current) fileItemRefs.current[idx] = el; }}
                style={{
                  marginLeft: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.25rem 0',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => handleCheckboxChange(fileName, !isChecked)}
                />
                <span
                  style={{
                    fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
                    cursor: 'pointer',
                    color: darkMode ? '#fff' : '#000',
                    fontWeight: 'normal',
                    transition: 'font-weight 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                  onClick={() => handleFolderClick(fileName)}
                  onMouseEnter={(e) => { e.currentTarget.style.fontWeight = 'bold'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.fontWeight = 'normal'; }}
                >
                  <FolderOpen size={isMobile ? 14 : 16} className="inline-block mb-0.5" style={{ marginRight: '0.35rem' }} />
                  <span style={{ lineHeight: 1 }}>{originalFileName}</span>
                </span>
              </li>
            );
          }

          return (
            <li
              ref={el => { if (fileItemRefs?.current) fileItemRefs.current[idx] = el; }}
              key={fileName}
              style={{
                marginLeft: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                background: isHighlighted
                  ? 'linear-gradient(90deg, rgba(0, 178, 255, 0.15), rgba(0, 255, 178, 0.1))'
                  : 'transparent',
                transition: 'background-color 0.6s ease',
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleCheckboxChange(fileName, !isChecked)}
              />
                  <button
                    onClick={() => handleFileClick(file)}
                    style={{ ...style, fontSize: 'clamp(0.85rem, 2.2vw, 1rem)' }}
                    onMouseEnter={() => setHoveredFile(fileName)}
                    onMouseLeave={() => setHoveredFile(null)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '0.5rem' }}>
                      {getFileIcon(fileName)}
                    </span>
                    <span style={{ lineHeight: 1 }}>{originalFileName}</span>
                  </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default FileBrowser;
