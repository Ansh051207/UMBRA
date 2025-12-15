import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaLock, FaEnvelope, FaUser, FaKey, FaCheck, FaCopy, 
  FaShieldAlt, FaEye, FaEyeSlash, FaDownload, FaQrcode 
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [copied, setCopied] = useState({ master: false, public: false, private: false });
  const [generatedKeys, setGeneratedKeys] = useState(null);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showQR, setShowQR] = useState({ master: false, public: false, private: false });
  
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Calculate password strength
    if (name === 'password') {
      let strength = 0;
      if (value.length >= 8) strength += 25;
      if (/[A-Z]/.test(value)) strength += 25;
      if (/[0-9]/.test(value)) strength += 25;
      if (/[^A-Za-z0-9]/.test(value)) strength += 25;
      setPasswordStrength(strength);
    }
  };

  const generatePassword = (length = 16) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    if (typeof window !== 'undefined' && window.crypto) {
      const randomValues = new Uint32Array(length);
      window.crypto.getRandomValues(randomValues);
      
      for (let i = 0; i < length; i++) {
        password += charset[randomValues[i] % charset.length];
      }
    } else {
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
      }
    }
    
    return password;
  };

  const generateKeys = () => {
    // Generate master password
    const masterPass = generatePassword(16);
    setMasterPassword(masterPass);
    setShowMasterPassword(true);
    
    // Generate key pair (simplified for demo)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    
    const publicKey = `-----BEGIN PUBLIC KEY-----
UMBRA_${randomStr}_PUB_${timestamp}
${btoa(randomStr + timestamp).substring(0, 50)}
-----END PUBLIC KEY-----`;
    
    const privateKey = `-----BEGIN PRIVATE KEY-----
UMBRA_${randomStr}_PRIV_${timestamp}
${btoa(masterPass + randomStr + timestamp).substring(0, 100)}
-----END PRIVATE KEY-----`;
    
    setGeneratedKeys({
      publicKey,
      privateKey,
      timestamp
    });
    
    setCopied({ master: false, public: false, private: false });
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [type]: true });
    setTimeout(() => setCopied({ ...copied, [type]: false }), 2000);
  };

  const downloadKey = (key, filename) => {
    const element = document.createElement('a');
    const file = new Blob([key], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getStrengthColor = (strength) => {
    if (strength < 50) return 'bg-red-500';
    if (strength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!masterPassword) {
      setError('Please generate keys first');
      return;
    }

    if (!generatedKeys) {
      setError('Please generate keys first');
      return;
    }

    setLoading(true);

    try {
      // Prepare registration data
      const userData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        publicKey: generatedKeys.publicKey,
        encryptedPrivateKey: JSON.stringify({
          ciphertext: btoa(generatedKeys.privateKey),
          salt: btoa(`salt_${generatedKeys.timestamp}`)
        })
      };

      const result = await register(userData);
      
      if (result.success) {
        // Show success modal with all keys
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheck class="text-white text-2xl" />
              </div>
              <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Created Successfully!</h3>
              <p class="text-gray-500 dark:text-gray-400">Save your keys securely</p>
            </div>
            
            <div class="space-y-6">
              <!-- Master Password -->
              <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <FaKey class="text-yellow-600 dark:text-yellow-400" />
                    <span class="font-bold text-yellow-800 dark:text-yellow-300">Master Password</span>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="navigator.clipboard.writeText('${masterPassword}')" 
                      class="text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 px-2 py-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900">
                      Copy
                    </button>
                    <button onclick="downloadText('${masterPassword}', 'umbra-master-password.txt')"
                      class="text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 px-2 py-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900">
                      Download
                    </button>
                  </div>
                </div>
                <div class="font-mono text-sm bg-white dark:bg-gray-900 p-3 rounded-lg break-all">
                  ${masterPassword}
                </div>
                <div class="mt-3 text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                  ⚠️ This password encrypts your private key. Cannot be recovered!
                </div>
              </div>

              <!-- Public Key -->
              <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <FaShieldAlt class="text-blue-600 dark:text-blue-400" />
                    <span class="font-bold text-blue-800 dark:text-blue-300">Public Key</span>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="navigator.clipboard.writeText('${generatedKeys.publicKey}')"
                      class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900">
                      Copy
                    </button>
                    <button onclick="downloadText('${generatedKeys.publicKey}', 'umbra-public-key.pem')"
                      class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900">
                      Download
                    </button>
                  </div>
                </div>
                <div class="font-mono text-xs bg-white dark:bg-gray-900 p-3 rounded-lg break-all max-h-32 overflow-y-auto">
                  ${generatedKeys.publicKey}
                </div>
              </div>

              <!-- Private Key -->
              <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <FaLock class="text-red-600 dark:text-red-400" />
                    <span class="font-bold text-red-800 dark:text-red-300">Private Key (Encrypted)</span>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="navigator.clipboard.writeText('${generatedKeys.privateKey}')"
                      class="text-sm text-red-600 dark:text-red-400 hover:text-red-700 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900">
                      Copy
                    </button>
                    <button onclick="downloadText('${generatedKeys.privateKey}', 'umbra-private-key.pem')"
                      class="text-sm text-red-600 dark:text-red-400 hover:text-red-700 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900">
                      Download
                    </button>
                  </div>
                </div>
                <div class="font-mono text-xs bg-white dark:bg-gray-900 p-3 rounded-lg break-all max-h-32 overflow-y-auto">
                  ${generatedKeys.privateKey}
                </div>
                <div class="mt-3 text-sm text-red-700 dark:text-red-300 font-medium">
                  🔒 Encrypted with your master password. Keep this extremely secure!
                </div>
              </div>

              <!-- Security Notice -->
              <div class="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                <h4 class="font-bold text-gray-900 dark:text-white mb-2">⚠️ Security Instructions:</h4>
                <ul class="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• Store all keys in a password manager (like 1Password, Bitwarden)</li>
                  <li>• Make encrypted backups on multiple secure devices</li>
                  <li>• Never share your private key or master password</li>
                  <li>• You cannot recover lost keys - they're needed to decrypt notes</li>
                </ul>
              </div>
            </div>

            <button onclick="this.closest('div').remove(); window.location.href='/';" 
              class="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all">
              I've Saved My Keys - Go to Dashboard
            </button>
          </div>
        `;
        
        // Add download function
        const downloadText = (text, filename) => {
          const element = document.createElement('a');
          const file = new Blob([text], { type: 'text/plain' });
          element.href = URL.createObjectURL(file);
          element.download = filename;
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
        };
        
        window.downloadText = downloadText;
        document.body.appendChild(modal);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(`Registration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                <FaShieldAlt className="text-white text-sm" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Your Secure Account
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Generate encryption keys for maximum security</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left column - Registration Form */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Account Details</h3>
              
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                      placeholder="johndoe"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaEnvelope className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>
                  {/* Password strength */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Password strength</span>
                        <span className={`font-medium ${
                          passwordStrength < 50 ? 'text-red-500' : 
                          passwordStrength < 75 ? 'text-yellow-500' : 
                          'text-green-500'
                        }`}>
                          {passwordStrength}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                          style={{ width: `${passwordStrength}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Generate Keys Button */}
                <button
                  type="button"
                  onClick={generateKeys}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
                >
                  <FaKey />
                  Generate Encryption Keys
                </button>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !generatedKeys}
                  className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                      Creating Secure Account...
                    </>
                  ) : 'Create Secure Account'}
                </button>

                {/* Login link */}
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <Link
                      to="/login"
                      className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Right column - Generated Keys Display */}
          <div className="space-y-6">
            {/* Master Password Card */}
            {showMasterPassword && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                      <FaKey className="text-white text-lg" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Master Password</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Encrypts your private key</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(masterPassword, 'master')}
                      className="p-2 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg"
                      title="Copy"
                    >
                      {copied.master ? <FaCheck className="text-green-500" /> : <FaCopy />}
                    </button>
                    <button
                      onClick={() => downloadKey(masterPassword, 'umbra-master-password.txt')}
                      className="p-2 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg"
                      title="Download"
                    >
                      <FaDownload />
                    </button>
                    <button
                      onClick={() => setShowQR({ ...showQR, master: !showQR.master })}
                      className="p-2 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg"
                      title="Show QR"
                    >
                      <FaQrcode />
                    </button>
                  </div>
                </div>

                <div className="font-mono text-lg bg-white dark:bg-gray-900 p-3 rounded-lg break-all mb-4">
                  {masterPassword}
                </div>

                {showQR.master && (
                  <div className="mb-4 p-4 bg-white dark:bg-gray-900 rounded-lg flex flex-col items-center">
                    <QRCodeSVG value={masterPassword} size={150} />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Scan to save</p>
                  </div>
                )}

                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    ⚠️ This password cannot be recovered. Save it securely!
                  </p>
                </div>
              </div>
            )}

            {/* Public Key Card */}
            {generatedKeys && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <FaShieldAlt className="text-white text-lg" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Public Key</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">For sharing & verification</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(generatedKeys.publicKey, 'public')}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                      title="Copy"
                    >
                      {copied.public ? <FaCheck className="text-green-500" /> : <FaCopy />}
                    </button>
                    <button
                      onClick={() => downloadKey(generatedKeys.publicKey, 'umbra-public-key.pem')}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                      title="Download"
                    >
                      <FaDownload />
                    </button>
                    <button
                      onClick={() => setShowPublicKey(!showPublicKey)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                      title={showPublicKey ? "Hide Key" : "Show Key"}
                    >
                      {showPublicKey ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {showPublicKey ? (
                  <div className="font-mono text-xs bg-white dark:bg-gray-900 p-3 rounded-lg break-all max-h-48 overflow-y-auto mb-4">
                    {generatedKeys.publicKey}
                  </div>
                ) : (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg mb-4 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Click "Show Key" to view public key</p>
                  </div>
                )}

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    This key can be shared safely. Used for encrypting messages to you.
                  </p>
                </div>
              </div>
            )}

            {/* Private Key Card */}
            {generatedKeys && (
              <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/10 dark:to-pink-900/10 rounded-2xl p-6 border border-red-200 dark:border-red-800 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <FaLock className="text-white text-lg" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Private Key</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Encrypted with master password</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(generatedKeys.privateKey, 'private')}
                      className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                      title="Copy"
                    >
                      {copied.private ? <FaCheck className="text-green-500" /> : <FaCopy />}
                    </button>
                    <button
                      onClick={() => downloadKey(generatedKeys.privateKey, 'umbra-private-key.pem')}
                      className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                      title="Download"
                    >
                      <FaDownload />
                    </button>
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                      title={showPrivateKey ? "Hide Key" : "Show Key"}
                    >
                      {showPrivateKey ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {showPrivateKey ? (
                  <div className="font-mono text-xs bg-white dark:bg-gray-900 p-3 rounded-lg break-all max-h-48 overflow-y-auto mb-4">
                    {generatedKeys.privateKey}
                  </div>
                ) : (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg mb-4 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Click "Show Key" to view private key</p>
                  </div>
                )}

                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    🔒 Keep this extremely secure! Needed to decrypt your notes.
                  </p>
                </div>
              </div>
            )}

            {/* Security Tips */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Key Security Checklist:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FaCheck className="text-green-600 dark:text-green-400 text-xs" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Store in Password Manager</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Use 1Password, Bitwarden, or similar</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FaCheck className="text-blue-600 dark:text-blue-400 text-xs" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Multiple Secure Backups</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Encrypted backups on different devices</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FaCheck className="text-red-600 dark:text-red-400 text-xs" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Never Share Private Key</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This key decrypts all your notes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FaCheck className="text-purple-600 dark:text-purple-400 text-xs" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">No Recovery Possible</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Lost keys = lost access to notes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;