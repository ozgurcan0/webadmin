# Remote Desktop Manager

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![Python](https://img.shields.io/badge/python-%3E%3D3.8-blue.svg)

A modern and secure remote desktop management solution. This application simplifies remote system management with its web-based interface and powerful security features.

## 🚀 Features

- 🔐 Secure authentication and session management
- 🖥️ Real-time remote desktop control
- 📁 File management and transfer
- 📊 System performance monitoring
- 👥 Multi-user support
- 🛡️ SSL/TLS encryption
- 📱 Responsive design

## 🛠️ Technologies

### Frontend
- Next.js 15.3.0
- React 19
- Mantine UI
- Socket.IO Client
- Framer Motion

### Backend
- Node.js
- Express
- Socket.IO
- SSL/TLS

### Client
- Python 3.8+
- PyAutoGUI
- Socket.IO Client

## 🔧 Installation

### Prerequisites
- Node.js (>= 18.0.0)
- Python (>= 3.8)
- npm or yarn

### Server Setup

1. Clone the repository
```bash
git clone [repository-url]
cd remotedesktop
```

2. Install dependencies
```bash
npm install
```

3. Generate SSL certificates (for development)
```bash
mkdir server/certs
cd server/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt
```

4. Configure environment variables
```bash
cp server/.env.example server/.env
```

5. Start the application
```bash
npm run dev
```

### Client Setup

1. Install Python dependencies
```bash
cd client
pip install -r requirements.txt
```

2. Start the client
```bash
python start_client.py
```

## 🔒 Security

- SSL/TLS encryption
- Secure WebSocket connections
- Session management and authentication
- Permission-based access control

## 🌐 Access

- Web Interface: `https://localhost:3000`
- WebSocket Server: `wss://localhost:3002`

## 📝 Usage

1. Log in to the web interface (Default credentials: admin/admin123)
2. Run the client application on the target computer
3. Once connected, you can use remote management features:
   - Screen sharing and control
   - File management
   - System monitoring
   - Remote command execution

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for more information.

