#!/usr/bin/env python3
"""
Main entry point for running the Flask server
Optionally builds the frontend first
"""
import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / 'frontend' / 'frontend'
FRONTEND_BUILD_DIR = FRONTEND_DIR / 'dist'

def main():
    """Run the server, optionally building frontend first"""
    build_frontend = '--build' in sys.argv or '-b' in sys.argv
    
    if build_frontend:
        print("Building frontend...")
        if not (FRONTEND_DIR / 'node_modules').exists():
            print("Installing dependencies...")
            subprocess.run(['npm', 'install'], cwd=str(FRONTEND_DIR))
        
        result = subprocess.run(['npm', 'run', 'build'], cwd=str(FRONTEND_DIR))
        if result.returncode != 0:
            print("ERROR: Frontend build failed!")
            sys.exit(1)
        print("✓ Frontend built successfully\n")
    
    # Import and run the server
    from server import app, socketio
    print("Starting Flask server...\n")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

if __name__ == '__main__':
    main()

