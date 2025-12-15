import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaShareAlt, FaLock, FaUnlock } from 'react-icons/fa';

const NoteList = ({ notes, onDelete, onShare, isDecrypted }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map(note => (
        <div key={note._id} className="border rounded-lg p-4 shadow hover:shadow-md transition">
          <div className="flex justify-between items-start mb-2">
            <Link to={`/note/${note._id}`} className="text-lg font-semibold hover:text-blue-600">
              {note.title}
            </Link>
            <div className="flex space-x-2">
              <button
                onClick={() => onShare(note)}
                className="text-gray-500 hover:text-blue-600"
                title="Share"
              >
                <FaShareAlt />
              </button>
              <button
                onClick={() => onDelete(note._id)}
                className="text-gray-500 hover:text-red-600"
                title="Delete"
              >
                <FaTrash />
              </button>
              {isDecrypted ? (
                <FaLock className="text-green-500" title="Encrypted" />
              ) : (
                <FaUnlock className="text-red-500" title="Not Encrypted" />
              )}
            </div>
          </div>
          
          <div className="text-sm text-gray-500 mb-2">
            {new Date(note.updatedAt).toLocaleDateString()}
          </div>
          
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {note.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {note.ownerId && typeof note.ownerId === 'object' && (
            <div className="text-sm text-gray-600">
              Shared by: {note.ownerId.username}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NoteList;