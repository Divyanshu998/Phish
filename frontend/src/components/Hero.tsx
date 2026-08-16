import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, AlertOctagon } from 'lucide-react';

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="soc-card red-glow" style={{
      position: 'relative',
      overflow: 'hidden',
      padding: '32px 36px',
      background: 'linear-gradient(135deg, #0B0B0F 0%, #111318 100%)',
      marginBottom: '28px'
    }}>
      {/* Background Web Geometry Overlay */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '320px',
        height: '320px',
        pointerEvents: 'none',
        opacity: 0.12,
        backgroundImage: 'radial-gradient(circle, #E50914 1px, transparent 1px)',
        backgroundSize: '16px 16px'
      }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '750px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(229, 9, 20, 0.12)',
          border: '1px solid rgba(229, 9, 20, 0.3)',
          color: '#E50914',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 700,
          marginBottom: '16px'
        }}>
          <Shield size={14} /> THREAT INTELLIGENCE CENTER
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#FFF', letterSpacing: '-0.5px', marginBottom: '12px' }}>
          Real-Time Web Threat Detection & Phishing Analytics
        </h1>

        <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '24px', lineHeight: 1.6 }}>
          Monitor global phishing activity, analyze suspicious URL structures using machine learning and heuristic extraction rules, and seamlessly sync protection across your web browser extension.
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button className="btn-red" onClick={() => navigate('/dashboard/scanner')}>
            <Search size={16} /> SCAN URL
          </button>
          <button className="btn-blue" onClick={() => navigate('/dashboard/threats')}>
            <AlertOctagon size={16} /> VIEW THREATS
          </button>
        </div>
      </div>
    </div>
  );
};
