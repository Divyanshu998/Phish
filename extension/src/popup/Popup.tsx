import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, ExternalLink, RefreshCw, Settings as SettingsIcon, History as HistoryIcon, Activity } from 'lucide-react';
import { ScanResult, LocalScanItem, ExtensionSettings } from '../types';
import { checkBackendHealth, executeExtensionScan } from '../services/api';
import { getSettings, saveSettings, getScanHistory, addScanToHistory } from '../utils/storage';
import './Popup.css';

export const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'settings'>('scan');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [isUnsupported, setIsUnsupported] = useState<boolean>(false);
  const [unsupportedReason, setUnsupportedReason] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [history, setHistory] = useState<LocalScanItem[]>([]);
  const [settings, setSettingsState] = useState<ExtensionSettings>({
    apiServer: 'http://localhost:8000',
    autoOpenReport: true,
    saveLocalHistory: true
  });
  const [testResult, setTestResult] = useState<string>('');

  // 1. Initial Load & URL Detection
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const savedSettings = await getSettings();
    setSettingsState(savedSettings);

    const online = await checkBackendHealth(savedSettings.apiServer);
    setIsOnline(online);

    const scanHist = await getScanHistory();
    setHistory(scanHist);

    // Detect Active Tab URL in Chrome/Edge
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          processDetectedUrl(tabs[0].url);
        } else {
          processDetectedUrl('https://example.com');
        }
      });
    } else {
      // Fallback for standalone dev mode
      processDetectedUrl('https://example.com');
    }
  };

  const processDetectedUrl = (url: string) => {
    setCurrentUrl(url);
    try {
      const parsed = new URL(url);
      setCurrentDomain(parsed.hostname);

      if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) {
        setIsUnsupported(true);
        setUnsupportedReason('Browser internal system pages cannot be analyzed.');
      } else {
        setIsUnsupported(false);
      }
    } catch (e) {
      setIsUnsupported(true);
      setUnsupportedReason('Invalid URL structure detected.');
    }
  };

  // 2. Perform Scan
  const handleAnalyze = async () => {
    if (isUnsupported || !currentUrl) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await executeExtensionScan(currentUrl, settings.apiServer, 'chrome');
      setScanResult(result);

      if (settings.saveLocalHistory) {
        const item: LocalScanItem = {
          scan_id: result.scan_id,
          url: result.url,
          domain: result.domain,
          risk_score: result.risk_score,
          classification: result.classification,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        await addScanToHistory(item);
        const updatedHist = await getScanHistory();
        setHistory(updatedHist);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to communicate with PhishGuard backend API.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Open Security Dashboard
  const handleOpenDashboard = (scanId?: string) => {
    const targetUrl = scanId 
      ? `http://localhost:5173/dashboard/scan/${scanId}`
      : 'http://localhost:5173/dashboard';

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  // 4. Test Settings Connection
  const handleTestConnection = async () => {
    setTestResult('Testing connection...');
    const ok = await checkBackendHealth(settings.apiServer);
    setIsOnline(ok);
    if (ok) {
      setTestResult('● Backend API is Online & Connected!');
    } else {
      setTestResult('✖ Connection Failed. Ensure FastAPI backend is running on port 8000.');
    }
  };

  const handleSaveSettings = async (newSettings: ExtensionSettings) => {
    setSettingsState(newSettings);
    await saveSettings(newSettings);
  };

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="popup-header">
        <div className="brand-section">
          <img src="/icons/icon32.png" alt="PhishGuard AI" className="brand-icon" />
          <div>
            <div className="brand-title">🕷 PHISHGUARD AI</div>
            <div className="brand-sub">Web Threat Protection</div>
          </div>
        </div>
        <div className="status-badge">
          <button 
            onClick={async () => {
              const newState = !(settings as any).realtimeProtection;
              const updated = { ...settings, realtimeProtection: newState };
              setSettingsState(updated as any);
              await saveSettings(updated as any);
              if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({ realtimeProtection: newState });
              }
            }}
            style={{
              background: (settings as any).realtimeProtection !== false ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${(settings as any).realtimeProtection !== false ? '#10B981' : '#EF4444'}`,
              color: (settings as any).realtimeProtection !== false ? '#10B981' : '#EF4444',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '9px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            REAL-TIME PROTECTION {(settings as any).realtimeProtection !== false ? '● ON' : '○ OFF'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="popup-tabs">
        <button 
          className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
          onClick={() => setActiveTab('scan')}
        >
          <Activity size={13} /> Analyze
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <HistoryIcon size={13} /> History
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={13} /> Settings
        </button>
      </nav>

      {/* Content */}
      <main className="popup-content">
        {activeTab === 'scan' && (
          <>
            {/* Current Website Section */}
            <div className="card">
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px', fontWeight: 600 }}>
                CURRENT WEBSITE
              </div>
              <div className="url-box">
                {currentDomain || currentUrl || 'Detecting URL...'}
              </div>
            </div>

            {/* Offline Alert */}
            {!isOnline && (
              <div className="recommendation-box" style={{ background: 'rgba(229, 9, 20, 0.15)', borderColor: '#E50914' }}>
                PhishGuard API is offline. Start the backend (`uvicorn app.main:app`) and click test connection.
              </div>
            )}

            {/* Unsupported Page Alert */}
            {isUnsupported ? (
              <div className="card" style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '11px' }}>
                <AlertTriangle size={24} color="#F59E0B" style={{ margin: '0 auto 6px' }} />
                <div>{unsupportedReason}</div>
              </div>
            ) : (
              <>
                {/* Analyze Trigger */}
                <button 
                  className="btn-primary" 
                  onClick={handleAnalyze}
                  disabled={loading || !isOnline}
                  style={{ opacity: (loading || !isOnline) ? 0.6 : 1 }}
                >
                  {loading ? <RefreshCw className="spin" size={14} /> : <Shield size={14} />}
                  {loading ? 'ANALYZING THREATS...' : scanResult ? 'RE-ANALYZE WEBSITE' : 'ANALYZE WEBSITE'}
                </button>

                {errorMsg && (
                  <div style={{ fontSize: '11px', color: '#EF4444', textAlign: 'center' }}>
                    {errorMsg}
                  </div>
                )}

                {/* Scan Result Output */}
                {scanResult && (
                  <div className={`risk-display ${scanResult.classification.replace(' ', '_')}`}>
                    <div className={`risk-badge ${scanResult.classification.replace(' ', '_')}`}>
                      {scanResult.classification}
                    </div>
                    <div>
                      <span className="risk-score-value">{scanResult.risk_score}</span>
                      <span className="risk-score-denom"> / 100</span>
                    </div>

                    <div style={{ fontSize: '10px', color: '#D1D5DB', marginTop: '6px', fontWeight: 600 }}>
                      ML Model: <span style={{ color: scanResult.ml_prediction === 'PHISHING' ? '#EF4444' : '#10B981' }}>
                        {scanResult.ml_prediction}
                      </span> ({roundConfidence(scanResult.ml_confidence)}% confidence)
                    </div>

                    {/* Risk Factors */}
                    <div style={{ width: '100%', marginTop: '10px', textAlign: 'left' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', marginBottom: '4px' }}>
                        PRIMARY RISK FACTORS
                      </div>
                      <ul className="factors-list">
                        {scanResult.risk_factors.map((factor, idx) => (
                          <li key={idx} className="factor-item">
                            <AlertTriangle size={12} color={scanResult.risk_score > 60 ? '#EF4444' : '#F59E0B'} style={{ flexShrink: 0 }} />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendation */}
                    <div className="recommendation-box" style={{ marginTop: '10px', width: '100%', textAlign: 'left' }}>
                      {scanResult.recommendation}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Dashboard Redirect Button */}
            <button 
              className="btn-secondary"
              onClick={() => handleOpenDashboard(scanResult?.scan_id)}
            >
              <ExternalLink size={13} />
              OPEN SECURITY DASHBOARD
            </button>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="card" style={{ padding: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>
              RECENT EXTENSION SCANS
            </div>
            {history.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: '#6B7280' }}>
                No recent extension scans recorded.
              </div>
            ) : (
              history.map((item, idx) => (
                <div key={idx} className="history-item" onClick={() => handleOpenDashboard(item.scan_id)} style={{ cursor: 'pointer' }}>
                  <div>
                    <div className="history-domain">{item.domain || item.url}</div>
                    <div style={{ fontSize: '9px', color: '#6B7280' }}>{item.timestamp}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`mini-badge ${item.classification.replace(' ', '_')}`}>
                      {item.classification}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 700 }}>{item.risk_score}/100</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                API SERVER ENDPOINT
              </label>
              <input 
                type="text" 
                value={settings.apiServer} 
                onChange={(e) => handleSaveSettings({ ...settings, apiServer: e.target.value })}
                style={{ width: '100%', background: '#000', border: '1px solid var(--border-color)', color: '#FFF', padding: '6px 8px', borderRadius: '4px', fontSize: '11px' }}
              />
            </div>

            <button className="btn-secondary" onClick={handleTestConnection}>
              TEST CONNECTION
            </button>

            {testResult && (
              <div style={{ fontSize: '10px', color: isOnline ? '#10B981' : '#EF4444', textAlign: 'center' }}>
                {testResult}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '10px', color: '#6B7280', lineHeight: 1.4 }}>
              <strong>Privacy Disclosure:</strong> PhishGuard analyzes only URLs explicitly submitted for scanning. It does NOT collect browsing history, passwords, cookies, or personal webpage contents.
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

function roundConfidence(val: number): string {
  if (!val) return '0.0';
  return (val * 100).toFixed(1);
}
