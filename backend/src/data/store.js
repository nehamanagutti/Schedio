// src/data/store.js
// In-memory data store (writes to db.json for persistence)
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

const defaultData = {
  users: [],
  classes: [],
  posts: [],
  coverRequests: [],
  messages: [],
  pendingRegistrations: [] // unverified signups awaiting OTP confirmation
};

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('DB read error:', e.message);
  }
  return { ...defaultData };
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('DB write error:', e.message);
  }
}

let db = loadDB();

module.exports = {
  getDB: () => db,
  saveDB: (newData) => {
    db = newData;
    saveDB(db);
  },
  // Helpers
  findUser: (pred) => db.users.find(pred),
  findUsers: (pred) => db.users.filter(pred),
  addUser: (user) => {
    db.users.push(user);
    saveDB(db);
    return user;
  },
  updateUser: (id, updates) => {
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...updates };
    saveDB(db);
    return db.users[idx];
  },
  // Classes
  getClasses: (userId) => userId ? db.classes.filter(c => c.userId === userId) : db.classes,
  addClass: (cls) => {
    db.classes.push(cls);
    saveDB(db);
    return cls;
  },
  updateClass: (id, userId, updates) => {
    const idx = db.classes.findIndex(c => c.id === id && c.userId === userId);
    if (idx === -1) return null;
    db.classes[idx] = { ...db.classes[idx], ...updates };
    saveDB(db);
    return db.classes[idx];
  },
  deleteClass: (id, userId) => {
    const before = db.classes.length;
    db.classes = db.classes.filter(c => !(c.id === id && c.userId === userId));
    saveDB(db);
    return db.classes.length < before;
  },
  // Posts
  getPosts: () => [...db.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  addPost: (post) => {
    db.posts.push(post);
    saveDB(db);
    return post;
  },
  deletePost: (id, userId) => {
    const before = db.posts.length;
    db.posts = db.posts.filter(p => !(p.id === id && p.userId === userId));
    saveDB(db);
    return db.posts.length < before;
  },
  // Cover Requests
  getCoverRequests: () => db.coverRequests,
  addCoverRequest: (req) => {
    db.coverRequests.push(req);
    saveDB(db);
    return req;
  },
  updateCoverRequest: (id, updates) => {
    const idx = db.coverRequests.findIndex(r => r.id === id);
    if (idx === -1) return null;
    db.coverRequests[idx] = { ...db.coverRequests[idx], ...updates };
    saveDB(db);
    return db.coverRequests[idx];
  },
  // Messages
  getMessages: (userA, userB) => db.messages.filter(m =>
    (m.fromUserId === userA && m.toUserId === userB) ||
    (m.fromUserId === userB && m.toUserId === userA)
  ).sort((a, b) => a.timestamp - b.timestamp),
  addMessage: (msg) => {
    db.messages.push(msg);
    saveDB(db);
    return msg;
  },
  markMessagesRead: (fromUserId, toUserId) => {
    db.messages.forEach(m => {
      if (m.fromUserId === fromUserId && m.toUserId === toUserId && !m.read) {
        m.read = true;
      }
    });
    saveDB(db);
  },
  getUnreadCount: (userId) => db.messages.filter(m => m.toUserId === userId && !m.read).length,

  // Pending registrations (unverified, awaiting OTP)
  findPending: (pred) => {
    if (!db.pendingRegistrations) db.pendingRegistrations = [];
    return db.pendingRegistrations.find(pred);
  },
  addPending: (pending) => {
    if (!db.pendingRegistrations) db.pendingRegistrations = [];
    // Replace any existing pending signup for the same email so re-registering
    // (e.g. to get a new OTP) doesn't pile up duplicates.
    db.pendingRegistrations = db.pendingRegistrations.filter(p => p.email !== pending.email);
    db.pendingRegistrations.push(pending);
    saveDB(db);
    return pending;
  },
  removePending: (email) => {
    if (!db.pendingRegistrations) db.pendingRegistrations = [];
    db.pendingRegistrations = db.pendingRegistrations.filter(p => p.email !== email);
    saveDB(db);
  }
};
