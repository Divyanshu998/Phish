import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { PhishGuardLogo } from '../components/PhishGuardLogo';
import '../styles/auth.css';

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
    { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const levels = ['WEAK', 'FAIR', 'STRONG', 'EXCELLENT'];
  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

  if (!password) return null;

  return (
    <div className="password-strength">
      <div className="strength-bars">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="strength-bar"
            style={{ background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      <div className="strength-label" style={{ color: colors[score - 1] || '#94a3b8' }}>
        {score > 0 ? levels[score - 1] : 'WEAK'}
      </div>
      <div className="strength-checks">
        {checks.map(c => (
          <span key={c.label} style={{ color: c.ok ? '#10b981' : '#6b7280' }}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (authService.isAuthenticated()) navigate('/dashboard');
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authService.signup(form.name, form.email, form.password, form.confirmPassword);
      setSuccess(`Account created! A verification email has been sent to ${form.email}`);
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="auth-page">
      <WebBackground />
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: '440px' }}>
          <div className="auth-logo">
            <PhishGuardLogo size={52} showText={false} />
          </div>
          <div className="auth-brand">CREATE ACCOUNT</div>
          <div className="auth-tagline">JOIN PHISHGUARD AI PROTECTION NETWORK</div>

          {success ? (
            <div className="auth-success-box">
              <div className="auth-success-icon">✓</div>
              <div className="auth-success-title">REGISTRATION SUCCESSFUL</div>
              <div>{success}</div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                Redirecting to dashboard...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>Full Name</label>
                <input id="signup-name" type="text" value={form.name} onChange={f('name')}
                  placeholder="Your full name" required />
              </div>
              <div className="auth-field">
                <label>Email Address</label>
                <input id="signup-email" type="email" value={form.email} onChange={f('email')}
                  placeholder="analyst@organization.com" required />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input id="signup-password" type="password" value={form.password} onChange={f('password')}
                  placeholder="Create a strong password" required />
                <PasswordStrength password={form.password} />
              </div>
              <div className="auth-field">
                <label>Confirm Password</label>
                <input id="signup-confirm-password" type="password" value={form.confirmPassword}
                  onChange={f('confirmPassword')} placeholder="Repeat your password" required />
              </div>

              {error && <div className="auth-error">⚠ {error}</div>}

              <button id="signup-submit" type="submit" className="auth-btn" disabled={loading}>
                {loading ? '⬡ CREATING ACCOUNT...' : '⬡ CREATE ACCOUNT'}
              </button>

              <div className="auth-divider" />
              <div className="auth-switch">
                Already have an account? <Link to="/login">Sign In</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const WebBackground: React.FC = () => (
  <svg className="auth-web-bg" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
    {Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360;
      const rad = (angle * Math.PI) / 180;
      return (
        <line key={`ray-${i}`} x1="600" y1="400"
          x2={600 + 600 * Math.cos(rad)} y2={400 + 500 * Math.sin(rad)}
          stroke="#ef4444" strokeWidth="0.4" opacity="0.25" />
      );
    })}
    {[80, 160, 240, 320, 420, 540].map((r, i) => (
      <ellipse key={`ring-${i}`} cx="600" cy="400" rx={r} ry={r * 0.75}
        stroke="#3b82f6" strokeWidth="0.6" fill="none" opacity="0.2" />
    ))}
  </svg>
);
