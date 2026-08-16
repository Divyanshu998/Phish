import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, ArrowLeft, Cpu, Globe, Clock, Tag, RefreshCw } from 'lucide-react';
import { apiService, ScanRecord } from '../services/api';

export const ScanDetailPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (scanId) {
      fetchScanDetail(scanId);
    }
  }, [scanId]);

  const fetchScanDetail = async (id: string) => {
    setLoading(true);
    try {
      const data = await apiService.getScanById(id);
      setScan(data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Scan record not found.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="soc-container" style={{ textAlign: 'center', padding: '60px' }}>
        <RefreshCw className="spin" size={24} color="#E50914" />
        <div style={{ marginTop: '12px', color: '#9CA3AF', fontSize: '13px' }}>Loading Threat Analysis...</div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="soc-container">
        <button className="btn-outline" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="soc-card" style={{ textAlign: 'center', padding: '40px', color: '#EF4444' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 12px' }} />
          <h3>{error || 'Scan record not found'}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="soc-container">
      <button className="btn-outline" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="soc-card red-glow" style={{ borderTop: `4px solid ${getScoreColor(scan.risk_score)}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', marginBottom: '4px' }}>
              SCAN ID: {scan.scan_id}
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#FFF', fontFamily: 'monospace' }}>
              {scan.url}
            </h1>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={13} /> {scan.domain}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={13} /> SOURCE: {scan.source.toUpperCase()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> {scan.timestamp}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className={`badge-${getBadgeClass(scan.classification)}`} style={{ fontSize: '14px', padding: '6px 16px' }}>
              {scan.classification}
            </span>
            <div style={{ fontSize: '36px', fontWeight: 900, color: getScoreColor(scan.risk_score), marginTop: '4px' }}>
              {scan.risk_score} <span style={{ fontSize: '14px', color: '#9CA3AF' }}>/ 100</span>
            </div>
          </div>
        </div>

        {/* Breakdown Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Cpu size={16} /> ML PREDICTION
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: scan.ml_prediction === 'PHISHING' ? '#E50914' : '#10B981' }}>
              {scan.ml_prediction}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
              Classifier Confidence: {(scan.ml_confidence * 100).toFixed(1)}%
            </div>
          </div>

          <div style={{ background: 'rgba(229,9,20,0.08)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #E50914' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#FCA5A5', marginBottom: '4px' }}>
              ACTIONABLE RECOMMENDATION
            </div>
            <div style={{ fontSize: '13px', color: '#FFF', fontWeight: 600 }}>
              {scan.recommendation}
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFF', marginBottom: '12px' }}>
            PRIMARY RISK FACTORS & SIGNALS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scan.risk_factors.map((factor, idx) => (
              <div key={idx} style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                padding: '10px 14px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#E5E7EB'
              }}>
                <AlertTriangle size={16} color={scan.risk_score > 60 ? '#E50914' : '#F59E0B'} style={{ flexShrink: 0 }} />
                <span>{factor}</span>
              </div>
            ))}
          </div>
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
