import CryptoJS from 'crypto-js';

// Generate a secure random password
export const generatePassword = (length = 16) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Check if crypto is available
  if (typeof window !== 'undefined' && window.crypto) {
    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
  }
  
  return password;
};


// Hash password with salt
export const hashPassword = (password, salt) => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000
  }).toString();
};

// Generate initialization vector
export const generateIV = () => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

// Encrypt note content
export const encryptNote = (content, key) => {
  const iv = generateIV();
  const encrypted = CryptoJS.AES.encrypt(content, key, { iv });
  
  return {
    ciphertext: encrypted.toString(),
    iv: iv,
    salt: CryptoJS.lib.WordArray.random(16).toString()
  };
};

// Decrypt note content
export const decryptNote = (ciphertext, key, iv) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { 
      iv: CryptoJS.enc.Hex.parse(iv) 
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt note');
  }
};

// Generate note encryption key
export const generateNoteKey = () => {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
};

// Export/import encrypted data
export const exportEncryptedData = (data, password) => {
  const salt = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.PBKDF2(password, salt, { keySize: 256/32, iterations: 100000 });
  const iv = CryptoJS.lib.WordArray.random(16);
  
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, { iv });
  
  return {
    encrypted: encrypted.toString(),
    salt: salt.toString(),
    iv: iv.toString()
  };
};

export const importEncryptedData = (encryptedData, password) => {
  try {
    const key = CryptoJS.PBKDF2(password, 
      CryptoJS.enc.Hex.parse(encryptedData.salt), 
      { keySize: 256/32, iterations: 100000 }
    );
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, key, {
      iv: CryptoJS.enc.Hex.parse(encryptedData.iv)
    });
    
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    throw new Error('Invalid password or corrupted data');
  }
};