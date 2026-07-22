// src/pages/Timetable.jsx
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Spinner } from '../components/UI';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const COLORS = ['#F59E0B','#8B5CF6','#10B981','#3B82F6','#EC4899','#F97316','#14B8A6'];

export default function Timetable() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyClasses()
      .then(r => setClasses(r.classes))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  // Assign a color per subject
  const subjects = [...new Set(classes.map(c => c.subjectCode))];
  const colorMap = Object.fromEntries(subjects.map((s, i) => [s, COLORS[i % COLORS.length]]));

  return (
    <div className="fade-up">
      <h1 className="page-title gold-text" style={{ marginBottom:'1.75rem' }}>Weekly Timetable</h1>

      <div className="glass" style={{ borderRadius:'1.5rem', overflowX:'auto', padding:'0.25rem' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
          <thead>
            <tr>
              {DAYS.map(d => (
                <th key={d} style={{
                  padding:'0.85rem 0.6rem', fontSize:'0.78rem', fontWeight:700,
                  color: d === getTodayName() ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                  textTransform:'uppercase', letterSpacing:'0.05em',
                  background: d === getTodayName() ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.15)',
                  borderBottom:'1px solid rgba(255,255,255,0.07)',
                  borderRight:'1px solid rgba(255,255,255,0.04)'
                }}>
                  {d.slice(0,3)}
                  {d === getTodayName() && <span style={{ display:'block', width:5, height:5, borderRadius:'50%', background:'#F59E0B', margin:'0.25rem auto 0' }} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {DAYS.map(day => {
                const dayCls = classes.filter(c => c.day === day).sort((a,b) => a.startTime.localeCompare(b.startTime));
                return (
                  <td key={day} style={{ padding:'0.5rem', verticalAlign:'top', borderRight:'1px solid rgba(255,255,255,0.04)', minWidth:110 }}>
                    {dayCls.length === 0
                      ? <div style={{ textAlign:'center', color:'rgba(255,255,255,0.15)', fontSize:'0.8rem', padding:'1.5rem 0' }}>-</div>
                      : dayCls.map(c => (
                        <div key={c.id} style={{
                          marginBottom:'0.5rem', padding:'0.6rem 0.7rem', borderRadius:'0.7rem',
                          background:`${colorMap[c.subjectCode]}15`,
                          borderLeft:`2.5px solid ${colorMap[c.subjectCode]}`
                        }}>
                          <p style={{ fontWeight:700, fontSize:'0.82rem', marginBottom:'0.15rem' }}>{c.subjectName}</p>
                          <p style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.45)', fontFamily:'DM Mono' }}>{c.startTime}-{c.endTime}</p>
                          <p style={{ fontSize:'0.72rem', color:`${colorMap[c.subjectCode]}cc`, marginTop:'0.1rem' }}>{c.room}</p>
                        </div>
                      ))
                    }
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      {subjects.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.6rem', marginTop:'1.25rem' }}>
          {subjects.map(s => (
            <span key={s} style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.3rem 0.7rem', borderRadius:9999, fontSize:'0.78rem', fontWeight:600, background:`${colorMap[s]}15`, color:colorMap[s], border:`1px solid ${colorMap[s]}40` }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:colorMap[s], display:'inline-block' }} />
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function getTodayName() {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[new Date().getDay()];
}
