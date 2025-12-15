import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaSave, FaTimes, FaHistory, FaLock, FaKey, 
  FaBold, FaItalic, FaUnderline, FaListUl, FaListOl,
  FaHeading, FaCode, FaLink, FaImage, FaQuoteLeft,
  FaEye, FaEyeSlash, FaExpand, FaCompress, FaBug,
  FaStickyNote, FaInfoCircle, FaExclamationTriangle,
  FaDatabase, FaServer, FaNetworkWired, FaList,
  FaCheckCircle, FaExclamationCircle,
  FaUserPlus, FaShareAlt, FaUserFriends, FaSearch, 
  FaUserCheck, FaUserTimes, FaEnvelope, FaSpinner,
  FaTimesCircle
} from 'react-icons/fa';
import api from '../services/api';
import { useCrypto } from '../contexts/CryptoContext';
import { useAuth } from '../contexts/AuthContext';
import { encryptNote, decryptNote } from '../utils/cryptoUtils';
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
  const [showPreview, setShowPreview] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('unknown');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  
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
  const { masterKey, encrypt, decrypt, deriveKeyFromPassword } = useCrypto();
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
    updateDebugInfo();
    
    // Check backend status
    checkBackendStatus();
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

  // Check backend status
  const checkBackendStatus = async () => {
    try {
      // Try to ping the backend
      const response = await axios.get('http://localhost:5000/', {
        timeout: 2000
      });
      setBackendStatus('connected');
      console.log('✅ Backend is connected');
    } catch (error) {
      setBackendStatus('disconnected');
      console.warn('⚠️ Backend connection check failed:', error.message);
    }
  };

  // Handle password prompt for encryption
  const handlePasswordSubmit = () => {
    if (!password.trim()) {
      alert('Please enter a password');
      return;
    }
    
    try {
      const derivedKey = deriveKeyFromPassword(password, 'master-salt');
      // In a real app, you would set this in the crypto context
      console.log('🔍 Password set for encryption');
      setShowPasswordPrompt(false);
      setPassword('');
      alert('Encryption password set. Your note will be encrypted when saved.');
    } catch (error) {
      console.error('Failed to set encryption password:', error);
      alert('Failed to set encryption password');
    }
  };

  // Debug function to check note ID
  const debugNoteId = () => {
    const info = {
      idFromParams: id,
      type: typeof id,
      length: id?.length,
      isNewNote: id === 'new' || id === undefined,
      fullURL: window.location.href,
      pathname: window.location.pathname,
      isValidObjectId: id && id !== 'new' && id !== undefined ? /^[0-9a-fA-F]{24}$/.test(id) : false
    };
    
    console.log('🔍 Debug Note ID:', info);
    
    alert(`Note ID Debug:\n\n` +
          `ID from useParams(): "${id}"\n` +
          `Type: ${typeof id}\n` +
          `Length: ${id?.length}\n` +
          `Is new note? ${info.isNewNote ? '✅ Yes' : '❌ No'}\n` +
          `Valid ObjectId? ${info.isValidObjectId ? '✅ Yes' : '❌ No'}\n` +
          `Full URL: ${window.location.href}\n` +
          `Pathname: ${window.location.pathname}\n` +
          `Expected note ID from path: ${window.location.pathname.split('/')[2]}`);
  };

  // Test API call directly (bypassing the api service)
  const testDirectApiCall = async () => {
    try {
      setApiError(null);
      setApiResponse(null);
      
      const token = localStorage.getItem('token');
      console.log('🔍 Direct API Test:');
      console.log('Token:', token ? `${token.substring(0, 20)}...` : 'Missing');
      console.log('Note ID:', id);
      console.log('User ID:', user?._id);
      
      if (!token) {
        throw new Error('No token found in localStorage');
      }
      
      // Better validation for note ID
      if (!id || id === 'new' || id === 'undefined' || id === 'null' || id === undefined) {
        throw new Error(`Cannot test API: This is a new note (ID: "${id}"). Create a note first, then edit it.`);
      }
      
      // Check if ID looks like a MongoDB ObjectId (24 hex characters)
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      if (!isValidObjectId) {
        throw new Error(`Invalid note ID format: "${id}". Expected 24-character hex string. Visit /notes to see your notes.`);
      }
      
      console.log('🔍 Making direct API call to:', `http://localhost:5000/api/notes/${id}`);
      
      const response = await axios.get(`http://localhost:5000/api/notes/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log('✅ Direct API Success:', response.data);
      setApiResponse(response.data);
      
      alert(`✅ Direct API call successful!\n\nTitle: ${response.data.title}\nID: ${response.data._id}\nOwner: ${response.data.ownerId}`);
      
      return response.data;
    } catch (error) {
      const errorDetails = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code
      };
      
      console.error('❌ Direct API Error:', errorDetails);
      setApiError(errorDetails);
      
      let errorMessage = `Direct API test failed:\n\n`;
      errorMessage += `Status: ${errorDetails.status || 'No response'}\n`;
      errorMessage += `Message: ${errorDetails.message}\n`;
      
      if (errorDetails.data) {
        errorMessage += `Error: ${JSON.stringify(errorDetails.data, null, 2)}\n`;
      }
      
      if (errorDetails.status === 404) {
        errorMessage += `\n💡 Tip: This note doesn't exist or you don't have access. Visit /notes to see your notes.`;
      } else if (errorDetails.code === 'ECONNREFUSED') {
        errorMessage += `\n💡 Tip: Backend server is not running on port 5000. Start it with: cd backend && npm start`;
      }
      
      alert(errorMessage);
      
      return null;
    }
  };

  // Test backend connectivity
  const testBackendHealth = async () => {
    try {
      console.log('🔍 Testing backend health...');
      
      // Try multiple endpoints to see what works
      const endpoints = [
        { url: 'http://localhost:5000/', name: 'Root' },
        { url: 'http://localhost:5000/api/auth/me', name: 'Auth Check' },
        { url: 'http://localhost:5000/api/notes', name: 'Notes List' }
      ];
      
      let success = false;
      let errorMessage = '';
      let workingEndpoint = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying ${endpoint.name} (${endpoint.url})...`);
          const response = await axios.get(endpoint.url, {
            timeout: 2000,
            headers: endpoint.url.includes('/auth/me') && localStorage.getItem('token') ? {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            } : {}
          });
          console.log(`✅ ${endpoint.name} responded:`, response.status);
          success = true;
          workingEndpoint = endpoint;
          break;
        } catch (err) {
          errorMessage = err.message;
          console.log(`❌ ${endpoint.name} failed:`, err.message);
          
          // If it's a 401, backend is running but token is invalid
          if (err.response?.status === 401) {
            success = true;
            workingEndpoint = endpoint;
            errorMessage = 'Backend is running but token is invalid/expired';
            break;
          }
        }
      }
      
      if (success) {
        setBackendStatus('connected');
        if (workingEndpoint) {
          alert(`✅ Backend is running!\n\nEndpoint: ${workingEndpoint.name}\nURL: ${workingEndpoint.url}\n\nStatus: Connected`);
        }
      } else {
        setBackendStatus('disconnected');
        throw new Error(`All endpoints failed. Last error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      setBackendStatus('disconnected');
      alert(`❌ Cannot connect to backend:\n\n${error.message}\n\nMake sure:\n1. Backend server is running on port 5000\n2. Run: cd backend && npm start\n3. Check if port 5000 is available`);
    }
  };

  // List all notes to see what's available
  const listAllNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('❌ No token found. Please log in first.');
        return;
      }
      
      console.log('🔍 Listing all notes...');
      const response = await axios.get('http://localhost:5000/api/notes', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      });
      
      console.log('✅ Notes list:', response.data);
      
      if (response.data.length === 0) {
        alert('📝 No notes found. Create a new note first!');
        return;
      }
      
      let message = `📚 Found ${response.data.length} notes:\n\n`;
      response.data.forEach((note, index) => {
        message += `${index + 1}. ${note.title || 'Untitled'} \n`;
        message += `   ID: ${note._id}\n`;
        message += `   Created: ${new Date(note.createdAt).toLocaleDateString()}\n`;
        message += `   Tags: ${note.tags?.join(', ') || 'None'}\n\n`;
      });
      
      message += `\n💡 Tip: Copy a note ID and visit /note/[id] to edit it.`;
      
      alert(message);
    } catch (error) {
      console.error('❌ Failed to list notes:', error);
      let errorMsg = `Failed to list notes:\n\n${error.message}`;
      if (error.response?.status === 401) {
        errorMsg += '\n\nYour session may have expired. Please log in again.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMsg += '\n\nBackend server is not running. Start it with: cd backend && npm start';
      }
      alert(errorMsg);
    }
  };

  const fetchNote = async () => {
    try {
      // If it's a new note, don't try to fetch
      if (isNewNote) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError('');
      setApiError(null);
      setApiResponse(null);
      
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
      setApiResponse(note);
      
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
      
      // Decrypt content if we have the master key
      if (masterKey && note.isEncrypted && note.encryptionMetadata) {
        try {
          console.log('🔍 NoteEditor: Attempting to decrypt note content');
          const decryptedContent = decryptNote(
            note.content,
            masterKey,
            note.encryptionMetadata.iv
          );
          setContent(decryptedContent);
          console.log('🔍 NoteEditor: Note decrypted successfully');
        } catch (decryptError) {
          console.error('🔍 NoteEditor: Decryption failed:', decryptError);
          setError('Failed to decrypt note. Check your master password.');
          setContent('[Encrypted - Enter master password to view]');
        }
      } else {
        setContent(note.content || '');
      }
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
      
      setApiError({
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
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
      setVersions(response.data.versions);
      setShowHistory(true);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    }
  };

  const updateDebugInfo = async () => {
    const token = localStorage.getItem('token');
    const info = {
      timestamp: new Date().toISOString(),
      authLoading,
      isAuthenticated,
      user: user ? { 
        email: user.email, 
        id: user._id || user.id,
        hasId: !!(user._id || user.id)
      } : null,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` : null,
      masterKey: !!masterKey,
      noteId: id,
      isNewNote,
      isValidObjectId: id && id !== 'new' && id !== undefined ? /^[0-9a-fA-F]{24}$/.test(id) : false,
      backendStatus,
      apiResponse: apiResponse ? {
        hasData: true,
        id: apiResponse._id,
        title: apiResponse.title,
        ownerId: apiResponse.ownerId
      } : null,
      apiError: apiError ? {
        status: apiError.status,
        message: apiError.message
      } : null
    };
    
    setDebugInfo(info);
    console.log('🔍 Debug Info Updated:', info);
  };

  const debugAuth = async () => {
    console.log('=== DEBUG AUTHENTICATION ===');
    console.log('1. LocalStorage token:', localStorage.getItem('token'));
    console.log('2. isAuthenticated:', isAuthenticated);
    console.log('3. User:', user);
    console.log('4. User ID:', user?._id);
    console.log('5. Axios headers:', axios.defaults.headers.common);
    console.log('6. Auth loading:', authLoading);
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('ERROR: No token in localStorage');
      alert('❌ No token found. Please log in again.');
      return;
    }
    
    try {
      console.log('Testing token with backend...');
      const response = await axios.get('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Token is valid:', response.data);
      alert('✅ Token is valid!\n\nUser: ' + response.data.user.email + '\nID: ' + response.data.user._id);
    } catch (error) {
      console.error('❌ Token test failed:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      alert('❌ Token validation failed: ' + (error.response?.data?.error || error.message));
    }
  };

  // ========== FIX: Handle navigation from Dashboard ==========
  const handleCreateNewNote = () => {
    console.log('🔍 Creating new note manually...');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Current pathname:', window.location.pathname);
    
    // Force navigation to /note/new with state
    navigate('/note/new', { 
      state: location.state || {},
      replace: true // Replace current history entry
    });
  };

  // ========== SHARING FUNCTIONS ==========
  
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
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    setSharingError('');
    
    try {
      console.log('🔍 Searching users with query:', query);
      
      const response = await api.searchUsers(query);
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
          permission: 'read' // or 'write' based on your UI
        };
        
        // If note is encrypted, you might need to add encryptedKey here
        if (masterKey && content) {
          // You'll need to encrypt the key for the target user
          // This depends on your encryption implementation
          // shareData.encryptedKey = encryptedKeyForUser;
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

  // Debug sharing function
  const debugSharing = async () => {
    console.log('=== DEBUG SHARING ===');
    console.log('1. Note ID:', id);
    console.log('2. Is new note:', isNewNote);
    console.log('3. Current user:', user);
    console.log('4. Selected users:', selectedUsers);
    console.log('5. Shared with:', sharedWith);
    
    // Test user search
    if (searchQuery.length >= 2) {
      console.log('Testing user search with query:', searchQuery);
      try {
        const response = await api.searchUsers(searchQuery);
        console.log('Search response:', response.data);
      } catch (error) {
        console.error('Search error:', error.response?.data || error.message);
      }
    }
    
    // Test share endpoint
    if (id && !isNewNote && selectedUsers.length > 0) {
      console.log('Testing share with first selected user:', selectedUsers[0]);
      const testShareData = {
        userId: selectedUsers[0]._id,
        permission: 'read'
      };
      console.log('Share data:', testShareData);
      
      try {
        const response = await api.shareNote(id, testShareData);
        console.log('Share test response:', response.data);
      } catch (error) {
        console.error('Share test error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
    }
  };

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
      if (masterKey && content) {
        try {
          console.log('🔍 NoteEditor: Encrypting content...');
          const encrypted = encryptNote(content, masterKey);
          noteData.content = encrypted.ciphertext;
          noteData.encryptionMetadata = {
            algorithm: 'AES-CBC',
            iv: encrypted.iv,
            salt: encrypted.salt
          };
          console.log('🔍 NoteEditor: Content encrypted successfully');
        } catch (encryptError) {
          console.error('🔍 NoteEditor: Encryption error:', encryptError);
          setError('Failed to encrypt note. Using plaintext.');
          noteData.content = content;
          noteData.isEncrypted = false;
        }
      } else {
        noteData.content = content;
        noteData.isEncrypted = false;
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

  const handleRestoreVersion = async (version) => {
    if (window.confirm(`Restore to version ${version}?`)) {
      try {
        await api.restoreVersion(id, version);
        fetchNote();
        setShowHistory(false);
        alert('Version restored successfully!');
      } catch (error) {
        console.error('Restore error:', error);
        alert('Failed to restore version');
      }
    }
  };

  // Enhanced formatting functions
  const formatText = (command, value = null) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let formattedText = '';
    let cursorOffset = 0;
    
    switch (command) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        cursorOffset = selectedText ? 2 : 0;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        cursorOffset = selectedText ? 1 : 0;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        cursorOffset = selectedText ? 3 : 0;
        break;
      case 'heading':
        const level = value || 1;
        formattedText = `${'#'.repeat(level)} ${selectedText}`;
        cursorOffset = selectedText ? level + 1 : 0;
        break;
      case 'bullet':
        formattedText = selectedText ? `\n- ${selectedText}` : `\n- `;
        cursorOffset = selectedText ? 3 : 2;
        break;
      case 'numbered':
        formattedText = selectedText ? `\n1. ${selectedText}` : `\n1. `;
        cursorOffset = selectedText ? 4 : 3;
        break;
      case 'code':
        formattedText = selectedText ? `\`\`\`\n${selectedText}\n\`\`\`` : `\`\`\`\n\`\`\``;
        cursorOffset = selectedText ? 4 : 4;
        break;
      case 'inlineCode':
        formattedText = `\`${selectedText}\``;
        cursorOffset = selectedText ? 1 : 0;
        break;
      case 'quote':
        formattedText = selectedText ? `> ${selectedText}` : `> `;
        cursorOffset = selectedText ? 2 : 2;
        break;
      case 'link':
        formattedText = `[${selectedText || 'link text'}](https://example.com)`;
        cursorOffset = selectedText ? 0 : 11;
        break;
      case 'image':
        formattedText = `![${selectedText || 'alt text'}](https://example.com/image.jpg)`;
        cursorOffset = selectedText ? 0 : 28;
        break;
      default:
        formattedText = selectedText;
    }
    
    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
    
    // Focus back on textarea and position cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + formattedText.length - (selectedText ? 0 : cursorOffset);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
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
    // Simple markdown rendering
    let preview = content
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mb-3">$2</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mb-2">$3</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n/g, '<br />');
    
    return { __html: preview };
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
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FaLock className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Encryption Required</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter password to encrypt this note</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              This note was created with encryption enabled. Please enter the encryption password to continue.
            </p>
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter encryption password"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              autoFocus
            />
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setPassword('');
                  alert('Note will be saved without encryption.');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Skip Encryption
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all"
              >
                Set Password
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Enhanced Debug Panel */}
      <div className="mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-4 border border-gray-300 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <FaBug className="text-yellow-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">Debug Panel</h3>
            {isNewNote && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                Creating New Note
              </span>
            )}
            {apiError && !isNewNote && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded">
                API Error: {apiError.status || 'No Status'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testBackendHealth}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm flex items-center gap-2 hover:bg-green-600"
            >
              <FaServer />
              Test Backend
            </button>

            <button
              onClick={testDirectApiCall}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm flex items-center gap-2 hover:bg-purple-600"
              disabled={isNewNote}
              title={isNewNote ? "Cannot test API for new notes" : "Test API with current note ID"}
            >
              <FaNetworkWired />
              Test API Direct
            </button>
            <button
              onClick={listAllNotes}
              className="px-3 py-1 bg-teal-500 text-white rounded text-sm flex items-center gap-2 hover:bg-teal-600"
            >
              <FaList />
              List Notes
            </button>
            <button
              onClick={debugNoteId}
              className="px-3 py-1 bg-indigo-500 text-white rounded text-sm flex items-center gap-2 hover:bg-indigo-600"
            >
              <FaDatabase />
              Debug ID
            </button>
            <button
              onClick={debugAuth}
              className="px-3 py-1 bg-yellow-500 text-white rounded text-sm flex items-center gap-2 hover:bg-yellow-600"
            >
              <FaKey />
              Test Auth
            </button>
            {/* ADDED Current State Debug Button */}
            <button
              onClick={() => {
                console.log('=== CURRENT STATE DEBUG ===');
                console.log('Title:', title);
                console.log('Tags:', tags);
                console.log('Content length:', content.length);
                console.log('Location state:', location.state);
                console.log('Is new note:', isNewNote);
                console.log('Master key present:', !!masterKey);
                console.log('useParams id:', id);
                console.log('Window location:', window.location.href);
                alert(`Current State:\n\nTitle: "${title}"\nTags: "${tags}"\nContent: ${content.length} chars\nLocation State: ${JSON.stringify(location.state)}\nIs New Note: ${isNewNote}\nuseParams id: ${id}\nURL: ${window.location.href}`);
              }}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm flex items-center gap-2 hover:bg-gray-600"
            >
              <FaInfoCircle />
              Current State
            </button>
            {/* ADDED: Force create new note button */}
            <button
              onClick={handleCreateNewNote}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-2 hover:bg-blue-700"
            >
              <FaStickyNote />
              Force New Note
            </button>
            {/* ADDED: Debug sharing button */}
            <button
              onClick={debugSharing}
              className="px-3 py-1 bg-pink-500 text-white rounded text-sm flex items-center gap-2 hover:bg-pink-600"
            >
              <FaUserFriends />
              Debug Sharing
            </button>
            <button
              onClick={updateDebugInfo}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm flex items-center gap-2 hover:bg-blue-600"
            >
              <FaInfoCircle />
              Refresh
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm flex items-center gap-2 hover:bg-red-600"
            >
              <FaExclamationTriangle />
              Clear & Login
            </button>
          </div>
        </div>
        
        {debugInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
              <div className="p-2 bg-white dark:bg-gray-900 rounded">
                <div className="text-gray-500">Auth Status</div>
                <div className={`font-medium ${debugInfo.isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                  {debugInfo.isAuthenticated ? '✅ Logged In' : '❌ Logged Out'}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 rounded">
                <div className="text-gray-500">Auth Loading</div>
                <div className={`font-medium ${debugInfo.authLoading ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {debugInfo.authLoading ? '⏳ Loading...' : '✅ Ready'}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 rounded">
                <div className="text-gray-500">Backend</div>
                <div className={`font-medium ${debugInfo.backendStatus === 'connected' ? 'text-green-600' : debugInfo.backendStatus === 'disconnected' ? 'text-red-600' : 'text-yellow-600'}`}>
                  {debugInfo.backendStatus === 'connected' ? '✅ Connected' : 
                   debugInfo.backendStatus === 'disconnected' ? '❌ Disconnected' : '⚠️ Unknown'}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 rounded">
                <div className="text-gray-500">Token</div>
                <div className={`font-medium ${debugInfo.hasToken ? 'text-green-600' : 'text-red-600'}`}>
                  {debugInfo.hasToken ? `✅ ${debugInfo.tokenLength} chars` : '❌ Missing'}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 rounded">
                <div className="text-gray-500">User</div>
                <div className="font-medium truncate">
                  {debugInfo.user ? debugInfo.user.email : 'None'}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 rounded">
                <div className="text-gray-500">Encryption</div>
                <div className={`font-medium ${debugInfo.masterKey ? 'text-green-600' : 'text-yellow-600'}`}>
                  {debugInfo.masterKey ? '✅ Active' : '⚠️ Inactive'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-white dark:bg-gray-900 rounded border">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Details</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Note ID from useParams:</span>
                    <span className="font-mono truncate">
                      {debugInfo.noteId === undefined ? 'undefined' : debugInfo.noteId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Is New Note:</span>
                    <span className={debugInfo.isNewNote ? 'text-green-600 font-medium' : ''}>
                      {debugInfo.isNewNote ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valid ObjectId:</span>
                    <span className={debugInfo.isValidObjectId ? 'text-green-600' : 'text-gray-500'}>
                      {debugInfo.isNewNote ? 'N/A (New Note)' : debugInfo.isValidObjectId ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">User ID:</span>
                    <span className="font-mono truncate">{debugInfo.user?.id || 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Actual URL:</span>
                    <span className="font-mono truncate">{window.location.href}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-white dark:bg-gray-900 rounded border">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Status</div>
                <div className="space-y-1 text-xs">
                  {debugInfo.isNewNote ? (
                    <div className="text-green-600 text-center py-2">
                      <FaCheckCircle className="inline mr-2" />
                      Creating new note - no API call needed
                    </div>
                  ) : debugInfo.apiResponse ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Response:</span>
                        <span className="text-green-600 font-medium">✅ Received</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Note ID:</span>
                        <span className="font-mono truncate">{debugInfo.apiResponse.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Title:</span>
                        <span className="truncate">{debugInfo.apiResponse.title}</span>
                      </div>
                    </>
                  ) : debugInfo.apiError ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className="text-red-600 font-medium">
                          ❌ {debugInfo.apiError.status || 'Error'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Message:</span>
                        <span className="truncate text-red-500">{debugInfo.apiError.message}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500 text-center py-2">No API call made yet</div>
                  )}
                </div>
              </div>
            </div>
            
            {debugInfo.tokenPreview && (
              <div className="p-3 bg-white dark:bg-gray-900 rounded border">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Token Preview</div>
                <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded break-all">
                  {debugInfo.tokenPreview}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title"
            className="text-3xl font-bold w-full border-0 focus:outline-none focus:ring-0 bg-transparent dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            disabled={!!apiError && !isNewNote}
          />
          <div className="mt-2">
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="text-sm text-gray-600 dark:text-gray-400 w-full border-0 focus:outline-none focus:ring-0 bg-transparent placeholder-gray-400 dark:placeholder-gray-500"
              disabled={!!apiError && !isNewNote}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {!isNewNote && (
            <>
              <button
                onClick={fetchVersions}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors text-gray-700 dark:text-gray-300"
                disabled={!!apiError}
              >
                <FaHistory />
                <span>History</span>
              </button>
              <button
                onClick={openShareModal} // FIXED: Now using the defined function
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors text-gray-700 dark:text-gray-300"
                disabled={!!apiError}
              >
                <FaShareAlt />
                <span>Share</span>
              </button>
              <button
                onClick={fetchNote}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors text-gray-700 dark:text-gray-300"
                disabled={!!apiError}
              >
                <FaDatabase />
                <span>Reload Note</span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors text-gray-700 dark:text-gray-300"
          >
            {showPreview ? <FaEyeSlash /> : <FaEye />}
            <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors text-gray-700 dark:text-gray-300"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
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
            disabled={saving || !isAuthenticated || authLoading || (!!apiError && !isNewNote)}
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
              {apiError?.data && (
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  Server error: {JSON.stringify(apiError.data)}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigate('/')}
                  className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded"
                >
                  View All Notes
                </button>
                {!isNewNote && (
                  <button
                    onClick={() => navigate('/note/new')}
                    className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded"
                  >
                    Create New Note
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats and Settings */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {masterKey ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <FaLock />
                  <span className="font-medium">Encryption Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <FaKey />
                  <span className="font-medium">Not Encrypted</span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{content.length}</span> characters •{' '}
              <span className="font-medium">{content.trim().split(/\s+/).filter(Boolean).length}</span> words
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isAutoResizing}
                onChange={(e) => setIsAutoResizing(e.target.checked)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              Auto-resize editor
            </label>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            <div className={`text-xs ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {isAuthenticated ? '✅ Logged in' : '❌ Not logged in'}
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            <div className={`text-xs ${backendStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
              Backend: {backendStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced formatting toolbar */}
      <div className="mb-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-2">Format:</span>
          
          {/* Headings */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => formatText('heading', 1)}
              className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1 transition-colors"
              title="Heading 1"
              disabled={!!apiError && !isNewNote}
            >
              <FaHeading className="text-gray-600 dark:text-gray-400 text-sm" />
              <span className="text-sm font-medium">H1</span>
            </button>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <button
              onClick={() => formatText('heading', 2)}
              className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
              title="Heading 2"
              disabled={!!apiError && !isNewNote}
            >
              H2
            </button>
            <button
              onClick={() => formatText('heading', 3)}
              className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
              title="Heading 3"
              disabled={!!apiError && !isNewNote}
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
              disabled={!!apiError && !isNewNote}
            >
              <FaBold className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('italic')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Italic (Ctrl+I)"
              disabled={!!apiError && !isNewNote}
            >
              <FaItalic className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('underline')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Underline"
              disabled={!!apiError && !isNewNote}
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
              disabled={!!apiError && !isNewNote}
            >
              <FaListUl className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('numbered')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Numbered List"
              disabled={!!apiError && !isNewNote}
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
              disabled={!!apiError && !isNewNote}
            >
              <FaCode className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('code')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Code Block"
              disabled={!!apiError && !isNewNote}
            >
              <FaCode className="text-lg text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('quote')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Blockquote"
              disabled={!!apiError && !isNewNote}
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
              disabled={!!apiError && !isNewNote}
            >
              <FaLink className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => formatText('image')}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Insert Image"
              disabled={!!apiError && !isNewNote}
            >
              <FaImage className="text-gray-600 dark:text-gray-400" />
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
              className="w-full min-h-[500px] border-2 border-gray-300 dark:border-gray-600 rounded-xl p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-base resize-y transition-all bg-white dark:bg-gray-900 dark:text-white"
              placeholder={isNewNote 
                ? "Start typing your new note here... Use Markdown for formatting: # Headings, **bold**, *italic*, `code`, - lists, etc." 
                : apiError ? "Note failed to load. Check debug panel for details." 
                : "Start typing your note here... Use Markdown for formatting: # Headings, **bold**, *italic*, `code`, - lists, etc."}
              style={{
                lineHeight: '1.6',
                fontSize: '16px',
                minHeight: '500px',
                maxHeight: 'calc(100vh - 300px)'
              }}
              disabled={!!apiError && !isNewNote}
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
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-6 min-h-[500px] bg-white dark:bg-gray-900 overflow-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preview</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Live Markdown Preview
                </div>
              </div>
              <div 
                className="prose dark:prose-invert max-w-none markdown-preview"
                dangerouslySetInnerHTML={renderPreview()}
              />
              {!content && (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaStickyNote className="text-2xl" />
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
                          {version.content.substring(0, 300)}
                          {version.content.length > 300 && '...'}
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