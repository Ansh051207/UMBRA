import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaStickyNote, FaUser, FaSignOutAlt, FaMoon, FaSun, FaHome, FaShareAlt } from 'react-icons/fa';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = React.useState(false);

  const isActive = (path) => {
    return location.pathname === path ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : '';
  };

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FaStickyNote className="text-white text-xl" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Umbra
                </span>
              </Link>
              
              <div className="hidden md:ml-10 md:flex md:space-x-1">
                <Link
                  to="/"
                  className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all ${isActive('/')}`}
                >
                  <FaHome />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/shared"
                  className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all ${isActive('/shared')}`}
                >
                  <FaShareAlt />
                  <span>Shared</span>
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? <FaSun className="text-yellow-500" /> : <FaMoon className="text-gray-600 dark:text-gray-300" />}
              </button>

              {/* User menu */}
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="font-medium text-gray-900 dark:text-white">{user.username}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{user.email}</span>
                  </div>
                  <div className="relative group">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 hidden group-hover:block z-50 border border-gray-200 dark:border-gray-700">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          navigate('/login');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                      >
                        <FaSignOutAlt />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-3">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex space-x-2">
          <Link
            to="/"
            className={`flex-1 text-center py-2 rounded-lg font-medium ${isActive('/')}`}
          >
            Dashboard
          </Link>
          <Link
            to="/shared"
            className={`flex-1 text-center py-2 rounded-lg font-medium ${isActive('/shared')}`}
          >
            Shared
          </Link>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FaStickyNote className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Umbra
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-right">
              <p>© 2024 Umbra Notes. All rights reserved.</p>
              <p className="mt-1">Your notes are encrypted and secure.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;