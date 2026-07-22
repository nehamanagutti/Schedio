// src/components/Layout.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './UI';

const NAV = [
  { to: '/',          icon: 'tachometer-alt', label: 'Dashboard'  },
  { to: '/classes',   icon: 'book-open',      label: 'Classes'    },
  { to: '/timetable', icon: 'calendar-alt',   label: 'Timetable'  },
  { to: '/colleagues',icon: 'users',          label: 'Colleagues' },
  { to: '/board',     icon: 'comment-dots',   label: 'Board'      },
  { to: '/cover',     icon: 'handshake',      label: 'Cover'      },
  { to: '/chat',      icon: 'comments',       label: 'Chat'       },
  { to: '/profile',   icon: 'user-circle',    label: 'Profile'    },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* Sidebar - desktop */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'rgba(8,13,26,0.85)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(245,158,11,0.15)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.25rem 0.75rem',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }} className="desktop-sidebar">
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.75rem', marginBottom:'1.75rem' }}>
          <div style={{
            width:36, height:36, borderRadius:'0.65rem',
            background:'linear-gradient(135deg,#F59E0B,#FBBF24)',
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <i className="fas fa-chalkboard" style={{ color:'#0A0F1E', fontSize:'1rem' }} />
          </div>
          <span style={{ fontSize:'1.35rem', fontWeight:800, letterSpacing:'-0.03em' }} className="gold-text">Schedio</span>
        </div>

        {/* Nav links */}
        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:'0.25rem' }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:'0.7rem',
              padding:'0.6rem 0.85rem',
              borderRadius:'0.75rem',
              fontSize:'0.875rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#FBBF24' : 'rgba(255,255,255,0.55)',
              background: isActive ? 'linear-gradient(95deg,rgba(245,158,11,0.18),rgba(139,92,246,0.07))' : 'transparent',
              borderLeft: isActive ? '2px solid #F59E0B' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
            })}>
              <i className={`fas fa-${icon}`} style={{ width:16, textAlign:'center' }} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:'1rem', marginTop:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0 0.5rem', marginBottom:'0.75rem' }}>
            <Avatar name={user?.name} size={38} color={user?.avatarColor} />
            <div style={{ overflow:'hidden' }}>
              <p style={{ fontWeight:600, fontSize:'0.85rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</p>
              <p style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)' }}>{user?.department || 'Faculty'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', fontSize:'0.82rem' }}>
            <i className="fas fa-sign-out-alt" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, paddingBottom:'5rem' }}>
        <main style={{ flex:1, padding:'2rem 1.75rem', maxWidth:1100, width:'100%', margin:'0 auto' }}>
          {children}
        </main>
      </div>

      {/* Bottom nav - mobile */}
      <nav style={{
        display:'none',
        position:'fixed', bottom:0, left:0, right:0,
        background:'rgba(10,15,30,0.95)',
        backdropFilter:'blur(20px)',
        borderTop:'1px solid rgba(245,158,11,0.15)',
        padding:'0.4rem 0',
        zIndex: 100,
        justifyContent: 'space-around',
      }} className="mobile-nav">
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display:'flex', flexDirection:'column', alignItems:'center', gap:'0.2rem',
            padding:'0.4rem 0.6rem',
            color: isActive ? '#F59E0B' : 'rgba(255,255,255,0.4)',
            textDecoration:'none', fontSize:'0.6rem', fontWeight:600,
          })}>
            <i className={`fas fa-${icon}`} style={{ fontSize:'1.1rem' }} />
            {label}
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-nav { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
