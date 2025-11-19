"""
Enhanced Form Analyzer with 3D Mesh Visualization and Demo Mode
"""

import math
import random
import numpy as np
import time
from datetime import datetime
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from collections import deque
import joblib
import os

@dataclass
class Point3D:
    x: float
    y: float
    z: float

@dataclass
class MeshJoint:
    position: Point3D
    name: str
    children: List[str] = None

    def __post_init__(self):
        if self.children is None:
            self.children = []

class HumanMesh:
    """3D human mesh for exercise visualization with enhanced joint tracking"""
    
    def __init__(self):
        # Initialize joint hierarchy with more detailed skeleton
        self.joints: Dict[str, MeshJoint] = {
            # Core body
            'hip': MeshJoint(Point3D(0, 0, 0), 'hip', ['spine', 'left_hip', 'right_hip']),
            'spine': MeshJoint(Point3D(0, 0.3, 0), 'spine', ['chest']),
            'chest': MeshJoint(Point3D(0, 0.5, 0), 'chest', ['neck', 'left_shoulder', 'right_shoulder']),
            'neck': MeshJoint(Point3D(0, 0.7, 0), 'neck', ['head']),
            'head': MeshJoint(Point3D(0, 0.85, 0), 'head'),
            
            # Left arm chain
            'left_shoulder': MeshJoint(Point3D(-0.2, 0.6, 0), 'left_shoulder', ['left_upper_arm']),
            'left_upper_arm': MeshJoint(Point3D(-0.3, 0.5, 0), 'left_upper_arm', ['left_elbow']),
            'left_elbow': MeshJoint(Point3D(-0.4, 0.3, 0), 'left_elbow', ['left_forearm']),
            'left_forearm': MeshJoint(Point3D(-0.5, 0.25, 0), 'left_forearm', ['left_wrist']),
            'left_wrist': MeshJoint(Point3D(-0.6, 0.2, 0), 'left_wrist'),
            
            # Right arm chain
            'right_shoulder': MeshJoint(Point3D(0.2, 0.6, 0), 'right_shoulder', ['right_upper_arm']),
            'right_upper_arm': MeshJoint(Point3D(0.3, 0.5, 0), 'right_upper_arm', ['right_elbow']),
            'right_elbow': MeshJoint(Point3D(0.4, 0.3, 0), 'right_elbow', ['right_forearm']),
            'right_forearm': MeshJoint(Point3D(0.5, 0.25, 0), 'right_forearm', ['right_wrist']),
            'right_wrist': MeshJoint(Point3D(0.6, 0.2, 0), 'right_wrist'),
            
            # Legs for squat visualization
            'left_hip': MeshJoint(Point3D(-0.1, 0, 0), 'left_hip', ['left_knee']),
            'right_hip': MeshJoint(Point3D(0.1, 0, 0), 'right_hip', ['right_knee']),
            'left_knee': MeshJoint(Point3D(-0.15, -0.25, 0), 'left_knee', ['left_ankle']),
            'right_knee': MeshJoint(Point3D(0.15, -0.25, 0), 'right_knee', ['right_ankle']),
            'left_ankle': MeshJoint(Point3D(-0.15, -0.5, 0), 'left_ankle'),
            'right_ankle': MeshJoint(Point3D(0.15, -0.5, 0), 'right_ankle'),
        }
        
        # Store initial positions for reset
        self.initial_positions = {name: MeshJoint(
            Point3D(j.position.x, j.position.y, j.position.z),
            j.name, j.children
        ) for name, j in self.joints.items()}
    
    def update_joint_positions(self, pitch: float, roll: float, exercise: str):
        """Update joint positions based on sensor data and exercise type"""
        # Convert angles to radians
        pitch_rad = math.radians(pitch)
        roll_rad = math.radians(roll)
        
        if exercise == 'bicep_curl':
            self._update_bicep_curl(pitch_rad, roll_rad)
        elif exercise == 'squat':
            self._update_squat(pitch_rad, roll_rad)
        elif exercise == 'pushup':
            self._update_pushup(pitch_rad, roll_rad)
        else:
            self.reset_positions()  # Reset to initial pose for 'ready' state
    
    def _update_bicep_curl(self, pitch_rad: float, roll_rad: float):
        """Update mesh for bicep curl with natural arm movement"""
        # Right arm curl chain
        elbow_height = 0.3 + 0.2 * math.sin(pitch_rad)
        wrist_height = 0.2 + 0.4 * math.sin(pitch_rad)
        
        # Update right arm chain
        self.joints['right_upper_arm'].position = Point3D(
            0.3 * math.cos(roll_rad),
            0.5,
            0.1 * math.sin(roll_rad)
        )
        self.joints['right_elbow'].position = Point3D(
            0.4 * math.cos(roll_rad),
            elbow_height,
            0.15 * math.sin(roll_rad)
        )
        self.joints['right_forearm'].position = Point3D(
            0.5 * math.cos(pitch_rad) * math.cos(roll_rad),
            (elbow_height + wrist_height) / 2,
            0.2 * math.sin(roll_rad)
        )
        self.joints['right_wrist'].position = Point3D(
            0.6 * math.cos(pitch_rad) * math.cos(roll_rad),
            wrist_height,
            0.25 * math.sin(roll_rad)
        )
        
        # Subtle upper body compensation
        self.joints['spine'].position = Point3D(
            0.02 * math.sin(roll_rad),
            0.3,
            0.02 * math.cos(roll_rad)
        )
    
    
    def reset_positions(self):
        """Reset all joints to their initial positions"""
        for name, joint in self.initial_positions.items():
            self.joints[name].position = Point3D(
                joint.position.x,
                joint.position.y,
                joint.position.z
            )
    
    def get_mesh_data(self) -> dict:
        """Get mesh data for frontend visualization"""
        return {
            'joints': {
                name: {
                    'position': {'x': j.position.x, 'y': j.position.y, 'z': j.position.z},
                    'children': j.children,
                    'name': j.name  # Include joint name for frontend labeling
                }
                for name, j in self.joints.items()
            }
        }

class DemoMode:
    """Advanced sensor data simulation for testing"""
    
    def __init__(self):
        self.running = False
        self.exercise = 'Ready'
        self.current_angle = 0
        self.direction = 1  # 1 for up, -1 for down
        self.speed = 1  # degrees per update (slowed down from 2)
        self.rep_count = 0
        self.heart_rate = 70
        self.exercise_params = {
            'bicep_curl': {
                'min_angle': 0,
                'max_angle': 90,
                'speed': 0.8,  # Slowed down from 2
                'roll_range': (-5, 5)
            },
            'squat': {
                'min_angle': 0,
                'max_angle': -60,
                'speed': 0.6,  # Slowed down from 1.5
                'roll_range': (-10, 10)
            },
            'pushup': {
                'min_angle': 0,
                'max_angle': 40,
                'speed': 0.7,  # Slowed down from 1.8
                'roll_range': (-8, 8)
            },
            'running': {
                'min_angle': 0,
                'max_angle': 0,  # No arm angle for running
                'speed': 0,
                'roll_range': (-3, 3)
            }
        }
        self.transition_state = None
        self.transition_timer = 0
        self.fatigue_factor = 0  # Increases with reps, affects form
        
    def start(self, exercise: str):
        """Start demo mode with specified exercise"""
        self.running = True
        self.exercise = exercise
        self.current_angle = 0
        self.direction = 1
        self.rep_count = 0
        self.heart_rate = 70
        self.fatigue_factor = 0
        self.transition_state = 'starting'
        self.transition_timer = 10  # Frames for smooth transition
        
    def stop(self):
        """Stop demo mode"""
        self.running = False
        self.exercise = 'Ready'
        self.transition_state = 'stopping'
        self.transition_timer = 10
        
    def _update_heart_rate(self):
        """Simulate heart rate changes based on exercise intensity"""
        base_rate = 70
        exercise_intensity = abs(self.current_angle) / 90.0
        fatigue_impact = self.fatigue_factor * 0.1
        
        # Store last beat time for realistic beat detection
        if not hasattr(self, 'last_beat_time'):
            self.last_beat_time = time.time()
            self.beat_interval = 60.0 / self.heart_rate  # seconds between beats
        
        target_hr = base_rate + (50 * exercise_intensity) + (10 * fatigue_impact)
        current_hr = self.heart_rate
        
        # Smooth heart rate changes
        if current_hr < target_hr:
            self.heart_rate = min(target_hr, current_hr + 2)
        else:
            self.heart_rate = max(target_hr, current_hr - 1)
            
    def _apply_natural_variation(self, value, range_percent=0.05):
        """Add natural variation to values"""
        variation = value * range_percent * random.uniform(-1, 1)
        return value + variation
    
    def _get_acceleration_data(self):
        """Generate realistic acceleration data based on movement"""
        params = self.exercise_params.get(self.exercise, {})
        
        # Initialize step simulation variables if not present
        if not hasattr(self, 'step_phase'):
            self.step_phase = 0.0
            self.step_frequency = 1.8  # Hz (108 steps per minute for running)
        
        # Base acceleration affected by movement and fatigue
        ax = random.uniform(-0.1, 0.1) * (1 + self.fatigue_factor * 0.2)
        ay = random.uniform(-0.1, 0.1) * (1 + self.fatigue_factor * 0.2)
        az = 0.98 + random.uniform(-0.02, 0.02)  # Mostly gravity
        
        # Add movement-specific acceleration
        movement_factor = abs(self.direction * self.speed) / 10.0
        if self.exercise == 'squat':
            ay -= movement_factor  # Vertical movement
        elif self.exercise == 'pushup':
            az += movement_factor  # Forward/backward movement
        elif self.exercise == 'bicep_curl':
            ax += movement_factor * math.cos(math.radians(self.current_angle))
            ay += movement_factor * math.sin(math.radians(self.current_angle))
        elif self.exercise == 'running':
            # Generate realistic running gait pattern
            # Update step phase (assuming ~10Hz update rate)
            self.step_phase += self.step_frequency * 0.1  # 0.1s per update
            
            # Create vertical acceleration pattern typical of running
            # Each step creates a sharp peak in vertical acceleration
            step_pattern = math.sin(2 * math.pi * self.step_phase)
            impact_pattern = max(0, math.sin(2 * math.pi * self.step_phase)) ** 3
            
            # Add step impact to vertical (y-axis) acceleration
            ay += 0.8 * impact_pattern  # Strong vertical impact
            
            # Add forward-backward oscillation (x-axis)
            ax += 0.3 * step_pattern
            
            # Add some vertical bounce to z-axis
            az += 0.4 * impact_pattern
            
            # Add realistic variation
            ax += random.uniform(-0.15, 0.15)
            ay += random.uniform(-0.1, 0.1)
            az += random.uniform(-0.1, 0.1)
            
        return ax, ay, az
    
    def get_next_data(self) -> dict:
        """Generate next frame of demo data with realistic movement patterns"""
        if not self.running and not self.transition_state:
            return None
            
        params = self.exercise_params.get(self.exercise, {
            'min_angle': 0,
            'max_angle': 90,
            'speed': 2,
            'roll_range': (-5, 5)
        })
        
        # Handle transitions
        if self.transition_state:
            if self.transition_timer > 0:
                self.transition_timer -= 1
                # Gradually change angles during transition
                transition_factor = self.transition_timer / 10.0
                self.current_angle *= transition_factor
            else:
                self.transition_state = None
        
        # Update movement (not for running which is continuous)
        if self.running and self.exercise != 'running':
            self.current_angle += self.direction * params['speed']
            
            # Check for rep completion and direction changes
            if self.direction == 1 and self.current_angle >= params['max_angle']:
                self.direction = -1
                self.fatigue_factor = min(1.0, self.fatigue_factor + 0.1)
            elif self.direction == -1 and self.current_angle <= params['min_angle']:
                self.direction = 1
                self.rep_count += 1
        
        # Generate sensor data with realistic step patterns for running
        ax, ay, az = self._get_acceleration_data()
        roll = random.uniform(*params['roll_range']) * (1 + self.fatigue_factor * 0.3)
        
        # Update simulated heart rate
        self._update_heart_rate()
        
        # Calculate angular velocities based on movement
        if self.exercise == 'running':
            # Running has different gyro patterns - arm swing motion
            gx = self._apply_natural_variation(50 * math.sin(2 * math.pi * self.step_phase))
            gy = self._apply_natural_variation(30 * math.cos(2 * math.pi * self.step_phase))
            gz = self._apply_natural_variation(20 * math.sin(4 * math.pi * self.step_phase))
        else:
            gx = self._apply_natural_variation(self.direction * params['speed'] * 20)
            gy = self._apply_natural_variation(self.direction * params['speed'] * 15)
            gz = self._apply_natural_variation(self.direction * params['speed'] * 10)
        
        # FIXED: Realistic pulse values (60-100 BPM range, not ADC values)
        # Pulse should match heart rate, not be in 512-800 range
        current_time = time.time()
        beat_interval = 60.0 / self.heart_rate  # seconds between beats
        time_since_last_beat = current_time - self.last_beat_time
        
        beat_detected = False
        
        # Check if it's time for a heartbeat
        if time_since_last_beat >= beat_interval:
            beat_detected = True
            self.last_beat_time = current_time
        
        # Add realistic noise to heart rate
        displayed_hr = int(self.heart_rate + random.randint(-2, 2))
        displayed_hr = max(60, min(180, displayed_hr))  # Clamp to realistic range
        
        # Include timestamp for step detection
        return {
            'ax': ax,
            'ay': ay,
            'az': az,
            'gx': gx,
            'gy': gy,
            'gz': gz,
            'pitch': self._apply_natural_variation(self.current_angle),
            'roll': roll,
            'yaw': random.uniform(-5, 5),
            'heartRate': displayed_hr,  # Realistic BPM value
            'pulse': displayed_hr,  # Pulse matches heart rate in BPM
            'beatDetected': beat_detected,
            'repCount': self.rep_count,
            'exercise': self.exercise,
            'timestamp': current_time  # Include timestamp for step detection
        }

class FormAnalyzer:
    """Real-time form analysis with mesh visualization"""
    
    def __init__(self):
        self.mesh = HumanMesh()
        self.demo_mode = DemoMode()
        self.thresholds = {
            'bicep_curl': {
                'min_curl': 60,
                'max_curl': 120,
                'max_roll': 10,
                'target_curl': 90,
                'ideal_tempo': 2.0,
                'tempo_range': 0.5
            },
            'lateral_raise': {
                'min_raise': 20,
                'max_raise': 100,
                'max_roll': 12,
                'ideal_tempo': 2.0,
                'tempo_range': 0.6
            },
            'shoulder_press': {
                'min_press': 30,
                'max_press': 120,
                'max_roll': 12,
                'ideal_tempo': 2.2,
                'tempo_range': 0.6
            }
        }
        self.rep_state = 'up'
        self.last_rep_count = 0
        self.current_form_score = 100
        self.current_feedback = []
        
        # Enhanced tracking
        self.movement_history = []  # Store recent movements
        self.last_rep_time = None
        self.rep_durations = []     # Track rep timing
        self.range_of_motion = {'min': 0, 'max': 0}  # Track ROM
        
        # Wrist / activity tracking
        self.placement = 'wrist'
        self.mode = 'normal'  # 'normal' or 'workout'
        self.step_count = 0
        self._last_step_time = None
        self._step_buffer = deque(maxlen=100)  # Increased buffer for better detection
        self._last_metric_time = None
        self.latest_metrics = {
            'stepCount': 0,
            'stepDetected': False,
            'activity': 'unknown',
            'activityConfidence': 0.0,
            'runningSpeedKmh': 0.0,
            'caloriesTotal': 0.0
        }

        # User profile (can be updated via API). Defaults reasonable placeholders.
        self.user_height_cm = 170.0
        self.user_weight_kg = 70.0
        self.user_age = 30

        # Calorie accumulation
        self._calories_accum = 0.0
        
        # Load trained activity classifier model
        self.activity_model = None
        self._load_activity_model()
        
        # Step detection parameters
        self._step_threshold = 1.2  # g-force threshold for step detection
        self._min_step_interval = 0.3  # Minimum 300ms between steps
        self._max_step_interval = 2.0  # Maximum 2s between steps
        self._peak_buffer = deque(maxlen=10)  # Track recent peaks
    
    def _load_activity_model(self):
        """Load the trained activity classifier model"""
        model_path = os.path.join(os.path.dirname(__file__), 'model.joblib')
        try:
            if os.path.exists(model_path):
                self.activity_model = joblib.load(model_path)
                print(f"✓ Activity classifier model loaded from {model_path}")
            else:
                print(f"⚠ Activity model not found at {model_path}")
                self.activity_model = None
        except Exception as e:
            print(f"✗ Error loading activity model: {e}")
            self.activity_model = None
    
    def analyze(self, exercise, pitch, roll, sensor_data=None):
        """Analyze form and detect reps with enhanced feedback"""
        score = 100
        feedback = []
        rep_detected = False

        # Only generate heart rate in demo mode or if not provided by sensor_data
        generate_heart_rate = self.demo_mode.running or (sensor_data and 'heartRate' not in sensor_data)
        
        if generate_heart_rate:
            self.demo_mode._update_heart_rate()

        # Update 3D mesh visualization
        self.mesh.update_joint_positions(pitch, roll, exercise)
        
        # Store movement data for temporal analysis
        self._update_movement_history(pitch, roll)
        
        # Get exercise-specific analysis (wrist-compatible exercises only)
        if exercise == 'bicep_curl':
            score, feedback, rep_detected = self._analyze_bicep_curl(pitch, roll, sensor_data)
        elif exercise == 'lateral_raise':
            score, feedback, rep_detected = self._analyze_lateral_raise(pitch, roll, sensor_data)
        elif exercise == 'shoulder_press':
            score, feedback, rep_detected = self._analyze_shoulder_press(pitch, roll, sensor_data)
        elif exercise == 'running':
            # Running handled primarily by activity/step detection
            score = 100
            feedback = ["Running mode: use steps and heart rate metrics"]
            rep_detected = False
        else:
            return 0, ["Select a wrist-compatible exercise to begin"], False
            
        # Add tempo-based feedback
        if sensor_data:
            tempo_feedback = self._analyze_movement_tempo(sensor_data)
            if tempo_feedback:
                feedback.extend(tempo_feedback)

        # Add stability analysis
        stability_score, stability_feedback = self._analyze_stability()
        if stability_feedback:
            feedback.extend(stability_feedback)
            score = min(score, stability_score)

        self.current_form_score = score
        self.current_feedback = feedback

        # Process wrist/normal-mode analytics (steps, activity, calories, speed)
        if sensor_data is not None:
            try:
                self._process_activity_and_steps(sensor_data)
            except Exception:
                # Keep analysis robust - don't fail entire pipeline on analytics
                pass

        return score, feedback, rep_detected

    def _analyze_bicep_curl(self, pitch, roll, sensor_data=None):
        """Analyze bicep curl form with comprehensive feedback"""
        score = 100
        feedback = []
        rep_detected = False
        thresholds = self.thresholds['bicep_curl']
        
        # Analyze upward phase (curl)
        if self.rep_state == 'down' and pitch > thresholds['min_curl']:
            self.rep_state = 'up'
            
            # Check curl height
            if pitch > thresholds['max_curl']:
                feedback.append("⚠️ Too much curl - maintain control")
                score -= 15
            elif pitch >= thresholds['target_curl']:
                feedback.append("💪 Perfect curl height!")
                score = 100
            else:
                feedback.append("↑ Curl a bit higher")
                score = 85
            
            # Check curl speed
            if sensor_data and abs(sensor_data.get('gy', 0)) > 200:
                feedback.append("⚠ Slower, control the curl")
                score -= 15
            
            # Check momentum usage
            if sensor_data and abs(sensor_data.get('ax', 0)) > 0.5:
                feedback.append("⚠ Reduce body swing")
                score -= 20
        
        # Analyze downward phase (extension)
        elif self.rep_state == 'up' and pitch < 20:
            self.rep_state = 'down'
            rep_detected = True
            
            # Check extension
            if pitch > 5:
                feedback.append("↓ Extend arms fully")
                score -= 10
            else:
                feedback.append("✓ Good extension!")
            
            # Update rep metrics
            self._update_rep_metrics(datetime.now())
        
        # Analyze form stability
        roll_threshold = thresholds['max_roll']
        if abs(roll) > roll_threshold:
            score -= 20
            if roll > 0:
                feedback.append("⚠ Keep right arm steady")
            else:
                feedback.append("⚠ Keep left arm steady")
        
        # Analyze movement consistency
        if len(self.movement_history) >= 3:
            # Check for jerky movements
            pitch_changes = [abs(self.movement_history[i+1]['pitch'] - self.movement_history[i]['pitch']) 
                           for i in range(len(self.movement_history)-2)]
            if max(pitch_changes) > 20:
                feedback.append("⚠ Smooth out the movement")
                score -= 10
            
            # Check tempo
            if len(self.rep_durations) >= 2:
                avg_duration = sum(self.rep_durations[-2:]) / 2
                if avg_duration < thresholds['ideal_tempo'] - thresholds['tempo_range']:
                    feedback.append("⚠ Slow down for better form")
                    score -= 10
                elif avg_duration > thresholds['ideal_tempo'] + thresholds['tempo_range']:
                    feedback.append("⚠ Maintain steady pace")
                    score -= 5
        
        return score, feedback, rep_detected

    def _analyze_lateral_raise(self, pitch, roll, sensor_data=None):
        """Simple lateral raise analysis for wrist-worn IMU"""
        score = 100
        feedback = []
        rep_detected = False
        thresholds = self.thresholds.get('lateral_raise', {})

        min_raise = thresholds.get('min_raise', 20)
        max_raise = thresholds.get('max_raise', 100)
        max_roll = thresholds.get('max_roll', 12)

        # Detect raise phase (pitch increasing beyond min_raise)
        if self.rep_state == 'down' and pitch > min_raise:
            self.rep_state = 'up'
            if pitch > max_raise:
                feedback.append("⚠️ Too high - control the raise")
                score -= 10
            else:
                feedback.append("✓ Good raise")

        elif self.rep_state == 'up' and pitch < min_raise:
            self.rep_state = 'down'
            rep_detected = True
            self._update_rep_metrics(datetime.now())

        if abs(roll) > max_roll:
            feedback.append("⚠ Keep wrist steady")
            score -= 10

        return score, feedback, rep_detected

    def _analyze_shoulder_press(self, pitch, roll, sensor_data=None):
        """Simple shoulder press analysis for wrist-worn IMU"""
        score = 100
        feedback = []
        rep_detected = False
        thresholds = self.thresholds.get('shoulder_press', {})

        min_press = thresholds.get('min_press', 30)
        max_press = thresholds.get('max_press', 120)
        max_roll = thresholds.get('max_roll', 12)

        # Press up detection
        if self.rep_state == 'down' and pitch > min_press:
            self.rep_state = 'up'
            if pitch > max_press:
                feedback.append("⚠️ Overextension")
                score -= 10
            else:
                feedback.append("✓ Good press")

        elif self.rep_state == 'up' and pitch < min_press:
            self.rep_state = 'down'
            rep_detected = True
            self._update_rep_metrics(datetime.now())

        if abs(roll) > max_roll:
            feedback.append("⚠ Keep elbows steady")
            score -= 12

        return score, feedback, rep_detected

    def _update_movement_history(self, pitch, roll):
        """Update movement history buffer"""
        timestamp = datetime.now()
        self.movement_history.append({
            'pitch': pitch,
            'roll': roll,
            'timestamp': timestamp
        })
        # Keep only last 20 readings
        if len(self.movement_history) > 20:
            self.movement_history.pop(0)
        
        # Update range of motion
        self.range_of_motion['min'] = min(self.range_of_motion['min'], pitch)
        self.range_of_motion['max'] = max(self.range_of_motion['max'], pitch)

    def _analyze_movement_tempo(self, sensor_data):
        """Analyze movement tempo and smoothness"""
        feedback = []
        
        if len(self.movement_history) < 2:
            return feedback
            
        # Calculate movement speed from gyroscope data
        gy = abs(sensor_data.get('gy', 0))
        if gy > 200:
            feedback.append("⚠ Movement too fast - maintain control")
        elif gy < 50 and self.rep_state != 'rest':
            feedback.append("⚠ Movement too slow - maintain momentum")
            
        # Analyze rep timing if available
        if self.last_rep_time and len(self.rep_durations) > 0:
            avg_duration = sum(self.rep_durations) / len(self.rep_durations)
            if avg_duration < 1.5:
                feedback.append("⚠ Slow down your reps")
            elif avg_duration > 4.0:
                feedback.append("⚠ Speed up slightly")
                
        return feedback

    def _analyze_stability(self):
        """Analyze movement stability and consistency"""
        if len(self.movement_history) < 5:
            return 100, []
            
        # Calculate variance in pitch and roll
        pitch_values = [m['pitch'] for m in self.movement_history[-5:]]
        roll_values = [m['roll'] for m in self.movement_history[-5:]]
        
        pitch_variance = np.var(pitch_values)
        roll_variance = np.var(roll_values)
        
        feedback = []
        score = 100
        
        # Check for excessive movement variation
        if pitch_variance > 100:
            feedback.append("⚠ Stabilize your movement - too much variation")
            score -= 20
        if roll_variance > 50:
            feedback.append("⚠ Keep your form steady - reduce swaying")
            score -= 15
            
        return score, feedback

    def _update_rep_metrics(self, timestamp):
        """Update metrics when a rep is completed"""
        if self.last_rep_time:
            duration = (timestamp - self.last_rep_time).total_seconds()
            self.rep_durations.append(duration)
            # Keep only last 5 rep durations
            if len(self.rep_durations) > 5:
                self.rep_durations.pop(0)
                
        self.last_rep_time = timestamp
        self.range_of_motion = {'min': 0, 'max': 0}  # Reset ROM tracking

    def get_mesh_data(self):
        """Get current mesh visualization data"""
        return self.mesh.get_mesh_data()

    def start_demo(self, exercise):
        """Start demo mode"""
        self.demo_mode.start(exercise)
        return {"status": "demo_started", "exercise": exercise}
    
    def stop_demo(self):
        """Stop demo mode"""
        self.demo_mode.stop()
        return {"status": "demo_stopped"}
    
    def get_demo_data(self):
        """Get next frame of demo data"""
        return self.demo_mode.get_next_data()

    def set_user_profile(self, height_cm=None, weight_kg=None, age=None):
        """Update user profile used for calorie and speed estimation"""
        if height_cm is not None:
            self.user_height_cm = float(height_cm)
        if weight_kg is not None:
            self.user_weight_kg = float(weight_kg)
        if age is not None:
            self.user_age = int(age)

    def set_mode(self, mode: str):
        """Set analyzer mode: 'normal' or 'workout'"""
        if mode in ('normal', 'workout'):
            self.mode = mode

    def _process_activity_and_steps(self, sensor_data):
        """Improved step detection and activity classification using trained model"""
        ts = None
        if 'timestamp' in sensor_data and sensor_data['timestamp']:
            try:
                ts = float(sensor_data['timestamp'])
            except Exception:
                try:
                    ts = datetime.fromisoformat(sensor_data['timestamp']).timestamp()
                except Exception:
                    ts = datetime.now().timestamp()
        else:
            ts = datetime.now().timestamp()

        # Get actual sensor readings from MPU6050
        ax = float(sensor_data.get('ax', 0.0) or 0.0)
        ay = float(sensor_data.get('ay', 0.0) or 0.0)
        az = float(sensor_data.get('az', 0.0) or 0.0)
        gx = float(sensor_data.get('gx', 0.0) or 0.0)
        gy = float(sensor_data.get('gy', 0.0) or 0.0)
        gz = float(sensor_data.get('gz', 0.0) or 0.0)

        # Calculate acceleration magnitude (remove gravity bias)
        acc_magnitude = math.sqrt(ax*ax + ay*ay + az*az)
        
        # Append to buffer
        self._step_buffer.append((ts, acc_magnitude))

        # IMPROVED STEP DETECTION ALGORITHM
        step_detected = False
        now = ts
        
        # Only detect steps if enough data in buffer
        if len(self._step_buffer) >= 5:
            # Get recent magnitudes
            recent_mags = [m for _, m in list(self._step_buffer)[-10:]]
            current_mag = acc_magnitude
            
            # Calculate dynamic threshold based on moving average and std
            window_mags = [m for _, m in self._step_buffer]
            mean_mag = float(np.mean(window_mags))
            std_mag = float(np.std(window_mags))
            
            # Adaptive threshold: mean + 1.5*std (more robust than fixed threshold)
            threshold = mean_mag + max(0.3, 1.5 * std_mag)
            
            # Peak detection: current value is a local maximum above threshold
            if len(recent_mags) >= 5:
                mid_idx = 2  # Check if the middle value is a peak
                is_peak = (recent_mags[mid_idx] > threshold and
                          recent_mags[mid_idx] > recent_mags[mid_idx-1] and
                          recent_mags[mid_idx] > recent_mags[mid_idx-2] and
                          recent_mags[mid_idx] > recent_mags[mid_idx+1] and
                          recent_mags[mid_idx] > recent_mags[mid_idx+2])
                
                # Verify time constraint between steps
                if is_peak:
                    if self._last_step_time is None:
                        step_detected = True
                        self._last_step_time = now
                    else:
                        time_since_last = now - self._last_step_time
                        if self._min_step_interval <= time_since_last <= self._max_step_interval:
                            step_detected = True
                            self._last_step_time = now
                            self.step_count += 1

        # Calculate cadence (steps per minute) using last 10 seconds
        window_start = now - 10.0
        steps_recent = [t for t, _ in self._step_buffer if t >= window_start]
        steps_in_window = len([t for t in steps_recent if t >= window_start - 0.5])  # Count actual steps
        cadence_spm = steps_in_window * 6  # Scale 10s window to per-minute

        # ACTIVITY CLASSIFICATION using trained model
        activity = 'stationary'
        confidence = 0.5
        
        if self.activity_model is not None and self.mode == 'normal':
            try:
                # Prepare features for the model (match training feature set)
                # Typical features: ax, ay, az, gx, gy, gz, acc_mag, gyro_mag
                gyro_magnitude = math.sqrt(gx*gx + gy*gy + gz*gz)
                
                features = np.array([[ax, ay, az, gx, gy, gz, acc_magnitude, gyro_magnitude]])
                
                # Predict activity
                prediction = self.activity_model.predict(features)[0]
                
                # Get confidence if model supports predict_proba
                if hasattr(self.activity_model, 'predict_proba'):
                    proba = self.activity_model.predict_proba(features)[0]
                    confidence = float(np.max(proba))
                else:
                    confidence = 0.8  # Default confidence if not available
                
                activity = str(prediction).lower()
                
            except Exception as e:
                print(f"⚠ Activity prediction error: {e}")
                # Fallback to simple heuristic
                activity, confidence = self._simple_activity_classification(
                    cadence_spm, acc_magnitude, gyro_magnitude
                )
        else:
            # Fallback to simple heuristic when model not available or in workout mode
            gyro_magnitude = math.sqrt(gx*gx + gy*gy + gz*gz)
            activity, confidence = self._simple_activity_classification(
                cadence_spm, acc_magnitude, gyro_magnitude
            )

        # Heuristic safety: robust idle detection to avoid false 'running'
        try:
            if cadence_spm < 20 and acc_magnitude < 1.05 and gyro_magnitude < 80:
                activity = 'stationary'
                confidence = 0.9
        except Exception:
            pass

        # Running speed estimation using MPU6050 step detection
        height_m = max(0.5, self.user_height_cm / 100.0)
        
        if activity == 'running':
            stride_m = 0.65 * height_m
        elif activity == 'walking':
            stride_m = 0.415 * height_m
        else:
            stride_m = 0.0

        running_speed_m_s = (cadence_spm / 60.0) * stride_m
        running_speed_kmh = running_speed_m_s * 3.6

        # ✅ CALORIE ESTIMATION - Uses actual MAX30100 heart rate readings
        # Get actual heart rate from MAX30100 sensor
        hr = float(sensor_data.get('heartRate', 0) or 0)
        calories_increment = 0.0
        
        if self._last_metric_time is None:
            self._last_metric_time = now

        dt = max(0.0, now - self._last_metric_time)
        minutes = dt / 60.0 if dt > 0 else 0.0

        # PRIORITY: Use heart rate if available from MAX30100
        if hr > 0 and hr < 200 and minutes > 0:  # Validate HR is in reasonable range
            # HR-based calorie formula (gender-neutral approximation)
            # Formula: Calories/min = (-55.0969 + (0.6309 × HR) + (0.1988 × Weight) + (0.2017 × Age)) / 4.184
            # This is a research-backed formula that uses actual heart rate
            calories_per_min = (-55.0969 + 0.6309 * hr + 0.1988 * self.user_weight_kg + 0.2017 * self.user_age) / 4.184
            
            # Ensure non-negative
            if calories_per_min < 0:
                calories_per_min = 0.0
                
            calories_increment = calories_per_min * minutes
            
            # Debug log to verify HR is being used
            if minutes > 0:
                print(f"💓 Calorie calc using MAX30100 HR: {hr} BPM → {calories_per_min:.2f} kcal/min")
        else:
            # FALLBACK: MET-based approximation when HR not available
            # Uses MPU6050 activity detection to estimate METs
            met = 1.0  # Resting
            if activity == 'walking':
                met = 3.5
            elif activity == 'running':
                met = 9.8
            
            # MET formula: Calories = MET × weight(kg) × time(hours)
            calories_increment = met * self.user_weight_kg * (minutes / 60.0)
            
            if minutes > 0:
                print(f"⚠ Calorie calc using MET fallback (no HR): activity={activity}, MET={met}")

        self._calories_accum += calories_increment
        self._last_metric_time = now

        # Update latest metrics
        self.latest_metrics = {
            'stepCount': int(self.step_count),
            'stepDetected': bool(step_detected),
            'activity': activity,
            'activityConfidence': float(confidence),
            'runningSpeedKmh': float(round(running_speed_kmh, 2)),
            'caloriesTotal': float(round(self._calories_accum, 4))
        }

        return self.latest_metrics
    
    def _simple_activity_classification(self, cadence_spm, acc_mag, gyro_mag):
        """Fallback activity classification using simple heuristics"""
        activity = 'stationary'
        confidence = 0.5
        
        # Strong stationary condition
        if cadence_spm < 20 and acc_mag < 1.05 and gyro_mag < 80:
            activity = 'stationary'
            confidence = 0.9
        # Running requires either high cadence or strong movement on both signals
        elif cadence_spm >= 80 or (gyro_mag > 300 and acc_mag > 1.2):
            activity = 'running'
            confidence = min(1.0, 0.5 + max((cadence_spm - 80) / 120.0, (gyro_mag - 300) / 400.0))
        # Walking moderate thresholds
        elif cadence_spm >= 20 or acc_mag > 1.05 or gyro_mag > 120:
            activity = 'walking'
            confidence = min(0.9, 0.3 + max(cadence_spm / 120.0, (acc_mag - 1.0)))
        else:
            activity = 'stationary'
            confidence = 0.85
            
        return activity, confidence