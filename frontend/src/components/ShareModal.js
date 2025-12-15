import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useCrypto } from '../contexts/CryptoContext';
import { FaTimes, FaUserPlus } from 'react-icons/fa';

const ShareModal = ({ note, onClose, onShare }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [permission, setPermission] = useState('read');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { encryptWithPublicKey, generateKey } = useCrypto();

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchUsers();
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      const response = await api.searchUsers(searchQuery);
      setUsers(response.data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate a symmetric key for this note
      const noteKey = generateKey();
      
      // Encrypt the note key with recipient's public key
      const encryptedKey = encryptWithPublicKey(noteKey, selectedUser.publicKey);
      
      // Share the note
      await api.shareNote(note._id, {
        toUserId: selectedUser._id,
        encryptedKey,
        permission
      });

      onShare();
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to share note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Share Note</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Users
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Type to search users..."
          />
        </div>

        {users.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto">
            {users.map(user => (
              <div
                key={user._id}
                className={`p-2 cursor-pointer hover:bg-gray-100 rounded ${
                  selectedUser?._id === user._id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="font-medium">{user.username}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="mb-4 p-3 bg-blue-50 rounded">
            <div className="font-medium">Selected: {selectedUser.username}</div>
            <div className="text-sm text-gray-600">{selectedUser.email}</div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Permission Level
          </label>
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="read">Read Only</option>
            <option value="write">Read & Write</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={!selectedUser || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              'Sharing...'
            ) : (
              <>
                <FaUserPlus className="mr-2" />
                Share Note
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;