import React from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

/**
 * Reusable loading spinner component
 * 
 * @param {string} size - Size variant: 'sm', 'md', 'lg', 'xl'
 * @param {string} color - Color (CSS color or CSS variable)
 * @param {string} text - Optional loading text
 * @param {boolean} fullScreen - Whether to show fullscreen overlay
 * @param {string} variant - Spinner style: 'spin', 'pulse', 'dots'
 */
const LoadingSpinner = ({
  size = 'md',
  color = 'var(--primary)',
  text = null,
  fullScreen = false,
  variant = 'spin'
}) => {
  const sizes = {
    sm: { icon: 16, fontSize: '0.75rem' },
    md: { icon: 24, fontSize: '0.875rem' },
    lg: { icon: 40, fontSize: '1rem' },
    xl: { icon: 64, fontSize: '1.125rem' }
  };
  
  const sizeConfig = sizes[size] || sizes.md;
  
  const renderSpinner = () => {
    if (variant === 'dots') {
      return (
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: sizeConfig.icon / 4,
                height: sizeConfig.icon / 4,
                borderRadius: '50%',
                backgroundColor: color,
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
              }}
            />
          ))}
        </div>
      );
    }
    
    if (variant === 'pulse') {
      return (
        <div
          style={{
            width: sizeConfig.icon,
            height: sizeConfig.icon,
            borderRadius: '50%',
            backgroundColor: color,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      );
    }
    
    // Default: spin
    return (
      <RefreshCw
        size={sizeConfig.icon}
        style={{
          color: color,
          animation: 'spin 1s linear infinite'
        }}
      />
    );
  };
  
  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem'
      }}
    >
      {renderSpinner()}
      
      {text && (
        <span
          style={{
            color: 'var(--text)',
            fontSize: sizeConfig.fontSize,
            opacity: 0.8
          }}
        >
          {text}
        </span>
      )}
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
  
  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998
        }}
      >
        <div
          style={{
            background: 'var(--card-bg)',
            padding: '2rem 3rem',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          {content}
        </div>
      </div>
    );
  }
  
  return content;
};

/**
 * Inline loading indicator for buttons, etc.
 */
export const InlineSpinner = ({ size = 14, color = 'currentColor' }) => (
  <span
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      border: `2px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }}
  />
);

/**
 * Skeleton loading placeholder
 */
export const Skeleton = ({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '4px',
  style = {}
}) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, var(--card-border) 25%, var(--hover-bg) 50%, var(--card-border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style
    }}
  >
    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

/**
 * Card skeleton for loading states
 */
export const CardSkeleton = ({ rows = 3 }) => (
  <div
    style={{
      background: 'var(--card-bg)',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '1px solid var(--card-border)'
    }}
  >
    <Skeleton width="60%" height="1.25rem" style={{ marginBottom: '1rem' }} />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton 
        key={i} 
        width={`${100 - i * 15}%`} 
        height="0.875rem" 
        style={{ marginBottom: '0.5rem' }} 
      />
    ))}
  </div>
);

export default LoadingSpinner;
