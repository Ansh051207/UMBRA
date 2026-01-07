const express = require('express');
const { body, validationResult } = require('express-validator');
const Note = require('../models/Note');
const ShareKey = require('../models/ShareKey');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Share note with another user - IMPROVED VERSION
router.post('/:noteId', auth, [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('permission').isIn(['read', 'write']).withMessage('Permission must be "read" or "write"'),
  body('encryptedKey').optional() // Make this optional for non-encrypted notes
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

      return res.status(400).json({ errors: errors.array() });
    }

    const { noteId } = req.params;
    const { userId, permission, encryptedKey } = req.body;



    // Check if note exists and user is owner
    const note = await Note.findOne({
      _id: noteId,
      $or: [
        { ownerId: req.user._id },
        { sharedWith: { $elemMatch: { userId: req.user._id, permission: 'write' } } }
      ]
    });

    if (!note) {

      return res.status(404).json({
        error: 'Note not found or you are not the owner'
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {

      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow sharing with yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot share note with yourself' });
    }

    // Check if already shared
    const existingShareIndex = note.sharedWith.findIndex(
      share => share.userId.toString() === userId
    );

    if (existingShareIndex !== -1) {
      // Update existing share
      note.sharedWith[existingShareIndex].permission = permission;
      note.sharedWith[existingShareIndex].sharedAt = new Date();

    } else {
      // Add new share
      note.sharedWith.push({
        userId: userId,
        permission: permission,
        sharedAt: new Date(),
        sharedBy: req.user._id
      });

    }

    // Save share key if encrypted key provided (for encrypted notes)
    if (encryptedKey && note.isEncrypted) {
      await ShareKey.findOneAndUpdate(
        {
          noteId,
          fromUserId: req.user._id,
          toUserId: userId
        },
        {
          encryptedKey,
          permission,
          noteId,
          fromUserId: req.user._id,
          toUserId: userId
        },
        { upsert: true, new: true }
      );

    }

    await note.save();

    // Get user details for response
    const sharedUserDetails = await User.findById(userId).select('username email _id');

    res.json({
      message: 'Note shared successfully',
      sharedWith: note.sharedWith,
      user: sharedUserDetails
    });
  } catch (error) {
    console.error('❌ Share note error:', error);
    res.status(500).json({
      error: 'Server error while sharing note',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get shared notes for current user
router.get('/shared-with-me', auth, async (req, res) => {
  try {
    const sharedNotes = await Note.find({
      'sharedWith.userId': req.user._id
    })
      .populate('ownerId', 'username email')
      .select('title tags ownerId sharedWith createdAt updatedAt isEncrypted')
      .sort({ updatedAt: -1 });

    // Transform the response to include only relevant share info
    const transformedNotes = sharedNotes.map(note => {
      const userShare = note.sharedWith.find(share =>
        share.userId.toString() === req.user._id.toString()
      );

      return {
        _id: note._id,
        title: note.title,
        tags: note.tags,
        owner: note.ownerId,
        permission: userShare?.permission || 'read',
        sharedAt: userShare?.sharedAt,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        isEncrypted: note.isEncrypted
      };
    });

    res.json(transformedNotes);
  } catch (error) {
    console.error('Get shared notes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get share key for a note
router.get('/key/:noteId/:fromUserId', auth, async (req, res) => {
  try {
    const { noteId, fromUserId } = req.params;

    const query = {
      noteId,
      toUserId: req.user._id
    };

    // If fromUserId is provided and not 'any', include it in query
    if (fromUserId && fromUserId !== 'any' && fromUserId !== 'undefined') {
      query.fromUserId = fromUserId;
    }

    // Sort by id descending to get the most recent share if multiple exist
    const shareKey = await ShareKey.findOne(query).sort({ _id: -1 });

    if (!shareKey) {
      return res.status(404).json({ error: 'Share key not found' });
    }

    res.json({
      encryptedKey: shareKey.encryptedKey,
      permission: shareKey.permission
    });
  } catch (error) {
    console.error('Get share key error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove share
router.delete('/:noteId/:userId', auth, async (req, res) => {
  try {
    const { noteId, userId } = req.params;



    const note = await Note.findOne({
      _id: noteId,
      $or: [
        { ownerId: req.user._id },
        { 'sharedWith.userId': req.user._id }
      ]
    });

    if (!note) {
      return res.status(404).json({
        error: 'Note not found or you are not authorized to modify its shares'
      });
    }

    // Check if the current user is removing themself
    const isRemovingSelf = userId === req.user._id.toString();

    // Check if the current user is the owner or has write permission to remove shares
    const isOwner = note.ownerId.toString() === req.user._id.toString();
    const hasWritePermission = note.sharedWith.some(
      share => share.userId.toString() === req.user._id.toString() && share.permission === 'write'
    );

    if (!isOwner && !hasWritePermission && !isRemovingSelf) {
      return res.status(403).json({ error: 'You do not have permission to remove shares for this note' });
    }

    // Check if share exists
    const shareExists = note.sharedWith.some(
      share => share.userId.toString() === userId
    );

    if (!shareExists) {
      return res.status(404).json({ error: 'Share not found' });
    }

    // Remove from sharedWith array
    note.sharedWith = note.sharedWith.filter(
      share => share.userId.toString() !== userId
    );

    // Delete share key if it exists
    await ShareKey.findOneAndDelete({
      noteId,
      fromUserId: req.user._id,
      toUserId: userId
    });

    await note.save();



    res.json({
      message: 'Share removed successfully',
      noteId,
      removedUserId: userId
    });
  } catch (error) {
    console.error('Remove share error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all shares for a note (who it's shared with)
router.get('/:noteId/shares', auth, async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await Note.findOne({
      _id: noteId,
      $or: [
        { ownerId: req.user._id },
        { 'sharedWith.userId': req.user._id }
      ]
    }).populate('sharedWith.userId', 'username email _id');

    if (!note) {
      return res.status(404).json({
        error: 'Note not found or you are not the owner'
      });
    }

    res.json(note.sharedWith);
  } catch (error) {
    console.error('Get shares error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;