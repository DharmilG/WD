# 🚀 Deployment Guide

## Vercel Deployment (Recommended)

Your ChatRoom application is now fully configured for Vercel deployment with `npm run build` support.

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? `Y`
   - Which scope? Choose your account
   - Link to existing project? `N` (for first deployment)
   - What's your project's name? `chatroom-app` (or your preferred name)
   - In which directory is your code located? `./`

### Option 2: Deploy via GitHub Integration

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Vercel build configuration"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the configuration

### Build Configuration

The project includes:
- ✅ `package.json` with build scripts
- ✅ `vercel.json` with deployment configuration
- ✅ Automatic build command: `npm run build`
- ✅ Output directory: `dist`
- ✅ Static file serving with proper headers

### Environment Variables (Optional)

If you want to configure a production WebSocket server:

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Add environment variable: `WEBSOCKET_URL`
   - Value: `wss://your-websocket-server.com/ws`

2. **Update the code:**
   ```javascript
   // In js/websocket-service.js, modify getWebSocketUrl()
   getWebSocketUrl() {
       // ... existing code ...
       
       // For production with environment variable
       if (process.env.WEBSOCKET_URL) {
           return process.env.WEBSOCKET_URL;
       }
       
       // ... rest of the code ...
   }
   ```

## Alternative Deployment Options

### Netlify
1. Connect your GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`

### GitHub Pages
1. Enable GitHub Pages in repository settings
2. Use GitHub Actions for automatic deployment:
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [ main ]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - uses: actions/setup-node@v2
           with:
             node-version: '16'
         - run: npm install
         - run: npm run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

### Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize: `firebase init hosting`
3. Set public directory to `dist`
4. Build: `npm run build`
5. Deploy: `firebase deploy`

## WebSocket Server Deployment

Since Vercel doesn't support WebSocket servers, deploy the server separately:

### Railway
1. Create account at [railway.app](https://railway.app)
2. Connect GitHub repository
3. Deploy the `server` folder
4. Update WebSocket URL in your frontend

### Render
1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Set build command: `cd server && npm install`
5. Set start command: `cd server && npm start`

### Heroku
1. Create Heroku app
2. Add buildpack: `heroku/nodejs`
3. Set environment variables if needed
4. Deploy with Git

## Testing Your Deployment

1. **Build locally first:**
   ```bash
   npm run build
   npm run serve
   ```

2. **Test all features:**
   - ✅ Home page loads
   - ✅ Create room works
   - ✅ Join room works
   - ✅ Chat functionality (offline mode)
   - ✅ Settings page
   - ✅ Dark mode toggle

3. **Check browser console:**
   - No JavaScript errors
   - WebSocket connection attempts (will fail gracefully)
   - Fallback to offline mode

## Troubleshooting

### Build Fails
- Check Node.js version (requires 16+)
- Run `npm install` to ensure dependencies are installed
- Check for any syntax errors in JavaScript files

### Assets Not Loading
- Verify `dist` folder structure matches original
- Check that all files are copied correctly
- Ensure no hardcoded localhost URLs

### WebSocket Issues
- Remember: Vercel doesn't support WebSocket servers
- App gracefully falls back to offline mode
- Deploy WebSocket server separately if real-time features needed

## Performance Optimization

The build includes:
- ✅ Static file caching headers
- ✅ Security headers
- ✅ Optimized asset serving
- ✅ Minimal bundle size (vanilla JS)

Your ChatRoom app is now ready for production deployment! 🎉
