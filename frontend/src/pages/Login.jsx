// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'otp'
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const [form, setForm] = useState({ phone:'', email:'', password:'', name:'', department:'', title:'' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      await login(form.phone, form.password);
      navigate('/');
    } catch (err) {
      if (err.unverified) {
        // Account exists but was never verified; send them to finish OTP.
        setPendingEmail(err.email || form.email);
        setMode('otp');
        setInfo('Your email isn\'t verified yet. Enter the code we sent you, or resend it below.');
      } else {
        setError(err.message);
      }
    } finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      console.info('[register] Create Account clicked', { email: form.email, phone: form.phone });
      const { email, devOtp } = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password, department: form.department, title: form.title });
      console.info('[register] API accepted registration', { email });
      setPendingEmail(email);
      setMode('otp');
      setInfo(devOtp
        ? `Local dev code for ${email}: ${devOtp}`
        : `We sent a 6-digit code to ${email}. Enter it below to activate your account.`);
    } catch (err) {
      console.error('[register] registration failed', err);
      setError(err.message);
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      await verifyOtp(pendingEmail, otp);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  async function handleResend() {
    setError(''); setInfo(''); setLoading(true);
    try {
      const { devOtp } = await resendOtp(pendingEmail);
      setInfo(devOtp ? `Local dev code for ${pendingEmail}: ${devOtp}` : 'A new code has been sent to your email.');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.25rem' }}>
      <div className="glass fade-up" style={{ width:'100%', maxWidth:420, borderRadius:'1.75rem', padding:'2rem' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'1.75rem' }}>
          <div style={{
            width:60, height:60, margin:'0 auto 1rem',
            background:'linear-gradient(135deg,#F59E0B,#FBBF24)',
            borderRadius:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <i className="fas fa-chalkboard-user" style={{ fontSize:'1.6rem', color:'#0A0F1E' }} />
          </div>
          <h1 style={{ fontSize:'2.25rem', fontWeight:800, letterSpacing:'-0.04em' }} className="gold-text">Schedio</h1>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.85rem', marginTop:'0.3rem' }}>Faculty Timetable - Collaborative Suite</p>
        </div>

        {/* Toggle */}
        {mode !== 'otp' && (
          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', background:'rgba(0,0,0,0.3)', borderRadius:'0.9rem', padding:'0.3rem' }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setInfo(''); }} style={{
                flex:1, padding:'0.55rem', borderRadius:'0.65rem', border:'none', cursor:'pointer',
                fontWeight:600, fontSize:'0.85rem', transition:'all 0.2s',
                background: mode === m ? 'linear-gradient(135deg,#F59E0B,#FBBF24)' : 'transparent',
                color: mode === m ? '#0A0F1E' : 'rgba(255,255,255,0.45)'
              }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
        )}

        {info && (
          <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'0.75rem', padding:'0.65rem 1rem', marginBottom:'1rem', color:'#FBBF24', fontSize:'0.85rem' }}>
            <i className="fas fa-envelope-circle-check" style={{ marginRight:'0.5rem' }} />{info}
          </div>
        )}

        {error && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'0.75rem', padding:'0.65rem 1rem', marginBottom:'1rem', color:'#FCA5A5', fontSize:'0.85rem' }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight:'0.5rem' }} />{error}
          </div>
        )}

        {mode === 'otp' ? (
          <form onSubmit={handleVerifyOtp} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            <input
              type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code"
              value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g,''))}
              style={{ textAlign:'center', fontSize:'1.4rem', letterSpacing:'0.5rem', fontWeight:700 }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'0.8rem', fontSize:'1rem' }} disabled={loading || otp.length !== 6}>
              {loading ? <><i className="fas fa-spinner fa-spin" /> Verifying...</> : 'Verify & Continue ->'}
            </button>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem' }}>
              <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.45)', cursor:'pointer' }}>
                Back
              </button>
              <button type="button" onClick={handleResend} disabled={loading} style={{ background:'none', border:'none', color:'#FBBF24', cursor:'pointer' }}>
                Resend code
              </button>
            </div>
          </form>
        ) : mode === 'login' ? (
          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            <input type="tel" placeholder="Mobile Number" value={form.phone} onChange={set('phone')} required />
            <input type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'0.8rem', fontSize:'1rem', marginTop:'0.25rem' }} disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin" /> Signing in...</> : 'Sign In ->'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <input type="text" placeholder="Full Name *" value={form.name} onChange={set('name')} required />
            <input type="email" placeholder="College Email *" value={form.email} onChange={set('email')} required />
            <input type="tel" placeholder="Mobile Number *" value={form.phone} onChange={set('phone')} required />
            <input type="password" placeholder="Password (min 6 chars) *" value={form.password} onChange={set('password')} required />
            <input type="text" placeholder="Department (e.g. Computer Science)" value={form.department} onChange={set('department')} />
            <input type="text" placeholder="Title (e.g. Associate Professor)" value={form.title} onChange={set('title')} />
            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'0.8rem', fontSize:'1rem', marginTop:'0.25rem' }} disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin" /> Creating account...</> : 'Create Account ->'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
