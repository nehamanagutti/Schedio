// src/routes/messages.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:userId - conversation with a user
router.get('/:userId', auth, (req, res) => {
  const messages = store.getMessages(req.user.id, req.params.userId);
  // Mark incoming messages as read
  store.markMessagesRead(req.params.userId, req.user.id);
  res.json({ messages });
});

// GET /api/messages/unread/count
router.get('/unread/count', auth, (req, res) => {
  const count = store.getUnreadCount(req.user.id);
  res.json({ count });
});

// POST /api/messages
router.post('/', auth, (req, res) => {
  const { toUserId, content } = req.body;
  if (!toUserId || !content?.trim()) {
    return res.status(400).json({ error: 'toUserId and content are required' });
  }
  if (toUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot message yourself' });
  }
  const recipient = store.findUser(u => u.id === toUserId);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
  const message = store.addMessage({
    id: uuidv4(),
    fromUserId: req.user.id,
    toUserId,
    content: content.trim(),
    timestamp: Date.now(),
    read: false
  });
  res.status(201).json({ message });
});

module.exports = router;
