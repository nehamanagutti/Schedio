// src/routes/cover.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/cover
router.get('/', auth, (req, res) => {
  const requests = store.getCoverRequests().map(r => {
    const requester = store.findUser(u => u.id === r.requestingUserId);
    const responder = r.respondingUserId ? store.findUser(u => u.id === r.respondingUserId) : null;
    const cls = store.getClasses().find(c => c.id === r.classId);
    return {
      ...r,
      requesterName: requester?.name || 'Unknown',
      responderName: responder?.name || null,
      class: cls || null
    };
  });
  res.json({ requests });
});

// POST /api/cover
router.post('/', auth, (req, res) => {
  const { classId, reason } = req.body;
  if (!classId) return res.status(400).json({ error: 'classId is required' });
  // Verify class belongs to user
  const cls = store.getClasses(req.user.id).find(c => c.id === classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const request = store.addCoverRequest({
    id: uuidv4(),
    requestingUserId: req.user.id,
    classId,
    reason: reason || '',
    status: 'pending',
    respondingUserId: null,
    createdAt: new Date().toISOString()
  });
  res.status(201).json({ request });
});

// PATCH /api/cover/:id - accept or decline
router.patch('/:id', auth, (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Status must be accepted or declined' });
  }
  const existing = store.getCoverRequests().find(r => r.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Request not found' });
  if (existing.requestingUserId === req.user.id) {
    return res.status(403).json({ error: 'Cannot respond to your own request' });
  }
  if (existing.status !== 'pending') {
    return res.status(409).json({ error: 'Request is no longer pending' });
  }
  const updated = store.updateCoverRequest(req.params.id, { status, respondingUserId: req.user.id });
  res.json({ request: updated });
});

module.exports = router;
