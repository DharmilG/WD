# ChatRoom - No Phone Required 💬

A simple, no-registration chat application with real-time WebSocket support and offline fallback mode.

## 🚀 Features

- **No Registration Required**: Join rooms with just a room code and username
- **Real-Time Messaging**: WebSocket support for instant communication
- **Offline Mode**: Works without internet connection using simulation
- **Room-Based Chat**: Create or join rooms with 6-character codes
- **Modern UI**: Clean, responsive design with dark mode support
- **SPA Navigation**: Single-page application without browser reloads

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js WebSocket server (optional)
- **Deployment**: Vercel-ready with build scripts

## 📦 Quick Start

### Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd chatroom-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Production Build

```bash
npm run build
```

This creates a `dist/` folder with all static files ready for deployment.

## 🌐 Deployment

### Deploy to Vercel

1. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

   Or connect your GitHub repository to Vercel for automatic deployments.

### Deploy to Other Platforms

The build output in `dist/` folder can be deployed to any static hosting service:
- Netlify
- GitHub Pages
- Firebase Hosting
- AWS S3
- Any web server

## 🔌 WebSocket Server (Optional)

For real-time functionality, you can run the WebSocket server:

### Local Development
```bash
cd server
npm install
npm start
```

### Production WebSocket Server

Since Vercel doesn't support WebSocket servers, you can deploy the server to:
- **Railway**: `railway deploy`
- **Render**: Connect GitHub repo
- **Heroku**: `git push heroku main`
- **DigitalOcean App Platform**

Then update `js/websocket-service.js` with your production WebSocket URL:

```javascript
// In getWebSocketUrl() method
return 'wss://your-websocket-server.herokuapp.com/ws';
```

## 📁 Project Structure

```
chatroom-app/
├── css/
│   └── styles.css          # Main stylesheet
├── js/
│   ├── app.js             # Main application logic
│   ├── chat.js            # Chat functionality
│   ├── storage.js         # Local storage service
│   ├── utils.js           # Utility functions
│   └── websocket-service.js # WebSocket client
├── server/
│   ├── websocket-server.js # Node.js WebSocket server
│   └── package.json       # Server dependencies
├── index.html             # Main HTML file
├── package.json           # Build dependencies
├── vercel.json           # Vercel configuration
└── README.md             # This file
```

## 🎯 Available Scripts

- `npm run build` - Build the project for production
- `npm run dev` - Build and serve locally
- `npm run clean` - Clean build directory
- `npm run serve` - Serve the built files
- `npm start` - Alias for serve

## 🔧 Configuration

### Vercel Configuration

The `vercel.json` file configures:
- Build command: `npm run build`
- Output directory: `dist`
- Static file serving
- Security headers
- Cache headers for assets

### WebSocket Configuration

Edit `js/websocket-service.js` to configure:
- WebSocket server URL
- Reconnection settings
- Heartbeat intervals

## 🌟 Features in Detail

### Hybrid Architecture
- **Online Mode**: Real-time with WebSocket server
- **Offline Mode**: Simulation when server unavailable
- **Automatic Fallback**: Seamless switching between modes

### Room Management
- 6-character room codes (letters and numbers)
- Create new rooms or join existing ones
- Room isolation (messages only to room members)

### User Experience
- Typing indicators
- Online user count
- Connection status
- Toast notifications
- Dark/light theme toggle

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

If you encounter any issues:
1. Check the browser console for errors
2. Ensure all dependencies are installed
3. Verify the build completed successfully
4. Check network connectivity for WebSocket features

For WebSocket issues in production, remember that the app gracefully falls back to offline mode if the WebSocket server is unavailable.
