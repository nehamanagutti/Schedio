// src/pages/Classes.jsx
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Modal, Toast, EmptyState, Spinner } from '../components/UI';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const EMPTY = { subjectName:'', subjectCode:'', room:'', day:'Monday', startTime:'09:00', endTime:'10:00', reminderMinutes:15, notes:'' };

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | classObj
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function load() {
    return api.getMyClasses().then(r => setClasses(r.classes)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openNew() { setForm(EMPTY); setModal('new'); }
  function openEdit(cls) { setForm({ ...cls }); setModal(cls); }
  function closeModal() { setModal(null); }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'new') {
        await api.createClass(form);
        setToast('Class added');
      } else {
        await api.updateClass(modal.id, form);
        setToast('Class updated');
      }
      await load();
      closeModal();
    } catch (err) {
      setToast(err.message);
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this class permanently?')) return;
    try {
      await api.deleteClass(id);
      setClasses(c => c.filter(x => x.id !== id));
      setToast('Class deleted');
    } catch (err) { setToast(err.message); }
  }

  if (loading) return <Spinner />;

  return (
    <div className="fade-up">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.75rem', flexWrap:'wrap', gap:'1rem' }}>
        <h1 className="page-title gold-text">My Classes</h1>
        <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus-circle" /> New Class</button>
      </div>

      {classes.length === 0
        ? <div className="glass" style={{ borderRadius:'1.5rem' }}><EmptyState icon="folder-open" title="No classes yet" subtitle='Click "New Class" to build your timetable.' /></div>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            {classes.map(cls => (
              <div key={cls.id} className="glass" style={{ borderRadius:'1.1rem', padding:'1.1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
                <div style={{ display:'flex', gap:'1rem', alignItems:'flex-start' }}>
                  <div style={{ width:44, height:44, borderRadius:'0.75rem', background:'linear-gradient(135deg,#F59E0B,#FBBF24)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className="fas fa-graduation-cap" style={{ color:'#0A0F1E', fontSize:'1.1rem' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:'1.05rem' }}>
                      {cls.subjectName} <span style={{ color:'#F59E0B', fontFamily:'DM Mono', fontSize:'0.8rem', fontWeight:400 }}>{cls.subjectCode}</span>
                    </p>
                    <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.82rem', marginTop:'0.15rem' }}>
                      {cls.day} - {cls.startTime}-{cls.endTime} - <i className="fas fa-door-open" style={{ marginRight:'0.3rem' }} />{cls.room}
                    </p>
                    {cls.notes && <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.78rem', marginTop:'0.25rem' }}><i className="fas fa-sticky-note" style={{ marginRight:'0.3rem' }} />{cls.notes}</p>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button className="btn btn-ghost" style={{ padding:'0.5rem 0.7rem' }} onClick={() => openEdit(cls)}><i className="fas fa-pen" /></button>
                  <button className="btn btn-danger" style={{ padding:'0.5rem 0.7rem' }} onClick={() => handleDelete(cls.id)}><i className="fas fa-trash" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'new' ? 'New Class' : 'Edit Class'} onClose={closeModal}>
          <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <input placeholder="Subject Name *" value={form.subjectName} onChange={set('subjectName')} required />
            <input placeholder="Subject Code *" value={form.subjectCode} onChange={set('subjectCode')} required />
            <input placeholder="Room / Lab *" value={form.room} onChange={set('room')} required />
            <select value={form.day} onChange={set('day')}>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem' }}>
              <div><label style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', display:'block', marginBottom:'0.3rem' }}>Start Time</label><input type="time" value={form.startTime} onChange={set('startTime')} required /></div>
              <div><label style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', display:'block', marginBottom:'0.3rem' }}>End Time</label><input type="time" value={form.endTime} onChange={set('endTime')} required /></div>
            </div>
            <input type="number" placeholder="Reminder (minutes before class)" value={form.reminderMinutes} onChange={set('reminderMinutes')} min={0} />
            <textarea placeholder="Notes (optional)" rows={2} value={form.notes} onChange={set('notes')} style={{ resize:'none' }} />
            <div style={{ display:'flex', gap:'0.65rem', marginTop:'0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} disabled={saving}>
                {saving ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : 'Save Class'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={closeModal}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
