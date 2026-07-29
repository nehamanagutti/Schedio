// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SocialButton } from '../components/SocialButton';
import { firebaseAuth, firebaseConfigured, githubProvider, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

export default function Login() {
  const { login, loginWithEmail, loginWithFirebase, register, registerWithPassword, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'otp'
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [socialProvider, setSocialProvider] = useState('');
  const [loginMethod, setLoginMethod] = useState('phone');
  const [skipOtp, setSkipOtp] = useState(false);

  const [form, setForm] = useState({ phone:'', email:'', password:'', name:'', department:'', title:'' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      if (loginMethod === 'email') await loginWithEmail(form.email, form.password);
      else await login(form.phone, form.password);
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
      if (skipOtp) {
        await registerWithPassword({ name: form.name, email: form.email, phone: form.phone, password: form.password, department: form.department, title: form.title });
        navigate('/');
        return;
      }
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

  function socialErrorMessage(error, provider) {
    switch (error?.code) {
      case 'auth/popup-closed-by-user': return `${provider} sign-in was cancelled.`;
      case 'auth/popup-blocked': return 'Your browser blocked the sign-in window. Please allow pop-ups and try again.';
      case 'auth/account-exists-with-different-credential': return 'An account already exists with this email using another sign-in method.';
      case 'auth/operation-not-allowed': return `${provider} sign-in has not been enabled for this Firebase project yet.`;
      case 'auth/unauthorized-domain': return 'This domain is not authorized for Firebase sign-in. Please contact support.';
      default: return error?.message || `Unable to sign in with ${provider}. Please try again.`;
    }
  }

  async function handleSocialLogin(providerName, provider) {
    if (!firebaseConfigured || !firebaseAuth || !provider) {
      setError('Social sign-in is not configured in this app build. Please use mobile-number sign-in or contact support.');
      return;
    }
    setError(''); setInfo(''); setSocialProvider(providerName);
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      await loginWithFirebase(idToken);
      navigate('/');
    } catch (err) {
      console.error(`[auth/${providerName.toLowerCase()}] sign-in failed`, err);
      setError(socialErrorMessage(err, providerName));
    } finally {
      setSocialProvider('');
    }
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
            <div style={{ display:'flex', gap:'0.4rem' }}>
              {['phone', 'email'].map(method => <button key={method} type="button" onClick={() => setLoginMethod(method)} style={{ flex:1, padding:'0.45rem', borderRadius:'0.5rem', border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', background: loginMethod === method ? 'rgba(245,158,11,0.18)' : 'transparent', color: loginMethod === method ? '#FBBF24' : 'rgba(255,255,255,0.55)' }}>{method === 'phone' ? 'Mobile number' : 'Email'}</button>)}
            </div>
            {loginMethod === 'email'
              ? <input type="email" placeholder="College Email" value={form.email} onChange={set('email')} required />
              : <input type="tel" placeholder="Mobile Number" value={form.phone} onChange={set('phone')} required />}
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
            <label style={{ display:'flex', alignItems:'center', gap:'0.55rem', color:'rgba(255,255,255,0.7)', fontSize:'0.82rem', cursor:'pointer' }}>
              <input type="checkbox" checked={skipOtp} onChange={(e) => setSkipOtp(e.target.checked)} />
              Create account with password only (no email OTP)
            </label>
            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'0.8rem', fontSize:'1rem', marginTop:'0.25rem' }} disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin" /> Creating account...</> : skipOtp ? 'Create Account & Sign In ->' : 'Create Account ->'}
            </button>
          </form>
        )}

        {mode !== 'otp' && (
          <div className="social-auth" aria-label="Social sign-in options">
            <div className="social-auth__separator" aria-hidden="true">
              <span />
              <b>OR</b>
              <span />
            </div>
            <div className="social-auth__buttons">
              <SocialButton provider="Google" iconClass="fa-brands fa-google" onClick={() => handleSocialLogin('Google', googleProvider)} disabled={!firebaseConfigured || loading || Boolean(socialProvider)} loading={socialProvider === 'Google'} />
              <SocialButton provider="GitHub" iconClass="fa-brands fa-github" onClick={() => handleSocialLogin('GitHub', githubProvider)} disabled={!firebaseConfigured || loading || Boolean(socialProvider)} loading={socialProvider === 'GitHub'} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
