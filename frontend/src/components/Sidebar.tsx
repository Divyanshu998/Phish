import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, ShieldAlert, History, BarChart3, Chrome, Settings, Info } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'URL Scanner', path: '/dashboard/scanner', icon: Search },
    { label: 'Threats', path: '/dashboard/threats', icon: ShieldAlert },
    { label: 'Scan History', path: '/dashboard/history', icon: History },
    { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Extension', path: '/dashboard/extension', icon: Chrome },
    { label: 'Settings', path: '/dashboard/settings', icon: Settings },
    { label: 'About', path: '/dashboard/about', icon: Info },
  ];

  return (
    <aside className="soc-sidebar">
      <div className="sidebar-logo-section">
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #E50914 0%, #1565C0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: '16px',
          color: '#FFF',
          boxShadow: '0 0 12px rgba(229, 9, 20, 0.4)'
        }}>
          🕷
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFF', letterSpacing: '0.5px' }}>
            COMMAND CENTER
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>SOC Threat Matrix</div>
        </div>
      </div>

      <nav style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{
          background: 'rgba(21, 101, 192, 0.1)',
          border: '1px solid rgba(21, 101, 192, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '11px',
          color: '#9CA3AF'
        }}>
          <div style={{ fontWeight: 700, color: '#60A5FA', marginBottom: '4px' }}>
            🕷 SPIDER-MAN SECURITY
          </div>
          Cyber Threat Monitoring & Machine Learning Classification System.
        </div>
      </div>
    </aside>
  );
};
