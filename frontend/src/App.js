import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CryptoProvider } from './contexts/CryptoContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NoteEditor from './pages/NoteEditor';
import SharedNotes from './pages/SharedNotes';
import DebugAuth from './pages/DebugAuth';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CryptoProvider>
          <Routes>
            // In App.js, add this route
<Route path="/debug-auth" element={<DebugAuth />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/note/:id" element={
              <PrivateRoute>
                <Layout>
                  <NoteEditor />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/note/new" element={
              <PrivateRoute>
                <Layout>
                  <NoteEditor />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/shared" element={
              <PrivateRoute>
                <Layout>
                  <SharedNotes />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
      
          </Routes>
        </CryptoProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;