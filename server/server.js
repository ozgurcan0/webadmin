const { Server } = require('socket.io');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
require('dotenv').config();

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();
let nextClientId = 1;

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'register') {
                handleClientRegistration(ws, data);
            } else if (data.type === 'screen_frame') {
                // Forward screen frames directly to the web client
                broadcastToWebClients(ws, data);
            } else if (data.client_id) {
                // Forward command to specific client
                handleClientCommand(data);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        // Remove client when disconnected
        for (const [clientId, client] of clients.entries()) {
            if (client.ws === ws) {
                clients.delete(clientId);
                broadcastClientList();
                break;
            }
        }
    });
});

function handleClientRegistration(ws, data) {
    const clientId = data.client_id || `client_${nextClientId++}`;
    clients.set(clientId, {
        ws,
        info: data.system_info || {},
        type: 'desktop_client'
    });
    
    // Send confirmation to client
    ws.send(JSON.stringify({
        type: 'registration_complete',
        client_id: clientId
    }));

    broadcastClientList();
}

function handleClientCommand(data) {
    const targetClient = clients.get(data.client_id);
    if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
        targetClient.ws.send(JSON.stringify(data));
    }
}

function broadcastToWebClients(sourceWs, data) {
    wss.clients.forEach((client) => {
        if (client !== sourceWs && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function broadcastClientList() {
    const clientList = Array.from(clients.entries()).map(([id, client]) => ({
        id,
        ...client.info
    }));

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'clients_updated',
                clients: clientList
            }));
        }
    });
}

// Implement WebSocket heartbeat to detect stale connections
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(() => {});
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`WebSocket server is running on port ${PORT}`);
});

// Handle frontend connections
io.on('connection', (socket) => {
    console.log('Frontend client connected');

    // Send current list of connected clients
    socket.emit('clients_updated', Array.from(clients.keys()).map(id => ({ id })));

    socket.on('send_command', async ({ clientId, command }) => {
        const client = clients.get(clientId);
        if (client) {
            try {
                client.send(JSON.stringify(command));
            } catch (error) {
                console.error('Error sending command:', error);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Frontend client disconnected');
    });
});

// Start HTTP server for Socket.IO
httpServer.listen(3001, () => {
    console.log('Server running on port 3001');
});
