# Umbra - Zero-Knowledge Encrypted Notes Sharing

**Umbra** is a state-of-the-art secure workspace application designed with a "Privacy First" architecture. It employs **Zero-Knowledge Encryption**, meaning your data is encrypted on your device before it ever reaches our servers. Even as service providers, we literally *cannot* read your notes or files.

Built with modern web technologies, Umbra combines security with a premium, responsive user experience.

##  Key Features

### Security & Privacy
*   **Zero-Knowledge Architecture**: All encryption happens client-side (in your browser) using **AES-256** and **RSA-2048**.
*   **End-to-End Encryption (E2EE)**: Data remains encrypted in transit and at rest. The server only sees encrypted blobs (`ciphertext`).
*   **Secure Identity**:
    *   **Master Password**: Your private key is encrypted with your master password. We never store your password or unencrypted private key.

###  Smart Note Management
*   **Secure Editor**: Distraction-free text editor with auto-encryption.
*   **Version History**: Track changes with encrypted version control.
*   **Markdown Export**: Download your secure notes as standard `.md` files.
*   **Organization**: Tagging system, search functionality, and intuitive dashboard.

###  Secure Collaboration
*   **Encrypted Sharing**: Share notes securely with other users without exposing keys to the server.
*   **Role-Based Access Control (RBAC)**:
    *   **Owner**: Full control.
    *   **Editor**: Can decrypt and modify content.
    *   **Viewer**: Read-only access.
*   **Shared Dashboard**: Dedicated "Shared with me" section to manage incoming shared assets.

##  Technology Stack

### Frontend
*   **Framework**: [React 18](https://reactjs.org/)
*   **Styling**: [TailwindCSS](https://tailwindcss.com/) (Modern, responsive design)
*   **Cryptography**: `crypto-js` (Client-side encryption primitives), Web Crypto API.
*   **Routing**: React Router v6
*   **Icons**: React Icons (FontAwesome, Material Design)

### Backend
*   **Runtime**: Node.js & Express.js
*   **Database**: MongoDB (Mongoose ODM)
*   **Authentication**: JWT (JSON Web Tokens) with secure HTTP-only cookies.
*   **Security**: Helmet, Rate Limitting, Input Validation.

## Installation & Setup

### Prerequisites
*   **Node.js** (v16 or higher)
*   **MongoDB** (local instance or Atlas URI)
*   **npm** 

### 1. Clone the Repository
```bash
git clone https://github.com/Ansh051207/umbra.git
cd umbra
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/umbra
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d
NODE_ENV=development
```

Start the backend server:
```bash
npm run dev
# Server will start on http://localhost:5000
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start the React development server:
```bash
npm start
# App will open at http://localhost:3000
```

## Usage Guide

1.  **Registration**: Sign up for an account. Vital: **Do not forget your password**. Since we cannot recover your encrypted private key without it, losing your password means losing access to your data permanently.
2.  **Creating Notes**: Click "+ New Note" to start. Saving automatically encrypts (locks) the note.
3.  **Sharing**:
    *   Open a note.
    *   Click the "Share" icon.
    *   Search for a user by username.
    *   Select permission (Read or Write) and share.
    *   The system performs an RSA key exchange to securely deliver the file key to the recipient.

##  Security Notice
This application is a demonstration of E2EE principles. While it uses industry-standard algorithms, always ensure you are running it in a secure environment (HTTPS in production) to prevent MITM attacks on the client-side code delivery.

## Demo Video Link
https://drive.google.com/file/d/1CvvgogJJU5txCK-GwxLTwsGiNCuKAyXi/view?usp=sharing

## Credits
1. AI tools and code assisstant
- ChatGPT
- DeepSeek
- Antigravity
2. Youtube Channels
- Chai aur Code
- CodeWithHarry
3. Website
- w3schools
