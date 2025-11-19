#!/bin/bash
# Development startup script
# Starts both backend and frontend dev servers

echo "Starting AI Fitness Tracker Development Environment"
echo "=================================================="
echo ""

# Start backend in background
echo "Starting Flask backend server..."
cd backend
python server.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend dev server
echo "Starting Vite frontend dev server..."
cd frontend/frontend
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "✓ Both servers started!"
echo "  Backend API: http://localhost:5000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait

