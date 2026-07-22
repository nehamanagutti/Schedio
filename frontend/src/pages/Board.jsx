// src/pages/Board.jsx
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Avatar, Toast, EmptyState, Spinner } from '../components/UI';

export default function Board() {
  const { user: me } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState('');

  function load() { return api.getPosts().then(r => setPosts(r.posts)).finally(() => setLoading(false)); }
  useEffect(() => { load(); }, []);

  async function handlePost(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api.createPost({ content });
      setContent('');
      await load();
      setToast('Post published');
    } catch (err) { setToast(err.message); }
    finally { setPosting(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this post?')) return;
    try {
      await api.deletePost(id);
      setPosts(p => p.filter(x => x.id !== id));
      setToast('Post deleted');
    } catch (err) { setToast(err.message); }
  }

  if (loading) return <Spinner />;

  return (
    <div className="fade-up">
      <h1 className="page-title gold-text" style={{ marginBottom:'1.75rem' }}>Faculty Board</h1>

      {/* Compose */}
      <div className="glass section-card" style={{ marginBottom:'1.5rem' }}>
        <form onSubmit={handlePost}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share an announcement, question, or update with the faculty..."
            rows={3}
            style={{ resize:'none', marginBottom:'0.85rem' }}
          />
          <button type="submit" className="btn btn-primary" disabled={posting || !content.trim()}>
            {posting ? <><i className="fas fa-spinner fa-spin" /> Publishing...</> : <><i className="fas fa-paper-plane" /> Publish Post</>}
          </button>
        </form>
      </div>

      {/* Posts */}
      {posts.length === 0
        ? <div className="glass" style={{ borderRadius:'1.5rem' }}><EmptyState icon="comment-dots" title="No posts yet" subtitle="Start the faculty conversation!" /></div>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {posts.map(p => (
              <div key={p.id} className="glass section-card" style={{ transition:'border-color 0.2s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.85rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <Avatar name={p.authorName} size={40} color={p.authorColor} />
                    <div>
                      <p style={{ fontWeight:600 }}>{p.authorName}</p>
                      <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)' }}>
                        {new Date(p.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  </div>
                  {p.userId === me.id && (
                    <button className="btn btn-danger" style={{ padding:'0.4rem 0.6rem', fontSize:'0.8rem' }} onClick={() => handleDelete(p.id)}>
                      <i className="fas fa-trash" />
                    </button>
                  )}
                </div>
                <p style={{ color:'rgba(255,255,255,0.85)', lineHeight:1.65, whiteSpace:'pre-wrap' }}>{p.content}</p>
              </div>
            ))}
          </div>
        )
      }
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
