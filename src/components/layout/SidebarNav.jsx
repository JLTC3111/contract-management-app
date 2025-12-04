import React, { useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

/**
 * Sidebar Button Component
 * Reusable button for sidebar navigation items
 */
export const SidebarButton = ({ 
  icon, 
  label, 
  onClick, 
  collapsed, 
  path, 
  currentPath, 
  toggleable, 
  isOpen, 
  onToggle,
  disabled = false,
  ...rest 
}) => {
  let isActive = false;
  if (path === '/') {
    isActive = currentPath === '/';
  } else if (path) {
    isActive = currentPath?.startsWith(path);
  }
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className="sidebar-button"
      {...rest}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'space-between',
        cursor: disabled ? 'not-allowed' : 'pointer',
        marginBottom: isMobile ? '0' : '1rem',
        marginRight: isMobile ? '0.5rem' : '0',
        width: isMobile ? 'auto' : '100%',
        maxWidth: isMobile ? 'auto' : '100%',
        padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
        borderRadius: '8px',
        backgroundColor: isActive ? 'var(--sidebar-active-bg, #c7d2fe)' : 'transparent',
        color: isActive ? 'var(--sidebar-active-text, rgb(220, 229, 254))' : undefined,
        fontWeight: isActive ? 'bold' : 'normal',
        transition: 'transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease, color 0.3s ease',
        transform: 'translateX(0)',
        boxShadow: 'none',
        position: 'relative',
        overflow: 'hidden',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.backgroundColor = 'var(--sidebar-hover-bg, #e0e7ff)';
        e.currentTarget.style.transform = 'translateX(4px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        e.currentTarget.style.borderRadius = '10px';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isActive ? 'var(--sidebar-active-bg, #c7d2fe)' : 'transparent';
        e.currentTarget.style.transform = 'translateX(0) scale(1)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderRadius = '8px';
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed || isMobile ? 0 : '0.5rem',
          justifyContent: collapsed || isMobile ? 'center' : 'flex-start',
          width: 'fit-content',
          paddingLeft: isMobile ? '0' : '0',
          flex: 1,
          pointerEvents: 'none',
        }}
      >
        {icon}
        {(!collapsed && !isMobile) && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      </div>
      {!collapsed && toggleable && (
        <div 
          style={{ marginRight: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
          onClick={(e) => { 
            e.stopPropagation(); 
            onToggle?.(); 
          }}
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      )}
    </div>
  );
};

/**
 * SubMenu Component
 * Animated submenu for sidebar navigation
 */
export const SubMenu = ({ items }) => {
  const { darkMode } = useTheme();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  
  // Reset refs before rendering
  itemRefs.current = [];
  
  const setItemRef = useCallback((el, idx) => {
    if (el) itemRefs.current[idx] = el;
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      import('gsap').then(({ default: gsap }) => {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
        if (itemRefs.current.length) {
          gsap.fromTo(
            itemRefs.current,
            { opacity: 0, x: 20 },
            { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out', stagger: 0.1, delay: 0.1 }
          );
        }
      });
    }
  }, [items.length]);

  return (
    <div className="submenu-container" ref={containerRef}>
      <ul style={{
        marginTop: '-.5rem',
        marginLeft: '.25rem',
        marginBottom: '1rem',
        paddingLeft: '.25rem',
        listStyle: 'none',
        ...(isMobile && { display: 'flex', flexDirection: 'row', gap: '10px' })
      }}>
        {items.map(({ label, icon, onClick }, index) => (
          <li
            key={`${label}-${index}`}
            ref={(el) => setItemRef(el, index)}
            onClick={onClick}
            style={{
              fontSize: '0.9rem',
              color: darkMode ? '#fff' : 'var(--sidebar-text)',
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              transition: 'transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease, color 0.3s ease',
              justifyContent: 'flex-start',
              width: '100%',
              maxWidth: '100%',
              borderBottom: !isMobile && index !== items.length - 1 ? '1px solid var(--card-border)' : 'none',
              transform: 'translateX(0) scale(1)',
              boxShadow: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = darkMode ? '#232b3b' : '#e0e7ff';
              e.currentTarget.style.color = darkMode ? '#fff' : '#000';
              e.currentTarget.style.transform = 'translateX(4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.borderRadius = '6px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = darkMode ? '#fff' : 'var(--sidebar-text)';
              e.currentTarget.style.transform = 'translateX(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderRadius = '4px';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {icon}
            </span>
            <span style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SidebarButton;
