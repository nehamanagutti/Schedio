// src/pages/Colleagues.jsx
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Avatar, Modal, EmptyState, Spinner } from '../components/UI';
import { useAuth } from '../context/AuthContext';

function isOnline(user) {
  return user.lastActive && (Date.now() - user.lastActive) < 120000;
}

export default function Colleagues() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewUser, setViewUser] = useState(null);
  const [viewClasses, setViewClasses] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    api.getUsers().then(r => setUsers(r.users.filter(u => u.id !== me.id))).finally(() => setLoading(false));
  }, [me.id]);

  async function openSchedule(user) {
    setViewUser(user);
    setLoadingSchedule(true);
    try {
      const { classes } = await api.getUserClasses(user.id);
      setViewClasses(classes);
    } catch { setViewClasses([]); }
    finally { setLoadingSchedule(false); }
  }

  if (loading) return <Spinner />;

  return (
    <div className="fade-up">
      <h1 className="page-title gold-text" style={{ marginBottom:'1.75rem' }}>Faculty Colleagues</h1>

      {users.length === 0
        ? <div className="glass" style={{ borderRadius:'1.5rem' }}><EmptyState icon="users" title="No other faculty members yet" subtitle="Register more accounts to see colleagues here." /></div>
        : (
          <div className="grid-2">
            {users.map(u => (
              <div key={u.id} className="glass" style={{ borderRadius:'1.1rem', padding:'1.1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem' }}>
                <div style={{ display:'flex', gap:'0.9rem', alignItems:'center' }}>
                  <Avatar name={u.name} size={48} color={u.avatarColor} />
                  <div>
                    <p style={{ fontWeight:700, fontSize:'1.05rem' }}>{u.name}</p>
                    <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)' }}>{u.department || 'Faculty'}{u.title ? ` - ${u.title}` : ''}</p>
                    <p style={{ fontSize:'0.75rem', marginTop:'0.3rem', display:'flex', alignItems:'center', gap:'0.35rem' }}>
                      <span className={isOnline(u) ? 'online-dot' : 'offline-dot'} />
                      <span style={{ color: isOnline(u) ? '#10B981' : 'rgba(255,255,255,0.3)' }}>
                        {isOnline(u) ? 'Online' : 'Offline'}
                      </span>
                    </p>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ fontSize:'0.82rem', whiteSpace:'nowrap' }} onClick={() => openSchedule(u)}>
                  View Schedule
                </button>
              </div>
            ))}
          </div>
        )
      }

      {viewUser && (
        <Modal title={`${viewUser.name}'s Schedule`} onClose={() => setViewUser(null)}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.85rem', marginBottom:'1.25rem', paddingBottom:'1rem', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
            <Avatar name={viewUser.name} size={48} color={viewUser.avatarColor} />
            <div>
              <p style={{ fontWeight:700 }}>{viewUser.name}</p>
              <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.4)' }}>{viewUser.department} {viewUser.title ? `- ${viewUser.title}` : ''}</p>
            </div>
          </div>
          {loadingSchedule
            ? <div style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', padding:'2rem' }}><i className="fas fa-spinner fa-spin" /></div>
            : viewClasses.length === 0
              ? <EmptyState icon="calendar" title="No classes scheduled" />
              : <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', maxHeight:360, overflowY:'auto' }}>
                  {viewClasses.sort((a,b) => a.day.localeCompare(b.day) || a.startTime.localeCompare(b.startTime)).map(c => (
                    <div key={c.id} style={{ padding:'0.75rem 1rem', background:'rgba(0,0,0,0.3)', borderRadius:'0.75rem', borderLeft:'2px solid #F59E0B' }}>
                      <p style={{ fontWeight:600 }}>{c.subjectName} <span style={{ color:'#F59E0B', fontFamily:'DM Mono', fontSize:'0.78rem' }}>({c.subjectCode})</span></p>
                      <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginTop:'0.15rem' }}>{c.day} - {c.startTime}-{c.endTime} - {c.room}</p>
                    </div>
                  ))}
                </div>
          }
        </Modal>
      )}
    </div>
  );
}
