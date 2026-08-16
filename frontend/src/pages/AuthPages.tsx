import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { PhishGuardLogo } from '../components/PhishGuardLogo';
import '../styles/auth.css';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      setError('An error occurred. Please try again.');
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
            <PhishGuardLogo size={48} showText={false} />
          </div>
          <div className="auth-brand">RESET PASSWORD</div>
          <div className="auth-tagline">WE'LL SEND YOU A SECURE RESET LINK</div>

          {sent ? (
            <div className="auth-success-box">
              <div className="auth-success-icon">✉</div>
              <div className="auth-success-title">CHECK YOUR INBOX</div>
              <div>If an account with <strong>{email}</strong> exists, a password reset link has been sent.</div>
              <div style={{ marginTop: '12px' }}>
                <Link to="/login" className="auth-btn" style={{ display: 'inline-block' }}>
                  BACK TO LOGIN
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your registered email"
                  required
                />
              </div>
              {error && <div className="auth-error">⚠ {error}</div>}
              <button id="forgot-submit" type="submit" className="auth-btn" disabled={loading}>
                {loading ? '⬡ SENDING...' : '⬡ SEND RESET LINK'}
              </button>
              <div className="auth-divider" />
              <div className="auth-switch">
                <Link to="/login">← Back to Login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(token, form.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-error">Invalid or missing reset token.</div>
          <Link to="/forgot-password">Request a new password reset</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <WebBackground />
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo"><PhishGuardLogo size={48} showText={false} /></div>
          <div className="auth-brand">NEW PASSWORD</div>
          <div className="auth-tagline">SET YOUR NEW SECURE PASSWORD</div>

          {success ? (
            <div className="auth-success-box">
              <div className="auth-success-icon">✓</div>
              <div className="auth-success-title">PASSWORD UPDATED</div>
              <div>Your password has been reset successfully. Redirecting to login...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>New Password</label>
                <input id="reset-password" type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Create a strong password" required />
              </div>
              <div className="auth-field">
                <label>Confirm Password</label>
                <input id="reset-confirm" type="password" value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat your password" required />
              </div>
              {error && <div className="auth-error">⚠ {error}</div>}
              <button id="reset-submit" type="submit" className="auth-btn" disabled={loading}>
                {loading ? '⬡ UPDATING...' : '⬡ UPDATE PASSWORD'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'pending' | 'success' | 'error' | 'resent'>('pending');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (token) {
      authService.verifyEmail(token)
        .then(() => setStatus('success'))
        .catch((err: any) => {
          setStatus('error');
          setMessage(err.message || 'Verification failed');
        });
    } else {
      setStatus('error');
      setMessage('No verification token provided.');
    }
  }, [token]);

  return (
    <div className="auth-page">
      <WebBackground />
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo"><PhishGuardLogo size={48} showText={false} /></div>
          <div className="auth-brand">EMAIL VERIFICATION</div>

          {status === 'pending' && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
              <div className="auth-spinner" style={{ fontSize: '32px' }}>⬡</div>
              <div>Verifying your email address...</div>
            </div>
          )}

          {status === 'success' && (
            <div className="auth-success-box">
              <div className="auth-success-icon">✓</div>
              <div className="auth-success-title">EMAIL VERIFIED</div>
              <div>Your PhishGuard AI account is now fully activated.</div>
              <div style={{ marginTop: '14px' }}>
                <Link to="/login" className="auth-btn" style={{ display: 'inline-block' }}>
                  PROCEED TO LOGIN
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="auth-error">⚠ {message || 'Verification link may have expired.'}</div>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link to="/login" style={{ color: '#3b82f6', fontSize: '13px' }}>← Back to Login</Link>
              </div>
            </div>
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
