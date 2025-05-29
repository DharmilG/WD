// Simple WebSocket Server for ChatRoom Application
// Run with: node server/websocket-server.js

const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

class ChatServer {
    constructor(port = 8080) {
        this.port = port;
        this.rooms = new Map(); // roomCode -> Set of clients
        this.clients = new Map(); // client -> { username, roomCode, lastSeen }
        
        this.setupServer();
    }
    
    setupServer() {
        // Create HTTP server for serving static files
        this.httpServer = http.createServer((req, res) => {
            this.handleHttpRequest(req, res);
        });
        
        // Create WebSocket server
        this.wss = new WebSocket.Server({ 
            server: this.httpServer,
            path: '/ws'
        });
        
        this.wss.on('connection', (ws, req) => {
            console.log('New WebSocket connection from:', req.socket.remoteAddress);
            this.handleConnection(ws);
        });
        
        this.httpServer.listen(this.port, () => {
            console.log(`ChatRoom server running on http://localhost:${this.port}`);
            console.log(`WebSocket server running on ws://localhost:${this.port}/ws`);
        });
    }
    
    handleHttpRequest(req, res) {
        // Serve static files from parent directory
        const baseDir = path.join(__dirname, '..');
        let filePath = path.join(baseDir, req.url === '/' ? 'index.html' : req.url);
        
        // Security check - prevent directory traversal
        if (!filePath.startsWith(baseDir)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            
            // Set content type based on file extension
            const ext = path.extname(filePath);
            const contentTypes = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.json': 'application/json'
            };
            
            res.writeHead(200, {
                'Content-Type': contentTypes[ext] || 'text/plain',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        });
    }
    
    handleConnection(ws) {
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(ws, message);
            } catch (error) {
                console.error('Error parsing message:', error);
                this.sendError(ws, 'Invalid message format');
            }
        });
        
        ws.on('close', () => {
            this.handleDisconnection(ws);
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
        
        // Send welcome message
        this.send(ws, {
            type: 'connected',
            message: 'Connected to ChatRoom server'
        });
    }
    
    handleMessage(ws, message) {
        switch (message.type) {
            case 'join_room':
                this.handleJoinRoom(ws, message);
                break;
                
            case 'chat_message':
                this.handleChatMessage(ws, message);
                break;
                
            case 'typing':
                this.handleTyping(ws, message);
                break;
                
            case 'ping':
                this.handlePing(ws, message);
                break;
                
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    
    handleJoinRoom(ws, message) {
        const { roomCode, username } = message;
        
        if (!roomCode || !username) {
            this.sendError(ws, 'Room code and username are required');
            return;
        }
        
        // Remove client from previous room if any
        this.leaveCurrentRoom(ws);
        
        // Add client to new room
        if (!this.rooms.has(roomCode)) {
            this.rooms.set(roomCode, new Set());
        }
        
        this.rooms.get(roomCode).add(ws);
        this.clients.set(ws, {
            username,
            roomCode,
            lastSeen: Date.now()
        });
        
        console.log(`${username} joined room ${roomCode}`);
        
        // Notify client they joined successfully
        this.send(ws, {
            type: 'room_joined',
            roomCode,
            username
        });
        
        // Notify other users in the room
        this.broadcastToRoom(roomCode, {
            type: 'user_joined',
            username,
            timestamp: Date.now()
        }, ws);
        
        // Send current user list to the new user
        const roomUsers = this.getRoomUsers(roomCode);
        this.send(ws, {
            type: 'user_list',
            users: roomUsers
        });
        
        // Broadcast updated user list to all users in room
        this.broadcastToRoom(roomCode, {
            type: 'user_list',
            users: roomUsers
        });
    }
    
    handleChatMessage(ws, message) {
        const client = this.clients.get(ws);
        if (!client) {
            this.sendError(ws, 'Not in a room');
            return;
        }
        
        const { content } = message;
        if (!content || !content.trim()) {
            this.sendError(ws, 'Message content is required');
            return;
        }
        
        const chatMessage = {
            type: 'chat_message',
            id: message.id || this.generateId(),
            username: client.username,
            content: content.trim(),
            timestamp: Date.now()
        };
        
        console.log(`Message in ${client.roomCode} from ${client.username}: ${content}`);
        
        // Broadcast to all users in the room (including sender for confirmation)
        this.broadcastToRoom(client.roomCode, chatMessage);
    }
    
    handleTyping(ws, message) {
        const client = this.clients.get(ws);
        if (!client) return;
        
        const typingMessage = {
            type: 'typing',
            username: client.username,
            isTyping: message.isTyping,
            timestamp: Date.now()
        };
        
        // Broadcast to other users in the room (not the sender)
        this.broadcastToRoom(client.roomCode, typingMessage, ws);
    }
    
    handlePing(ws, message) {
        this.send(ws, {
            type: 'pong',
            timestamp: Date.now()
        });
        
        // Update last seen time
        const client = this.clients.get(ws);
        if (client) {
            client.lastSeen = Date.now();
        }
    }
    
    handleDisconnection(ws) {
        const client = this.clients.get(ws);
        if (client) {
            console.log(`${client.username} disconnected from room ${client.roomCode}`);
            
            // Remove from room and notify others
            this.leaveCurrentRoom(ws);
        }
        
        this.clients.delete(ws);
    }
    
    leaveCurrentRoom(ws) {
        const client = this.clients.get(ws);
        if (!client) return;
        
        const { username, roomCode } = client;
        const room = this.rooms.get(roomCode);
        
        if (room) {
            room.delete(ws);
            
            // If room is empty, remove it
            if (room.size === 0) {
                this.rooms.delete(roomCode);
                console.log(`Room ${roomCode} is now empty and removed`);
            } else {
                // Notify other users
                this.broadcastToRoom(roomCode, {
                    type: 'user_left',
                    username,
                    timestamp: Date.now()
                });
                
                // Send updated user list
                const roomUsers = this.getRoomUsers(roomCode);
                this.broadcastToRoom(roomCode, {
                    type: 'user_list',
                    users: roomUsers
                });
            }
        }
    }
    
    getRoomUsers(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return [];
        
        const users = [];
        room.forEach(client => {
            const clientData = this.clients.get(client);
            if (clientData) {
                users.push(clientData.username);
            }
        });
        
        return users;
    }
    
    broadcastToRoom(roomCode, message, excludeClient = null) {
        const room = this.rooms.get(roomCode);
        if (!room) return;
        
        room.forEach(client => {
            if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
                this.send(client, message);
            }
        });
    }
    
    send(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    
    sendError(ws, errorMessage) {
        this.send(ws, {
            type: 'error',
            message: errorMessage,
            timestamp: Date.now()
        });
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Cleanup inactive connections
    startCleanupTimer() {
        setInterval(() => {
            const now = Date.now();
            const timeout = 5 * 60 * 1000; // 5 minutes
            
            this.clients.forEach((client, ws) => {
                if (now - client.lastSeen > timeout) {
                    console.log(`Cleaning up inactive connection: ${client.username}`);
                    ws.terminate();
                }
            });
        }, 60000); // Check every minute
    }
}

// Start the server
const server = new ChatServer(8080);
server.startCleanupTimer();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
