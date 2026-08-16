import React, { useEffect, useState } from 'react';
import { apiService, ScanRecord } from '../services/api';
import { ShieldAlert, ExternalLink, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ThreatsPage: React.FC = () => {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchThreats();
  }, [filter]);

  const fetchThreats = async () => {
    setLoading(true);
    try {
      const cls = filter === 'ALL' ? undefined : filter;
      const data = await apiService.getScans(50, undefined, cls);
      // Filter threats
      const threatOnly = data.filter(s => s.classification !== 'SAFE');
      setScans(threatOnly);
    } catch (e) {
      console.error("Failed to load threats", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="soc-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert color="#E50914" size={26} /> ACTIVE THREAT INTELLIGENCE
          </h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
            Filtered database view of suspicious, high risk, and critical phishing detections.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-panel)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          {['ALL', 'CRITICAL', 'HIGH RISK', 'SUSPICIOUS'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#E50914' : 'transparent',
                color: filter === f ? '#FFF' : '#9CA3AF',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="soc-card red-glow">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#9CA3AF' }}>
                <th style={{ padding: '12px' }}>URL / DOMAIN</th>
                <th style={{ padding: '12px' }}>RISK SCORE</th>
                <th style={{ padding: '12px' }}>CLASSIFICATION</th>
                <th style={{ padding: '12px' }}>ML PREDICTION</th>
                <th style={{ padding: '12px' }}>SOURCE</th>
                <th style={{ padding: '12px' }}>TIMESTAMP</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.scan_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px', fontWeight: 600, fontFamily: 'monospace', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {scan.domain || scan.url}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 900, color: getScoreColor(scan.risk_score) }}>
                    {scan.risk_score}/100
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge-${getBadgeClass(scan.classification)}`}>
                      {scan.classification}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: scan.ml_prediction === 'PHISHING' ? '#E50914' : '#10B981' }}>
                    {scan.ml_prediction} ({(scan.ml_confidence * 100).toFixed(0)}%)
                  </td>
                  <td style={{ padding: '12px', color: '#9CA3AF', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700 }}>
                    {scan.source}
                  </td>
                  <td style={{ padding: '12px', color: '#9CA3AF', fontSize: '11px' }}>
                    {scan.timestamp}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button 
                      className="btn-outline" 
                      onClick={() => navigate(`/dashboard/scan/${scan.scan_id}`)}
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                    >
                      <ExternalLink size={12} /> Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function getScoreColor(score: number): string {
  if (score <= 30) return '#10B981';
  if (score <= 60) return '#F59E0B';
  if (score <= 80) return '#F97316';
  return '#E50914';
}

function getBadgeClass(cls: string): string {
  if (!cls) return 'safe';
  const lower = cls.toLowerCase();
  if (lower.includes('critical')) return 'critical';
  if (lower.includes('high')) return 'high-risk';
  if (lower.includes('suspicious')) return 'suspicious';
  return 'safe';
}
