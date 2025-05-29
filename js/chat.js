// Chat Service for ChatRoom Application

class ChatService {
    constructor() {
        this.currentRoom = null;
        this.currentUser = null;
        this.messages = [];
        this.onlineUsers = new Set();
        this.typingUsers = new Set();
        this.isConnected = false;
        this.messageListeners = [];
        this.userListeners = [];
        this.typingListeners = [];

        // WebSocket integration
        this.useWebSocket = true;
        this.webSocketConnected = false;

        // Simulated network delay for realistic feel (fallback mode)
        this.networkDelay = 500;

        // Initialize event handlers
        this.initializeEventHandlers();

        // Setup WebSocket listeners if available
        this.setupWebSocketListeners();
    }

    /**
     * Initialize event handlers
     */
    initializeEventHandlers() {
        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleUserInactive();
            } else {
                this.handleUserActive();
            }
        });

        // Handle beforeunload
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });
    }

    /**
     * Setup WebSocket listeners
     */
    setupWebSocketListeners() {
        if (typeof webSocketService === 'undefined' || !webSocketService.isSupported()) {
            console.log('WebSocket not available, using simulation mode');
            this.useWebSocket = false;
            return;
        }

        // Listen for WebSocket events
        webSocketService.onMessage((data) => {
            this.handleWebSocketMessage(data);
        });

        webSocketService.onUserListChange((data) => {
            this.handleWebSocketUserChange(data);
        });

        webSocketService.onTyping((data) => {
            this.handleWebSocketTyping(data);
        });

        webSocketService.onConnectionChange((isConnected) => {
            this.webSocketConnected = isConnected;
            if (!isConnected && this.isConnected) {
                showToast('Connection lost, trying to reconnect...', 'info');
            } else if (isConnected && this.isConnected) {
                showToast('Reconnected successfully!', 'success');
            }
        });
    }

    /**
     * Connect to a room
     * @param {string} roomCode - Room code to join
     * @param {string} username - Username
     * @returns {Promise<boolean>} - Success status
     */
    async connect(roomCode, username) {
        try {
            showLoading('Connecting to room...');

            // Validate inputs
            if (!validateRoomCode(roomCode) || !validateUsername(username)) {
                throw new Error('Invalid room code or username');
            }

            this.currentRoom = roomCode.toUpperCase();
            this.currentUser = username.trim();

            // Try WebSocket connection first
            if (this.useWebSocket) {
                try {
                    const wsConnected = await webSocketService.connect(this.currentRoom, this.currentUser);
                    if (wsConnected) {
                        this.webSocketConnected = true;
                        console.log('Connected via WebSocket');
                    } else {
                        throw new Error('WebSocket connection failed');
                    }
                } catch (wsError) {
                    console.warn('WebSocket connection failed, falling back to simulation mode:', wsError);
                    this.useWebSocket = false;
                    this.webSocketConnected = false;
                    showToast('Using offline mode - messages won\'t sync with other users', 'info');
                }
            }

            // If WebSocket failed or not available, use simulation mode
            if (!this.useWebSocket) {
                await new Promise(resolve => setTimeout(resolve, this.networkDelay));
            }

            this.isConnected = true;

            // Load chat history from storage
            this.loadChatHistory();

            // Add user to online users
            this.onlineUsers.add(this.currentUser);

            // Save user data
            storage.setUserData({
                username: this.currentUser,
                currentRoom: this.currentRoom,
                joinedAt: Date.now()
            });

            // Add to recent rooms
            storage.addRecentRoom({
                code: this.currentRoom,
                username: this.currentUser
            });

            // Send join message (only locally if no WebSocket)
            if (!this.webSocketConnected) {
                this.addSystemMessage(`${this.currentUser} joined the room`);
                // Simulate other users being online
                this.simulateOnlineUsers();
            }

            hideLoading();
            return true;

        } catch (error) {
            hideLoading();
            console.error('Connection error:', error);
            showToast(error.message || 'Failed to connect to room', 'error');
            return false;
        }
    }

    /**
     * Disconnect from current room
     */
    disconnect() {
        if (!this.isConnected) return;

        // Disconnect WebSocket if connected
        if (this.webSocketConnected) {
            webSocketService.disconnect();
            this.webSocketConnected = false;
        }

        // Send leave message (only locally if no WebSocket)
        if (this.currentUser && this.currentRoom && !this.webSocketConnected) {
            this.addSystemMessage(`${this.currentUser} left the room`);
        }

        // Clear user data
        storage.setUserData({
            username: '',
            currentRoom: null,
            joinedAt: null
        });

        // Reset state
        this.currentRoom = null;
        this.currentUser = null;
        this.messages = [];
        this.onlineUsers.clear();
        this.typingUsers.clear();
        this.isConnected = false;

        // Notify listeners
        this.notifyUserListeners();
    }

    /**
     * Send a message
     * @param {string} content - Message content
     * @returns {Promise<boolean>} - Success status
     */
    async sendMessage(content) {
        if (!this.isConnected || !content.trim()) {
            return false;
        }

        try {
            const message = {
                id: generateId(),
                author: this.currentUser,
                content: content.trim(),
                timestamp: Date.now(),
                type: 'user',
                isOwn: true
            };

            // Send via WebSocket if connected
            if (this.webSocketConnected) {
                const sent = webSocketService.sendChatMessage(
                    message.content,
                    this.currentRoom,
                    this.currentUser
                );

                if (sent) {
                    // Add message locally for immediate feedback
                    this.addMessage(message);
                    // Save to storage
                    storage.saveMessage(this.currentRoom, message);
                    return true;
                } else {
                    throw new Error('Failed to send message via WebSocket');
                }
            } else {
                // Fallback to simulation mode
                // Add message locally first for immediate feedback
                this.addMessage(message);

                // Save to storage
                storage.saveMessage(this.currentRoom, message);

                // Simulate network delay for sending
                await new Promise(resolve => setTimeout(resolve, 200));

                // Simulate receiving responses from other users occasionally
                this.simulateIncomingMessages();

                return true;
            }

        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message', 'error');
            return false;
        }
    }

    /**
     * Add message to chat
     * @param {object} message - Message object
     */
    addMessage(message) {
        this.messages.push(message);
        this.notifyMessageListeners(message);

        // Play notification sound for incoming messages
        if (!message.isOwn && storage.getSettings().soundNotifications) {
            playNotificationSound();
        }
    }

    /**
     * Add system message
     * @param {string} content - System message content
     */
    addSystemMessage(content) {
        const message = {
            id: generateId(),
            author: 'System',
            content,
            timestamp: Date.now(),
            type: 'system',
            isOwn: false
        };

        this.addMessage(message);
        storage.saveMessage(this.currentRoom, message);
    }

    /**
     * Load chat history from storage
     */
    loadChatHistory() {
        if (!this.currentRoom) return;

        const history = storage.getChatHistory(this.currentRoom);
        this.messages = history.map(msg => ({
            ...msg,
            isOwn: msg.author === this.currentUser
        }));

        // Notify listeners about loaded messages
        this.messages.forEach(message => {
            this.notifyMessageListeners(message, false);
        });
    }

    /**
     * Start typing indicator
     */
    startTyping() {
        if (!this.isConnected) return;

        // Send typing indicator via WebSocket if connected
        if (this.webSocketConnected) {
            webSocketService.sendTypingIndicator(true, this.currentRoom, this.currentUser);
        } else {
            // Simulate other users seeing typing indicator
            setTimeout(() => {
                this.notifyTypingListeners(Array.from(this.typingUsers));
            }, 100);
        }
    }

    /**
     * Stop typing indicator
     */
    stopTyping() {
        if (!this.isConnected) return;

        // Send stop typing via WebSocket if connected
        if (this.webSocketConnected) {
            webSocketService.sendTypingIndicator(false, this.currentRoom, this.currentUser);
        } else {
            // Clear typing indicator after delay
            setTimeout(() => {
                this.notifyTypingListeners([]);
            }, 1000);
        }
    }

    /**
     * Simulate online users
     */
    simulateOnlineUsers() {
        const simulatedUsers = ['Alice', 'Bob', 'Charlie', 'Diana'];
        const randomCount = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < randomCount; i++) {
            const randomUser = simulatedUsers[Math.floor(Math.random() * simulatedUsers.length)];
            if (randomUser !== this.currentUser) {
                this.onlineUsers.add(randomUser);
            }
        }

        this.notifyUserListeners();
    }

    /**
     * Simulate incoming messages from other users
     */
    simulateIncomingMessages() {
        // 30% chance of getting a response
        if (Math.random() < 0.3) {
            const responses = [
                'That\'s interesting!',
                'I agree with you',
                'Thanks for sharing',
                'Good point!',
                'Exactly what I was thinking',
                'Nice!',
                'Cool stuff',
                'Makes sense'
            ];

            const users = Array.from(this.onlineUsers).filter(user => user !== this.currentUser);
            if (users.length > 0) {
                setTimeout(() => {
                    const randomUser = users[Math.floor(Math.random() * users.length)];
                    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

                    const message = {
                        id: generateId(),
                        author: randomUser,
                        content: randomResponse,
                        timestamp: Date.now(),
                        type: 'user',
                        isOwn: false
                    };

                    this.addMessage(message);
                    storage.saveMessage(this.currentRoom, message);
                }, Math.random() * 3000 + 1000);
            }
        }
    }

    /**
     * Handle user becoming inactive
     */
    handleUserInactive() {
        // Could implement away status here
    }

    /**
     * Handle user becoming active
     */
    handleUserActive() {
        // Could implement back status here
    }

    /**
     * Add message listener
     * @param {Function} callback - Callback function
     */
    onMessage(callback) {
        this.messageListeners.push(callback);
    }

    /**
     * Add user list listener
     * @param {Function} callback - Callback function
     */
    onUserListChange(callback) {
        this.userListeners.push(callback);
    }

    /**
     * Add typing listener
     * @param {Function} callback - Callback function
     */
    onTyping(callback) {
        this.typingListeners.push(callback);
    }

    /**
     * Notify message listeners
     * @param {object} message - Message object
     * @param {boolean} playSound - Whether to play notification sound
     */
    notifyMessageListeners(message, playSound = true) {
        this.messageListeners.forEach(callback => {
            try {
                callback(message);
            } catch (error) {
                console.error('Error in message listener:', error);
            }
        });
    }

    /**
     * Notify user list listeners
     */
    notifyUserListeners() {
        const userList = Array.from(this.onlineUsers);
        this.userListeners.forEach(callback => {
            try {
                callback(userList);
            } catch (error) {
                console.error('Error in user list listener:', error);
            }
        });
    }

    /**
     * Notify typing listeners
     * @param {Array} typingUsers - Array of users currently typing
     */
    notifyTypingListeners(typingUsers) {
        this.typingListeners.forEach(callback => {
            try {
                callback(typingUsers);
            } catch (error) {
                console.error('Error in typing listener:', error);
            }
        });
    }

    /**
     * Get current room info
     * @returns {object} - Room information
     */
    getRoomInfo() {
        return {
            code: this.currentRoom,
            user: this.currentUser,
            onlineCount: this.onlineUsers.size,
            messageCount: this.messages.length,
            isConnected: this.isConnected
        };
    }

    /**
     * Get online users
     * @returns {Array} - Array of online usernames
     */
    getOnlineUsers() {
        return Array.from(this.onlineUsers);
    }

    /**
     * Clear chat history
     */
    clearHistory() {
        if (this.currentRoom) {
            storage.clearChatHistory(this.currentRoom);
            this.messages = [];
            showToast('Chat history cleared', 'info');
        }
    }

    /**
     * Handle WebSocket message events
     * @param {object} data - Message data from WebSocket
     */
    handleWebSocketMessage(data) {
        // Don't show our own messages again
        if (data.username === this.currentUser) return;

        const message = {
            id: data.id || generateId(),
            author: data.username,
            content: data.content,
            timestamp: data.timestamp,
            type: 'user',
            isOwn: false
        };

        this.addMessage(message);
        storage.saveMessage(this.currentRoom, message);
    }

    /**
     * Handle WebSocket user list changes
     * @param {object} data - User data from WebSocket
     */
    handleWebSocketUserChange(data) {
        switch (data.type) {
            case 'user_joined':
                if (data.username !== this.currentUser) {
                    this.onlineUsers.add(data.username);
                    this.addSystemMessage(`${data.username} joined the room`);
                }
                break;

            case 'user_left':
                if (data.username !== this.currentUser) {
                    this.onlineUsers.delete(data.username);
                    this.addSystemMessage(`${data.username} left the room`);
                }
                break;

            case 'user_list':
                // Update the complete user list
                this.onlineUsers.clear();
                if (data.users && Array.isArray(data.users)) {
                    data.users.forEach(username => {
                        this.onlineUsers.add(username);
                    });
                }
                break;
        }

        this.notifyUserListeners();
    }

    /**
     * Handle WebSocket typing events
     * @param {object} data - Typing data from WebSocket
     */
    handleWebSocketTyping(data) {
        // Don't show our own typing indicator
        if (data.username === this.currentUser) return;

        if (data.isTyping) {
            this.typingUsers.add(data.username);
        } else {
            this.typingUsers.delete(data.username);
        }

        this.notifyTypingListeners(Array.from(this.typingUsers));
    }
}

// Create global chat service instance
const chatService = new ChatService();
