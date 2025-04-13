@echo off
echo Starting Remote Desktop Management System Development Environment

:: Start the WebSocket server
start cmd /k "cd server && npm install && node server.js"

:: Set environment variables
set ADMIN_USERNAME=admin
set ADMIN_PASSWORD=admin123

:: Start the Next.js frontend
start cmd /k "npm install && npm run dev"

:: Start a test Python client
start cmd /k "cd client && python -m pip install -r requirements.txt && python client.py"

echo Development environment started:
echo - Frontend: http://localhost:3000
echo - WebSocket Server: ws://localhost:3001
echo - Python Client WebSocket: ws://localhost:3002
