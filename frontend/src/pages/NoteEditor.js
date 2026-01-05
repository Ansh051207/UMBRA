import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FaSave, FaTimes, FaHistory, FaLock, FaKey,
  FaBold, FaItalic, FaUnderline, FaListUl, FaListOl,
  FaHeading, FaCode, FaLink, FaQuoteLeft,
  FaExpand, FaCompress, FaDownload,
  FaShareAlt, FaUserFriends, FaSearch,
  FaUserPlus, FaUserCheck, FaUserTimes, FaSpinner,
  FaTimesCircle, FaCheckCircle, FaEdit, FaEye, FaShieldAlt
} from 'react-icons/fa';
import api from '../services/api';
import { useCrypto } from '../contexts/CryptoContext';
import { useAuth } from '../contexts/AuthContext';
import { encryptNote, decryptNote, importEncryptedData } from '../utils/cryptoUtils';
import axios from 'axios';

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // CRITICAL FIX: Handle the case where id is undefined
  // If id is undefined, we're definitely creating a new note
  const isNewNote = id === 'new' || id === undefined;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(!isNewNote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [isAutoResizing, setIsAutoResizing] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canEdit, setCanEdit] = useState(isNewNote); // New state to control editability
  const [sessionNoteKey, setSessionNoteKey] = useState(null); // Key used for current note encryption/decryption

  const [isOwner, setIsOwner] = useState(false);
  const showPreview = true;
  // Sharing states
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);
  const [sharingError, setSharingError] = useState('');
  const [sharingSuccess, setSharingSuccess] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const { masterKey, setMasterKey, encrypt, decrypt, deriveKeyFromPassword, encryptWithPublicKey, decryptWithPrivateKey, privateKey, setPrivateKey } = useCrypto();
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();

  // ========== CRITICAL DEBUGGING ==========
  useEffect(() => {
    console.log('=== URL DEBUGGING ===');
    console.log('useParams() id:', id);
    console.log('Type of id:', typeof id);
    console.log('isNewNote calculation:', id === 'new' || id === undefined);
    console.log('Window location pathname:', window.location.pathname);
    console.log('Window location href:', window.location.href);
    console.log('useLocation() pathname:', location.pathname);
    console.log('useLocation() search:', location.search);
    console.log('useLocation() state:', location.state);

    // If id is undefined but URL is /note/new, fix it manually
    if (id === undefined && window.location.pathname === '/note/new') {
      console.log('⚠️ FIXING: id is undefined but URL is /note/new');
      console.log('✅ Manually treating as new note');
    }

    // Check route params more carefully
    const pathParts = window.location.pathname.split('/');
    console.log('Path parts:', pathParts);
    console.log('Expected note ID from path:', pathParts[2]);
  }, [id, location]);

  // ========== ROUTING FIX ==========
  // If id is undefined, check if we should be at /note/new
  useEffect(() => {
    if (id === undefined) {
      console.log('⚠️ NoteEditor: id is undefined from useParams()');
      console.log('🔍 Checking current URL:', window.location.pathname);

      const pathParts = window.location.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];

      console.log('Last part of URL:', lastPart);

      // If we're at /note (without an ID), redirect to /note/new
      if (window.location.pathname === '/note') {
        console.log('🔍 Found /note without ID, redirecting to /note/new');
        navigate('/note/new', { state: location.state || {} });
        return;
      }

      // If we're at /note/ but the ID is empty
      if (lastPart === '' && pathParts[pathParts.length - 2] === 'note') {
        console.log('🔍 Found /note/ (trailing slash), redirecting to /note/new');
        navigate('/note/new', { state: location.state || {} });
        return;
      }

      // If we're at /note/new but id is undefined (shouldn't happen with proper routing)
      if (window.location.pathname === '/note/new') {
        console.log('✅ Already at /note/new, continuing with new note creation');
        // This is okay, we'll treat it as a new note
      }
    }
  }, [id, navigate, location.state, location.pathname]);

  // Handle prefilled data for new notes - UPDATED
  useEffect(() => {
    console.log('🔍 NoteEditor: Checking for prefilled data...');
    console.log('🔍 isNewNote:', isNewNote);
    console.log('🔍 location.state:', location.state);

    if (isNewNote) {
      if (location.state) {
        console.log('🔍 NoteEditor: Received prefilled data from Dashboard:', location.state);

        // Only set title if it's not already set
        if (location.state.prefillTitle && !title) {
          console.log('🔍 Setting title to:', location.state.prefillTitle);
          setTitle(location.state.prefillTitle);
        }

        if (location.state.prefillTags && location.state.prefillTags.length > 0 && !tags) {
          console.log('🔍 Setting tags to:', location.state.prefillTags);
          setTags(location.state.prefillTags.join(', '));
        }

        // Handle encryption if needed
        if (location.state.shouldEncrypt && !masterKey && location.state.encryptionPassword) {
          console.log('🔍 Note should be encrypted, setting master key...');
          try {
            const derivedKey = deriveKeyFromPassword(location.state.encryptionPassword, 'master-salt');
            // In a real app, you would set this in the crypto context
            console.log('🔍 Derived key created');
            alert('Encryption enabled for this note');
          } catch (error) {
            console.error('Failed to set encryption key:', error);
          }
        }
      } else {
        console.log('🔍 No prefilled data found - creating empty note');
      }
    }
  }, [isNewNote, location.state, masterKey]);

  // Add debugging to see what's happening
  useEffect(() => {
    console.log('🔍 DEBUG - Current component state:');
    console.log('  Title:', title);
    console.log('  Tags:', tags);
    console.log('  Content length:', content.length);
    console.log('  isNewNote:', isNewNote);
    console.log('  Note ID from URL:', id);
    console.log('  Full URL:', window.location.href);
    console.log('  Location state:', location.state);

    // Check if we're on the wrong URL
    if (id !== 'new' && id !== undefined && !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.error('❌ ERROR: Invalid note ID in URL! Expected "new" or valid ObjectId');
      console.error('❌ Current ID:', id);
      alert(`Wrong URL! You should be at /note/new but you're at /note/${id}\n\nGo back and create a note again.`);
    }
  }, [title, tags, content, isNewNote, id, location.state]);

  // Debug: Log authentication state
  useEffect(() => {
    console.log('🔍 NoteEditor: Component mounted');
    console.log('🔍 NoteEditor: isAuthenticated:', isAuthenticated);
    console.log('🔍 NoteEditor: User:', user);
    console.log('🔍 NoteEditor: User ID:', user?._id);
    console.log('🔍 NoteEditor: Token in localStorage:', localStorage.getItem('token') ? 'Present' : 'Missing');
    console.log('🔍 NoteEditor: Auth loading:', authLoading);
    console.log('🔍 NoteEditor: Note ID from URL:', id);
    console.log('🔍 NoteEditor: Is new note?', isNewNote);
    console.log('🔍 NoteEditor: Note ID type:', typeof id);
    console.log('🔍 NoteEditor: Note ID value:', JSON.stringify(id));

    // Check axios headers
    console.log('🔍 NoteEditor: Axios headers:', axios.defaults.headers.common);

    // Update debug info


    // Check backend status
    // checkBackendStatus(); // Removed as part of debug panel removal
  }, [isAuthenticated, user, authLoading, id, isNewNote]);

  useEffect(() => {
    // Debug: Show current state
    console.log('=== NOTE EDITOR AUTH CHECK ===');
    console.log('authLoading:', authLoading);
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isNewNote:', isNewNote);
    console.log('Note ID:', id);
    console.log('Note ID type:', typeof id);

    // Wait for auth to finish loading
    if (authLoading) {
      console.log('🔍 NoteEditor: Auth still loading, waiting...');
      return;
    }

    // Check authentication
    if (!isAuthenticated) {
      console.log('🔍 NoteEditor: User not authenticated, redirecting to login');
      setError('Please log in to create or edit notes');
      navigate('/login');
      return;
    }

    console.log('🔍 NoteEditor: User authenticated, proceeding...');
    console.log('🔍 NoteEditor: User details:', {
      id: user?._id,
      email: user?.email
    });

    if (!isNewNote) {
      fetchNote();
    } else {
      setLoading(false);
    }
  }, [id, isAuthenticated, navigate, authLoading, isNewNote, user]);

  // Auto-resize textarea based on content
  const resizeTextarea = () => {
    if (textareaRef.current && isAutoResizing) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.max(400, textareaRef.current.scrollHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [content]);







  const fetchNote = async () => {
    try {
      // If it's a new note, don't try to fetch
      if (isNewNote) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      // setApiError(null); // Removed as part of debug panel removal
      // setApiResponse(null); // Removed as part of debug panel removal

      console.log('🔍 NoteEditor: Fetching note with ID:', id);
      console.log('🔍 NoteEditor: User ID:', user?._id);

      // Check if ID is literally "undefined" string
      if (id === "undefined") {
        const errorMsg = 'Invalid note URL. The note ID is missing. Go to /notes to see your notes or /note/new to create one.';
        console.error('🔍 NoteEditor:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Validate ID format
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        const errorMsg = `Invalid note ID format: "${id}". Expected 24-character hex string. Visit /notes to see your notes.`;
        console.error('🔍 NoteEditor:', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('🔍 NoteEditor: Using api.getNote() service...');

      const response = await api.getNote(id);
      console.log('🔍 NoteEditor: Note fetched successfully:', response.data);

      const note = response.data;
      // setApiResponse(note); // Removed as part of debug panel removal

      // Check if note is actually returned
      if (!note) {
        const errorMsg = 'Note not found in response (null/undefined)';
        console.error('🔍 NoteEditor:', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('🔍 NoteEditor: Note details:', {
        id: note._id,
        title: note.title,
        ownerId: note.ownerId,
        hasContent: !!note.content,
        isEncrypted: note.isEncrypted,
        tagsCount: note.tags?.length || 0
      });

      setTitle(note.title || '');
      setTags(note.tags?.join(', ') || '');

      const ownerIdStr = String(note.ownerId?._id || note.ownerId || '');
      const userIdStr = String(user?._id || user?.id || '');
      const isNoteOwner = userIdStr && ownerIdStr === userIdStr;
      setIsOwner(isNoteOwner);

      // Decrypt content if we have the master key
      if (masterKey && note.isEncrypted && note.encryptionMetadata) {

        try {
          console.log('🔍 NoteEditor: Attempting to decrypt note content');
          let noteKey = masterKey;

          // If this is a shared note (and we are not the owner), we need to get the specific note key
          console.log('🔍 NoteEditor: Ownership check:', {
            isOwner: isNoteOwner,
            ownerIdStr,
            userIdStr
          });

          if (!isNoteOwner) {
            console.log('🔍 Shared note detected. Trying to retrieve share key...');
            try {
              // 1. Check localStorage first (cached from Dashboard)
              const cachedKeyData = localStorage.getItem(`share_key_${id}`);
              if (cachedKeyData) {
                try {
                  const { encryptedKey } = JSON.parse(cachedKeyData);
                  console.log('🔍 Found cached share key, decrypting...');

                  let privateKeyPEM = privateKey;
                  if (!privateKeyPEM) {
                    throw new Error('Private key not unlocked. Please log in again.');
                  }

                  noteKey = await decryptWithPrivateKey(encryptedKey, privateKeyPEM);
                  console.log('✅ Shared note key decrypted from cache');
                } catch (cacheErr) {
                  console.warn('⚠️ Cached key decryption failed:', cacheErr.message);
                  // Continue to fetch from API
                }
              }

              // 2. If no key yet, fetch from API
              if (!noteKey || noteKey === masterKey) {
                let privateKeyPEM = privateKey;

                if (!privateKeyPEM) {
                  // Decrypt Private Key if password available
                  throw new Error('Encryption keys are required. Please log in again.');
                }

                console.log('🔍 Fetching share key from API...');
                let shareKeyRes;
                try {
                  const ownerId = note.ownerId?._id || note.ownerId;
                  shareKeyRes = await api.getShareKey(id, ownerId);
                } catch (firstErr) {
                  console.warn('⚠️ Fetch with ownerId failed, trying "any":', firstErr.message);
                  shareKeyRes = await api.getShareKey(id, 'any');
                }

                console.log('🔍 Decrypting share key from API...');
                noteKey = await decryptWithPrivateKey(shareKeyRes.data.encryptedKey, privateKeyPEM);
                console.log('✅ Shared note key decrypted from API');
              }
            } catch (shareErr) {
              console.error('❌ Failed to retrieve shared note key:', shareErr);
              throw new Error('Failed to decrypt shared note. Your encryption keys might be missing.');
            }
          }

          const decryptedContent = decryptNote(
            note.content,
            noteKey,
            note.encryptionMetadata.iv
          );
          setContent(decryptedContent);
          setSessionNoteKey(noteKey); // Store the key for later use (like sharing)
          console.log('✅ NoteEditor: Note decrypted successfully');
        } catch (decryptError) {
          console.error('🔍 NoteEditor: Decryption failed:', decryptError);
          setError('Decryption Error: ' + decryptError.message);

          // If encryption keys are missing, alert user
          if (decryptError.message.includes('Encryption keys are required')) {
            setError('Encryption required. Please log in again to restore your keys.');
          }

          // If we are the owner but decryption failed, maybe the masterKey is wrong
          if (isNoteOwner) {
            setContent(`[Decryption Failed] This note was encrypted with a different password or your master key is incorrect.`);
          } else {
            setContent('[Encrypted - Shared note decryption failed. Your encryption keys might be missing or incorrect.]');
          }
        }
      } else if (note.isEncrypted && !masterKey) {
        // Encrypted but no master key
        setContent('[Note is encrypted. Encryption keys are missing. Please log in again.]');
      } else {
        setContent(note.content || '');
      }

      // Check if user has permission to edit
      const currentUserId = user?._id || user?.id;
      const userShare = note.sharedWith?.find(s => String(s.userId?._id || s.userId) === String(currentUserId));
      const hasWritePermission = isNoteOwner || (userShare && userShare.permission === 'write');
      setCanEdit(hasWritePermission);
      console.log('🔍 NoteEditor: Permissions:', { isNoteOwner, hasWritePermission, currentUserId });
    } catch (error) {
      console.error('🔍 NoteEditor: Failed to fetch note:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });

      // setApiError({ // Removed as part of debug panel removal
      //   status: error.response?.status,
      //   statusText: error.response?.statusText,
      //   data: error.response?.data,
      //   message: error.message
      // });

      if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        logout();
        navigate('/login');
      } else if (error.response?.status === 404) {
        setError(`Note not found (ID: ${id}). It may have been deleted or you don't have access. Visit /notes to see your notes.`);
      } else if (error.response?.status === 500) {
        setError('Server error (500). Please check backend logs and make sure MongoDB is running.');
      } else if (error.code === 'ECONNREFUSED') {
        setError('Cannot connect to backend server. Make sure it\'s running on http://localhost:5000');
      } else if (error.message?.includes('Network Error')) {
        setError('Network error. Check your internet connection and backend server.');
      } else if (error.message?.includes('Invalid note ID format')) {
        setError(error.message);
      } else {
        setError(`Failed to load note: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const response = await api.getNoteVersions(id);
      let noteVersions = response.data.versions;

      // Decrypt versions if note is encrypted
      if (sessionNoteKey) {
        console.log('🔍 Decrypting note versions...');
        noteVersions = noteVersions.map(version => {
          try {
            if (version.isEncrypted && version.encryptionMetadata?.iv) {
              const decrypted = decryptNote(
                version.content,
                sessionNoteKey,
                version.encryptionMetadata.iv
              );
              return { ...version, content: decrypted, decryptionFailed: false };
            }
            return { ...version, decryptionFailed: false };
          } catch (err) {
            console.warn(`⚠️ Failed to decrypt version ${version.version}:`, err.message);
            return { ...version, decryptionFailed: true };
          }
        });
      }

      setVersions(noteVersions);
      setShowHistory(true);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    }
  };


  // MISSING FUNCTION: Add this to fix the error
  const openShareModal = () => {
    console.log('🔍 Opening share modal for note:', id);
    setShowShareModal(true);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setSharingError('');
    setSharingSuccess('');

    // Fetch shared users when opening modal
    if (!isNewNote && id) {
      fetchSharedWith();
    }
  };

  const searchUsers = async (query) => {
    const queryTrimmed = query.trim();
    if (queryTrimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSharingError('');

    try {
      console.log('🔍 Searching users with query:', queryTrimmed);

      const response = await api.searchUsers(queryTrimmed);
      console.log('✅ Search results:', response.data);

      // Filter out users already selected or already shared with
      const filteredResults = response.data.filter(user =>
        !selectedUsers.some(selected => selected._id === user._id) &&
        !sharedWith.some(shared => shared.userId === user._id)
      );

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('❌ User search failed:', error);
      setSharingError('Failed to search users: ' + (error.response?.data?.error || error.message));
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search (wait 500ms after user stops typing)
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query);
    }, 500);
  };

  const handleAddUser = (user) => {
    // Check if user is already selected
    if (!selectedUsers.some(u => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, user]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleRemoveSelectedUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(user => user._id !== userId));
  };

  const handleRemoveSharedUser = async (userId) => {
    try {
      setShareLoading(true);
      setSharingError('');

      const response = await api.removeShare(id, userId);
      console.log('✅ Share removed:', response.data);

      // Update local state
      setSharedWith(sharedWith.filter(share => share.userId !== userId));
      setSharingSuccess('User removed from shared list');

      setTimeout(() => setSharingSuccess(''), 3000);
    } catch (error) {
      console.error('❌ Remove share failed:', error);
      setSharingError('Failed to remove share: ' + (error.response?.data?.error || error.message));
    } finally {
      setShareLoading(false);
    }
  };

  const handleShareNote = async () => {
    if (selectedUsers.length === 0) {
      setSharingError('Please select at least one user to share with');
      return;
    }

    if (!id || isNewNote) {
      setSharingError('Please save the note first before sharing');
      return;
    }

    setShareLoading(true);
    setSharingError('');
    setSharingSuccess('');

    try {
      console.log('🔍 Sharing note with users:', selectedUsers);

      // For each selected user, share the note
      const sharePromises = selectedUsers.map(async (user) => {
        const shareData = {
          userId: user._id,
          permission: 'read'
        };

        // If encryption is enabled, encrypt the key for the recipient
        if (masterKey) {
          if (!user.publicKey) {
            console.warn(`User ${user.username} has no public key, cannot share encrypted note securely.`);
            throw new Error(`User ${user.username} has not set up encryption keys. Cannot share.`);
          }

          try {
            // 1. Get the correct encryption key
            // If the note is already encrypted, we should share the key used to encrypt it.
            // In this app, we use the user's masterKey for their own notes.
            if (!masterKey) {
              throw new Error('Encryption keys are missing. Please log in again.');
            }

            if (!user.publicKey || user.publicKey.length < 50) {
              throw new Error(`User ${user.username} has not set up valid encryption keys yet.`);
            }

            console.log(`🔐 Encrypting key for user ${user.username}...`);

            // 2. Encrypt the sessionNoteKey (or masterKey if owner) with the recipient's public key
            // For owner, sessionNoteKey might be null before first save, so use masterKey
            const keyToShare = sessionNoteKey || masterKey;
            const encryptedKey = await encryptWithPublicKey(keyToShare, user.publicKey);

            console.log('✅ Key encrypted, sending share request...');

            shareData.encryptedKey = encryptedKey;
            console.log(`✅ Key encrypted for ${user.username}`);
          } catch (err) {
            console.error(`Failed to encrypt key for ${user.username}:`, err);
            throw new Error(`Failed to encrypt key for ${user.username}`);
          }
        }

        return api.shareNote(id, shareData);
      });

      const results = await Promise.all(sharePromises);
      console.log('✅ Share results:', results);

      // Add to sharedWith list
      const newSharedUsers = selectedUsers.map((user, index) => ({
        userId: user._id,
        permission: 'read',
        sharedAt: new Date().toISOString(),
        user: {
          _id: user._id,
          username: user.username,
          email: user.email
        }
      }));

      setSharedWith([...sharedWith, ...newSharedUsers]);
      setSelectedUsers([]);
      setSearchQuery('');
      setSharingSuccess(`Successfully shared with ${selectedUsers.length} user(s)`);

      setTimeout(() => {
        setSharingSuccess('');
        setShowShareModal(false);
      }, 3000);

    } catch (error) {
      console.error('❌ Share failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      const errorMsg = error.response?.data?.error || error.message;
      setSharingError(`Failed to share note: ${errorMsg}`);
    } finally {
      setShareLoading(false);
    }
  };

  const fetchSharedWith = async () => {
    if (!id || isNewNote) return;

    try {
      console.log('🔍 Fetching shared users for note:', id);
      const response = await api.getNoteSharedWith(id);
      console.log('✅ Shared with:', response.data);
      setSharedWith(response.data);
    } catch (error) {
      console.error('❌ Failed to fetch shared users:', error);
      // Don't show error if endpoint doesn't exist yet
      if (error.response?.status !== 404) {
        console.error('Error details:', error.response?.data);
      }
    }
  };

  // Add this useEffect to fetch shared users when note loads
  useEffect(() => {
    if (!isNewNote && id && isAuthenticated) {
      fetchSharedWith();
    }
  }, [id, isNewNote, isAuthenticated]);


  // UPDATED save function
  const handleSave = async () => {
    console.log('🔍 NoteEditor: Save button clicked');
    console.log('🔍 Current title:', title);
    console.log('🔍 Current content length:', content.length);
    console.log('🔍 isNewNote:', isNewNote);
    console.log('🔍 id from useParams:', id);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Check if we have a token
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🔍 NoteEditor: No token found, redirecting to login');
      setError('Please log in to save notes');
      navigate('/login');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Process tags
      const tagsArray = tags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const noteData = {
        title: title.trim(),
        tags: tagsArray,
        isEncrypted: !!masterKey
      };

      console.log('🔍 NoteEditor: Note data to save:', {
        title: noteData.title,
        tagsCount: noteData.tags.length,
        hasContent: !!content,
        isEncrypted: noteData.isEncrypted
      });

      // Encrypt content if we have master key
      // Enforce mandatory encryption
      if (!masterKey) {
        setError('Encryption is required. Please reload the page or log in again to restore your keys.');
        setSaving(false);
        return;
      }

      if (content) {
        try {
          console.log('🔍 NoteEditor: Encrypting content...');

          // CRITICAL SAFETY CHECK: If this is a shared note, we MUST have the sessionNoteKey
          if (!isNewNote && !isOwner && !sessionNoteKey) {
            setError('Safety Error: Cannot save shared note because its encryption key is not decrypted. Please unlock the note first.');
            setSaving(false);
            return;
          }

          const keyToUse = sessionNoteKey || masterKey; // CRITICAL: Use current note key if available
          const encrypted = encryptNote(content, keyToUse);
          noteData.content = encrypted.ciphertext;
          noteData.encryptionMetadata = {
            algorithm: 'AES-CBC',
            iv: encrypted.iv,
            salt: encrypted.salt
          };
          console.log('🔍 NoteEditor: Content encrypted successfully');
        } catch (encryptError) {
          console.error('🔍 NoteEditor: Encryption error:', encryptError);
          setError('Failed to encrypt note. Cannot save unencrypted data.');
          setSaving(false);
          return;
        }
      } else {
        // Empty content is allowed but treated as encrypted
        noteData.content = '';
      }

      console.log('🔍 NoteEditor: Sending note data to API...');

      let response;
      if (isNewNote) {
        console.log('🔍 Creating new note via API...');
        response = await api.createNote(noteData);
        console.log('🔍 NoteEditor: Create response:', response.data);
      } else {
        console.log('🔍 Updating existing note via API...');
        response = await api.updateNote(id, noteData);
        console.log('🔍 NoteEditor: Update response:', response.data);
      }

      if (response.data && response.data.id) {
        console.log('✅ Note saved successfully! ID:', response.data.id);
        alert('✅ Note saved successfully!');

        if (isNewNote) {
          // Navigate to the newly created note
          navigate(`/note/${response.data.id}`);
        } else {
          // Refresh the note data
          fetchNote();
        }
      } else {
        console.error('❌ Note saved but no ID returned:', response.data);
        alert('Note saved but something went wrong. Please check console.');
      }

    } catch (error) {
      console.error('🔍 NoteEditor: Save error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      });

      if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (error.code === 'ECONNREFUSED') {
        setError('Cannot connect to backend server. Make sure it\'s running on http://localhost:5000');
      } else if (error.response?.status === 400) {
        setError(`Validation error: ${JSON.stringify(error.response.data)}`);
      } else if (error.response?.status === 500) {
        setError('Server error (500). Please check backend logs.');
      } else {
        setError(error.response?.data?.error || 'Failed to save note');
      }
    } finally {
      setSaving(false);
    }
  };

  const downloadNote = () => {
    if (!content) return;
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${title || 'Untitled'}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleRestoreVersion = async (version) => {
    if (window.confirm(`Restore to version ${version}?`)) {
      try {
        setSaving(true);
        await api.restoreVersion(id, version);
        await fetchNote();
        setShowHistory(false);
        alert('Version restored successfully!');
      } catch (error) {
        console.error('Restore error:', error);
        alert('Failed to restore version: ' + (error.response?.data?.error || error.message));
      } finally {
        setSaving(false);
      }
    }
  };

  // Enhanced formatting functions
  const formatText = (command, value = null) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = content.substring(start, end);

    let prefix = '';
    let suffix = '';
    let replacement = selection;
    let newCursorStart = start;
    let newCursorEnd = end;

    switch (command) {
      case 'bold':
        if (selection.startsWith('**') && selection.endsWith('**')) {
          replacement = selection.slice(2, -2);
        } else {
          prefix = '**';
          suffix = '**';
        }
        break;
      case 'italic':
        if (selection.startsWith('*') && selection.endsWith('*')) {
          replacement = selection.slice(1, -1);
        } else {
          prefix = '*';
          suffix = '*';
        }
        break;
      case 'underline':
        if (selection.startsWith('<u>') && selection.endsWith('</u>')) {
          replacement = selection.slice(3, -4);
        } else {
          prefix = '<u>';
          suffix = '</u>';
        }
        break;
      case 'heading':
        const level = value || 1;
        const hPrefix = '#'.repeat(level) + ' ';
        if (selection.startsWith(hPrefix)) {
          replacement = selection.slice(hPrefix.length);
        } else {
          replacement = hPrefix + selection;
        }
        break;
      case 'bullet':
        const lines = selection.split('\n');
        const isBullet = lines.every(line => line.startsWith('- '));
        if (isBullet && selection.length > 0) {
          replacement = lines.map(line => line.substring(2)).join('\n');
        } else {
          replacement = lines.map(line => `- ${line}`).join('\n');
        }
        break;
      case 'numbered':
        const numLines = selection.split('\n');
        const isNum = numLines.every((line, i) => line.startsWith(`${i + 1}. `));
        if (isNum && selection.length > 0) {
          replacement = numLines.map(line => line.substring(line.indexOf('.') + 2)).join('\n');
        } else {
          replacement = numLines.map((line, i) => `${i + 1}. ${line}`).join('\n');
        }
        break;
      case 'inlineCode':
        if (selection.startsWith('`') && selection.endsWith('`')) {
          replacement = selection.slice(1, -1);
        } else {
          prefix = '`';
          suffix = '`';
        }
        break;
      case 'code':
        if (selection.startsWith('```\n') && selection.endsWith('\n```')) {
          replacement = selection.slice(4, -4);
        } else {
          prefix = '```\n';
          suffix = '\n```';
        }
        break;
      case 'quote':
        const qLines = selection.split('\n');
        const isQuote = qLines.every(line => line.startsWith('> '));
        if (isQuote && selection.length > 0) {
          replacement = qLines.map(line => line.substring(2)).join('\n');
        } else {
          replacement = qLines.map(line => `> ${line}`).join('\n');
        }
        break;
      case 'link':
        replacement = `[${selection || 'link text'}](https://example.com)`;
        break;
      default:
        break;
    }

    const newContent = content.substring(0, start) + prefix + replacement + suffix + content.substring(end);
    setContent(newContent);

    // Maintain selection or place cursor correctly
    const finalReplacement = prefix + replacement + suffix;
    setTimeout(() => {
      textarea.focus();
      if (selection) {
        textarea.setSelectionRange(start, start + finalReplacement.length);
      } else {
        const pos = start + prefix.length;
        textarea.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      formatText('bold');
    }
    // Ctrl/Cmd + I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      formatText('italic');
    }
    // Ctrl/Cmd + K for code
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      formatText('inlineCode');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      editorRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const renderPreview = () => {
    if (!content) return { __html: '' };

    // 1. Escape basic HTML for security
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Unescape specific constructs
    html = html.replace(/^&gt; /gim, '> ');

    // 3. Block elements
    html = html
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
      .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/^---$/gim, '<hr />');

    // 4. Handle Code Blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-900 text-slate-300 p-5 rounded-xl my-6 overflow-x-auto border border-slate-800 shadow-lg"><code>$1</code></pre>');

    // 5. Inline elements
    html = html
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/__(.*?)__/gim, '<strong>$1</strong>')
      .replace(/_(.*?)_/gim, '<em>$1</em>')
      .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gim, '<span style="text-decoration: underline;">$1</span>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-500">$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline decoration-blue-500/30 underline-offset-4 hover:decoration-blue-500 font-medium">$1</a>');

    // 7. Clean up adjacent list items
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    html = html.replace(/<\/ol>\s*<ol>/g, '');

    // 8. Paragraph wrapping
    const lines = html.split('\n');
    let inPre = false;
    const processedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br />';

      if (trimmed.includes('<pre')) inPre = true;
      if (trimmed.includes('</pre>')) {
        inPre = false;
        return line;
      }
      if (inPre) return line;

      // Exclude block-level tags from P wrapping
      if (trimmed.match(/^<(h|block|ul|ol|li|pre|hr|div)/i) || trimmed.match(/<\/(ul|ol|blockquote)>/i)) {
        return line;
      }

      return `<p>${line}</p>`;
    });

    return { __html: processedLines.join('\n') };
  };

  // Show loading while auth is initializing OR note is loading
  if (authLoading || (loading && !isNewNote)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            {authLoading ? 'Checking authentication...' : 'Loading note...'}
          </p>
          {!authLoading && id && (
            <p className="mt-2 text-sm text-gray-400">Note ID: {id}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" ref={editorRef}>
      {/* Password Prompt Modal */}


      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Share Note</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Share "{title || 'Untitled Note'}" with other users
                </p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <FaTimes size={24} />
              </button>
            </div>

            {/* Error/Success Messages */}
            {sharingError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center">
                  <FaTimesCircle className="text-red-500 mr-2" />
                  <p className="text-sm text-red-800 dark:text-red-200">{sharingError}</p>
                </div>
              </div>
            )}

            {sharingSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  <p className="text-sm text-green-800 dark:text-green-200">{sharingSuccess}</p>
                </div>
              </div>
            )}

            {/* User Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search users by username or email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Start typing username or email..."
                  className="pl-10 w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                  disabled={shareLoading}
                />
                {searchLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <FaSpinner className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {searchResults.map(user => (
                    <div
                      key={user._id}
                      onClick={() => handleAddUser(user)}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                        <FaUserPlus className="text-blue-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                <div className="mt-2 text-center py-4 text-gray-500 dark:text-gray-400">
                  No users found for "{searchQuery}"
                </div>
              )}
            </div>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selected Users ({selectedUsers.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(user => (
                    <div
                      key={user._id}
                      className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1.5 rounded-full"
                    >
                      <span className="text-sm">
                        {user.username} ({user.email})
                      </span>
                      <button
                        onClick={() => handleRemoveSelectedUser(user._id)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        disabled={shareLoading}
                      >
                        <FaTimesCircle />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Already Shared With */}
            {sharedWith.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Already Shared With ({sharedWith.length})
                </h4>
                <div className="space-y-2">
                  {sharedWith.map(share => (
                    <div
                      key={share.userId}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {share.user?.username || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {share.user?.email || 'No email'} • {share.permission} access
                        </div>
                        {share.sharedAt && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Shared {new Date(share.sharedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveSharedUser(share.userId)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        disabled={shareLoading}
                      >
                        <FaUserTimes />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={shareLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleShareNote}
                disabled={selectedUsers.length === 0 || shareLoading}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {shareLoading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <FaShareAlt />
                    Share Note
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title"
            className="text-3xl font-bold w-full border-0 focus:outline-none focus:ring-0 bg-transparent dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            disabled={!canEdit || saving}
          />
          <div className="mt-2">
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="text-sm text-gray-600 dark:text-gray-400 w-full border-0 focus:outline-none focus:ring-0 bg-transparent placeholder-gray-400 dark:placeholder-gray-500"
              disabled={!canEdit || saving}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap shadow-sm ${isOwner
            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
            : canEdit
              ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400'
              : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-900/40 dark:border-gray-800 dark:text-gray-400'
            }`}>
            {isOwner ? (
              <>
                <FaShieldAlt className="text-sm" />
                <span className="text-sm font-medium">Full Access</span>
              </>
            ) : canEdit ? (
              <>
                <FaEdit className="text-sm" />
                <span className="text-sm font-medium">Can Edit</span>
              </>
            ) : (
              <>
                <FaEye className="text-sm" />
                <span className="text-sm font-medium">View Only</span>
              </>
            )}
          </div>
          {!isNewNote && (
            <button
              onClick={fetchVersions}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors text-gray-700 dark:text-gray-300"
              disabled={false}
            >
              <FaHistory />
              <span>History</span>
            </button>
          )}
          <button
            onClick={downloadNote}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors text-gray-700 dark:text-gray-300"
            disabled={!content || authLoading}
            title="Download as Markdown"
          >
            <FaDownload />
            <span>Download .md</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors text-gray-700 dark:text-gray-300"
            disabled={authLoading}
          >
            <FaTimes />
            <span>Back to Notes</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isAuthenticated || authLoading}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
          >
            <FaSave />
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                {isNewNote && error.includes('Invalid note ID')
                  ? 'Creating new note... Enter title and content below'
                  : error}
              </p>
            </div>
          </div>
        </div>
      )}



      {/* Enhanced formatting toolbar */}
      <div className="mb-6 glass rounded-xl p-4 shadow-sm animate-fade-in">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400 mr-2 uppercase tracking-wider">Format</span>

          {/* Headings */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => formatText('heading', 1)}
              className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1 transition-colors"
              title="Heading 1"
              disabled={!canEdit || saving}
            >
              <FaHeading className="text-gray-600 dark:text-gray-400 text-sm" />
              <span className="text-sm font-medium">H1</span>
            </button>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <button
              onClick={() => formatText('heading', 2)}
              className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
              title="Heading 2"
              disabled={!canEdit || saving}
            >
              H2
            </button>
            <button
              onClick={() => formatText('heading', 3)}
              className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
              title="Heading 3"
              disabled={!canEdit || saving}
            >
              H3
            </button>
          </div>

          {/* Text formatting */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => formatText('bold')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Bold (Ctrl+B)"
              disabled={!canEdit || saving}
            >
              <FaBold className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('italic')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Italic (Ctrl+I)"
              disabled={!canEdit || saving}
            >
              <FaItalic className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('underline')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Underline"
              disabled={!canEdit || saving}
            >
              <FaUnderline className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => formatText('bullet')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Bullet List"
              disabled={!canEdit || saving}
            >
              <FaListUl className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('numbered')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Numbered List"
              disabled={!canEdit || saving}
            >
              <FaListOl className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Code & Quotes */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => formatText('inlineCode')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Inline Code (Ctrl+K)"
              disabled={!canEdit || saving}
            >
              <FaCode className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('code')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Code Block"
              disabled={!canEdit || saving}
            >
              <FaCode className="text-lg text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('quote')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Blockquote"
              disabled={!canEdit || saving}
            >
              <FaQuoteLeft className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Links & Images */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => formatText('link')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Insert Link"
              disabled={!canEdit || saving}
            >
              <FaLink className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="ml-2 text-xs text-gray-500 dark:text-gray-400 hidden md:block">
            <span className="font-medium">Shortcuts:</span> Ctrl+B (Bold) • Ctrl+I (Italic) • Ctrl+K (Code)
          </div>
        </div>
      </div>

      {/* Editor and Preview */}
      <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Editor */}
        <div className={`${showPreview ? 'lg:col-span-1' : 'col-span-1'}`}>
          <div className="relative">
            <textarea
              ref={textareaRef}
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl p-6 pb-20 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-base resize-none transition-all bg-white dark:bg-slate-900 dark:text-white"
              placeholder={isNewNote
                ? "Start typing your new note here... Use Markdown for formatting: # Headings, **bold**, *italic*, `code`, - lists, etc."
                : "Start typing your note here... Use Markdown for formatting: # Headings, **bold**, *italic*, `code`, - lists, etc."}
              style={{
                lineHeight: '1.6',
                fontSize: '16px',
                height: 'calc(100vh - 400px)',
                minHeight: '500px',
                overflowY: 'auto'
              }}
              disabled={!canEdit || saving}
            />

            {/* Character counter */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded">
                {content.length}/10000
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {content.trim().split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="lg:col-span-1">
            <div
              className="border-2 border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-slate-900 overflow-y-auto scrollbar-hide"
              style={{
                height: 'calc(100vh - 400px)',
                minHeight: '500px'
              }}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Preview</h3>
                <div className="text-xs font-bold text-blue-500 uppercase tracking-widest">
                  Live View
                </div>
              </div>
              <div
                className="max-w-none markdown-preview animate-fade-in pb-12"
                dangerouslySetInnerHTML={renderPreview()}
              />
              {!content && (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="text-4xl text-gray-300">📝</div>
                  </div>
                  <p>Start typing to see the preview...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help section */}
      <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
        <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FaCode className="text-blue-600 dark:text-blue-400" />
          Markdown Quick Reference
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="font-mono text-sm mb-1"># Heading 1</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Large heading</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="font-mono text-sm mb-1">**bold**</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Bold text</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="font-mono text-sm mb-1">*italic*</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Italic text</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="font-mono text-sm mb-1">- item</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Bullet list</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="font-mono text-sm mb-1">1. item</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Numbered list</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="font-mono text-sm mb-1">`code`</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Inline code</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="font-mono text-sm mb-1">```code```</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Code block</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="font-mono text-sm mb-1">[link](url)</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Hyperlink</div>
          </div>
        </div>
      </div>

      {/* History modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Note History</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Restore previous versions of this note</p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <FaTimes size={24} />
              </button>
            </div>
            <div className="space-y-4">
              {versions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaHistory className="text-2xl text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">No previous versions found</p>
                </div>
              ) : (
                versions.map((version) => (
                  <div
                    key={version.version}
                    className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                            Version {version.version}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(version.savedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg font-mono overflow-auto max-h-24">
                          {version.decryptionFailed ? (
                            <span className="text-red-500 italic">[Decryption Failed - Content Encrypted]</span>
                          ) : (
                            <>
                              {version.content.substring(0, 300)}
                              {version.content.length > 300 && '...'}
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreVersion(version.version)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all whitespace-nowrap"
                      >
                        Restore This Version
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;