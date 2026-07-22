// src/pages/Profile.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, Toast } from '../components/UI';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, department: user.department || '', title: user.title || '', avatarColor: user.avatarColor || '#F59E0B' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(form);
      setToast('Profile updated');
    } catch (err) { setToast(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fade-up" style={{ maxWidth:560 }}>
      <h1 className="page-title gold-text" style={{ marginBottom:'1.75rem' }}>Profile Settings</h1>

      <div className="glass section-card">
        {/* Avatar preview */}
        <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.75rem', paddingBottom:'1.25rem', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <Avatar name={form.name} size={64} color={form.avatarColor} />
          <div>
            <p style={{ fontWeight:700, fontSize:'1.15rem' }}>{form.name}</p>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.85rem' }}>{form.department || 'Faculty'}{form.title ? ` - ${form.title}` : ''}</p>
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.8rem', marginTop:'0.2rem' }}><i className="fas fa-phone-alt" style={{ marginRight:'0.4rem' }} />{user.phone}</p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Full Name</label>
            <input value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Department</label>
            <input value={form.department} onChange={set('department')} placeholder="e.g. Computer Science" />
          </div>
          <div>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Title</label>
            <input value={form.title} onChange={set('title')} placeholder="e.g. Associate Professor" />
          </div>
          <div>
            <label style={{ fontSize:'0.8rem', fontWeight:600, color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Avatar Accent Color</label>
            <input type="color" value={form.avatarColor} onChange={set('avatarColor')} style={{ height:48, cursor:'pointer', padding:'0.25rem 0.5rem' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf:'flex-start', marginTop:'0.5rem' }} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-save" /> Save Changes</>}
          </button>
        </form>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
