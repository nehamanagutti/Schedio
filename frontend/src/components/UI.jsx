// src/components/UI.jsx
import { useEffect } from 'react';

export function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2300);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="toast">{message}</div>;
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass modal-box fade-up">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <h2 style={{ fontSize:'1.3rem', fontWeight:700 }} className="gold-text">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding:'0.4rem 0.7rem' }}>
            <i className="fas fa-times" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Avatar({ name, size = 44, color }) {
  const initials = name ? (name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()) : '?';
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38,
      border: `1.5px solid rgba(245,158,11,0.3)`,
      background: color ? `${color}22` : undefined
    }}>
      {initials}
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}>
      <div style={{
        width:36, height:36,
        border:'3px solid rgba(245,158,11,0.2)',
        borderTop:'3px solid #F59E0B',
        borderRadius:'50%',
        animation:'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign:'center', padding:'3.5rem 2rem', color:'rgba(255,255,255,0.3)' }}>
      <i className={`fas fa-${icon}`} style={{ fontSize:'2.5rem', marginBottom:'1rem', display:'block' }} />
      <p style={{ fontWeight:600, fontSize:'1rem', marginBottom:'0.4rem' }}>{title}</p>
      {subtitle && <p style={{ fontSize:'0.85rem' }}>{subtitle}</p>}
    </div>
  );
}

export function StatCard({ icon, label, value, accent }) {
  return (
    <div className="glass" style={{ borderRadius:'1.25rem', padding:'1.25rem 1.5rem', display:'flex', alignItems:'center', gap:'1rem' }}>
      <div style={{
        width:52, height:52, borderRadius:'0.9rem', flexShrink:0,
        background:`linear-gradient(135deg, ${accent || '#F59E0B'}, ${accent ? accent+'cc' : '#FBBF24'})`,
        display:'flex', alignItems:'center', justifyContent:'center'
      }}>
        <i className={`fas fa-${icon}`} style={{ fontSize:'1.3rem', color:'#0A0F1E' }} />
      </div>
      <div>
        <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.2rem' }}>{label}</p>
        <p style={{ fontSize:'2rem', fontWeight:800, lineHeight:1 }}>{value}</p>
      </div>
    </div>
  );
}
