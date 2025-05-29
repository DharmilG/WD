// Main Application Logic for ChatRoom

class ChatApp {
    constructor() {
        this.currentPage = 'home';
        this.pages = ['home', 'join', 'create', 'chat', 'settings'];
        this.isInitialized = false;
        
        // Bind methods
        this.navigate = this.navigate.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleUserListChange = this.handleUserListChange.bind(this);
        this.handleTyping = this.handleTyping.bind(this);
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    /**
     * Initialize the application
     */
    initialize() {
        if (this.isInitialized) return;
        
        console.log('Initializing ChatRoom App...');
        
        // Apply saved settings
        this.applySettings();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup chat service listeners
        this.setupChatListeners();
        
        // Initialize routing
        this.initializeRouting();
        
        // Check if user was in a room
        this.checkExistingSession();
        
        this.isInitialized = true;
        console.log('ChatRoom App initialized successfully');
    }
    
    /**
     * Apply saved settings
     */
    applySettings() {
        const settings = storage.getSettings();
        if (!settings) return;
        
        // Apply dark mode
        if (settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            const darkModeToggle = document.getElementById('darkMode');
            if (darkModeToggle) darkModeToggle.checked = true;
        }
        
        // Apply sound notifications setting
        const soundToggle = document.getElementById('soundNotifications');
        if (soundToggle) {
            soundToggle.checked = settings.soundNotifications !== false;
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation events
        document.getElementById('joinRoomCard')?.addEventListener('click', () => this.navigate('join'));
        document.getElementById('createRoomCard')?.addEventListener('click', () => this.navigate('create'));
        document.getElementById('backToHome')?.addEventListener('click', () => this.navigate('home'));
        document.getElementById('backToHomeFromCreate')?.addEventListener('click', () => this.navigate('home'));
        document.getElementById('backToChatFromSettings')?.addEventListener('click', () => this.navigate('chat'));
        
        // Navbar events
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.navigate('settings'));
        document.getElementById('leaveRoomBtn')?.addEventListener('click', () => this.leaveRoom());
        
        // Form events
        document.getElementById('joinForm')?.addEventListener('submit', (e) => this.handleJoinForm(e));
        document.getElementById('createForm')?.addEventListener('submit', (e) => this.handleCreateForm(e));
        document.getElementById('messageForm')?.addEventListener('submit', (e) => this.handleMessageForm(e));
        
        // Room code generation and copying
        document.getElementById('copyRoomCode')?.addEventListener('click', () => this.copyRoomCode());
        
        // Settings events
        document.getElementById('darkMode')?.addEventListener('change', (e) => this.toggleDarkMode(e.target.checked));
        document.getElementById('soundNotifications')?.addEventListener('change', (e) => this.toggleSoundNotifications(e.target.checked));
        
        // Message input events
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', () => this.handleMessageInput());
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleMessageForm(e);
                }
            });
        }
        
        // Room code input formatting
        const roomCodeInput = document.getElementById('roomCode');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
        }
        
        // Generate new room code on page load
        this.generateNewRoomCode();
    }
    
    /**
     * Setup chat service listeners
     */
    setupChatListeners() {
        chatService.onMessage(this.handleMessage);
        chatService.onUserListChange(this.handleUserListChange);
        chatService.onTyping(this.handleTyping);
    }
    
    /**
     * Initialize routing
     */
    initializeRouting() {
        // Show home page by default
        this.navigate('home');
    }
    
    /**
     * Check for existing session
     */
    checkExistingSession() {
        const userData = storage.getUserData();
        if (userData && userData.currentRoom && userData.username) {
            // User was in a room, ask if they want to rejoin
            const rejoin = confirm(`You were previously in room ${userData.currentRoom}. Would you like to rejoin?`);
            if (rejoin) {
                this.rejoinRoom(userData.currentRoom, userData.username);
            } else {
                // Clear the session
                storage.setUserData({ username: '', currentRoom: null, joinedAt: null });
            }
        }
    }
    
    /**
     * Navigate to a page
     * @param {string} pageName - Name of the page to navigate to
     */
    navigate(pageName) {
        if (!this.pages.includes(pageName)) {
            console.error('Invalid page:', pageName);
            return;
        }
        
        // Hide all pages
        this.pages.forEach(page => {
            const pageElement = document.getElementById(`${page}-page`);
            if (pageElement) {
                pageElement.classList.remove('active');
            }
        });
        
        // Show target page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // Update navbar visibility
        const navbar = document.getElementById('navbar');
        if (navbar) {
            if (pageName === 'chat' || pageName === 'settings') {
                navbar.classList.remove('hidden');
            } else {
                navbar.classList.add('hidden');
            }
        }
        
        this.currentPage = pageName;
        
        // Page-specific actions
        if (pageName === 'create') {
            this.generateNewRoomCode();
        } else if (pageName === 'chat') {
            this.focusMessageInput();
        }
    }
    
    /**
     * Handle join form submission
     * @param {Event} e - Form submit event
     */
    async handleJoinForm(e) {
        e.preventDefault();
        
        const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
        const username = document.getElementById('username').value.trim();
        
        if (!validateRoomCode(roomCode)) {
            showToast('Please enter a valid 6-character room code', 'error');
            return;
        }
        
        if (!validateUsername(username)) {
            showToast('Please enter a valid username (1-20 characters)', 'error');
            return;
        }
        
        const success = await chatService.connect(roomCode, username);
        if (success) {
            this.navigate('chat');
            this.updateChatHeader();
            showToast(`Joined room ${roomCode}`, 'success');
        }
    }
    
    /**
     * Handle create form submission
     * @param {Event} e - Form submit event
     */
    async handleCreateForm(e) {
        e.preventDefault();
        
        const roomCode = document.getElementById('generatedRoomCode').textContent;
        const username = document.getElementById('creatorUsername').value.trim();
        
        if (!validateUsername(username)) {
            showToast('Please enter a valid username (1-20 characters)', 'error');
            return;
        }
        
        const success = await chatService.connect(roomCode, username);
        if (success) {
            this.navigate('chat');
            this.updateChatHeader();
            showToast(`Created room ${roomCode}`, 'success');
        }
    }
    
    /**
     * Handle message form submission
     * @param {Event} e - Form submit event
     */
    async handleMessageForm(e) {
        e.preventDefault();
        
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content) return;
        
        const success = await chatService.sendMessage(content);
        if (success) {
            messageInput.value = '';
            this.updateSendButton();
            chatService.stopTyping();
        }
    }
    
    /**
     * Handle message input changes
     */
    handleMessageInput() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.querySelector('.send-btn');
        
        if (messageInput && sendBtn) {
            const hasContent = messageInput.value.trim().length > 0;
            sendBtn.disabled = !hasContent;
            
            if (hasContent) {
                chatService.startTyping();
            } else {
                chatService.stopTyping();
            }
        }
    }
    
    /**
     * Update send button state
     */
    updateSendButton() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.querySelector('.send-btn');
        
        if (messageInput && sendBtn) {
            sendBtn.disabled = messageInput.value.trim().length === 0;
        }
    }
    
    /**
     * Handle incoming messages
     * @param {object} message - Message object
     */
    handleMessage(message) {
        this.addMessageToUI(message);
        this.scrollToBottom();
    }
    
    /**
     * Handle user list changes
     * @param {Array} users - Array of online users
     */
    handleUserListChange(users) {
        this.updateOnlineCount(users.length);
    }
    
    /**
     * Handle typing indicators
     * @param {Array} typingUsers - Array of users currently typing
     */
    handleTyping(typingUsers) {
        this.updateTypingIndicator(typingUsers);
    }
    
    /**
     * Add message to UI
     * @param {object} message - Message object
     */
    addMessageToUI(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.isOwn ? 'own' : 'other'} ${message.type}`;
        
        if (message.type === 'system') {
            messageElement.innerHTML = `
                <div class="message-content">${escapeHTML(message.content)}</div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-author">${escapeHTML(message.author)}</span>
                    <span class="message-time">${formatMessageTime(message.timestamp)}</span>
                </div>
                <div class="message-content">${escapeHTML(message.content)}</div>
            `;
        }
        
        messagesContainer.appendChild(messageElement);
    }
    
    /**
     * Scroll messages to bottom
     */
    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    /**
     * Update chat header
     */
    updateChatHeader() {
        const roomInfo = chatService.getRoomInfo();
        const roomCodeElement = document.getElementById('currentRoomCode');
        
        if (roomCodeElement && roomInfo.code) {
            roomCodeElement.textContent = roomInfo.code;
        }
        
        this.updateOnlineCount(roomInfo.onlineCount);
    }
    
    /**
     * Update online count
     * @param {number} count - Number of online users
     */
    updateOnlineCount(count) {
        const onlineCountElement = document.getElementById('onlineCount');
        if (onlineCountElement) {
            onlineCountElement.innerHTML = `
                <i class="fas fa-circle online-indicator"></i>
                ${count} online
            `;
        }
    }
    
    /**
     * Update typing indicator
     * @param {Array} typingUsers - Array of users currently typing
     */
    updateTypingIndicator(typingUsers) {
        const typingIndicator = document.getElementById('typingIndicator');
        if (!typingIndicator) return;
        
        if (typingUsers.length > 0) {
            const typingText = typingUsers.length === 1 
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people are typing...`;
            
            typingIndicator.querySelector('.typing-text').textContent = typingText;
            typingIndicator.classList.remove('hidden');
        } else {
            typingIndicator.classList.add('hidden');
        }
    }
    
    /**
     * Generate new room code
     */
    generateNewRoomCode() {
        const roomCodeElement = document.getElementById('generatedRoomCode');
        if (roomCodeElement) {
            roomCodeElement.textContent = generateRoomCode();
        }
    }
    
    /**
     * Copy room code to clipboard
     */
    async copyRoomCode() {
        const roomCode = document.getElementById('generatedRoomCode').textContent;
        const success = await copyToClipboard(roomCode);
        
        if (success) {
            showToast('Room code copied to clipboard!', 'success');
        } else {
            showToast('Failed to copy room code', 'error');
        }
    }
    
    /**
     * Focus message input
     */
    focusMessageInput() {
        setTimeout(() => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.focus();
            }
        }, 100);
    }
    
    /**
     * Leave current room
     */
    leaveRoom() {
        const confirmLeave = confirm('Are you sure you want to leave this room?');
        if (confirmLeave) {
            chatService.disconnect();
            this.clearChatUI();
            this.navigate('home');
            showToast('Left the room', 'info');
        }
    }
    
    /**
     * Rejoin a room
     * @param {string} roomCode - Room code
     * @param {string} username - Username
     */
    async rejoinRoom(roomCode, username) {
        const success = await chatService.connect(roomCode, username);
        if (success) {
            this.navigate('chat');
            this.updateChatHeader();
            showToast(`Rejoined room ${roomCode}`, 'success');
        }
    }
    
    /**
     * Clear chat UI
     */
    clearChatUI() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = '';
        }
        
        this.updateSendButton();
    }
    
    /**
     * Toggle dark mode
     * @param {boolean} enabled - Whether dark mode is enabled
     */
    toggleDarkMode(enabled) {
        if (enabled) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        storage.updateSetting('darkMode', enabled);
        showToast(`Dark mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Toggle sound notifications
     * @param {boolean} enabled - Whether sound notifications are enabled
     */
    toggleSoundNotifications(enabled) {
        storage.updateSetting('soundNotifications', enabled);
        showToast(`Sound notifications ${enabled ? 'enabled' : 'disabled'}`, 'info');
    }
}

// Initialize the application
const app = new ChatApp();
