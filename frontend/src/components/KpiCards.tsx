import React, { useEffect, useState } from 'react';
import { Database, ShieldAlert, AlertTriangle, Chrome, RefreshCw } from 'lucide-react';
import { apiService, KPIData } from '../services/api';

export const KpiCards: React.FC = () => {
  const [kpis, setKpis] = useState<KPIData>({
    total_scans: 0,
    threats_detected: 0,
    critical_threats: 0,
    extension_scans: 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchKpis = async () => {
    try {
      const data = await apiService.getKPIs();
      setKpis(data);
    } catch (e) {
      console.error("Failed to load KPIs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    const interval = setInterval(fetchKpis, 5000);
    return () => clearInterval(interval);
  }, []);

  const cardItems = [
    {
      title: 'TOTAL SCANS',
      value: kpis.total_scans.toLocaleString(),
      icon: Database,
      accent: '#1565C0',
      glow: 'rgba(21, 101, 192, 0.2)'
    },
    {
      title: 'THREATS DETECTED',
      value: kpis.threats_detected.toLocaleString(),
      icon: ShieldAlert,
      accent: '#F97316',
      glow: 'rgba(249, 115, 22, 0.2)'
    },
    {
      title: 'CRITICAL THREATS',
      value: kpis.critical_threats.toLocaleString(),
      icon: AlertTriangle,
      accent: '#E50914',
      glow: 'rgba(229, 9, 20, 0.25)'
    },
    {
      title: 'EXTENSION SCANS',
      value: kpis.extension_scans.toLocaleString(),
      icon: Chrome,
      accent: '#3B82F6',
      glow: 'rgba(59, 130, 246, 0.2)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '20px',
      marginBottom: '28px'
    }}>
      {cardItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={idx} className="soc-card" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: `4px solid ${item.accent}`
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFF', letterSpacing: '-0.5px' }}>
                {loading ? <RefreshCw className="spin" size={20} /> : item.value}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: item.glow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: item.accent
            }}>
              <Icon size={22} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
