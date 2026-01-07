import CryptoJS from 'crypto-js';






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



// Export/import encrypted data
export const exportEncryptedData = (data, password) => {
  const salt = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 100000 });
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
      { keySize: 256 / 32, iterations: 100000 }
    );

    const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, key, {
      iv: CryptoJS.enc.Hex.parse(encryptedData.iv)
    });

    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    throw new Error('Invalid password or corrupted data');
  }
};