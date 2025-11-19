# Workout Data Logs

This directory contains CSV files with logged workout data from the AI Fitness Tracker.

## File Naming Convention

Files are named as: `fitness_data_<exercise>_<timestamp>.csv`

Example: `fitness_data_squat_20251103_143025.csv`

## CSV Structure

Each CSV file contains the following columns:

### Time & Exercise Info
- `timestamp` - ISO format timestamp for each data point
- `exercise` - Name of the exercise (squat, pushup, bicep_curl, etc.)
- `repCount` - Current rep count
- `formScore` - AI-calculated form score (0-100)
- `feedback` - Real-time form feedback messages

### Accelerometer Data (g-force)
- `ax` - X-axis linear acceleration
- `ay` - Y-axis linear acceleration
- `az` - Z-axis linear acceleration

### Gyroscope Data (degrees/second)
- `gx` - X-axis angular velocity
- `gy` - Y-axis angular velocity
- `gz` - Z-axis angular velocity

### Orientation Data (degrees)
- `pitch` - Forward/backward tilt
- `roll` - Left/right tilt
- `yaw` - Rotation/heading

### Heart Rate Data
- `heartRate` - Heart rate in BPM
- `pulse` - Pulse measurement
- `beatDetected` - Boolean indicating if a heartbeat was detected

## Usage

1. Start logging from the dashboard by clicking "Start Logging"
2. Perform your workout
3. Click "Stop Logging" to save the data
4. Files are saved automatically to this directory
5. Download files via the API: `GET /api/logs/<filename>`
6. List all logs via: `GET /api/logs`

## Data Analysis

These CSV files can be imported into:
- Excel/Google Sheets for basic analysis
- Python (pandas) for advanced data analysis
- R for statistical analysis
- Any data visualization tool

Example Python code to load a log file:

```python
import pandas as pd

# Load the CSV
df = pd.read_csv('fitness_data_squat_20251103_143025.csv')

# View basic statistics
print(df.describe())

# Plot acceleration over time
df.plot(x='timestamp', y=['ax', 'ay', 'az'])
```
