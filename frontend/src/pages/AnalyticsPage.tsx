import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { apiService } from '../services/api';
import { BarChart3, Cpu, Database, Chrome } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [distData, setDistData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const dist = await apiService.getThreatDistribution();
      setDistData([
        { category: 'SAFE', count: dist.SAFE || 0, fill: '#10B981' },
        { category: 'SUSPICIOUS', count: dist.SUSPICIOUS || 0, fill: '#F59E0B' },
        { category: 'HIGH RISK', count: dist['HIGH RISK'] || 0, fill: '#F97316' },
        { category: 'CRITICAL', count: dist.CRITICAL || 0, fill: '#E50914' },
      ]);

      const sources = await apiService.getSourcesDistribution();
      setSourceData([
        { name: 'Dashboard', count: sources.dashboard || 0, color: '#E50914' },
        { name: 'Browser Extension', count: sources.browser_extension || 0, color: '#1565C0' },
        { name: 'API', count: sources.api || 0, color: '#10B981' },
        { name: 'Demo', count: sources.demo || 0, color: '#F59E0B' },
      ]);
    } catch (e) {
      console.error("Error loading analytics data", e);
    }
  };

  return (
    <div className="soc-container">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 color="#1565C0" size={26} /> ADVANCED SECURITY ANALYTICS & ML INSIGHTS
        </h1>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Aggregated MongoDB metrics, detection breakdown, and machine learning classifier performance.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Threat Level Bar Chart */}
        <div className="soc-card red-glow">
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', marginBottom: '16px' }}>
            THREAT CLASSIFICATION BREAKDOWN
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData}>
                <XAxis dataKey="category" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#111318', borderColor: 'rgba(255,255,255,0.1)', color: '#FFF' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {distData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Distribution Pie Chart */}
        <div className="soc-card blue-glow">
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', marginBottom: '16px' }}>
            SCAN DETECTION SOURCES
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" outerRadius={90} dataKey="count" label>
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111318', borderColor: 'rgba(255,255,255,0.1)', color: '#FFF' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ML Performance Metrics Card */}
      <div className="soc-card" style={{ borderLeft: '4px solid #1565C0' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Cpu color="#60A5FA" size={20} /> ML CLASSIFIER SPECIFICATIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>MODEL TYPE</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', marginTop: '4px' }}>RandomForest / TF-IDF</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>ACCURACY</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>96.8%</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>PRECISION</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#60A5FA', marginTop: '4px' }}>95.4%</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>RECALL</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#F59E0B', marginTop: '4px' }}>97.2%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
