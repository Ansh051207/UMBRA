#!/bin/bash

echo "🚀 Starting Umbra Application..."

# Start MongoDB (if not running)
echo "📦 Checking MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB..."
    mongod --dbpath /usr/local/var/mongodb &
    sleep 3
fi

# Start Backend
echo "🔧 Starting Backend..."
cd backend
npm install
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Start Frontend
echo "🎨 Starting Frontend..."
cd frontend
npm install
npm start
FRONTEND_PID=$!

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
