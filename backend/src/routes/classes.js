// src/routes/classes.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');
const { auth } = require('../middleware/auth');

const router = express.Router();
const VALID_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// GET /api/classes - all my classes
router.get('/', auth, (req, res) => {
  const classes = store.getClasses(req.user.id);
  res.json({ classes });
});

// GET /api/classes/all - all faculty classes (for timetable view)
router.get('/all', auth, (req, res) => {
  const classes = store.getClasses();
  res.json({ classes });
});

// GET /api/classes/user/:userId - specific faculty member's classes
router.get('/user/:userId', auth, (req, res) => {
  const classes = store.getClasses(req.params.userId);
  res.json({ classes });
});

// POST /api/classes
router.post('/', auth, (req, res) => {
  const { subjectName, subjectCode, room, day, startTime, endTime, reminderMinutes, notes } = req.body;
  if (!subjectName || !subjectCode || !room || !day || !startTime || !endTime) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }
  if (!VALID_DAYS.includes(day)) {
    return res.status(400).json({ error: 'Invalid day of week' });
  }
  const cls = store.addClass({
    id: uuidv4(),
    userId: req.user.id,
    subjectName,
    subjectCode,
    room,
    day,
    startTime,
    endTime,
    reminderMinutes: reminderMinutes || 15,
    notes: notes || '',
    createdAt: Date.now()
  });
  res.status(201).json({ class: cls });
});

// PATCH /api/classes/:id
router.patch('/:id', auth, (req, res) => {
  const { subjectName, subjectCode, room, day, startTime, endTime, reminderMinutes, notes } = req.body;
  if (day && !VALID_DAYS.includes(day)) {
    return res.status(400).json({ error: 'Invalid day of week' });
  }
  const updated = store.updateClass(req.params.id, req.user.id, {
    ...(subjectName && { subjectName }),
    ...(subjectCode && { subjectCode }),
    ...(room && { room }),
    ...(day && { day }),
    ...(startTime && { startTime }),
    ...(endTime && { endTime }),
    ...(reminderMinutes !== undefined && { reminderMinutes }),
    ...(notes !== undefined && { notes })
  });
  if (!updated) return res.status(404).json({ error: 'Class not found' });
  res.json({ class: updated });
});

// DELETE /api/classes/:id
router.delete('/:id', auth, (req, res) => {
  const deleted = store.deleteClass(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Class not found' });
  res.json({ message: 'Class deleted' });
});

module.exports = router;
