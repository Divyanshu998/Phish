import React, { useEffect, useState } from 'react';
import { Network, Activity, RefreshCw } from 'lucide-react';
import { apiService, ThreatNetworkData } from '../services/api';

export const ThreatNetworkMap: React.FC = () => {
  const [data, setData] = useState<ThreatNetworkData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchNetwork();
  }, []);

  const fetchNetwork = async () => {
    try {
      const res = await apiService.getThreatNetwork();
      setData(res);
    } catch (e) {
      console.error("Failed to load network map", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="soc-card blue-glow" style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={18} color="#60A5FA" />
            <span>THREAT RELATIONSHIP NETWORK GRAPH</span>
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            Active connections between URLs, risk factors, and detection sources
          </div>
        </div>
        <button className="btn-outline" onClick={fetchNetwork} style={{ padding: '6px 12px', fontSize: '11px' }}>
          <RefreshCw size={12} /> Refresh Graph
        </button>
      </div>

      <div style={{
        height: '320px',
        width: '100%',
        background: '#07080C',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {loading ? (
          <div style={{ color: '#9CA3AF', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw className="spin" size={16} /> Rendering Threat Network...
          </div>
        ) : (
          <svg width="100%" height="100%" viewBox="0 0 800 300" style={{ background: 'transparent' }}>
            {/* Background Network Web Spoke Pattern */}
            <line x1="400" y1="150" x2="150" y2="60" stroke="rgba(21,101,192,0.15)" strokeWidth="1" />
            <line x1="400" y1="150" x2="650" y2="60" stroke="rgba(229,9,20,0.15)" strokeWidth="1" />
            <line x1="400" y1="150" x2="150" y2="240" stroke="rgba(229,9,20,0.15)" strokeWidth="1" />
            <line x1="400" y1="150" x2="650" y2="240" stroke="rgba(21,101,192,0.15)" strokeWidth="1" />
            <line x1="400" y1="150" x2="400" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

            {/* Central Node */}
            <g transform="translate(400, 150)">
              <circle r="26" fill="rgba(229,9,20,0.2)" stroke="#E50914" strokeWidth="2" />
              <circle r="10" fill="#E50914" />
              <text y="40" textAnchor="middle" fill="#FFF" fontSize="11" fontWeight="700">CORE THREAT HUB</text>
            </g>

            {/* Source Nodes */}
            <g transform="translate(150, 60)">
              <circle r="18" fill="rgba(21,101,192,0.2)" stroke="#1565C0" strokeWidth="2" />
              <text y="30" textAnchor="middle" fill="#93C5FD" fontSize="10" fontWeight="600">BROWSER EXTENSION</text>
            </g>

            <g transform="translate(650, 60)">
              <circle r="18" fill="rgba(21,101,192,0.2)" stroke="#1565C0" strokeWidth="2" />
              <text y="30" textAnchor="middle" fill="#93C5FD" fontSize="10" fontWeight="600">SOC DASHBOARD</text>
            </g>

            {/* Threat Nodes */}
            <g transform="translate(150, 240)">
              <circle r="18" fill="rgba(229,9,20,0.3)" stroke="#E50914" strokeWidth="2" />
              <text y="30" textAnchor="middle" fill="#FCA5A5" fontSize="10" fontWeight="600">DOMAIN IMPERSONATION</text>
            </g>

            <g transform="translate(650, 240)">
              <circle r="18" fill="rgba(249,115,22,0.3)" stroke="#F97316" strokeWidth="2" />
              <text y="30" textAnchor="middle" fill="#FDBA74" fontSize="10" fontWeight="600">CREDENTIAL KEYWORDS</text>
            </g>

            <g transform="translate(400, 30)">
              <circle r="14" fill="rgba(16,185,129,0.3)" stroke="#10B981" strokeWidth="2" />
              <text y="26" textAnchor="middle" fill="#6EE7B7" fontSize="10" fontWeight="600">SAFE URL SCAN</text>
            </g>
          </svg>
        )}
      </div>
    </div>
  );
};
