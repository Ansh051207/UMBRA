import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaPlus,
  FaSearch,
  FaLock,
  FaFilter,
  FaSort,
  FaTrash,
  FaShareAlt,
  FaStickyNote,
  FaSpinner
} from 'react-icons/fa';
import api from '../services/api';

import ShareModal from '../components/ShareModal';

import { useCrypto } from '../contexts/CryptoContext';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const [notes, setNotes] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [filteredSharedNotes, setFilteredSharedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareModal, setShareModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTags, setSelectedTags] = useState([]);
  const [noteToDelete, setNoteToDelete] = useState(null); // { id: string, type: 'own' | 'shared', title: string }
  const [deleteLoading, setDeleteLoading] = useState(false);


  const { masterKey, setMasterKey, deriveKeyFromPassword } = useCrypto();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    const filterAndSort = (notesList) => {
      let filtered = [...notesList];

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

      return filtered;
    };

    setFilteredNotes(filterAndSort(notes));
    setFilteredSharedNotes(filterAndSort(sharedNotes));
  }, [searchTerm, notes, sharedNotes, selectedTags, sortBy, sortOrder]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const [myNotesRes, sharedNotesRes] = await Promise.all([
        api.getNotes(),
        api.getSharedNotes()
      ]);
      setNotes(myNotesRes.data);
      setSharedNotes(sharedNotesRes.data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessSharedNote = async (note) => {
    try {
      if (!masterKey) {
        alert('Encryption keys are missing. Please log in again to access shared notes.');
        return;
      }

      // Get the share key
      let encryptedKey;
      try {
        const ownerId = note.owner?._id || note.owner;
        const response = await api.getShareKey(note._id, ownerId);
        encryptedKey = response.data.encryptedKey;
      } catch (err) {
        console.warn('⚠️ Fetch with ownerId failed in Dashboard, trying "any":', err.message);
        const response = await api.getShareKey(note._id, 'any');
        encryptedKey = response.data.encryptedKey;
      }

      // Store the encrypted key for NoteEditor to pick up
      localStorage.setItem(`share_key_${note._id}`, JSON.stringify({
        encryptedKey,
        fromUserId: note.owner?._id || note.owner
      }));

      // Navigate to note
      navigate(`/note/${note._id}`);
    } catch (error) {
      console.error('Failed to access shared note:', error);
      alert('Failed to access shared note');
    }
  };






  // ... (useEffect hooks remain same)

  // ... (fetchNotes and handleAccessSharedNote remain same)

  const handleDeleteNote = (note) => {
    setNoteToDelete({ id: note._id, type: 'own', title: note.title });
  };

  const handleRemoveSharedNote = (note) => {
    setNoteToDelete({ id: note._id, type: 'shared', title: note.title });
  };

  const executeDelete = async () => {
    if (!noteToDelete) return;

    try {
      setDeleteLoading(true);
      if (noteToDelete.type === 'own') {
        await api.deleteNote(noteToDelete.id);
      } else {
        const currentUserId = user?._id || user?.id;
        await api.removeShare(noteToDelete.id, currentUserId);
      }
      fetchNotes();
      setNoteToDelete(null);
    } catch (error) {
      console.error('Failed to delete/remove note:', error);
      alert('Failed to delete/remove note');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleShareNote = (note) => {
    if (!masterKey) {
      alert('Encryption keys are missing. Please log in again to share notes.');
      return;
    }
    setShareModal(note);
  };



  const getAllTags = () => {
    const tags = new Set();
    [...notes, ...sharedNotes].forEach(note => {
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
            onClick={() => navigate('/note/new')}
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl"
          >
            <FaPlus />
            <span>New Note</span>
          </button>
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

      {/* Sections Container */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* My Notes Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaStickyNote className="text-blue-500" /> My Notes
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded-full">
                {filteredNotes.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 px-6">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {notes.length === 0 ? "You haven't created any notes yet." : "No notes matching your filters."}
                </p>
                {notes.length === 0 && (
                  <button
                    onClick={() => navigate('/note/new')}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Create your first note
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredNotes.map(note => (
                  <div key={note._id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            to={`/note/${note._id}`}
                            className="text-lg font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
                          >
                            {note.title || 'Untitled Note'}
                          </Link>
                          {note.isEncrypted && <FaLock className="text-green-500 text-xs flex-shrink-0" title="Encrypted" />}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
                          <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                          {note.tags && note.tags.length > 0 && (
                            <span className="truncate">#{note.tags[0]}{note.tags.length > 1 ? ` +${note.tags.length - 1}` : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleShareNote(note)}
                          className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Share"
                        >
                          <FaShareAlt size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shared Notes Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaShareAlt className="text-purple-500" /> Shared with Me
              </h2>
              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-bold rounded-full">
                {filteredSharedNotes.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {filteredSharedNotes.length === 0 ? (
              <div className="text-center py-12 px-6">
                <p className="text-gray-500 dark:text-gray-400">
                  {sharedNotes.length === 0 ? "No notes have been shared with you yet." : "No shared notes matching your filters."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredSharedNotes.map(note => (
                  <div key={note._id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => handleAccessSharedNote(note)}
                            className="text-lg font-bold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate text-left"
                          >
                            {note.title || 'Untitled Note'}
                          </button>
                          {note.isEncrypted && <FaLock className="text-green-500 text-xs flex-shrink-0" title="Encrypted" />}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              By {note.owner?.username || 'Unknown'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${note.permission === 'write'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-900/50 dark:text-gray-400'
                              }`}>
                              {note.permission === 'write' ? 'Can Write' : 'Read Only'}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                          </div>
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex gap-1">
                              {note.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-purple-600 dark:text-purple-400">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button
                          onClick={() => handleAccessSharedNote(note)}
                          className="px-3 py-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-bold rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleRemoveSharedNote(note)}
                          className="p-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          title="Remove shared note"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>





      {noteToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {noteToDelete.type === 'own' ? 'Delete Note' : 'Remove Shared Note'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {noteToDelete.type === 'own' ? (
                <>
                  Are you sure you want to delete <strong>"{noteToDelete.title}"</strong>?
                  <br /><br />
                  This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to remove <strong>"{noteToDelete.title}"</strong> from your shared notes?
                  <br /><br />
                  You will no longer have access to this note.
                </>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    {noteToDelete.type === 'own' ? 'Deleting...' : 'Removing...'}
                  </>
                ) : (
                  <>
                    <FaTrash size={14} />
                    {noteToDelete.type === 'own' ? 'Delete' : 'Remove'}
                  </>
                )}
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