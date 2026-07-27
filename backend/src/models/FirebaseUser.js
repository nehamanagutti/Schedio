const mongoose = require('mongoose');

const firebaseUserSchema = new mongoose.Schema({
  // Stable ID shared with the legacy application store and encoded in the JWT.
  appUserId: { type: String, required: true, unique: true, index: true },
  firebaseUid: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  avatar: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  authProvider: { type: String, enum: ['google', 'github'], required: true },
  lastLogin: { type: Date, required: true },
  lastActive: { type: Number, required: true }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.FirebaseUser || mongoose.model('FirebaseUser', firebaseUserSchema);
