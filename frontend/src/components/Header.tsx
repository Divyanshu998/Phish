import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { apiService } from '../services/api';
import { authService } from '../services/auth';

interface Notification {
  notification_id: string;
  url: string;
  classification: string;
  risk_score: number;
  title: string;
  message: string;
  read: boolean;
  created_at: number;
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const user = authService.getUser();

  // Backend health check
  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiService.getHealth();
        setIsOnline(res.status === 'online');
      } catch {
        setIsOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications + SSE stream
  useEffect(() => {
    fetchNotifications();

    // SSE Real-time stream
    const sse = new EventSource('http://localhost:8000/api/notifications/stream');
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'scan_result' && (data.data?.classification === 'CRITICAL' || data.data?.classification === 'HIGH RISK')) {
          fetchNotifications();
        }
      } catch {}
    };
    sse.onerror = () => sse.close();

    // Polling fallback every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      sse.close();
      clearInterval(interval);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/notifications?limit=20', {
        headers: authService.getToken() ? { Authorization: `Bearer ${authService.getToken()}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {}
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (notifId: string) => {
    try {
      await fetch(`http://localhost:8000/api/notifications/${notifId}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.notification_id === notifId ? { ...n, read: true } : n));
    } catch {}
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const getClassColor = (cls: string) => {
    if (cls === 'CRITICAL') return '#ef4444';
    if (cls === 'HIGH RISK') return '#f59e0b';
    if (cls === 'SUSPICIOUS') return '#3b82f6';
    return '#10b981';
  };

  return (
    <header className="soc-header" style={{ position: 'relative', zIndex: 100 }}>
      {/* Left: Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 100 100" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' }}>
            <path d="M50 8L15 25V48C15 70 30 88 50 94C70 88 85 70 85 48V25L50 8Z" fill="url(#h_sg)" stroke="#ef4444" strokeWidth="3" />
            <path d="M50 22V78" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
            <path d="M24 35L76 65" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
            <path d="M24 65L76 35" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
            <text x="50" y="58" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="900" fontFamily="Arial">P</text>
            <circle cx="50" cy="50" r="3" fill="#ef4444" />
            <defs>
              <linearGradient id="h_sg" x1="50" y1="8" x2="50" y2="94" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1e1b4b" /><stop offset="1" stopColor="#090d16" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.8px', color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            PHISHGUARD <span style={{ color: '#ef4444' }}>AI</span>
            <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
              SOC V2.0
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 500 }}>
            Real-Time Phishing Detection & Threat Intelligence
          </div>
        </div>
      </div>

      {/* Right: Status, Notifications, User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* System Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#10B981' : '#ef4444', boxShadow: isOnline ? '0 0 8px #10B981' : '0 0 8px #ef4444', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: isOnline ? '#10B981' : '#ef4444' }}>
            {isOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
          </span>
        </div>

        {/* Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            id="notification-bell"
            onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); }}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 10px', color: '#cbd5e1', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '10px', padding: '1px 5px', minWidth: '16px', textAlign: 'center', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifs && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '340px', background: '#0d1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.7)', overflow: 'hidden', zIndex: 200 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>NOTIFICATIONS</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{unreadCount} unread</span>
              </div>
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.notification_id}
                      onClick={() => handleMarkRead(n.notification_id)}
                      style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: n.read ? 'transparent' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ color: getClassColor(n.classification), fontSize: '16px', lineHeight: 1, flexShrink: 0 }}>
                          {n.classification === 'CRITICAL' ? '🚨' : n.classification === 'HIGH RISK' ? '⚠' : '✓'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>{n.url}</div>
                          <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                            Risk: <span style={{ color: getClassColor(n.classification), fontWeight: 700 }}>{n.risk_score}/100</span>
                            &nbsp;·&nbsp;{new Date(n.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {!n.read && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.5)', flexShrink: 0, marginTop: '3px' }} />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            id="user-menu-btn"
            onClick={() => { setShowUser(!showUser); setShowNotifs(false); }}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '7px 10px', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s' }}
          >
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff' }}>
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name?.split(' ')[0] || 'Analyst'}
            </span>
            <ChevronDown size={13} />
          </button>

          {showUser && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '200px', background: '#0d1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.7)', overflow: 'hidden', zIndex: 200 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{user?.name || 'Security Analyst'}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{user?.email || ''}</div>
                {user?.email_verified && (
                  <div style={{ fontSize: '9px', color: '#10b981', marginTop: '4px', fontWeight: 700 }}>✓ EMAIL VERIFIED</div>
                )}
              </div>
              <button onClick={() => navigate('/settings')} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={13} /> Account Settings
              </button>
              <button onClick={handleLogout} id="logout-btn" style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#ef4444', cursor: 'pointer', textAlign: 'left', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
