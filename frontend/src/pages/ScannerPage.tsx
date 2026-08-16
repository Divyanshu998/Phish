import React, { useState } from 'react';
import { Search, ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, Cpu, Layers } from 'lucide-react';
import { apiService, ScanRecord } from '../services/api';

export const ScannerPage: React.FC = () => {
  const [inputUrl, setInputUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showFeatures, setShowFeatures] = useState<boolean>(false);

  const handleScan = async (targetUrl?: string) => {
    const urlToScan = targetUrl || inputUrl;
    if (!urlToScan.trim()) {
      setErrorMsg('Please enter a valid URL to analyze.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiService.scanUrl(urlToScan, 'dashboard');
      setScanResult(res);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.detail || e.message || 'Failed to scan URL.');
    } finally {
      setLoading(false);
    }
  };

  const setPresetAndScan = (url: string) => {
    setInputUrl(url);
    handleScan(url);
  };

  return (
    <div className="soc-container">
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF' }}>ENTER URL TO ANALYZE</h1>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Execute heuristic feature extraction, brand impersonation detection, and machine learning classification.
        </p>
      </div>

      {/* Input Card */}
      <div className="soc-card red-glow" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '14px' }} />
            <input 
              type="text"
              placeholder="e.g. http://suspicious-bank-login-verify.xyz/auth"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              style={{
                width: '100%',
                background: '#050505',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '12px 14px 12px 42px',
                color: '#FFF',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}
            />
          </div>
          <button className="btn-red" onClick={() => handleScan()} disabled={loading}>
            {loading ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
            {loading ? 'ANALYZING...' : 'ANALYZE URL'}
          </button>
        </div>

        {/* Demo Preset Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF' }}>DEMO PRESETS:</span>
          <button className="btn-outline" onClick={() => setPresetAndScan('https://example.com')} style={{ padding: '6px 12px', fontSize: '11px', borderColor: '#10B981', color: '#34D399' }}>
            TRY SAFE EXAMPLE
          </button>
          <button className="btn-outline" onClick={() => setPresetAndScan('http://verify-account-update-alert.xyz/bank')} style={{ padding: '6px 12px', fontSize: '11px', borderColor: '#F59E0B', color: '#FBBF24' }}>
            TRY SUSPICIOUS EXAMPLE
          </button>
          <button className="btn-outline" onClick={() => setPresetAndScan('http://paypal-security-update-fix-account.com-secure.net/login')} style={{ padding: '6px 12px', fontSize: '11px', borderColor: '#E50914', color: '#FCA5A5' }}>
            TRY CRITICAL EXAMPLE
          </button>
        </div>

        {errorMsg && (
          <div style={{ marginTop: '14px', color: '#EF4444', fontSize: '12px', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* Result Breakdown View */}
      {scanResult && (
        <div className="soc-card" style={{ borderTop: `4px solid ${getScoreColor(scanResult.risk_score)}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', marginBottom: '4px' }}>ANALYZED TARGET</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', fontFamily: 'monospace' }}>
                {scanResult.url}
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                Domain: {scanResult.domain} • Source: {scanResult.source.toUpperCase()} • Timestamp: {scanResult.timestamp}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className={`badge-${getBadgeClass(scanResult.classification)}`} style={{ fontSize: '14px', padding: '6px 16px' }}>
                {scanResult.classification}
              </span>
              <div style={{ fontSize: '32px', fontWeight: 900, color: getScoreColor(scanResult.risk_score), marginTop: '4px' }}>
                {scanResult.risk_score} <span style={{ fontSize: '14px', color: '#9CA3AF' }}>/ 100</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* ML Prediction Card */}
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Cpu size={16} /> ML CLASSIFIER INFERENCE
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: scanResult.ml_prediction === 'PHISHING' ? '#E50914' : '#10B981' }}>
                {scanResult.ml_prediction}
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                Confidence Score: <strong>{(scanResult.ml_confidence * 100).toFixed(1)}%</strong>
              </div>
            </div>

            {/* Recommendation Box */}
            <div style={{ background: 'rgba(229,9,20,0.08)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #E50914' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#FCA5A5', marginBottom: '4px' }}>
                ACTIONABLE RECOMMENDATION
              </div>
              <div style={{ fontSize: '13px', color: '#FFF', fontWeight: 600 }}>
                {scanResult.recommendation}
              </div>
            </div>
          </div>

          {/* Risk Factors List */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFF', marginBottom: '10px' }}>
              IDENTIFIED RISK FACTORS & HEURISTIC SIGNALS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scanResult.risk_factors.map((factor, idx) => (
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
                  <AlertTriangle size={16} color={scanResult.risk_score > 60 ? '#E50914' : '#F59E0B'} style={{ flexShrink: 0 }} />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Feature Breakdown Toggle */}
          {scanResult.features && (
            <div>
              <button 
                className="btn-outline"
                onClick={() => setShowFeatures(!showFeatures)}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <Layers size={14} /> {showFeatures ? 'Hide Raw Features' : 'Show Extracted Feature Vectors'}
              </button>

              {showFeatures && (
                <pre style={{
                  background: '#050505',
                  border: '1px solid var(--border-subtle)',
                  padding: '16px',
                  borderRadius: '8px',
                  marginTop: '12px',
                  fontSize: '11px',
                  color: '#34D399',
                  overflowX: 'auto',
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(scanResult.features, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
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
