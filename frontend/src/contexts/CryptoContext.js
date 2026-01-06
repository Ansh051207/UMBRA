import React, { createContext, useState, useContext, useCallback } from 'react';
import CryptoJS from 'crypto-js';

const CryptoContext = createContext();

export const useCrypto = () => useContext(CryptoContext);

export const CryptoProvider = ({ children }) => {
  const [masterKey, setMasterKeyState] = useState(sessionStorage.getItem('umbra_master_key') || null);
  const [privateKey, setPrivateKeyState] = useState(sessionStorage.getItem('umbra_private_key') || null);

  const setMasterKey = (key) => {
    if (key) {
      sessionStorage.setItem('umbra_master_key', key);
    } else {
      sessionStorage.removeItem('umbra_master_key');
    }
    setMasterKeyState(key);
  };

  const setPrivateKey = (key) => {
    if (key) {
      sessionStorage.setItem('umbra_private_key', key);
    } else {
      sessionStorage.removeItem('umbra_private_key');
    }
    setPrivateKeyState(key);
  };

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

  // Helper: Convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Helper: Convert Base64 to ArrayBuffer (Robust)
  const base64ToArrayBuffer = (base64) => {
    try {
      // 1. Clean the input: remove ALL whitespace
      const cleaned = base64.replace(/\s/g, '');

      // 2. Validate base64 characters only
      if (!/^[A-Za-z0-9+/=]*$/.test(cleaned)) {
        console.error('Invalid characters in base64 string');
        throw new Error('Invalid base64 characters');
      }

      // 3. Fix padding
      const padded = cleaned.length % 4 === 0 ? cleaned : cleaned.padEnd(cleaned.length + (4 - cleaned.length % 4) % 4, '=');

      const binary_string = window.atob(padded);
      const len = binary_string.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (e) {
      console.error('base64ToArrayBuffer failed:', e);
      throw new Error('Invalid encryption data format (Base64 error)');
    }
  };

  // Helper: Export Key to PEM format
  const exportKeyToPEM = async (key, type) => {
    const exported = await window.crypto.subtle.exportKey(
      type === 'public' ? 'spki' : 'pkcs8',
      key
    );
    const exportedAsString = arrayBufferToBase64(exported);
    const pemExported = `-----BEGIN ${type.toUpperCase()} KEY-----\n${exportedAsString.match(/.{1,64}/g).join('\n')}\n-----END ${type.toUpperCase()} KEY-----`;
    return pemExported;
  };

  // Helper: Import Key from PEM format (Robust)
  const importKeyFromPEM = async (pem, type) => {
    if (!pem || typeof pem !== 'string') {
      console.error(`Missing ${type} key data:`, pem);
      throw new Error(`Missing ${type} key data`);
    }


    const base64 = pem
      .replace(/-----BEGIN.*?-----/g, '')
      .replace(/-----END.*?-----/g, '')
      .replace(/\s/g, '');

    try {
      console.log(`🔍 Crypto: Importing ${type} key, base64 length:`, base64.length);
      const binaryDer = base64ToArrayBuffer(base64);
      return await window.crypto.subtle.importKey(
        type === 'public' ? 'spki' : 'pkcs8',
        binaryDer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        true,
        [type === 'public' ? "encrypt" : "decrypt"]
      );
    } catch (e) {
      console.error(`❌ Import ${type} key failed:`, e);
      console.error(`❌ Bad ${type} key start:`, base64.substring(0, 30));
      console.error(`❌ Bad ${type} key end:`, base64.substring(base64.length - 30));
      throw new Error(`Could not process ${type} encryption key. Possible corruption or incorrect format.`);
    }
  };

  // Generate RSA key pair using Web Crypto API
  const generateRSAKeyPair = useCallback(async () => {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["encrypt", "decrypt"]
    );

    const publicKeyPEM = await exportKeyToPEM(keyPair.publicKey, 'public');
    const privateKeyPEM = await exportKeyToPEM(keyPair.privateKey, 'private');

    return {
      publicKey: publicKeyPEM,
      privateKey: privateKeyPEM
    };
  }, []);

  // Encrypt symmetric key with RSA public key
  const encryptWithPublicKey = useCallback(async (data, publicKeyPEM) => {
    try {
      const publicKey = await importKeyFromPEM(publicKeyPEM, 'public');
      const encodedData = new TextEncoder().encode(data);

      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        publicKey,
        encodedData
      );

      return arrayBufferToBase64(encryptedData);
    } catch (error) {
      console.error('Encryption with public key failed:', error);
      throw error;
    }
  }, []);

  // Decrypt symmetric key with RSA private key
  const decryptWithPrivateKey = useCallback(async (encryptedData, privateKeyPEM) => {
    try {
      const privateKey = await importKeyFromPEM(privateKeyPEM, 'private');
      const encryptedBuffer = base64ToArrayBuffer(encryptedData);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP"
        },
        privateKey,
        encryptedBuffer
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption with private key failed:', error);
      throw error;
    }
  }, []);

  // Expose helpers for external use if needed
  const exportPublicKey = (key) => exportKeyToPEM(key, 'public');
  const exportPrivateKey = (key) => exportKeyToPEM(key, 'private');
  const importPublicKey = (pem) => importKeyFromPEM(pem, 'public');
  const importPrivateKey = (pem) => importKeyFromPEM(pem, 'private');

  const value = {
    masterKey,
    setMasterKey,
    privateKey,
    setPrivateKey,
    generateKey,
    deriveKeyFromPassword,
    encrypt,
    decrypt,
    generateRSAKeyPair,
    encryptWithPublicKey,
    decryptWithPrivateKey,
    exportPublicKey,
    exportPrivateKey,
    importPublicKey,
    importPrivateKey
  };

  return (
    <CryptoContext.Provider value={value}>
      {children}
    </CryptoContext.Provider>
  );
};