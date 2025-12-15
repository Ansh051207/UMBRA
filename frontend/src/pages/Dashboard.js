import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaPlus, 
  FaSearch, 
  FaLock, 
  FaUnlock, 
  FaFilter, 
  FaSort, 
  FaTrash, 
  FaShareAlt, 
  FaEye, 
  FaEdit,
  FaStickyNote
} from 'react-icons/fa';
import api from '../services/api';
// import NoteList from '../NotesList';
import ShareModal from '../components/ShareModal';
import TitleModal from '../components/TitleModal'; // NEW IMPORT
import { useCrypto } from '../contexts/CryptoContext';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [shareModal, setShareModal] = useState(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTitleModal, setShowTitleModal] = useState(false); // NEW STATE
  
  const { masterKey, setMasterKey, deriveKeyFromPassword } = useCrypto();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    let filtered = notes;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note =>
        note.tags?.some(tag => selectedTags.includes(tag))
      );
    }
    
    // Sort notes
    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredNotes(filtered);
  }, [searchTerm, notes, selectedTags, sortBy, sortOrder]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await api.getNotes();
      setNotes(response.data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  // In Dashboard.js, update the handleCreateNewNote function:
const handleCreateNewNote = async (noteData) => {
  try {
    console.log('Creating new note with data:', noteData);
    
    // If encryption is enabled, set the master key first
    if (noteData.encrypt && noteData.password) {
      const derivedKey = deriveKeyFromPassword(noteData.password, 'master-salt');
      setMasterKey(derivedKey);
    }
    
    // Navigate to new note page with state data - FIXED THIS LINE
    navigate('/note/new', { 
      state: { 
        prefillTitle: noteData.title,
        prefillTags: noteData.tags,
        shouldEncrypt: noteData.encrypt,
        encryptionPassword: noteData.password // Add this if you want to pass password
      }
    });
    
  } catch (error) {
    console.error('Failed to create new note:', error);
    alert('Failed to create new note. Please try again.');
  }
};

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      try {
        await api.deleteNote(noteId);
        fetchNotes();
      } catch (error) {
        console.error('Failed to delete note:', error);
        alert('Failed to delete note');
      }
    }
  };

  const handleShareNote = (note) => {
    if (!masterKey) {
      setShowPasswordPrompt(true);
      return;
    }
    setShareModal(note);
  };

  const handlePasswordSubmit = () => {
    const derivedKey = deriveKeyFromPassword(masterPassword, 'master-salt');
    setMasterKey(derivedKey);
    setShowPasswordPrompt(false);
    setMasterPassword('');
  };

  const getAllTags = () => {
    const tags = new Set();
    notes.forEach(note => {
      note.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  };

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Notes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Securely store and manage your encrypted notes</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* UPDATED: Changed from Link to button with click handler */}
          <button
            onClick={() => setShowTitleModal(true)}
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl"
          >
            <FaPlus />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{notes.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Notes</div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {notes.filter(n => n.isEncrypted).length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Encrypted</div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
            <div className="bg-green-600 h-2 rounded-full" style={{ 
              width: `${(notes.filter(n => n.isEncrypted).length / Math.max(notes.length, 1)) * 100}%` 
            }}></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {getAllTags().length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Unique Tags</div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
            <div className="bg-purple-600 h-2 rounded-full" style={{ 
              width: `${Math.min((getAllTags().length / Math.max(notes.length, 1)) * 100, 100)}%` 
            }}></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {masterKey ? '🔒' : '🔓'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {masterKey ? 'Locked' : 'Unlocked'}
              </div>
            </div>
            <button
              onClick={() => setShowPasswordPrompt(true)}
              className={`p-2 rounded-lg ${masterKey ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
            >
              {masterKey ? <FaLock /> : <FaUnlock />}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes by title or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex gap-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
              >
                <option value="updatedAt">Last Updated</option>
                <option value="createdAt">Date Created</option>
                <option value="title">Title</option>
              </select>
              <FaSort className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Tags Filter */}
        {getAllTags().length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <FaFilter className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by tags:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {getAllTags().map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedTags.includes(tag)
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notes ({filteredNotes.length})
            </h2>
            {filteredNotes.length > 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredNotes.length} of {notes.length} notes
              </div>
            )}
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaStickyNote className="text-3xl text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {notes.length === 0 ? 'No notes yet' : 'No notes found'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {notes.length === 0 
                ? 'Create your first encrypted note to get started'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            <button
              onClick={() => setShowTitleModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium inline-flex items-center space-x-2 transition-all"
            >
              <FaPlus />
              <span>Create New Note</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotes.map(note => (
              <div key={note._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        to={`/note/${note._id}`}
                        className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {note.title}
                      </Link>
                      {note.isEncrypted && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded-full flex items-center gap-1">
                          <FaLock className="text-xs" /> Encrypted
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Last updated: {new Date(note.updatedAt).toLocaleDateString()} at {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {note.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleShareNote(note)}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <FaShareAlt />
                        Share
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <FaTrash />
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/note/${note._id}`}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="View"
                    >
                      <FaEye />
                    </Link>
                    <Link
                      to={`/note/${note._id}`}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <FaEdit />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Title Modal for New Note */}
      <TitleModal
        isOpen={showTitleModal}
        onClose={() => setShowTitleModal(false)}
        onCreate={handleCreateNewNote}
      />

      {/* Master Password Prompt */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FaLock className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Unlock Encryption</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter your master password</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Your master password is required to enable encryption features and access shared notes.
            </p>
            
            <input
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Enter master password"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPasswordPrompt(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {shareModal && (
        <ShareModal
          note={shareModal}
          onClose={() => setShareModal(null)}
          onShare={fetchNotes}
        />
      )}
    </div>
  );
};

export default Dashboard;