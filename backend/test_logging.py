"""
Test script to verify CSV logging functionality
Run this after starting the server to test logging
"""

import requests
import time
import json

BASE_URL = "http://localhost:5000"

def test_logging():
    print("=" * 60)
    print("Testing CSV Logging Functionality")
    print("=" * 60)
    
    # 1. Check server status
    print("\n1. Checking server status...")
    response = requests.get(f"{BASE_URL}/api/status")
    print(f"   Status: {response.json()}")
    
    # 2. Start demo mode
    print("\n2. Starting demo mode (squat)...")
    response = requests.post(
        f"{BASE_URL}/api/start_demo",
        json={"exercise": "squat"}
    )
    print(f"   Demo started: {response.json()}")
    time.sleep(2)  # Wait for demo to initialize
    
    # 3. Start logging
    print("\n3. Starting data logging...")
    response = requests.post(f"{BASE_URL}/api/start_logging")
    print(f"   Logging started: {response.json()}")
    
    # 4. Let it run for 10 seconds
    print("\n4. Recording data for 10 seconds...")
    for i in range(10, 0, -1):
        print(f"   {i} seconds remaining...", end="\r")
        time.sleep(1)
    print("\n   Recording complete!")
    
    # 5. Stop logging
    print("\n5. Stopping logging and saving CSV...")
    response = requests.post(f"{BASE_URL}/api/stop_logging")
    result = response.json()
    print(f"   Result: {json.dumps(result, indent=2)}")
    
    if result.get('filename'):
        print(f"\n✅ SUCCESS! CSV file created: {result['filename']}")
        print(f"   Data points saved: {result.get('data_points', 0)}")
        print(f"   File location: {result.get('filepath', 'backend/logs/')}")
    else:
        print(f"\n❌ FAILED: {result.get('message', 'Unknown error')}")
    
    # 6. List all logs
    print("\n6. Listing all log files...")
    response = requests.get(f"{BASE_URL}/api/logs")
    logs = response.json().get('logs', [])
    print(f"   Found {len(logs)} log file(s):")
    for log in logs[:5]:  # Show first 5
        print(f"   - {log['filename']} ({log['size']} bytes)")
    
    # 7. Stop demo mode
    print("\n7. Stopping demo mode...")
    response = requests.post(f"{BASE_URL}/api/stop_demo")
    print(f"   Demo stopped: {response.json()}")
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_logging()
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to server")
        print("   Make sure the Flask server is running on port 5000")
        print("   Start it with: python backend/server.py")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
