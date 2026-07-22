// src/pages/Cover.jsx
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Modal, Toast, EmptyState, Spinner } from '../components/UI';

export default function Cover() {
  const { user: me } = useAuth();
  const [requests, setRequests] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ classId:'', reason:'' });
  const [toast, setToast] = useState('');

  function load() {
    return Promise.all([api.getCoverRequests(), api.getMyClasses()])
      .then(([r, c]) => { setRequests(r.requests); setMyClasses(c.classes); })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.createCoverRequest({ classId: form.classId, reason: form.reason });
      setModal(false);
      setForm({ classId:'', reason:'' });
      await load();
      setToast('Cover request published to all faculty');
    } catch (err) { setToast(err.message); }
  }

  async function handleRespond(id, status) {
    try {
      await api.respondToCover(id, status);
      await load();
      setToast(status === 'accepted' ? 'You accepted the cover request' : 'Request declined');
    } catch (err) { setToast(err.message); }
  }

  const openReqs = requests.filter(r => r.status === 'pending' && r.requestingUserId !== me.id);
  const myReqs = requests.filter(r => r.requestingUserId === me.id);

  if (loading) return <Spinner />;

  function statusBadge(r) {
    if (r.status === 'pending') return <span className="badge badge-amber">Pending</span>;
    if (r.status === 'accepted') return <span className="badge badge-green">Accepted by {r.responderName || 'colleague'}</span>;
    return <span className="badge badge-red">Declined</span>;
  }

  return (
    <div className="fade-up">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.75rem', flexWrap:'wrap', gap:'1rem' }}>
        <h1 className="page-title gold-text">Cover Requests</h1>
        <button className="btn btn-primary" onClick={() => { if (!myClasses.length) { setToast('Add a class first before requesting cover.'); return; } setModal(true); }}>
          <i className="fas fa-plus-circle" /> Request Cover
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'1.25rem' }}>
        {/* Open requests */}
        <div className="glass section-card">
          <h2 style={{ fontWeight:700, marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
            <i className="fas fa-globe" style={{ color:'#F59E0B' }} /> Open Requests
          </h2>
          {openReqs.length === 0
            ? <EmptyState icon="inbox" title="No open requests" subtitle="All colleagues are covered!" />
            : openReqs.map(r => (
              <div key={r.id} style={{ padding:'0.9rem 1rem', background:'rgba(0,0,0,0.25)', borderRadius:'0.85rem', borderLeft:'2.5px solid #F59E0B', marginBottom:'0.65rem' }}>
                <p style={{ fontWeight:600, fontSize:'0.9rem' }}>{r.requesterName} needs cover for:</p>
                {r.class && <>
                  <p style={{ fontWeight:700, marginTop:'0.35rem' }}>{r.class.subjectName} <span style={{ color:'#F59E0B', fontFamily:'DM Mono', fontSize:'0.78rem' }}>({r.class.subjectCode})</span></p>
                  <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginTop:'0.1rem' }}>{r.class.day} - {r.class.startTime}-{r.class.endTime} - {r.class.room}</p>
                </>}
                {r.reason && <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.35)', marginTop:'0.3rem', fontStyle:'italic' }}>"{r.reason}"</p>}
                <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.75rem' }}>
                  <button className="btn btn-success" style={{ fontSize:'0.82rem', padding:'0.45rem 0.9rem' }} onClick={() => handleRespond(r.id, 'accepted')}><i className="fas fa-check" /> Accept</button>
                  <button className="btn btn-danger" style={{ fontSize:'0.82rem', padding:'0.45rem 0.9rem' }} onClick={() => handleRespond(r.id, 'declined')}><i className="fas fa-times" /> Decline</button>
                </div>
              </div>
            ))
          }
        </div>

        {/* My requests */}
        <div className="glass section-card">
          <h2 style={{ fontWeight:700, marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
            <i className="fas fa-paper-plane" style={{ color:'#F59E0B' }} /> My Requests
          </h2>
          {myReqs.length === 0
            ? <EmptyState icon="pen-alt" title="No requests sent" subtitle='Click "Request Cover" to notify colleagues.' />
            : myReqs.map(r => (
              <div key={r.id} style={{ padding:'0.85rem 1rem', background:'rgba(0,0,0,0.25)', borderRadius:'0.85rem', marginBottom:'0.6rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem', flexWrap:'wrap' }}>
                  {r.class ? <p style={{ fontWeight:600 }}>{r.class.subjectName} ({r.class.subjectCode})</p> : <p style={{ fontWeight:600, color:'rgba(255,255,255,0.4)' }}>Class removed</p>}
                  {statusBadge(r)}
                </div>
                {r.class && <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginTop:'0.15rem' }}>{r.class.day} - {r.class.startTime}-{r.class.endTime}</p>}
              </div>
            ))
          }
        </div>
      </div>

      {modal && (
        <Modal title="Request Cover" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} required>
              <option value="">Select your class...</option>
              {myClasses.map(c => <option key={c.id} value={c.id}>{c.subjectName} - {c.day} {c.startTime}</option>)}
            </select>
            <textarea placeholder="Reason (optional, e.g. medical leave, conference)" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ resize:'none' }} />
            <div style={{ display:'flex', gap:'0.65rem', marginTop:'0.25rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>Send to All Faculty</button>
              <button type="button" className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={() => setModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
