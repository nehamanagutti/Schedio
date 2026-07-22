// src/routes/users.js
const express = require('express');
const store = require('../data/store');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - all verified faculty members (excluding passwords)
router.get('/', auth, (req, res) => {
  const users = store.findUsers(u => u.verified !== false).map(({ password, ...u }) => u);
  res.json({ users });
});

// PATCH /api/users/heartbeat - update last active
router.patch('/heartbeat', auth, (req, res) => {
  store.updateUser(req.user.id, { lastActive: Date.now() });
  res.json({ ok: true });
});

module.exports = router;
