"""
Python Backend Server for AI Fitness Tracker
Connects to ESP32, processes data with AI, serves React frontend
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import asyncio
import websockets
import json
import threading
import numpy as np
from collections import deque
from datetime import datetime
import os
from pathlib import Path

# Get the base directory (parent of backend folder)
BASE_DIR = Path(__file__).parent.parent
FRONTEND_BUILD_DIR = BASE_DIR / 'frontend' / 'frontend' / 'dist'
FRONTEND_DEV_DIR = BASE_DIR / 'frontend' / 'frontend'

# Determine if we're in development or production mode
DEV_MODE = os.getenv('FLASK_ENV') == 'development' or not FRONTEND_BUILD_DIR.exists()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Global state
sensor_data = {
    'ax': 0, 'ay': 0, 'az': 0,
    'gx': 0, 'gy': 0, 'gz': 0,
    'pitch': 0, 'roll': 0, 'yaw': 0,
    'heartRate': 70,
    'beatDetected': False,
    'repCount': 0,
    'exercise': 'Ready',
    'timestamp': 0,
    # Activity/step metrics (populated by FormAnalyzer)
    'stepCount': 0,
    'stepDetected': False,
    'activity': 'unknown',
    'activityConfidence': 0.0,
    'runningSpeedKmh': 0.0,
    'caloriesTotal': 0.0,
    'mode': 'normal'
}

sensor_buffer = deque(maxlen=20)  # For AI prediction
connected_to_esp32 = False
esp32_websocket = None
data_log = []
logging_enabled = False
demo_mode = False  # Demo mode can be enabled via API

# AI Model placeholder (load your trained model here)
ai_model = None

# Import form analyzer
from form_analyzer import FormAnalyzer
form_analyzer = FormAnalyzer()


async def connect_to_esp32(esp32_url):
    """Connect to ESP32 via WebSocket"""
    global connected_to_esp32, esp32_websocket
    
    try:
        async with websockets.connect(esp32_url) as websocket:
            esp32_websocket = websocket
            connected_to_esp32 = True
            print(f"✓ Connected to ESP32: {esp32_url}")
            
            # Notify frontend
            socketio.emit('esp32_status', {'connected': True})
            
            while connected_to_esp32:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(message)
                    
                    # Debug: Print raw ESP32 data
                    print(f"\n📡 Raw ESP32 data keys: {list(data.keys())}")
                    
                    # Update global state with ESP32 data
                    # Important: Only update fields that are present in ESP32 data
                    for key in ['ax', 'ay', 'az', 'gx', 'gy', 'gz', 'pitch', 'roll', 'yaw']:
                        if key in data:
                            sensor_data[key] = data[key]
                    
                    # IMPORTANT: Only update heart rate if ESP32 sends it
                    # Accept multiple field names from device
                    if 'heartRate' in data:
                        sensor_data['heartRate'] = data['heartRate']
                        print(f"  ✓ HR from ESP32: {data['heartRate']}")
                    elif 'bpm' in data:
                        sensor_data['heartRate'] = data['bpm']
                        print(f"  ✓ HR (bpm alias) from ESP32: {data['bpm']}")

                    # Remove 'pulse' support to avoid duplication; use heartRate only

                    if 'beatDetected' in data:
                        sensor_data['beatDetected'] = data['beatDetected']
                        print(f"  ✓ Beat from ESP32: {data['beatDetected']}")

                    # Timestamp mapping
                    if 'timestamp' in data:
                        sensor_data['timestamp'] = data['timestamp']
                    elif 'ts' in data:
                        sensor_data['timestamp'] = data['ts']
                    
                    # Debug: ensure IMU fields present
                    if not all(k in data for k in ['ax', 'ay', 'az']):
                        print("⚠ IMU accel missing in payload; check ESP32 JSON fields (ax, ay, az)")
                    if not all(k in data for k in ['gx', 'gy', 'gz']):
                        print("⚠ IMU gyro missing in payload; check ESP32 JSON fields (gx, gy, gz)")

                    # Add to buffer for AI
                    sensor_buffer.append([
                        data.get('ax', 0), data.get('ay', 0), data.get('az', 0),
                        data.get('gx', 0), data.get('gy', 0), data.get('gz', 0),
                        data.get('pitch', 0), data.get('roll', 0), data.get('yaw', 0)
                    ])
                    
                    # Analyze or at least compute activity/steps every frame
                    analyzer_mode = getattr(form_analyzer, 'mode', 'normal')
                    
                    if sensor_data.get('exercise') != 'Ready':
                        # Full analysis path (includes rep detection and step/activity processing)
                        score, feedback, rep_detected = form_analyzer.analyze(
                            sensor_data.get('exercise', 'bicep_curl'),
                            data.get('pitch', 0),
                            data.get('roll', 0),
                            data
                        )

                        sensor_data['formScore'] = score
                        sensor_data['feedback'] = ' | '.join(feedback) if feedback else ''
                        sensor_data['meshData'] = form_analyzer.get_mesh_data()
                        if rep_detected:
                            sensor_data['repCount'] = sensor_data.get('repCount', 0) + 1
                    else:
                        # In Ready mode, only process activity/steps (no exercise analysis)
                        try:
                            form_analyzer._process_activity_and_steps(data)
                        except Exception as e:
                            print(f"⚠ Activity/steps processing error: {e}")
                        
                        # Reset mesh to neutral position
                        form_analyzer.mesh.reset_positions()
                        sensor_data['meshData'] = form_analyzer.get_mesh_data()
                        sensor_data['formScore'] = 0
                        sensor_data['feedback'] = ''

                    # Always merge analyzer-derived metrics (steps, activity, speed, calories)
                    try:
                        metrics = getattr(form_analyzer, 'latest_metrics', None)
                        if metrics:
                            # Map keys into sensor_data for frontends
                            sensor_data['stepCount'] = metrics.get('stepCount', sensor_data.get('stepCount', 0))
                            sensor_data['stepDetected'] = metrics.get('stepDetected', False)
                            sensor_data['activity'] = metrics.get('activity', sensor_data.get('activity', 'unknown'))
                            sensor_data['activityConfidence'] = metrics.get('activityConfidence', 0.0)
                            sensor_data['runningSpeedKmh'] = metrics.get('runningSpeedKmh', 0.0)
                            sensor_data['caloriesTotal'] = metrics.get('caloriesTotal', 0.0)
                            
                            # Debug: Log when step is detected
                            if metrics.get('stepDetected'):
                                print(f"👟 Step detected! Total steps: {sensor_data['stepCount']}")
                    except Exception as e:
                        print(f"⚠ Error merging metrics: {e}")
                    
                    # Debug print to verify heart rate is being received
                    print(f"📊 Current sensor_data - HR: {sensor_data.get('heartRate', 'N/A')}, Beat: {sensor_data.get('beatDetected', 'N/A')}")
                    print(f"   Exercise: {sensor_data.get('exercise')}, Pitch: {sensor_data.get('pitch', 0):.1f}°")
                    print(f"   Steps: {sensor_data.get('stepCount', 0)}, Reps: {sensor_data.get('repCount', 0)}, Activity: {sensor_data.get('activity', 'unknown')}\n")
                    
                    # Broadcast to all connected clients
                    socketio.emit('sensor_data', sensor_data)
                    
                    # Log data if enabled (exclude meshData which is too complex for CSV)
                    if logging_enabled:
                        log_entry = {
                            'timestamp': datetime.now().isoformat(),
                            **{k: v for k, v in sensor_data.items() if k != 'meshData'}
                        }
                        data_log.append(log_entry)
                    
                except asyncio.TimeoutError:
                    continue
                except json.JSONDecodeError as e:
                    print(f"JSON error: {e}")
                    
    except Exception as e:
        connected_to_esp32 = False
        esp32_websocket = None
        print(f"✗ ESP32 connection error: {e}")
        socketio.emit('esp32_status', {'connected': False, 'error': str(e)})


def run_esp32_connection(esp32_url):
    """Run ESP32 connection in separate thread"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(connect_to_esp32(esp32_url))


# REST API Endpoints

@app.route('/')
def index():
    """Serve React app"""
    if DEV_MODE:
        # In dev mode, redirect to Vite dev server or show a message
        return jsonify({
            'message': 'Frontend not built. Run "npm run build" in frontend/frontend directory',
            'dev_mode': True,
            'frontend_dev_url': 'http://localhost:5173'
        })
    else:
        return send_from_directory(str(FRONTEND_BUILD_DIR), 'index.html')


@app.route('/api/status')
def get_status():
    """Get system status"""
    try:
        # Get connected clients count
        rooms = socketio.server.manager.rooms if hasattr(socketio.server, 'manager') else {}
        clients_count = len(rooms.get('/', {}).get('/', set())) if rooms else 0
    except:
        clients_count = 0
    
    return jsonify({
        'esp32_connected': connected_to_esp32,
        'clients_connected': clients_count,
        'logging_enabled': logging_enabled,
        'data_points_logged': len(data_log)
    })


@app.route('/api/sensor_data')
def get_sensor_data():
    """Get current sensor data"""
    return jsonify(sensor_data)


@app.route('/api/connect_esp32', methods=['POST'])
def connect_esp32_endpoint():
    """Connect to ESP32"""
    global demo_mode
    data = request.json
    esp32_url = data.get('url', 'ws://192.168.1.100:81')
    
    # Disable demo mode when connecting to real ESP32
    if demo_mode:
        demo_mode = False
        # Stop demo if running
        if hasattr(form_analyzer, 'demo_mode') and form_analyzer.demo_mode:
            form_analyzer.stop_demo()
    
    # Start connection in background thread
    thread = threading.Thread(target=run_esp32_connection, args=(esp32_url,))
    thread.daemon = True
    thread.start()
    
    return jsonify({'status': 'connecting', 'url': esp32_url})


@app.route('/api/disconnect_esp32', methods=['POST'])
def disconnect_esp32():
    """Disconnect from ESP32"""
    global connected_to_esp32
    connected_to_esp32 = False
    return jsonify({'status': 'disconnected'})

@app.route('/api/start_demo', methods=['POST'])
def start_demo():
    """Start demo mode with simulated sensor data"""
    global demo_mode, connected_to_esp32
    
    # Disconnect from ESP32 if connected
    if connected_to_esp32:
        connected_to_esp32 = False
    
    data = request.json
    exercise = data.get('exercise', 'bicep_curl')
    
    demo_mode = True
    sensor_data['exercise'] = exercise
    
    # Check if FormAnalyzer has demo capabilities
    if not hasattr(form_analyzer, 'start_demo'):
        return jsonify({'error': 'Demo mode not available in FormAnalyzer'}), 501
    
    result = form_analyzer.start_demo(exercise)
    
    # Start demo data generation in background
    def demo_data_generator():
        while demo_mode and hasattr(form_analyzer, 'demo_mode') and form_analyzer.demo_mode.running:
            demo_data = form_analyzer.get_demo_data()
            if demo_data:
                sensor_data.update(demo_data)
                
                # Analyze form
                score, feedback, rep_detected = form_analyzer.analyze(
                    exercise,
                    demo_data.get('pitch', 0),
                    demo_data.get('roll', 0),
                    demo_data
                )
                
                sensor_data['formScore'] = score
                sensor_data['feedback'] = ' | '.join(feedback) if feedback else ''
                sensor_data['meshData'] = form_analyzer.get_mesh_data()
                
                if rep_detected:
                    sensor_data['repCount'] = sensor_data.get('repCount', 0) + 1
                
                socketio.emit('sensor_data', sensor_data)
            socketio.sleep(0.1)  # Update at 10Hz
    
    socketio.start_background_task(demo_data_generator)
    return jsonify(result)

@app.route('/api/stop_demo', methods=['POST'])
def stop_demo():
    """Stop demo mode"""
    global demo_mode
    demo_mode = False
    
    if hasattr(form_analyzer, 'stop_demo'):
        result = form_analyzer.stop_demo()
        return jsonify(result)
    
    return jsonify({'status': 'demo_stopped', 'demo_mode': False})


@app.route('/api/send_command', methods=['POST'])
def send_command():
    """Send command to ESP32"""
    global esp32_websocket
    
    if not esp32_websocket:
        return jsonify({'error': 'Not connected to ESP32'}), 400
    
    data = request.json
    command = data.get('command')
    
    try:
        # Send command to ESP32
        asyncio.run(esp32_websocket.send(json.dumps(command)))
        return jsonify({'status': 'sent'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/start_logging', methods=['POST'])
def start_logging():
    """Start data logging"""
    global logging_enabled, data_log
    logging_enabled = True
    data_log = []
    return jsonify({'status': 'logging_started'})


@app.route('/api/stop_logging', methods=['POST'])
def stop_logging():
    """Stop data logging and save to file"""
    global logging_enabled, data_log
    logging_enabled = False
    
    # Save to CSV
    if data_log:
        try:
            # Create logs directory
            logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
            os.makedirs(logs_dir, exist_ok=True)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            exercise_name = sensor_data.get('exercise', 'unknown').replace(' ', '_')
            filename = f'fitness_data_{exercise_name}_{timestamp}.csv'
            filepath = os.path.join(logs_dir, filename)
            
            # Prepare data for CSV (flatten any nested structures)
            import csv
            csv_data = []
            for entry in data_log:
                flat_entry = {}
                for key, value in entry.items():
                    # Skip complex objects, convert simple types to strings
                    if isinstance(value, (dict, list)):
                        if key == 'feedback':
                            flat_entry[key] = str(value) if value else ''
                        # Skip other complex objects
                    else:
                        flat_entry[key] = value
                csv_data.append(flat_entry)
            
            # Define column order for better readability
            if csv_data:
                all_keys = csv_data[0].keys()
                ordered_keys = ['timestamp', 'exercise', 'repCount', 'formScore', 'feedback',
                               'ax', 'ay', 'az', 'gx', 'gy', 'gz', 
                               'pitch', 'roll', 'yaw', 
                               'heartRate', 'pulse', 'beatDetected']
                # Add any remaining keys
                fieldnames = [k for k in ordered_keys if k in all_keys]
                fieldnames.extend([k for k in all_keys if k not in fieldnames])
                
                # Write to CSV
                with open(filepath, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
                    writer.writeheader()
                    writer.writerows(csv_data)
                
                print(f"✓ Data logged to: {filepath}")
                print(f"  Total data points: {len(csv_data)}")
                
                return jsonify({
                    'status': 'logging_stopped',
                    'data_points': len(csv_data),
                    'filename': filename,
                    'filepath': filepath
                })
        except Exception as e:
            print(f"✗ Error saving CSV: {e}")
            return jsonify({
                'status': 'logging_stopped_with_error',
                'data_points': len(data_log),
                'error': str(e)
            }), 500
    
    return jsonify({'status': 'logging_stopped', 'data_points': 0, 'message': 'No data to save'})


@app.route('/api/logs', methods=['GET'])
def list_logs():
    """List all available log files"""
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    
    if not os.path.exists(logs_dir):
        return jsonify({'logs': []})
    
    logs = []
    for filename in os.listdir(logs_dir):
        if filename.endswith('.csv'):
            filepath = os.path.join(logs_dir, filename)
            file_stats = os.stat(filepath)
            logs.append({
                'filename': filename,
                'size': file_stats.st_size,
                'created': datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                'modified': datetime.fromtimestamp(file_stats.st_mtime).isoformat()
            })
    
    # Sort by creation time, newest first
    logs.sort(key=lambda x: x['created'], reverse=True)
    
    return jsonify({'logs': logs})


@app.route('/api/logs/<filename>', methods=['GET'])
def download_log(filename):
    """Download a specific log file"""
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    
    # Security check: prevent directory traversal
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400
    
    filepath = os.path.join(logs_dir, filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    return send_from_directory(logs_dir, filename, as_attachment=True)


@app.route('/api/reset_reps', methods=['POST'])
def reset_reps():
    """Reset rep counter"""
    global sensor_data
    sensor_data['repCount'] = 0
    form_analyzer.last_rep_count = 0
    
    if esp32_websocket:
        asyncio.run(esp32_websocket.send(json.dumps({'command': 'reset_reps'})))
    
    return jsonify({'status': 'reps_reset'})


@app.route('/api/reset_steps', methods=['POST'])
def reset_steps():
    """Reset step counter"""
    global sensor_data
    sensor_data['stepCount'] = 0
    # reset analyzer internal counter if present
    try:
        form_analyzer.step_count = 0
        if hasattr(form_analyzer, 'latest_metrics'):
            form_analyzer.latest_metrics['stepCount'] = 0
            form_analyzer.latest_metrics['stepDetected'] = False
    except Exception:
        pass

    # Forward command to ESP32 if connected (optional)
    if esp32_websocket:
        try:
            asyncio.run(esp32_websocket.send(json.dumps({'command': 'reset_steps'})))
        except Exception:
            pass

    return jsonify({'status': 'steps_reset'})


@app.route('/api/set_exercise', methods=['POST'])
def set_exercise():
    """Set current exercise"""
    global sensor_data
    data = request.json
    exercise = data.get('exercise', 'Ready')
    
    sensor_data['exercise'] = exercise
    form_analyzer.rep_state = 'up'
    
    if esp32_websocket:
        asyncio.run(esp32_websocket.send(json.dumps({
            'command': 'set_exercise',
            'exercise': exercise
        })))
    
    return jsonify({'status': 'exercise_set', 'exercise': exercise})


@app.route('/api/set_mode', methods=['POST'])
def set_mode():
    """Set analyzer mode (normal or workout)"""
    data = request.json
    mode = data.get('mode', 'normal')
    form_analyzer.set_mode(mode)
    sensor_data['mode'] = mode
    return jsonify({'status': 'mode_set', 'mode': mode})


@app.route('/api/set_profile', methods=['POST'])
def set_profile():
    """Set user profile values used for calorie/speed estimation"""
    data = request.json
    height = data.get('height_cm')
    weight = data.get('weight_kg')
    age = data.get('age')
    form_analyzer.set_user_profile(height_cm=height, weight_kg=weight, age=age)
    sensor_data['userProfile'] = {
        'height_cm': form_analyzer.user_height_cm,
        'weight_kg': form_analyzer.user_weight_kg,
        'age': form_analyzer.user_age
    }
    return jsonify({'status': 'profile_set', 'profile': sensor_data['userProfile']})


# SocketIO Events

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print('Client connected')
    emit('sensor_data', sensor_data)


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('Client disconnected')


@socketio.on('request_data')
def handle_data_request():
    """Handle data request from client"""
    emit('sensor_data', sensor_data)


# Serve static files for React build
@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from React build, fallback to index.html for SPA routing"""
    if path.startswith('api/'):
        # Don't serve API routes as static files
        return jsonify({'error': 'API endpoint not found'}), 404
    
    if DEV_MODE:
        return jsonify({
            'message': 'Frontend not built. Run "npm run build" in frontend/frontend directory',
            'dev_mode': True,
            'frontend_dev_url': 'http://localhost:5173'
        })
    
    # Check if the file exists in the build directory
    file_path = FRONTEND_BUILD_DIR / path
    if file_path.exists() and file_path.is_file():
        return send_from_directory(str(FRONTEND_BUILD_DIR), path)
    else:
        # Fallback to index.html for SPA routing (React Router)
        return send_from_directory(str(FRONTEND_BUILD_DIR), 'index.html')


if __name__ == '__main__':
    print("=" * 60)
    print("AI Fitness Tracker - Python Backend Server")
    print("=" * 60)
    
    if DEV_MODE:
        print("\n⚠️  DEVELOPMENT MODE")
        print("Frontend build not found. To serve the frontend:")
        print("  1. Run: cd frontend/frontend && npm run build")
        print("  2. Or use the Vite dev server: npm run dev")
        print("     Then access: http://localhost:5173")
        print(f"     (Backend API will be at: http://localhost:5000)")
    else:
        print("\n✓ Production Mode - Frontend build found")
        print(f"Frontend directory: {FRONTEND_BUILD_DIR}")
    
    print("\nStarting server...")
    print("Backend API: http://localhost:5000")
    if not DEV_MODE:
        print("React Dashboard: http://localhost:5000")
    
    print("\nAPI Endpoints:")
    print("  GET  /api/status - System status")
    print("  GET  /api/sensor_data - Current sensor data")
    print("  POST /api/connect_esp32 - Connect to ESP32")
    print("  POST /api/disconnect_esp32 - Disconnect from ESP32")
    print("  POST /api/start_demo - Start demo mode")
    print("  POST /api/stop_demo - Stop demo mode")
    print("  POST /api/send_command - Send command to ESP32")
    print("  POST /api/start_logging - Start data logging")
    print("  POST /api/stop_logging - Stop and save logs to CSV")
    print("  GET  /api/logs - List all saved log files")
    print("  GET  /api/logs/<filename> - Download a specific log file")
    print("  POST /api/reset_reps - Reset rep counter")
    print("  POST /api/set_exercise - Set exercise type")
    print("  POST /api/set_mode - Set analyzer mode (normal|workout)")
    print("  POST /api/set_profile - Set user profile (height_cm, weight_kg, age)")
    print("  POST /api/reset_steps - Reset step counter")
    print("\nWebSocket: Real-time sensor data streaming")
    print("Data logs will be saved to: backend/logs/")
    print("=" * 60)
    print()
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)