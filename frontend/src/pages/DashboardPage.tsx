import React, { useEffect, useState, useRef } from 'react';
import { Hero } from '../components/Hero';
import { KpiCards } from '../components/KpiCards';
import { LiveExtensionActivityFeed } from '../components/LiveExtensionActivityFeed';
import { ThreatNetworkMap } from '../components/ThreatNetworkMap';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { apiService, ScanRecord } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Radio } from 'lucide-react';

interface LiveFeedEvent {
  id: string;
  timestamp: string;
  url: string;
  domain: string;
  classification: string;
  risk_score: number;
  ml_prediction: string;
  source: string;
}

export const DashboardPage: React.FC = () => {
  const [distData, setDistData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [liveFeed, setLiveFeed] = useState<LiveFeedEvent[]>([]);
  const navigate = useNavigate();
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    loadDashboardData();
    setupSSE();
    return () => sseRef.current?.close();
  }, []);

  const loadDashboardData = async () => {
    try {
      const dist = await apiService.getThreatDistribution();
      setDistData([
        { name: 'SAFE', value: dist.SAFE || 0, color: '#10B981' },
        { name: 'SUSPICIOUS', value: dist.SUSPICIOUS || 0, color: '#F59E0B' },
        { name: 'HIGH RISK', value: dist['HIGH RISK'] || 0, color: '#F97316' },
        { name: 'CRITICAL', value: dist.CRITICAL || 0, color: '#E50914' },
      ]);
      const scans = await apiService.getRecentScans(8);
      setRecentScans(scans);

      // Populate live feed from latest scans
      setLiveFeed(scans.slice(0, 6).map(s => ({
        id: s.scan_id,
        timestamp: s.timestamp || '',
        url: s.url,
        domain: s.domain || s.url,
        classification: s.classification,
        risk_score: s.risk_score,
        ml_prediction: s.ml_prediction,
        source: s.source || 'dashboard'
      })));
    } catch (e) {
      console.error('Error loading dashboard data', e);
    }
  };

  const setupSSE = () => {
    try {
      const sse = new EventSource('http://localhost:8000/api/notifications/stream');
      sseRef.current = sse;
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'scan_result' && data.data) {
            const scan = data.data;
            const newEvent: LiveFeedEvent = {
              id: scan.scan_id || Date.now().toString(),
              timestamp: scan.timestamp || new Date().toISOString(),
              url: scan.url,
              domain: scan.domain || scan.url,
              classification: scan.classification,
              risk_score: scan.risk_score,
              ml_prediction: scan.ml_prediction,
              source: scan.source || 'dashboard'
            };
            setLiveFeed(prev => [newEvent, ...prev].slice(0, 20));
            // Refresh KPIs and scans
            loadDashboardData();
          }
        } catch {}
      };
      sse.onerror = () => {
        sse.close();
        // Fallback polling
        const poll = setInterval(loadDashboardData, 15000);
        return () => clearInterval(poll);
      };
    } catch {}
  };

  const getClassColor = (cls: string) => {
    if (cls === 'CRITICAL') return '#ef4444';
    if (cls === 'HIGH RISK') return '#f97316';
    if (cls === 'SUSPICIOUS') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="soc-container">
      {/* Hero */}
      <Hero />

      {/* KPI Cards */}
      <KpiCards />

      {/* Grid: Network Map & Live Extension Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        <ThreatNetworkMap />
        <LiveExtensionActivityFeed />
      </div>

      {/* Grid: Distribution & Recent Scans */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '28px' }}>
        {/* Threat Distribution Chart */}
        <div className="soc-card blue-glow">
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', marginBottom: '16px' }}>
            THREAT DISTRIBUTION
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {distData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#050505" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111318', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFF' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Scans Table */}
        <div className="soc-card red-glow">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF' }}>RECENT THREAT ANALYSES</div>
            <button className="btn-outline" onClick={() => navigate('/history')} style={{ padding: '6px 12px', fontSize: '11px' }}>
              View All History
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#9CA3AF' }}>
                  <th style={{ padding: '10px' }}>URL / DOMAIN</th>
                  <th style={{ padding: '10px' }}>RISK SCORE</th>
                  <th style={{ padding: '10px' }}>CLASSIFICATION</th>
                  <th style={{ padding: '10px' }}>SOURCE</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan) => (
                  <tr key={scan.scan_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px', fontWeight: 600, fontFamily: 'monospace', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scan.domain || scan.url}
                    </td>
                    <td style={{ padding: '10px', fontWeight: 900, color: getClassColor(scan.classification) }}>
                      {scan.risk_score}/100
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span className={`badge-${getBadgeClass(scan.classification)}`}>{scan.classification}</span>
                    </td>
                    <td style={{ padding: '10px', color: '#9CA3AF', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700 }}>
                      {scan.source}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button className="btn-outline" onClick={() => navigate(`/dashboard/scan/${scan.scan_id}`)} style={{ padding: '4px 8px', fontSize: '10px' }}>
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

      {/* LIVE THREAT FEED */}
      <div className="soc-card" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(8,12,24,0.95)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Radio size={16} color="#ef4444" style={{ animation: 'pulse 1.5s infinite' }} />
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', letterSpacing: '0.5px' }}>
            LIVE THREAT FEED
          </div>
          <span style={{ fontSize: '10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
            REAL-TIME
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {liveFeed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#475569', fontSize: '12px' }}>
              Waiting for scan events... Scan a URL to see live results.
            </div>
          ) : (
            liveFeed.map((event) => (
              <div
                key={event.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 100px 90px 80px',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/dashboard/scan/${event.id}`)}
              >
                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.domain}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', fontWeight: 600 }}>
                    {event.source.replace(/_/g, ' ')}
                  </div>
                </div>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    background: `${getClassColor(event.classification)}22`,
                    border: `1px solid ${getClassColor(event.classification)}55`,
                    color: getClassColor(event.classification),
                    textAlign: 'center'
                  }}
                >
                  {event.classification}
                </span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: getClassColor(event.classification) }}>
                  Risk: {event.risk_score}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>
                  ML: {event.ml_prediction}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

function getBadgeClass(cls: string): string {
  if (!cls) return 'safe';
  const lower = cls.toLowerCase();
  if (lower.includes('critical')) return 'critical';
  if (lower.includes('high')) return 'high-risk';
  if (lower.includes('suspicious')) return 'suspicious';
  return 'safe';
}
