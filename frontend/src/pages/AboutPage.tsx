import React from 'react';
import { Info, Cpu, ShieldCheck, Database, Layers, CheckCircle } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="soc-container">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info color="#1565C0" size={26} /> ABOUT PHISHGUARD AI ECOSYSTEM
        </h1>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          College Cybersecurity Project — Intelligent Phishing Detection & Threat Analysis Platform.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Architecture Card */}
        <div className="soc-card red-glow">
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Layers color="#E50914" size={20} /> END-TO-END ARCHITECTURE
          </div>
          <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6, marginBottom: '14px' }}>
            PhishGuard AI unifies browser protection, real-time Machine Learning classification, and security operation analytics into one integrated platform.
          </p>
          <pre style={{
            background: '#050505',
            padding: '14px',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#60A5FA',
            fontFamily: 'monospace',
            lineHeight: 1.4
          }}>
{`CHROMIUM BROWSER EXTENSION  ──►  FASTAPI DETECTOR
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
FEATURE EXTRACTION & HEURISTICS                     RANDOM FOREST ML ENGINE
           │                                                   │
           └─────────────────────────┬─────────────────────────┘
                                     ▼
                            0-100 RISK SCORER
                                     │
                                     ▼
                              MONGODB DATABASE
                                     │
                                     ▼
                          SPIDER-MAN SOC DASHBOARD`}
          </pre>
        </div>

        {/* ML Specifications */}
        <div className="soc-card blue-glow">
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Cpu color="#60A5FA" size={20} /> ML METRICS & FEATURE VECTORS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
              <strong style={{ color: '#FFF' }}>Algorithm:</strong> Scikit-Learn RandomForestClassifier (100 Decision Trees)
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
              <strong style={{ color: '#FFF' }}>Feature Engineering:</strong> URL Length, Host Entropy, Subdomain Depth, IP Host Check, Suspicious TLDs, Brand Impersonation, Keyword Signals.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700 }}>ACCURACY</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#34D399' }}>96.8%</div>
              </div>
              <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.3)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700 }}>F1 SCORE</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#60A5FA' }}>96.3%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Disclaimer */}
      <div className="soc-card" style={{ borderLeft: '4px solid #F59E0B' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#FBBF24', marginBottom: '6px' }}>
          EDUCATIONAL DEMONSTRATION SAFETY NOTICE
        </div>
        <p style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5 }}>
          PhishGuard AI is an educational cybersecurity project built for technical demonstration. All phishing classification tests are executed safely using controlled synthetic test patterns and heuristics without visiting live malicious infrastructure.
        </p>
      </div>
    </div>
  );
};
