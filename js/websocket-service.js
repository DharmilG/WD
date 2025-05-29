// WebSocket Service for Real-Time Communication

class WebSocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
        
        // Event listeners
        this.messageListeners = [];
        this.userListeners = [];
        this.typingListeners = [];
        this.connectionListeners = [];
        
        // Configuration
        this.config = {
            // For development, you can use a local WebSocket server
            // For production, replace with your actual WebSocket server URL
            serverUrl: this.getWebSocketUrl(),
            heartbeatInterval: 30000, // 30 seconds
            heartbeatTimeout: 5000,   // 5 seconds
            reconnectDelay: 1000,     // 1 second
            maxReconnectAttempts: 5
        };
        
        // Bind methods
        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleError = this.handleError.bind(this);
    }
    
    /**
     * Get WebSocket server URL
     * @returns {string} - WebSocket server URL
     */
    getWebSocketUrl() {
        // Check if we're in development or production
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        
        // For development, try to connect to a local server
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
            return 'ws://localhost:8080';
        }
        
        // For production, use the same host
        return `${protocol}//${host}/ws`;
    }
    
    /**
     * Connect to WebSocket server
     * @param {string} roomCode - Room code to join
     * @param {string} username - Username
     * @returns {Promise<boolean>} - Success status
     */
    async connect(roomCode, username) {
        try {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.disconnect();
            }
            
            console.log(`Connecting to WebSocket server: ${this.config.serverUrl}`);
            
            this.socket = new WebSocket(this.config.serverUrl);
            
            // Set up event listeners
            this.socket.addEventListener('open', this.handleOpen);
            this.socket.addEventListener('message', this.handleMessage);
            this.socket.addEventListener('close', this.handleClose);
            this.socket.addEventListener('error', this.handleError);
            
            // Wait for connection to open
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);
                
                const onOpen = () => {
                    clearTimeout(timeout);
                    this.socket.removeEventListener('open', onOpen);
                    this.socket.removeEventListener('error', onError);
                    
                    // Send join room message
                    this.sendMessage({
                        type: 'join_room',
                        roomCode,
                        username,
                        timestamp: Date.now()
                    });
                    
                    resolve(true);
                };
                
                const onError = (error) => {
                    clearTimeout(timeout);
                    this.socket.removeEventListener('open', onOpen);
                    this.socket.removeEventListener('error', onError);
                    reject(error);
                };
                
                this.socket.addEventListener('open', onOpen);
                this.socket.addEventListener('error', onError);
            });
            
        } catch (error) {
            console.error('WebSocket connection error:', error);
            return false;
        }
    }
    
    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.socket) {
            this.stopHeartbeat();
            this.socket.removeEventListener('open', this.handleOpen);
            this.socket.removeEventListener('message', this.handleMessage);
            this.socket.removeEventListener('close', this.handleClose);
            this.socket.removeEventListener('error', this.handleError);
            
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.close(1000, 'User disconnected');
            }
            
            this.socket = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.notifyConnectionListeners(false);
    }
    
    /**
     * Send message through WebSocket
     * @param {object} data - Data to send
     * @returns {boolean} - Success status
     */
    sendMessage(data) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not connected, cannot send message');
            return false;
        }
        
        try {
            this.socket.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
            return false;
        }
    }
    
    /**
     * Send chat message
     * @param {string} content - Message content
     * @param {string} roomCode - Room code
     * @param {string} username - Username
     * @returns {boolean} - Success status
     */
    sendChatMessage(content, roomCode, username) {
        return this.sendMessage({
            type: 'chat_message',
            content,
            roomCode,
            username,
            timestamp: Date.now(),
            id: generateId()
        });
    }
    
    /**
     * Send typing indicator
     * @param {boolean} isTyping - Whether user is typing
     * @param {string} roomCode - Room code
     * @param {string} username - Username
     * @returns {boolean} - Success status
     */
    sendTypingIndicator(isTyping, roomCode, username) {
        return this.sendMessage({
            type: 'typing',
            isTyping,
            roomCode,
            username,
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle WebSocket open event
     */
    handleOpen() {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.notifyConnectionListeners(true);
    }
    
    /**
     * Handle WebSocket message event
     * @param {MessageEvent} event - Message event
     */
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'chat_message':
                    this.notifyMessageListeners(data);
                    break;
                    
                case 'user_joined':
                case 'user_left':
                case 'user_list':
                    this.notifyUserListeners(data);
                    break;
                    
                case 'typing':
                    this.notifyTypingListeners(data);
                    break;
                    
                case 'room_joined':
                    console.log('Successfully joined room:', data.roomCode);
                    break;
                    
                case 'error':
                    console.error('Server error:', data.message);
                    showToast(data.message || 'Server error', 'error');
                    break;
                    
                case 'pong':
                    this.handlePong();
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
            
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }
    
    /**
     * Handle WebSocket close event
     * @param {CloseEvent} event - Close event
     */
    handleClose(event) {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        this.notifyConnectionListeners(false);
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
        }
    }
    
    /**
     * Handle WebSocket error event
     * @param {Event} event - Error event
     */
    handleError(event) {
        console.error('WebSocket error:', event);
        
        // If we can't connect initially, fall back to simulation mode
        if (!this.isConnected) {
            console.log('WebSocket connection failed, falling back to simulation mode');
            showToast('Real-time connection failed, using offline mode', 'info');
        }
    }
    
    /**
     * Attempt to reconnect
     */
    attemptReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
        
        setTimeout(() => {
            if (this.reconnectAttempts <= this.maxReconnectAttempts) {
                // Note: We'd need room and user info to reconnect properly
                // This would be handled by the ChatService
                console.log('Reconnection attempt...');
            }
        }, delay);
    }
    
    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.sendMessage({ type: 'ping', timestamp: Date.now() });
                
                // Set timeout for pong response
                this.heartbeatTimeout = setTimeout(() => {
                    console.warn('Heartbeat timeout, closing connection');
                    this.socket.close();
                }, this.config.heartbeatTimeout);
            }
        }, this.config.heartbeatInterval);
    }
    
    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }
    
    /**
     * Handle pong response
     */
    handlePong() {
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }
    
    /**
     * Check if WebSocket is supported
     * @returns {boolean} - True if WebSocket is supported
     */
    isSupported() {
        return typeof WebSocket !== 'undefined';
    }
    
    /**
     * Get connection status
     * @returns {boolean} - True if connected
     */
    getConnectionStatus() {
        return this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN;
    }
    
    // Event listener methods
    onMessage(callback) {
        this.messageListeners.push(callback);
    }
    
    onUserListChange(callback) {
        this.userListeners.push(callback);
    }
    
    onTyping(callback) {
        this.typingListeners.push(callback);
    }
    
    onConnectionChange(callback) {
        this.connectionListeners.push(callback);
    }
    
    // Notification methods
    notifyMessageListeners(data) {
        this.messageListeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in message listener:', error);
            }
        });
    }
    
    notifyUserListeners(data) {
        this.userListeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in user list listener:', error);
            }
        });
    }
    
    notifyTypingListeners(data) {
        this.typingListeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in typing listener:', error);
            }
        });
    }
    
    notifyConnectionListeners(isConnected) {
        this.connectionListeners.forEach(callback => {
            try {
                callback(isConnected);
            } catch (error) {
                console.error('Error in connection listener:', error);
            }
        });
    }
}

// Create global WebSocket service instance
const webSocketService = new WebSocketService();
