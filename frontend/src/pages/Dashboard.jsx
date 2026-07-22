// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { StatCard, Spinner, EmptyState } from '../components/UI';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function Dashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMyClasses(), api.getUsers()])
      .then(([c, u]) => { setClasses(c.classes); setUsers(u.users); })
      .finally(() => setLoading(false));
  }, []);

  const dayIdx = new Date().getDay();
  const today = DAYS[dayIdx === 0 ? 6 : dayIdx - 1];
  const todaysClasses = classes.filter(c => c.day === today).sort((a,b) => a.startTime.localeCompare(b.startTime));

  const now = new Date();
  const upcomingReminders = classes.filter(c => {
    if (c.day !== today) return false;
    const [h, m] = c.startTime.split(':');
    const classTime = new Date(); classTime.setHours(+h, +m, 0);
    const diff = (classTime - now) / 60000;
    return diff <= (c.reminderMinutes || 15) && diff > -60;
  });

  if (loading) return <Spinner />;

  return (
    <div className="fade-up">
      <div style={{ marginBottom:'2rem' }}>
        <h1 className="page-title gold-text">Good {getGreeting()}, {user?.name?.split(' ')[0]}</h1>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.9rem', borderLeft:'2px solid #F59E0B', paddingLeft:'0.75rem' }}>
          {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom:'2rem' }}>
        <StatCard icon="book-open" label="Total Classes" value={classes.length} />
        <StatCard icon="users" label="Faculty Network" value={users.length} accent="#8B5CF6" />
        <StatCard icon="calendar-day" label="Today's Sessions" value={todaysClasses.length} accent="#10B981" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'1.25rem' }}>
        {/* Today's schedule */}
        <div className="glass section-card">
          <h2 style={{ fontWeight:700, marginBottom:'1.1rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
            <i className="fas fa-clock" style={{ color:'#F59E0B' }} /> Today's Schedule
          </h2>
          {todaysClasses.length === 0
            ? <EmptyState icon="calendar-week" title="No classes today" subtitle="Enjoy your free day!" />
            : todaysClasses.map(c => (
              <div key={c.id} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'0.9rem 1rem', background:'rgba(0,0,0,0.25)', borderRadius:'0.9rem',
                marginBottom:'0.65rem', borderLeft:'2.5px solid #F59E0B'
              }}>
                <div>
                  <p style={{ fontWeight:600 }}>{c.subjectName} <span style={{ color:'#F59E0B', fontSize:'0.8rem', fontFamily:'DM Mono' }}>{c.subjectCode}</span></p>
                  <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginTop:'0.1rem' }}>{c.startTime} - {c.endTime} - {c.room}</p>
                </div>
                <i className="fas fa-chalkboard" style={{ color:'#F59E0B', fontSize:'1.1rem' }} />
              </div>
            ))
          }
        </div>

        {/* Reminders */}
        <div className="glass section-card">
          <h2 style={{ fontWeight:700, marginBottom:'1.1rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
            <i className="fas fa-bell" style={{ color:'#F59E0B' }} /> Upcoming Reminders
          </h2>
          {upcomingReminders.length === 0
            ? <EmptyState icon="check-circle" title="All clear" subtitle="No imminent class reminders" />
            : upcomingReminders.map(c => (
              <div key={c.id} style={{
                padding:'0.9rem 1rem', background:'rgba(245,158,11,0.07)', borderRadius:'0.9rem',
                borderLeft:'3px solid #F59E0B', marginBottom:'0.65rem'
              }}>
                <p style={{ fontWeight:600 }}>{c.subjectName}</p>
                <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.45)' }}>
                  <i className="far fa-clock" style={{ marginRight:'0.35rem' }} />Starts at {c.startTime} - {c.room}
                </p>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
