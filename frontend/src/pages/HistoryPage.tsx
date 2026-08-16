import React, { useEffect, useState } from 'react';
import { apiService, ScanRecord } from '../services/api';
import { History, Search, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HistoryPage: React.FC = () => {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, [sourceFilter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const src = sourceFilter === 'ALL' ? undefined : sourceFilter;
      const data = await apiService.getScans(100, src);
      setScans(data);
    } catch (e) {
      console.error("Error loading scan history", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredScans = scans.filter(s => 
    s.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="soc-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History color="#60A5FA" size={26} /> HISTORICAL SCAN AUDIT LOG
          </h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
            Complete audit trail of website threat analyses persisted in MongoDB.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input 
              type="text"
              placeholder="Search domain or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px 12px 6px 30px',
                color: '#FFF',
                fontSize: '12px'
              }}
            />
          </div>

          <select 
            value={sourceFilter} 
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
              color: '#FFF',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px'
            }}
          >
            <option value="ALL">All Sources</option>
            <option value="dashboard">Dashboard</option>
            <option value="browser_extension">Browser Extension</option>
            <option value="api">API</option>
            <option value="manual_scanner">Manual Scanner</option>
          </select>
        </div>
      </div>

      <div className="soc-card blue-glow">
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
                <th style={{ padding: '12px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.map((scan) => (
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
                    {scan.ml_prediction}
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
                      <ExternalLink size={12} /> View
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
