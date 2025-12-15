import React, { createContext, useState, useContext, useCallback } from 'react';
import CryptoJS from 'crypto-js';

const CryptoContext = createContext();

export const useCrypto = () => useContext(CryptoContext);

export const CryptoProvider = ({ children }) => {
  const [masterKey, setMasterKey] = useState(null);

  // Generate a random key
  const generateKey = useCallback(() => {
    return CryptoJS.lib.WordArray.random(32).toString();
  }, []);

  // Derive encryption key from password
  const deriveKeyFromPassword = useCallback((password, salt) => {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 100000
    }).toString();
  }, []);

  // Encrypt data with AES
  const encrypt = useCallback((data, key) => {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(data, key, { iv });
    
    return {
      ciphertext: encrypted.toString(),
      iv: iv.toString(),
      algorithm: 'AES-CBC'
    };
  }, []);

  // Decrypt data with AES
  const decrypt = useCallback((ciphertext, key, iv) => {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv: CryptoJS.enc.Hex.parse(iv) });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }, []);

  // Generate RSA key pair
  const generateRSAKeyPair = useCallback(async () => {
    // Note: In production, use Web Crypto API for RSA
    // This is a simplified version using cryptojs
    const keyPair = {
      publicKey: `pub_${CryptoJS.lib.WordArray.random(32).toString()}`,
      privateKey: `priv_${CryptoJS.lib.WordArray.random(64).toString()}`
    };
    return keyPair;
  }, []);

  // Encrypt symmetric key with RSA public key
  const encryptWithPublicKey = useCallback((data, publicKey) => {
    // Simplified - in production use proper RSA encryption
    return `enc_${data}_${publicKey}`;
  }, []);

  // Decrypt symmetric key with RSA private key
  const decryptWithPrivateKey = useCallback((encryptedData, privateKey) => {
    // Simplified - in production use proper RSA decryption
    return encryptedData.replace(/^enc_/, '').replace(new RegExp(`_${privateKey}$`), '');
  }, []);

  const value = {
    masterKey,
    setMasterKey,
    generateKey,
    deriveKeyFromPassword,
    encrypt,
    decrypt,
    generateRSAKeyPair,
    encryptWithPublicKey,
    decryptWithPrivateKey
  };

  return (
    <CryptoContext.Provider value={value}>
      {children}
    </CryptoContext.Provider>
  );
};