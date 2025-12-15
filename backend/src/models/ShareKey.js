const mongoose = require('mongoose');

const shareKeySchema = new mongoose.Schema({
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  encryptedKey: {
    type: String,
    required: true // Note key encrypted with recipient's public key
  },
  permission: {
    type: String,
    enum: ['read', 'write'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // Auto-delete after 30 days (for security)
  }
});

module.exports = mongoose.model('ShareKey', shareKeySchema);