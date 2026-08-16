import React from 'react';

interface PhishGuardLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const PhishGuardLogo: React.FC<PhishGuardLogoProps> = ({ size = 36, showText = true, className = '' }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }} className={className}>
      <div 
        style={{ 
          width: size, 
          height: size, 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg viewBox="0 0 100 100" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer Glowing Cyber Shield */}
          <path 
            d="M50 8L15 25V48C15 70 30 88 50 94C70 88 85 70 85 48V25L50 8Z" 
            fill="url(#shield_grad)" 
            stroke="#ef4444" 
            strokeWidth="3.5"
            style={{ filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' }}
          />

          {/* Spider Web Geometry Lines */}
          <path d="M50 18V82" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
          <path d="M22 32L78 68" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
          <path d="M22 68L78 32" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />

          {/* Radial Web Concentric Geometry */}
          <path d="M50 30C62 30 70 38 70 50C70 62 62 70 50 70C38 70 30 62 30 50C30 38 38 30 50 30Z" stroke="#ef4444" strokeWidth="1.5" opacity="0.6" fill="none" />
          
          {/* Stylized Letter 'P' with Spider Nodes */}
          <path 
            d="M40 32H54C62 32 67 36 67 43C67 50 62 54 54 54H40V68H47V54H54" 
            stroke="#ffffff" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <circle cx="50" cy="50" r="3.5" fill="#ef4444" />
          <circle cx="35" cy="35" r="2.5" fill="#3b82f6" />
          <circle cx="65" cy="35" r="2.5" fill="#3b82f6" />
          <circle cx="35" cy="65" r="2.5" fill="#3b82f6" />
          <circle cx="65" cy="65" r="2.5" fill="#3b82f6" />

          <defs>
            <linearGradient id="shield_grad" x1="50" y1="8" x2="50" y2="94" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#090d16" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {showText && (
        <div>
          <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px', color: '#FFFFFF', lineHeight: 1.1 }}>
            PHISHGUARD <span style={{ color: '#EF4444' }}>AI</span>
          </div>
          <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700, letterSpacing: '1.2px' }}>
            CYBER THREAT PROTECTION
          </div>
        </div>
      )}
    </div>
  );
};
