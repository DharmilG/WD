// Local Storage Service for ChatRoom Application

class StorageService {
    constructor() {
        this.prefix = 'chatroom_';
        this.keys = {
            USER_PREFERENCES: 'user_preferences',
            RECENT_ROOMS: 'recent_rooms',
            USER_DATA: 'user_data',
            CHAT_HISTORY: 'chat_history',
            SETTINGS: 'settings'
        };
        
        // Initialize default settings
        this.initializeDefaults();
    }
    
    /**
     * Initialize default settings if they don't exist
     */
    initializeDefaults() {
        const defaultSettings = {
            darkMode: false,
            soundNotifications: true,
            username: '',
            lastRoomCode: ''
        };
        
        if (!this.getSettings()) {
            this.setSettings(defaultSettings);
        }
    }
    
    /**
     * Get full key with prefix
     * @param {string} key - Key name
     * @returns {string} - Full key with prefix
     */
    getKey(key) {
        return this.prefix + key;
    }
    
    /**
     * Set item in localStorage
     * @param {string} key - Key name
     * @param {any} value - Value to store
     * @returns {boolean} - Success status
     */
    setItem(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(this.getKey(key), serializedValue);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }
    
    /**
     * Get item from localStorage
     * @param {string} key - Key name
     * @param {any} defaultValue - Default value if key doesn't exist
     * @returns {any} - Retrieved value or default
     */
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.getKey(key));
            if (item === null) return defaultValue;
            return JSON.parse(item);
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }
    
    /**
     * Remove item from localStorage
     * @param {string} key - Key name
     * @returns {boolean} - Success status
     */
    removeItem(key) {
        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }
    
    /**
     * Clear all app data from localStorage
     * @returns {boolean} - Success status
     */
    clearAll() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            this.initializeDefaults();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
    
    /**
     * Get user settings
     * @returns {object} - User settings object
     */
    getSettings() {
        return this.getItem(this.keys.SETTINGS);
    }
    
    /**
     * Set user settings
     * @param {object} settings - Settings object
     * @returns {boolean} - Success status
     */
    setSettings(settings) {
        return this.setItem(this.keys.SETTINGS, settings);
    }
    
    /**
     * Update specific setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @returns {boolean} - Success status
     */
    updateSetting(key, value) {
        const settings = this.getSettings() || {};
        settings[key] = value;
        return this.setSettings(settings);
    }
    
    /**
     * Get user data
     * @returns {object} - User data object
     */
    getUserData() {
        return this.getItem(this.keys.USER_DATA, {
            username: '',
            currentRoom: null,
            joinedAt: null
        });
    }
    
    /**
     * Set user data
     * @param {object} userData - User data object
     * @returns {boolean} - Success status
     */
    setUserData(userData) {
        return this.setItem(this.keys.USER_DATA, userData);
    }
    
    /**
     * Get recent rooms
     * @returns {Array} - Array of recent room objects
     */
    getRecentRooms() {
        return this.getItem(this.keys.RECENT_ROOMS, []);
    }
    
    /**
     * Add room to recent rooms
     * @param {object} roomData - Room data object
     * @returns {boolean} - Success status
     */
    addRecentRoom(roomData) {
        const recentRooms = this.getRecentRooms();
        
        // Remove existing entry if it exists
        const existingIndex = recentRooms.findIndex(room => room.code === roomData.code);
        if (existingIndex !== -1) {
            recentRooms.splice(existingIndex, 1);
        }
        
        // Add to beginning of array
        recentRooms.unshift({
            code: roomData.code,
            name: roomData.name || `Room ${roomData.code}`,
            lastJoined: Date.now(),
            username: roomData.username
        });
        
        // Keep only last 10 rooms
        if (recentRooms.length > 10) {
            recentRooms.splice(10);
        }
        
        return this.setItem(this.keys.RECENT_ROOMS, recentRooms);
    }
    
    /**
     * Remove room from recent rooms
     * @param {string} roomCode - Room code to remove
     * @returns {boolean} - Success status
     */
    removeRecentRoom(roomCode) {
        const recentRooms = this.getRecentRooms();
        const filteredRooms = recentRooms.filter(room => room.code !== roomCode);
        return this.setItem(this.keys.RECENT_ROOMS, filteredRooms);
    }
    
    /**
     * Get chat history for a room
     * @param {string} roomCode - Room code
     * @returns {Array} - Array of message objects
     */
    getChatHistory(roomCode) {
        const allHistory = this.getItem(this.keys.CHAT_HISTORY, {});
        return allHistory[roomCode] || [];
    }
    
    /**
     * Save message to chat history
     * @param {string} roomCode - Room code
     * @param {object} message - Message object
     * @returns {boolean} - Success status
     */
    saveMessage(roomCode, message) {
        const allHistory = this.getItem(this.keys.CHAT_HISTORY, {});
        
        if (!allHistory[roomCode]) {
            allHistory[roomCode] = [];
        }
        
        allHistory[roomCode].push({
            id: message.id || generateId(),
            author: message.author,
            content: message.content,
            timestamp: message.timestamp || Date.now(),
            type: message.type || 'user'
        });
        
        // Keep only last 100 messages per room
        if (allHistory[roomCode].length > 100) {
            allHistory[roomCode] = allHistory[roomCode].slice(-100);
        }
        
        return this.setItem(this.keys.CHAT_HISTORY, allHistory);
    }
    
    /**
     * Clear chat history for a room
     * @param {string} roomCode - Room code
     * @returns {boolean} - Success status
     */
    clearChatHistory(roomCode) {
        const allHistory = this.getItem(this.keys.CHAT_HISTORY, {});
        delete allHistory[roomCode];
        return this.setItem(this.keys.CHAT_HISTORY, allHistory);
    }
    
    /**
     * Get storage usage information
     * @returns {object} - Storage usage stats
     */
    getStorageInfo() {
        try {
            let totalSize = 0;
            let itemCount = 0;
            
            for (let key in localStorage) {
                if (key.startsWith(this.prefix)) {
                    totalSize += localStorage[key].length;
                    itemCount++;
                }
            }
            
            return {
                totalSize,
                itemCount,
                totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
                isQuotaExceeded: false
            };
        } catch (error) {
            return {
                totalSize: 0,
                itemCount: 0,
                totalSizeKB: 0,
                isQuotaExceeded: true,
                error: error.message
            };
        }
    }
    
    /**
     * Export all data
     * @returns {object} - All stored data
     */
    exportData() {
        const data = {};
        
        Object.values(this.keys).forEach(key => {
            data[key] = this.getItem(key);
        });
        
        return {
            version: '1.0',
            timestamp: Date.now(),
            data
        };
    }
    
    /**
     * Import data
     * @param {object} importData - Data to import
     * @returns {boolean} - Success status
     */
    importData(importData) {
        try {
            if (!importData.data) {
                throw new Error('Invalid import data format');
            }
            
            Object.entries(importData.data).forEach(([key, value]) => {
                if (Object.values(this.keys).includes(key)) {
                    this.setItem(key, value);
                }
            });
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
    
    /**
     * Check if localStorage is available
     * @returns {boolean} - True if localStorage is available
     */
    isAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create global instance
const storage = new StorageService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
}
