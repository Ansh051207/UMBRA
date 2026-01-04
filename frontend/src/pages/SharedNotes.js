import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useCrypto } from '../contexts/CryptoContext';
import { decryptNote } from '../utils/cryptoUtils';
import { FaArrowLeft, FaLock, FaUnlock } from 'react-icons/fa';

const SharedNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { masterKey } = useCrypto();

  useEffect(() => {
    fetchSharedNotes();
  }, []);

  const fetchSharedNotes = async () => {
    try {
      setLoading(true);
      const response = await api.getSharedNotes();
      setNotes(response.data);
    } catch (error) {
      console.error('Failed to fetch shared notes:', error);
      setError('Failed to load shared notes');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessNote = async (note) => {
    try {
      if (!masterKey) {
        setError('Please unlock encryption first');
        return;
      }

      // Get the share key
      const ownerId = note.owner?._id || note.owner;
      const response = await api.getShareKey(note._id, ownerId);
      const { encryptedKey } = response.data;

      // In a real implementation, we would decrypt the note key here
      // For now, we'll store the encrypted key and handle decryption in NoteEditor
      localStorage.setItem(`share_key_${note._id}`, JSON.stringify({
        encryptedKey,
        fromUserId: note.owner?._id || note.owner
      }));

      // Navigate to note
      window.location.href = `/note/${note._id}`;
    } catch (error) {
      console.error('Failed to access note:', error);
      setError('Failed to access shared note');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading shared notes...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Link
          to="/"
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <FaArrowLeft />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Shared with Me</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No shared notes found</div>
          <div className="text-sm text-gray-600">
            Notes shared with you will appear here
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(note => (
            <div key={note._id} className="border rounded-lg p-4 shadow hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <div className="font-semibold text-lg">{note.title}</div>
                <div className="flex items-center">
                  {masterKey ? (
                    <FaLock className="text-green-500" title="Encrypted" />
                  ) : (
                    <FaUnlock className="text-red-500" title="Not Encrypted" />
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-500 mb-2">
                From: {note.owner?.username || 'Unknown'}
              </div>

              <div className="text-sm text-gray-500 mb-3">
                Shared: {new Date(note.updatedAt).toLocaleDateString()}
              </div>

              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {note.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleAccessNote(note)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!masterKey}
              >
                {masterKey ? 'Access Note' : 'Unlock to Access'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedNotes;