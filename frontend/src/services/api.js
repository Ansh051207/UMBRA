import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request interceptor to add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error(' API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {

    return response;
  },
  (error) => {
    console.error(' API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {

      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];

      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);


export default {
  // Notes
  getNotes: () => api.get('/notes'),
  getNote: (id) => api.get(`/notes/${id}`),
  createNote: (noteData) => api.post('/notes', noteData),
  updateNote: (id, noteData) => api.put(`/notes/${id}`, noteData),
  deleteNote: (id) => api.delete(`/notes/${id}`),
  getNoteVersions: (id) => api.get(`/notes/${id}/versions`),
  restoreVersion: (id, version) => api.post(`/notes/${id}/restore/${version}`),

  // Shares
  getNoteSharedWith: (id) => api.get(`/share/${id}/shares`),

  // Sharing
  shareNote: (noteId, shareData) => api.post(`/share/${noteId}`, shareData),
  getSharedNotes: () => api.get('/share/shared-with-me'),
  getShareKey: (noteId, fromUserId) => api.get(`/share/key/${noteId}/${fromUserId}`),
  removeShare: (noteId, userId) => api.delete(`/share/${noteId}/${userId}`),



  // Users
  searchUsers: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`)
};