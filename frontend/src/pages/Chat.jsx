// src/pages/Chat.jsx
import { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Avatar, EmptyState, Spinner } from '../components/UI';

function isOnline(user) {
  return user.lastActive && (Date.now() - user.lastActive) < 120000;
}

export default function Chat() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Load contacts
  useEffect(() => {
    api.getUsers().then(r => {
      const others = r.users.filter(u => u.id !== me.id);
      setUsers(others);
      if (others.length) setSelectedId(others[0].id);
    }).finally(() => setLoadingUsers(false));
  }, [me.id]);

  // Load messages when contact changes
  useEffect(() => {
    if (!selectedId) return;
    setLoadingMessages(true);
    api.getMessages(selectedId)
      .then(r => setMessages(r.messages))
      .finally(() => setLoadingMessages(false));
  }, [selectedId]);

  // Poll for new messages every 5s
  useEffect(() => {
    if (!selectedId) return;
    const id = setInterval(() => {
      api.getMessages(selectedId).then(r => setMessages(r.messages)).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [selectedId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !selectedId) return;
    setSending(true);
    try {
      const { message } = await api.sendMessage(selectedId, text);
      setMessages(m => [...m, message]);
      setText('');
    } catch { }
    finally { setSending(false); }
  }

  const selectedUser = users.find(u => u.id === selectedId);

  if (loadingUsers) return <Spinner />;

  return (
    <div className="fade-up" style={{ display:'flex', gap:'1.25rem', height:'calc(100vh - 10rem)', minHeight:450 }}>
      {/* Contacts sidebar */}
      <div className="glass" style={{ width:220, flexShrink:0, borderRadius:'1.25rem', padding:'1rem 0.75rem', display:'flex', flexDirection:'column', gap:'0.25rem', overflowY:'auto' }}>
        <p style={{ fontSize:'0.75rem', fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.06em', padding:'0 0.5rem', marginBottom:'0.5rem' }}>Colleagues</p>
        {users.length === 0
          ? <EmptyState icon="users" title="No colleagues yet" />
          : users.map(u => (
            <button key={u.id} onClick={() => setSelectedId(u.id)} style={{
              display:'flex', alignItems:'center', gap:'0.7rem', padding:'0.6rem 0.7rem',
              borderRadius:'0.75rem', cursor:'pointer', border:'none',
              background: selectedId === u.id ? 'rgba(245,158,11,0.15)' : 'transparent',
              borderLeft: selectedId === u.id ? '2px solid #F59E0B' : '2px solid transparent',
              color:'white', textAlign:'left', transition:'all 0.15s', width:'100%'
            }}>
              <Avatar name={u.name} size={34} color={u.avatarColor} />
              <div style={{ flex:1, overflow:'hidden' }}>
                <p style={{ fontWeight:selectedId === u.id ? 600 : 400, fontSize:'0.85rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.name}</p>
                <p style={{ fontSize:'0.7rem', color: isOnline(u) ? '#10B981' : 'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                  <span className={isOnline(u) ? 'online-dot' : 'offline-dot'} style={{ width:6, height:6 }} />
                  {isOnline(u) ? 'Online' : 'Offline'}
                </p>
              </div>
            </button>
          ))
        }
      </div>

      {/* Chat panel */}
      <div className="glass" style={{ flex:1, borderRadius:'1.25rem', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'0.9rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:'0.75rem', flexShrink:0 }}>
          {selectedUser
            ? <>
                <Avatar name={selectedUser.name} size={40} color={selectedUser.avatarColor} />
                <div>
                  <p style={{ fontWeight:700 }}>{selectedUser.name}</p>
                  <p style={{ fontSize:'0.75rem', color: isOnline(selectedUser) ? '#10B981' : 'rgba(255,255,255,0.35)' }}>
                    {isOnline(selectedUser) ? 'Online' : 'Offline'}
                  </p>
                </div>
              </>
            : <p style={{ color:'rgba(255,255,255,0.3)' }}>Select a colleague to start chatting</p>
          }
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'1rem 1.25rem', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
          {!selectedId
            ? <EmptyState icon="comments" title="No conversation selected" subtitle="Pick a colleague from the left." />
            : loadingMessages
              ? <Spinner />
              : messages.length === 0
                ? <EmptyState icon="comment-dots" title="No messages yet" subtitle="Say hello!" />
                : messages.map(m => {
                    const mine = m.fromUserId === me.id;
                    return (
                      <div key={m.id} style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth:'72%', padding:'0.65rem 0.9rem',
                          borderRadius: mine ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
                          background: mine ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.08)',
                        }}>
                          <p style={{ fontSize:'0.875rem', lineHeight:1.55 }}>{m.content}</p>
                          <p style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.3)', marginTop:'0.25rem', textAlign:'right' }}>
                            {new Date(m.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
          }
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {selectedId && (
          <form onSubmit={handleSend} style={{ padding:'0.9rem 1.25rem', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'0.65rem', flexShrink:0 }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Message ${selectedUser?.name || ''}...`}
              autoComplete="off"
              style={{ flex:1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding:'0.65rem 1.1rem' }} disabled={sending || !text.trim()}>
              <i className="fas fa-paper-plane" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
