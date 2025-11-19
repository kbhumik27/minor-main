"""
Server endpoints for demo mode and mesh visualization
"""

from flask import Blueprint
from flask import jsonify, request
import asyncio
from datetime import datetime

demo_routes = Blueprint('demo', __name__)

@demo_routes.route('/api/start_demo', methods=['POST'])
def start_demo():
    """Start demo mode with simulated sensor data"""
    from server import form_analyzer, sensor_data, socketio
    
    data = request.json
    exercise = data.get('exercise', 'bicep_curl')
    
    result = form_analyzer.start_demo(exercise)
    sensor_data['exercise'] = exercise
    
    # Start demo data generation in background
    def demo_data_generator():
        while form_analyzer.demo_mode.running:
            demo_data = form_analyzer.get_demo_data()
            if demo_data:
                sensor_data.update(demo_data)
                
                # Analyze form
                score, feedback, rep_detected = form_analyzer.analyze(
                    exercise,
                    demo_data['pitch'],
                    demo_data['roll'],
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

@demo_routes.route('/api/stop_demo', methods=['POST'])
def stop_demo():
    """Stop demo mode"""
    from server import form_analyzer
    result = form_analyzer.stop_demo()
    return jsonify(result)

@demo_routes.route('/api/get_mesh', methods=['GET'])
def get_mesh():
    """Get current mesh visualization data"""
    from server import form_analyzer
    return jsonify(form_analyzer.get_mesh_data())