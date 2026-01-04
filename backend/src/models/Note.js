const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true // This will be encrypted ciphertext
  },
  tags: [{
    type: String,
    trim: true
  }],
  isEncrypted: {
    type: Boolean,
    default: false
  },
  encryptionMetadata: {
    algorithm: String,
    iv: String,
    salt: String
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write'],
      default: 'read'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    title: String,
    content: String,
    isEncrypted: Boolean,
    encryptionMetadata: {
      algorithm: String,
      iv: String,
      salt: String
    },
    version: Number,
    savedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp before save
noteSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Note', noteSchema);