"""
Helper script to build the React frontend before running the server
"""
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / 'frontend' / 'frontend'

def build_frontend():
    """Build the React frontend using npm"""
    print("Building React frontend...")
    print(f"Frontend directory: {FRONTEND_DIR}")
    
    if not FRONTEND_DIR.exists():
        print(f"ERROR: Frontend directory not found at {FRONTEND_DIR}")
        sys.exit(1)
    
    # Check if node_modules exists
    if not (FRONTEND_DIR / 'node_modules').exists():
        print("Installing dependencies...")
        result = subprocess.run(['npm', 'install'], cwd=str(FRONTEND_DIR))
        if result.returncode != 0:
            print("ERROR: Failed to install dependencies")
            sys.exit(1)
    
    # Build the frontend
    print("Running build...")
    result = subprocess.run(['npm', 'run', 'build'], cwd=str(FRONTEND_DIR))
    
    if result.returncode != 0:
        print("ERROR: Build failed")
        sys.exit(1)
    
    print("✓ Frontend built successfully!")
    print(f"Build output: {FRONTEND_DIR / 'dist'}")

if __name__ == '__main__':
    build_frontend()

