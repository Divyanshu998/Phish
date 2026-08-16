import React, { useEffect, useState } from 'react';
import { Chrome, Download, CheckCircle, AlertTriangle, Shield, RefreshCw, Terminal, Layers } from 'lucide-react';
import { apiService, ExtensionStatusData } from '../services/api';

export const ExtensionPage: React.FC = () => {
  const [extStatus, setExtStatus] = useState<ExtensionStatusData>({
    status: 'connected',
    version: '1.0.0',
    total_extension_scans: 0,
    threats_detected: 0,
    critical_threats: 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiService.getExtensionStatus();
      setExtStatus(data);
    } catch (e) {
      console.error("Failed to load extension status", e);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    "Download or build the browser extension (`cd extension && npm run build`).",
    "Open Google Chrome or Microsoft Edge browser.",
    "Navigate to chrome://extensions (or edge://extensions).",
    "Enable Developer Mode toggle in top right corner.",
    "Click the 'Load unpacked' button.",
    "Select the build output folder: extension/dist/",
    "Pin the PhishGuard AI icon to your browser extension bar.",
    "Navigate to any active website (e.g. https://example.com).",
    "Click the PhishGuard extension icon.",
    "Click ANALYZE WEBSITE to run live backend ML classification!"
  ];

  return (
    <div className="soc-container">
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Chrome color="#E50914" size={26} /> PHISHGUARD BROWSER EXTENSION PORTAL
        </h1>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Manifest V3 browser protection extension synchronized directly with the SOC backend and MongoDB database.
        </p>
      </div>

      {/* Extension Status KPI Banner */}
      <div className="soc-card red-glow" style={{ marginBottom: '28px', borderLeft: '4px solid #E50914' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/icons/icon48.png" alt="PhishGuard Extension" style={{ width: '48px', height: '48px' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#FFF' }}>
                PhishGuard AI Protection Engine
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                Manifest V3 • Version {extStatus.version} • Chrome & Edge Compatible
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              ● CONNECTED TO BACKEND
            </span>

            <a 
              href="/icons/icon128.png" 
              download="phishguard-extension-icon.png"
              className="btn-red"
              style={{ textDecoration: 'none' }}
            >
              <Download size={15} /> DOWNLOAD ASSETS
            </a>
          </div>
        </div>

        {/* Live MongoDB Extension KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>TOTAL EXTENSION SCANS</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFF' }}>
              {loading ? <RefreshCw className="spin" size={16} /> : extStatus.total_extension_scans}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>THREATS DETECTED</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#F97316' }}>
              {loading ? <RefreshCw className="spin" size={16} /> : extStatus.threats_detected}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>CRITICAL THREATS</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#E50914' }}>
              {loading ? <RefreshCw className="spin" size={16} /> : extStatus.critical_threats}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>LAST EXTENSION ACTIVITY</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#60A5FA', marginTop: '6px' }}>
              {extStatus.last_scan_timestamp ? new Date(extStatus.last_scan_timestamp).toLocaleTimeString() : 'Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Installation Instructions Card */}
      <div className="soc-card blue-glow">
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Terminal size={18} color="#60A5FA" />
          BROWSER EXTENSION UNPACKED INSTALLATION GUIDE (CHROME & EDGE)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {steps.map((stepText, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              background: 'rgba(0,0,0,0.3)',
              padding: '12px 14px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{
                background: 'rgba(21, 101, 192, 0.3)',
                color: '#60A5FA',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '11px',
                flexShrink: 0
              }}>
                {idx + 1}
              </span>
              <div style={{ fontSize: '13px', color: '#E5E7EB', lineHeight: 1.5, fontFamily: idx === 0 || idx === 2 || idx === 5 ? 'monospace' : 'inherit' }}>
                {stepText}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
