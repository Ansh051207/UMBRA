import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DebugAuth = () => {
  const [backendUrl, setBackendUrl] = useState('http://localhost:5000');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendType, setBackendType] = useState('unknown');

  const log = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { msg: `[${timestamp}] ${msg}`, type }]);
    console.log(`[${type.toUpperCase()}]`, msg);
  };

  const testEverything = async () => {
    setLoading(true);
    setLogs([]);
    setBackendType('unknown');
    
    const token = localStorage.getItem('token');
    
    // 1. Check token
    log(`Token: ${token ? 'Exists' : 'Missing'}`, token ? 'info' : 'error');
    
    if (!token) {
      log('No token found. Cannot proceed.', 'error');
      setLoading(false);
      return;
    }

    // 2. Test backend directly
    try {
      log(`Testing backend at ${backendUrl}/health`, 'info');
      const health = await axios.get(`${backendUrl}/health`);
      log(`Backend health: ${JSON.stringify(health.data)}`, 'success');
    } catch (e) {
      log(`Backend not reachable: ${e.message}`, 'error');
      setLoading(false);
      return;
    }

    // 3. Test auth endpoint
    try {
      log('Testing /api/auth/me endpoint', 'info');
      const authRes = await axios.get(`${backendUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      log(`Auth response: ${JSON.stringify(authRes.data)}`, 'success');
    } catch (e) {
      log(`Auth failed: ${e.response?.data?.error || e.message}`, 'error');
    }

    // 4. CRITICAL: Detect which backend route is being used
    log('=== DETECTING BACKEND ROUTE TYPE ===', 'warning');
    
    // Try to detect endpoint structure
    try {
      const endpointsRes = await axios.get(`${backendUrl}/api`);
      log(`API endpoints: ${JSON.stringify(endpointsRes.data)}`, 'info');
    } catch (e) {
      // Ignore - endpoint might not exist
    }

    // 5. Test BOTH possible note creation endpoints
    log('=== TESTING BOTH NOTE CREATION ENDPOINTS ===', 'warning');
    
    const testNotes = [
      {
        endpoint: '/api/notes',
        data: {
          title: 'Test Note - Route Format',
          content: 'Test content from routes/notes.js format',
          tags: ['test']
        },
        description: 'Standard route (notes.js)'
      },
      {
        endpoint: '/api/notes/create',  // Some apps use different endpoint
        data: {
          title: 'Test Note - Controller Format',
          content: 'Test content from noteController.js format',
          masterPassword: 'test123'  // Required for controller format
        },
        description: 'Controller format (noteController.js)'
      }
    ];

    let successfulCreation = null;

    for (const test of testNotes) {
      log(`Trying ${test.description} at ${test.endpoint}`, 'info');
      
      try {
        log(`Request data: ${JSON.stringify(test.data)}`, 'info');
        
        const response = await axios.post(`${backendUrl}${test.endpoint}`, test.data, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });

        console.group(`=== ${test.description.toUpperCase()} RESPONSE ===`);
        console.log('Full response:', response);
        console.log('Response data:', response.data);
        console.log('Response status:', response.status);
        console.log('Data type:', typeof response.data);
        console.log('Data keys:', Object.keys(response.data));
        console.groupEnd();

        log(`✅ ${test.description} SUCCESS: Status ${response.status}`, 'success');
        log(`Response structure: ${JSON.stringify(response.data, null, 2)}`, 'info');

        // Analyze response format
        if (response.data.id) {
          log(`✅ Format: Direct ID field (id: ${response.data.id})`, 'success');
          setBackendType('routes-format');
          successfulCreation = {
            endpoint: test.endpoint,
            id: response.data.id,
            response: response.data,
            format: 'routes'
          };
        } else if (response.data.note && response.data.note.id) {
          log(`✅ Format: Nested note object (note.id: ${response.data.note.id})`, 'success');
          setBackendType('controller-format');
          successfulCreation = {
            endpoint: test.endpoint,
            id: response.data.note.id,
            response: response.data,
            format: 'controller'
          };
        } else if (response.data._id) {
          log(`✅ Format: MongoDB _id field (_id: ${response.data._id})`, 'success');
          setBackendType('mongodb-format');
          successfulCreation = {
            endpoint: test.endpoint,
            id: response.data._id,
            response: response.data,
            format: 'mongodb'
          };
        } else {
          log(`⚠️ Unknown format. Full response keys: ${Object.keys(response.data).join(', ')}`, 'warning');
        }

        // If we got an ID, test retrieving it
        if (successfulCreation && successfulCreation.id) {
          log(`Testing retrieval of note ${successfulCreation.id}...`, 'info');
          
          try {
            const getRes = await axios.get(`${backendUrl}/api/notes/${successfulCreation.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            log(`✅ Can retrieve note: ${JSON.stringify(getRes.data)}`, 'success');
          } catch (getError) {
            log(`❌ Cannot retrieve note: ${getError.message}`, 'error');
          }

          // Clean up
          try {
            await axios.delete(`${backendUrl}/api/notes/${successfulCreation.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            log(`✅ Test note deleted`, 'success');
          } catch (deleteError) {
            log(`⚠️ Could not delete: ${deleteError.message}`, 'warning');
          }
        }

        break; // Stop after first successful creation

      } catch (error) {
        log(`❌ ${test.description} failed: ${error.message}`, 'error');
        if (error.response) {
          log(`Error details: ${JSON.stringify(error.response.data)}`, 'error');
          log(`Status: ${error.response.status}`, 'error');
        }
        // Continue to next endpoint
      }
    }

    if (!successfulCreation) {
      log('❌ All note creation attempts failed', 'error');
      
      // Try to get existing notes to see structure
      try {
        log('Trying to GET existing notes to see structure...', 'info');
        const existingNotes = await axios.get(`${backendUrl}/api/notes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        log(`GET /api/notes response: ${JSON.stringify(existingNotes.data, null, 2)}`, 'info');
        
        if (Array.isArray(existingNotes.data) && existingNotes.data.length > 0) {
          const firstNote = existingNotes.data[0];
          log(`First note has ID at: ${firstNote.id ? 'id' : firstNote._id ? '_id' : 'unknown location'}`, 'info');
        }
      } catch (e) {
        log(`Cannot GET notes: ${e.message}`, 'error');
      }
    }

    // 6. Generate frontend fix based on detected format
    log('=== GENERATING FIX ===', 'warning');
    
    if (successfulCreation) {
      let fixCode = '';
      
      if (successfulCreation.format === 'routes') {
        fixCode = `
// FIX for routes/notes.js format
const response = await axios.post('/api/notes', noteData, {
  headers: { Authorization: \`Bearer \${token}\` }
});

// This backend returns: { id: note._id, title: ..., createdAt: ... }
const noteId = response.data.id; // Direct id field

if (!noteId) {
  console.error('No ID in response:', response.data);
  throw new Error('Note created but no ID returned');
}
`;
      } else if (successfulCreation.format === 'controller') {
        fixCode = `
// FIX for noteController.js format  
const response = await axios.post('/api/notes/create', noteData, {
  headers: { Authorization: \`Bearer \${token}\` }
});

// This backend returns: { message: '...', note: { id: note._id, ... } }
const noteId = response.data.note.id; // Nested in note object

if (!noteId) {
  console.error('No ID in response:', response.data);
  throw new Error('Note created but no ID returned');
}
`;
      } else if (successfulCreation.format === 'mongodb') {
        fixCode = `
// FIX for MongoDB _id format
const response = await axios.post('/api/notes', noteData, {
  headers: { Authorization: \`Bearer \${token}\` }
});

// This backend returns: { _id: '...', title: ..., createdAt: ... }
const noteId = response.data._id; // MongoDB _id field

if (!noteId) {
  console.error('No ID in response:', response.data);
  throw new Error('Note created but no ID returned');
}
`;
      }
      
      log(`✅ Detected format: ${successfulCreation.format}`, 'success');
      log(`Endpoint: ${successfulCreation.endpoint}`, 'info');
      log(`ID location: ${successfulCreation.format === 'controller' ? 'response.data.note.id' : successfulCreation.format === 'mongodb' ? 'response.data._id' : 'response.data.id'}`, 'info');
      
      // Store fix for copying
      window._debuggerFixCode = fixCode;
    } else {
      log('❌ Could not determine backend format', 'error');
    }

    setLoading(false);
    log('=== TESTS COMPLETE ===', 'warning');
  };

  const copyFixCode = () => {
    if (window._debuggerFixCode) {
      navigator.clipboard.writeText(window._debuggerFixCode);
      alert('Fix code copied to clipboard! Paste this in your note creation function.');
    } else {
      alert('Run tests first to generate fix code.');
    }
  };

  const applyQuickFix = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found');
      return;
    }

    const fixInstructions = `
IMMEDIATE FRONTEND FIX:

1. Find where you create notes (likely in a NoteForm or similar component)
2. Look for this line:
   const response = await axios.post('/api/notes', noteData);
   
3. AFTER that line, add this check:
   console.log('Note creation response:', response.data);
   
4. Extract the ID correctly based on backend:
   
   OPTION A (if using routes/notes.js):
   const noteId = response.data.id;
   
   OPTION B (if using noteController.js):
   const noteId = response.data.note.id;
   
   OPTION C (if using _id):
   const noteId = response.data._id;
   
5. Add validation:
   if (!noteId || noteId === 'undefined') {
     throw new Error('Invalid note ID: ' + noteId);
   }
   
6. Use noteId for any follow-up operations.

Run the debugger to see which format your backend uses!`;
    
    navigator.clipboard.writeText(fixInstructions);
    alert('Fix instructions copied to clipboard!');
  };

  const clearEverything = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div style={{ 
      padding: 20, 
      backgroundColor: '#0a0a0a', 
      minHeight: '100vh', 
      color: 'white',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ color: '#ff6b6b', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 10 }}>
        🔍 BACKEND ROUTE DETECTOR 🔍
      </h1>
      
      <div style={{ 
        marginBottom: 20, 
        padding: 20, 
        backgroundColor: '#1a1a1a', 
        borderRadius: 10,
        border: '1px solid #333'
      }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <input
            value={backendUrl}
            onChange={e => setBackendUrl(e.target.value)}
            placeholder="http://localhost:5000"
            style={{ 
              flex: 1, 
              padding: 10, 
              backgroundColor: '#222', 
              color: '#0af', 
              border: '1px solid #444',
              borderRadius: 5,
              fontFamily: 'monospace'
            }}
          />
          <button
            onClick={testEverything}
            disabled={loading}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: loading ? '#555' : '#ff6b6b', 
              color: 'white', 
              border: 'none', 
              borderRadius: 5,
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '🔍 DETECTING...' : '🔍 DETECT BACKEND'}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={copyFixCode}
            style={{ 
              padding: 10, 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: 5,
              cursor: 'pointer'
            }}
          >
            📋 Copy Fix Code
          </button>
          <button
            onClick={applyQuickFix}
            style={{ 
              padding: 10, 
              backgroundColor: '#2196F3', 
              color: 'white', 
              border: 'none', 
              borderRadius: 5,
              cursor: 'pointer'
            }}
          >
            ⚡ Quick Fix Guide
          </button>
          <button
            onClick={clearEverything}
            style={{ 
              padding: 10, 
              backgroundColor: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: 5,
              cursor: 'pointer'
            }}
          >
            🗑️ Clear All
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            style={{ 
              padding: 10, 
              backgroundColor: '#9C27B0', 
              color: 'white', 
              border: 'none', 
              borderRadius: 5,
              cursor: 'pointer'
            }}
          >
            🔑 Go to Login
          </button>
        </div>
      </div>

      {backendType !== 'unknown' && (
        <div style={{ 
          marginBottom: 20, 
          padding: 15, 
          backgroundColor: backendType === 'routes-format' ? '#1b5e20' : 
                          backendType === 'controller-format' ? '#01579b' : '#4a148c',
          borderRadius: 10,
          border: '2px solid #fff'
        }}>
          <h3 style={{ margin: 0, color: '#fff' }}>
            ✅ DETECTED: {backendType.toUpperCase().replace('-', ' ')}
          </h3>
          <p style={{ margin: '5px 0 0 0', color: '#ccc' }}>
            {backendType === 'routes-format' 
              ? 'Using routes/notes.js format (returns { id: "..." })'
              : backendType === 'controller-format'
              ? 'Using noteController.js format (returns { note: { id: "..." } })'
              : 'Using MongoDB format (returns { _id: "..." })'}
          </p>
        </div>
      )}

      <div style={{ 
        marginBottom: 20, 
        padding: 20, 
        backgroundColor: '#1a1a1a', 
        borderRadius: 10,
        border: '1px solid #333'
      }}>
        <h3 style={{ color: '#4CAF50', marginTop: 0 }}>Token Status:</h3>
        <div style={{ 
          wordBreak: 'break-all', 
          backgroundColor: '#000', 
          padding: 15, 
          borderRadius: 5, 
          marginTop: 10,
          border: '1px solid #333',
          fontSize: '12px',
          maxHeight: 100,
          overflowY: 'auto'
        }}>
          {localStorage.getItem('token') 
            ? `${localStorage.getItem('token').substring(0, 50)}...`
            : 'NO TOKEN FOUND'}
        </div>
      </div>

      <div style={{ 
        marginBottom: 20, 
        padding: 20, 
        backgroundColor: '#1a1a1a', 
        borderRadius: 10,
        border: '1px solid #333'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ color: '#2196F3', margin: 0 }}>Debug Log:</h3>
          <button
            onClick={() => setLogs([])}
            style={{ 
              padding: '5px 10px', 
              backgroundColor: '#555', 
              color: 'white', 
              border: 'none', 
              borderRadius: 3,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Clear Log
          </button>
        </div>
        <div style={{ 
          maxHeight: 400, 
          overflowY: 'auto', 
          backgroundColor: '#000', 
          padding: 15, 
          borderRadius: 5,
          border: '1px solid #333',
          fontSize: '12px'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              Click "DETECT BACKEND" to start diagnosis...
            </div>
          ) : (
            logs.map((log, i) => (
              <div 
                key={i} 
                style={{ 
                  padding: '5px 0', 
                  borderBottom: '1px solid #222',
                  color: log.type === 'error' ? '#ff6b6b' : 
                         log.type === 'success' ? '#4CAF50' : 
                         log.type === 'warning' ? '#FFC107' : '#64B5F6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {log.msg}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ 
        padding: 20, 
        backgroundColor: '#1a237e', 
        borderRadius: 10,
        border: '2px solid #5c6bc0'
      }}>
        <h3 style={{ color: '#bbdefb', marginTop: 0 }}>🎯 PROBLEM ANALYSIS:</h3>
        <p style={{ color: '#e3f2fd' }}>
          You have <strong>TWO different note creation implementations</strong>:
        </p>
        <ol style={{ color: '#e3f2fd', lineHeight: 1.8 }}>
          <li>
            <strong>routes/notes.js</strong> - Returns: <code style={{ backgroundColor: '#000', padding: '2px 5px' }}>{`{ id: note._id, title: "...", createdAt: "..." }`}</code>
          </li>
          <li>
            <strong>noteController.js</strong> - Returns: <code style={{ backgroundColor: '#000', padding: '2px 5px' }}>{`{ message: "...", note: { id: note._id, title: "...", createdAt: "..." } }`}</code>
          </li>
        </ol>
        <p style={{ color: '#ffcdd2', marginTop: 15 }}>
          <strong>Your frontend expects one format but backend returns the other!</strong>
        </p>
        <div style={{ 
          marginTop: 15, 
          padding: 15, 
          backgroundColor: '#000', 
          borderRadius: 5,
          border: '1px solid #5c6bc0'
        }}>
          <p style={{ color: '#4CAF50', margin: 0 }}>
            <strong>Solution:</strong> Click "DETECT BACKEND" to find which format your backend uses, 
            then click "Copy Fix Code" to get the exact fix for your frontend.
          </p>
        </div>
      </div>

      <div style={{ 
        marginTop: 20, 
        padding: 15, 
        backgroundColor: '#2e7d32', 
        borderRadius: 10,
        border: '2px solid #4caf50',
        fontSize: '14px'
      }}>
        <h4 style={{ color: '#c8e6c9', marginTop: 0 }}>📋 HOW TO FIX:</h4>
        <ol style={{ color: '#e8f5e9', lineHeight: 1.6 }}>
          <li>Click the <strong style={{ color: '#ffeb3b' }}>🔍 DETECT BACKEND</strong> button above</li>
          <li>Check the logs to see which endpoint succeeds</li>
          <li>Look at the response format in the logs</li>
          <li>Click <strong style={{ color: '#ffeb3b' }}>📋 Copy Fix Code</strong> for the correct format</li>
          <li>Find your frontend's note creation function</li>
          <li>Replace the ID extraction code with the copied fix</li>
        </ol>
      </div>
    </div>
  );
};

export default DebugAuth;