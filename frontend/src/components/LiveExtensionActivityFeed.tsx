import React, { useEffect, useState } from 'react';
import { Chrome, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService, LiveExtensionActivityItem } from '../services/api';

export const LiveExtensionActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<LiveExtensionActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const fetchActivity = async () => {
    try {
      const data = await apiService.getLiveExtensionActivity();
      setActivities(data);
    } catch (e) {
      console.error("Failed to load live extension activity", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="soc-card red-glow" style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E50914', boxShadow: '0 0 8px #E50914' }} />
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF' }}>
            LIVE EXTENSION ACTIVITY
          </div>
        </div>
        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Polling real MongoDB data</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF', fontSize: '12px' }}>
          <RefreshCw className="spin" size={16} /> Loading extension feed...
        </div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#6B7280', fontSize: '12px' }}>
          No extension scans recorded yet. Use the browser extension to trigger live events.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
          {activities.map((item) => (
            <div 
              key={item.scan_id} 
              onClick={() => navigate(`/dashboard/scan/${item.scan_id}`)}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(229, 9, 20, 0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)'}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
                  <Chrome size={13} color="#60A5FA" />
                  <span style={{ fontWeight: 600, color: '#D1D5DB' }}>{item.browser ? item.browser.toUpperCase() : 'CHROME'} EXTENSION</span>
                  <span>•</span>
                  <span>{formatTime(item.timestamp)}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF', fontFamily: 'monospace' }}>
                  {item.domain || item.url}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`badge-${getBadgeClass(item.classification)}`}>
                  {item.classification}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#FFF' }}>
                  Risk: {item.risk_score}
                </span>
                <ExternalLink size={14} color="#9CA3AF" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function formatTime(tsStr: string): string {
  if (!tsStr) return 'Just now';
  try {
    const dt = new Date(tsStr);
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    return tsStr;
  }
}

function getBadgeClass(cls: string): string {
  if (!cls) return 'safe';
  const lower = cls.toLowerCase();
  if (lower.includes('critical')) return 'critical';
  if (lower.includes('high')) return 'high-risk';
  if (lower.includes('suspicious')) return 'suspicious';
  return 'safe';
}
