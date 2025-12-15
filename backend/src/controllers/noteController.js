const Note = require('../models/Note');
const { encryptText, decryptText } = require('../utils/encryption');

// Create encrypted note
exports.createNote = async (req, res) => {
  try {
    const { title, content, masterPassword } = req.body;
    const userId = req.userId;
    
    // Encrypt note content
    const encryptedContent = encryptText(content, masterPassword);
    
    const note = new Note({
      title,
      content: encryptedContent,
      user: userId,
      encrypted: true
    });
    
    await note.save();
    
    res.status(201).json({
      message: 'Note created and encrypted',
      note: {
        id: note._id,
        title: note.title,
        createdAt: note.createdAt
      }
    });
    
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
};

// Get user's notes (encrypted)
exports.getNotes = async (req, res) => {
  try {
    const userId = req.userId;
    const notes = await Note.find({ user: userId })
      .select('title createdAt updatedAt encrypted')
      .sort({ updatedAt: -1 });
    
    res.json({ notes });
    
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

// Decrypt and get single note
exports.getNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { masterPassword } = req.body;
    const userId = req.userId;
    
    const note = await Note.findOne({ _id: id, user: userId });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Decrypt content
    const decryptedContent = decryptText(note.content, masterPassword);
    
    res.json({
      note: {
        id: note._id,
        title: note.title,
        content: decryptedContent,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to decrypt note' });
  }
};