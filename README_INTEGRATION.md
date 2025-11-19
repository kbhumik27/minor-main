# Frontend-Backend Integration Guide

This guide explains how to integrate and run the React frontend with the Python Flask backend.

## 🚀 Quick Start

### Option 1: Development Mode (Recommended for Development)

**Run Frontend and Backend Separately:**

1. **Start Backend Server:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python server.py
   ```
   Backend will run on `http://localhost:5000`

2. **Start Frontend Dev Server:**
   ```bash
   cd frontend/frontend
   npm install
   npm run dev
   ```
   Frontend will run on `http://localhost:5173` (Vite dev server)
   
   The Vite config is already set up to proxy `/api` requests to `http://localhost:5000`

3. **Access the Dashboard:**
   - Open `http://localhost:5173` in your browser
   - The frontend will automatically connect to the backend API

### Option 2: Production Mode (Single Server)

**Build and Serve Everything from Flask:**

1. **Build the Frontend:**
   ```bash
   cd frontend/frontend
   npm install
   npm run build
   ```
   This creates a `dist` folder with the production build.

2. **Start the Backend Server:**
   ```bash
   cd backend
   python server.py
   ```
   The server will automatically detect the build and serve it.

3. **Access the Dashboard:**
   - Open `http://localhost:5000` in your browser
   - Both frontend and API are served from the same port

## 📁 Project Structure

```
project/
├── backend/
│   ├── server.py              # Flask server with API endpoints
│   ├── build_frontend.py      # Helper script to build frontend
│   └── requirements.txt      # Python dependencies
│
└── frontend/frontend/
    ├── src/                   # React source code
    │   ├── components/        # React components
    │   ├── hooks/            # Custom hooks (useSocket)
    │   ├── services/         # API service layer
    │   └── types/            # TypeScript types
    ├── dist/                  # Production build (created by npm run build)
    └── package.json          # Frontend dependencies
```

## 🔌 API Integration

The frontend communicates with the backend through:

1. **REST API Endpoints** (via `src/services/api.ts`):
   - `GET /api/status` - System status
   - `GET /api/sensor_data` - Current sensor data
   - `POST /api/connect_esp32` - Connect to ESP32
   - `POST /api/disconnect_esp32` - Disconnect
   - `POST /api/reset_reps` - Reset rep counter
   - `POST /api/set_exercise` - Set exercise type
   - `POST /api/start_logging` - Start data logging
   - `POST /api/stop_logging` - Stop and save logs

2. **WebSocket Connection** (via `src/hooks/useSocket.ts`):
   - Real-time sensor data: `socket.io` events
   - Event: `sensor_data` - Receives live sensor updates
   - Event: `esp32_status` - Connection status updates

## 🛠️ Configuration

### Frontend API Base URL

The frontend is configured to use:
- **Development:** `http://localhost:5000` (via Vite proxy)
- **Production:** Relative URLs (same origin as Flask server)

To change the API URL, edit `frontend/frontend/src/services/api.ts`:
```typescript
const API_URL = 'http://localhost:5000';  // Change this
```

### CORS Configuration

The backend has CORS enabled for all origins. For production, you may want to restrict this in `backend/server.py`:
```python
CORS(app, origins=["http://your-domain.com"])
```

## 📦 Building for Production

### Automated Build Script

Use the helper script:
```bash
python backend/build_frontend.py
```

Or manually:
```bash
cd frontend/frontend
npm run build
```

### Deploying

1. Build the frontend: `npm run build`
2. Start the Flask server: `python server.py`
3. The server will serve both the API and the static frontend files

## 🐛 Troubleshooting

### Frontend can't connect to backend

- Ensure backend is running on port 5000
- Check CORS settings in `server.py`
- Verify API_URL in `frontend/frontend/src/services/api.ts`

### Socket.io connection fails

- Ensure Flask-SocketIO is installed: `pip install flask-socketio`
- Check WebSocket events in browser console
- Verify `cors_allowed_origins="*"` in server.py

### Frontend not served by Flask

- Ensure you've run `npm run build` in `frontend/frontend`
- Check that `dist` folder exists
- Server will show "DEVELOPMENT MODE" if build is missing

### Port conflicts

- Backend uses port 5000 (change in `server.py`)
- Frontend dev server uses port 5173 (change in `vite.config.ts`)

## 🔄 Development Workflow

1. **Make changes to frontend:**
   - Files auto-reload in dev mode
   - Test at `http://localhost:5173`

2. **Make changes to backend:**
   - Restart `python server.py`
   - API changes are immediately available

3. **Build for production:**
   - Run `npm run build`
   - Test at `http://localhost:5000`

## 📝 Notes

- The backend automatically detects if the frontend build exists
- In development mode, use the Vite dev server for hot reloading
- In production mode, Flask serves the built static files
- All API routes are prefixed with `/api/` to avoid conflicts with frontend routes

