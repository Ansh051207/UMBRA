const express = require('express');
const { body, validationResult } = require('express-validator');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get all notes for user
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Note.find({
      ownerId: req.user._id
    })
      .select('-content -previousVersions') // Don't send encrypted content in listing
      .sort({ updatedAt: -1 });

    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single note
router.get('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      $or: [
        { ownerId: req.user._id },
        { 'sharedWith.userId': req.user._id }
      ]
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new note
router.post('/', auth, [
  body('title').trim().notEmpty(),
  body('content').optional(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, tags, isEncrypted, encryptionMetadata } = req.body;

    const note = new Note({
      ownerId: req.user._id,
      title,
      content: content || '',
      tags: tags || [],
      isEncrypted: isEncrypted || false,
      encryptionMetadata: encryptionMetadata || null
    });

    await note.save();

    res.status(201).json({
      id: note._id,
      title: note.title,
      tags: note.tags,
      createdAt: note.createdAt,
      isEncrypted: note.isEncrypted
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update note
router.put('/:id', auth, [
  body('title').optional().trim().notEmpty(),
  body('content').optional(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

      return res.status(400).json({ errors: errors.array() });
    }

    const note = await Note.findOne({
      _id: req.params.id,
      $or: [
        { ownerId: req.user._id },
        {
          sharedWith: {
            $elemMatch: { userId: req.user._id, permission: 'write' }
          }
        }
      ]
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found or no write permission' });
    }

    // Save current version before updating
    if (req.body.content !== undefined && note.content !== req.body.content) {
      note.previousVersions.push({
        title: note.title,
        content: note.content,
        isEncrypted: note.isEncrypted,
        encryptionMetadata: note.encryptionMetadata,
        version: note.version,
        savedAt: new Date()
      });
      note.version += 1;
    }

    // Update fields
    if (req.body.title !== undefined) note.title = req.body.title;
    if (req.body.content !== undefined) note.content = req.body.content;
    if (req.body.tags !== undefined) note.tags = req.body.tags;
    if (req.body.isEncrypted !== undefined) note.isEncrypted = req.body.isEncrypted;
    if (req.body.encryptionMetadata !== undefined) {
      note.encryptionMetadata = req.body.encryptionMetadata;
    }

    await note.save();

    res.json({
      id: note._id,
      title: note.title,
      version: note.version,
      updatedAt: note.updatedAt,
      isEncrypted: note.isEncrypted
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete note
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id // Only owner can delete
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found or not authorized to delete' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get note versions
router.get('/:id/versions', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      $or: [
        { ownerId: req.user._id },
        { 'sharedWith.userId': req.user._id }
      ]
    }).select('previousVersions version');

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      currentVersion: note.version,
      versions: note.previousVersions
    });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restore to previous version
router.post('/:id/restore/:version', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      $or: [
        { ownerId: req.user._id },
        {
          sharedWith: {
            $elemMatch: { userId: req.user._id, permission: 'write' }
          }
        }
      ]
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const versionToRestore = note.previousVersions.find(
      v => v.version === parseInt(req.params.version)
    );

    if (!versionToRestore) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Save current version
    note.previousVersions.push({
      title: note.title,
      content: note.content,
      isEncrypted: note.isEncrypted,
      encryptionMetadata: note.encryptionMetadata,
      version: note.version,
      savedAt: new Date()
    });

    // Restore old version
    if (versionToRestore.title) note.title = versionToRestore.title;
    note.content = versionToRestore.content;
    note.isEncrypted = versionToRestore.isEncrypted || false;
    note.encryptionMetadata = versionToRestore.encryptionMetadata;
    note.version += 1;

    await note.save();

    res.json({
      message: 'Version restored successfully',
      version: note.version
    });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get users a note is shared with
router.get('/:id/shared-with', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      ownerId: req.user._id // Only owner can see who it's shared with
    }).select('sharedWith');

    if (!note) {
      return res.status(404).json({ error: 'Note not found or not authorized' });
    }

    // Get user details for each shared user
    const sharedWithDetails = await Promise.all(
      note.sharedWith.map(async (share) => {
        const user = await User.findById(share.userId).select('username email _id');
        return {
          ...share.toObject(),
          user: user || { _id: share.userId, username: 'Unknown User', email: 'unknown@example.com' }
        };
      })
    );

    res.json(sharedWithDetails);
  } catch (error) {
    console.error('Get shared with error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
