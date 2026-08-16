import React, { useState, useEffect } from 'react';
import { Save, Shield, Bell, Mail, User, CheckCircle } from 'lucide-react';
import { authService, UserProfile } from '../services/auth';

export const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(authService.getUser());
  const [name, setName] = useState(profile?.name || '');
  const [prefs, setPrefs] = useState({
    browser_notifications: true,
    realtime_protection: true,
    email_alerts: true,
    email_high_risk: true,
    email_critical: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_username: '',
    smtp_from: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const p = await authService.getProfile();
      setProfile(p);
      setName(p.name);
      if (p.alert_preferences) {
        setPrefs(prev => ({ ...prev, ...p.alert_preferences }));
      }
    } catch {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await authService.updateSettings(name, prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: string) =>
    setPrefs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));

  return (
    <div className="soc-container">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
          ACCOUNT SETTINGS
        </h1>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Manage your PhishGuard AI profile, security alerts, and notification preferences
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* PROFILE SECTION */}
        <div className="soc-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <User size={18} color="#3b82f6" />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>PROFILE</div>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', color: '#64748b', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Account Status</div>
                  <div style={{ color: '#10b981', fontWeight: 700 }}>Active</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Email Verification</div>
                  <div style={{ color: profile?.email_verified ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                    {profile?.email_verified ? '✓ Verified' : '⚠ Pending'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Registered</div>
                  <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{profile?.created_at?.slice(0, 10) || '—'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Last Login</div>
                  <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{profile?.last_login?.slice(0, 10) || '—'}</div>
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#ef4444' }}>
                  ⚠ {error}
                </div>
              )}

              <button
                id="save-profile-btn"
                type="submit"
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: saved ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #dc2626, #9f1239)', border: saved ? '1px solid #10b981' : 'none', borderRadius: '8px', padding: '11px 20px', color: saved ? '#10b981' : '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', letterSpacing: '0.5px' }}
              >
                {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                {saving ? 'SAVING...' : saved ? 'SAVED SUCCESSFULLY' : 'SAVE CHANGES'}
              </button>
            </div>
          </form>
        </div>

        {/* ALERT PREFERENCES */}
        <div className="soc-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Bell size={18} color="#ef4444" />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>SECURITY ALERTS</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'browser_notifications', icon: '🔔', label: 'Browser Notifications', sub: 'Show alerts in the browser when threats are detected' },
              { key: 'realtime_protection', icon: '🛡', label: 'Real-Time Protection', sub: 'Continuously monitor URLs as you browse' },
              { key: 'email_alerts', icon: '✉', label: 'Email Alerts', sub: 'Receive threat alerts to your registered email' },
              { key: 'email_high_risk', icon: '⚠', label: 'High Risk Email Alerts', sub: 'Send email for HIGH RISK detections (Score 61-80)' },
              { key: 'email_critical', icon: '🚨', label: 'Critical Threat Email Alerts', sub: 'Send email for CRITICAL threats (Score 81-100)' },
            ].map(({ key, icon, label, sub }) => (
              <div
                key={key}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 14px', border: `1px solid rgba(255,255,255,${prefs[key as keyof typeof prefs] ? '0.1' : '0.04'})` }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>{label}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{sub}</div>
                  </div>
                </div>
                <button
                  id={`toggle-${key}`}
                  onClick={() => togglePref(key)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: prefs[key as keyof typeof prefs] ? '#ef4444' : 'rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.25s',
                    flexShrink: 0
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: prefs[key as keyof typeof prefs] ? '23px' : '3px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.25s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
                  }} />
                </button>
              </div>
            ))}

            <button
              id="save-prefs-btn"
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)', border: `1px solid ${saved ? '#10b981' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', padding: '10px 18px', color: saved ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              {saved ? <CheckCircle size={15} /> : <Save size={15} />}
              {saving ? 'SAVING...' : saved ? 'PREFERENCES SAVED' : 'SAVE PREFERENCES'}
            </button>
          </div>
        </div>

        {/* SMTP EMAIL CONFIG */}
        <div className="soc-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Mail size={18} color="#3b82f6" />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>EMAIL CONFIGURATION</div>
            <span style={{ fontSize: '10px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
              BACKEND ENV VARS
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.8, background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '14px 16px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ color: '#64748b', marginBottom: '8px' }}># Configure in backend/.env or environment variables:</div>
            <div><span style={{ color: '#f59e0b' }}>SMTP_HOST</span>=<span style={{ color: '#10b981' }}>smtp.gmail.com</span></div>
            <div><span style={{ color: '#f59e0b' }}>SMTP_PORT</span>=<span style={{ color: '#10b981' }}>587</span></div>
            <div><span style={{ color: '#f59e0b' }}>SMTP_USERNAME</span>=<span style={{ color: '#10b981' }}>your-email@gmail.com</span></div>
            <div><span style={{ color: '#f59e0b' }}>SMTP_PASSWORD</span>=<span style={{ color: '#10b981' }}>your-app-password</span></div>
            <div><span style={{ color: '#f59e0b' }}>SMTP_FROM</span>=<span style={{ color: '#10b981' }}>phishguard@yourdomain.com</span></div>
            <div style={{ color: '#64748b', marginTop: '10px' }}># For Gmail: Use App Password, not your account password.</div>
            <div style={{ color: '#64748b' }}># For Outlook: Use smtp-mail.outlook.com:587</div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b' }}>
            Email alerts are triggered automatically for HIGH RISK and CRITICAL scans when SMTP is configured. Email failures never interrupt scan functionality.
          </div>
        </div>

      </div>
    </div>
  );
};
