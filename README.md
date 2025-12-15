# Umbra - Encrypted Notes Application

Umbra is a secure, encrypted note-taking web application where all note content is encrypted client-side before being stored on the server. Only note owners and explicitly authorized users can decrypt and read the notes.

## Features

### Core Features
- **Client-Side Encryption**: All note content is encrypted in the browser before transmission
- **Secure User Authentication**: JWT-based authentication with password hashing
- **Rich Text Editing**: WYSIWYG editor with formatting options
- **Note Sharing**: Share notes with other users with read or read+write permissions
- **Version History**: Track and restore previous versions of notes
- **Tag System**: Organize notes with tags

### Security Features
- **End-to-End Encryption**: Server only stores ciphertext
- **Master Password Protection**: Private keys encrypted with user's master password
- **Secure Key Exchange**: RSA-based key sharing for note access
- **Session Management**: Automatic logout and session cleanup

## Architecture

### Frontend
- React.js with functional components and hooks
- Context API for state management
- Web Crypto API for cryptographic operations
- React Router for navigation
- React Quill for rich text editing

### Backend
- Node.js with Express.js
- MongoDB for data storage
- JWT for authentication
- RESTful API design

### Encryption Flow
1. **User Registration**:
   - Generate RSA key pair
   - Encrypt private key with master password
   - Store public key and encrypted private key

2. **Note Creation**:
   - Generate random AES key for each note
   - Encrypt note content with AES key
   - Encrypt AES key with user's public key
   - Store encrypted content and encrypted key

3. **Note Sharing**:
   - Encrypt note's AES key with recipient's public key
   - Store encrypted key for recipient
   - Recipient decrypts with their private key

## Installation

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- npm or yarn

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend