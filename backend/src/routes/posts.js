// src/routes/posts.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/posts
router.get('/', auth, (req, res) => {
  const posts = store.getPosts();
  // Attach author name to each post
  const enriched = posts.map(p => {
    const user = store.findUser(u => u.id === p.userId);
    return { ...p, authorName: user?.name || 'Unknown', authorColor: user?.avatarColor || '#F59E0B' };
  });
  res.json({ posts: enriched });
});

// POST /api/posts
router.post('/', auth, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });
  const post = store.addPost({
    id: uuidv4(),
    userId: req.user.id,
    content: content.trim(),
    createdAt: new Date().toISOString()
  });
  res.status(201).json({ post: { ...post, authorName: req.user.name, authorColor: req.user.avatarColor } });
});

// DELETE /api/posts/:id
router.delete('/:id', auth, (req, res) => {
  const deleted = store.deletePost(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Post not found or not yours' });
  res.json({ message: 'Post deleted' });
});

module.exports = router;
