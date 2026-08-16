import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { PhishGuardLogo } from '../components/PhishGuardLogo';
import '../styles/auth.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authService.isAuthenticated()) navigate('/dashboard');
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <WebBackground />
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <PhishGuardLogo size={56} showText={false} />
          </div>
          <div className="auth-brand">PHISHGUARD AI</div>
          <div className="auth-tagline">SECURE YOUR DIGITAL WEB</div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Email Address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="analyst@organization.com"
                required
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            {error && <div className="auth-error">⚠ {error}</div>}

            <button id="login-submit" type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <span className="auth-spinner">⬡ AUTHENTICATING...</span>
              ) : (
                '⬡ SIGN IN'
              )}
            </button>

            <div className="auth-links">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>
            <div className="auth-divider" />
            <div className="auth-switch">
              Don't have an account?{' '}
              <Link to="/signup">Create Account</Link>
            </div>
          </form>

          <div className="auth-footer">
            <span className="status-dot-mini online" />
            PhishGuard AI — Real-Time Phishing Protection Platform
          </div>
        </div>
      </div>
    </div>
  );
};

const WebBackground: React.FC = () => (
  <svg className="auth-web-bg" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
    {/* Spider web radial lines */}
    {Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360;
      const rad = (angle * Math.PI) / 180;
      return (
        <line
          key={`ray-${i}`}
          x1="600" y1="400"
          x2={600 + 600 * Math.cos(rad)}
          y2={400 + 500 * Math.sin(rad)}
          stroke="#ef4444"
          strokeWidth="0.4"
          opacity="0.25"
        />
      );
    })}
    {/* Concentric web rings */}
    {[80, 160, 240, 320, 420, 540].map((r, i) => (
      <ellipse key={`ring-${i}`} cx="600" cy="400" rx={r} ry={r * 0.75}
        stroke="#3b82f6" strokeWidth="0.6" fill="none" opacity="0.2" />
    ))}
    {/* Node dots at intersections */}
    {Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * 2 * Math.PI;
      return (
        <circle
          key={`node-${i}`}
          cx={600 + 240 * Math.cos(angle)}
          cy={400 + 180 * Math.sin(angle)}
          r="3" fill="#ef4444" opacity="0.5"
        />
      );
    })}
  </svg>
);
