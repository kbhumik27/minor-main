# CSV Data Logging Feature

## Overview

The AI Fitness Tracker now includes comprehensive CSV data logging functionality that records all sensor data, form analysis, and workout metrics during your exercise sessions.

## Features

✅ **Real-time Data Recording** - Captures sensor data at 10Hz (10 samples per second)
✅ **Automatic CSV Export** - Saves data to organized CSV files
✅ **Works with ESP32 & Demo Mode** - Logs data from both real sensors and simulated data
✅ **Comprehensive Metrics** - Records acceleration, gyroscope, orientation, heart rate, reps, and form scores
✅ **Easy Download** - API endpoints to list and download log files
✅ **Visual Indicators** - Dashboard shows recording status with animated badge

## How to Use

### From the Dashboard

1. **Connect to Device**
   - Connect to ESP32 hardware OR
   - Start Demo Mode for testing

2. **Start Workout**
   - Select your exercise type (Squats, Push-ups, Bicep Curls)
   - Click "Start Workout"

3. **Begin Logging**
   - Click "Start Logging" button
   - You'll see a blue "Recording Data" badge appear in the header
   - The button changes to "Stop Logging" with a red color

4. **Perform Exercise**
   - Do your workout as normal
   - All data is being recorded in the background

5. **Stop Logging**
   - Click "Stop Logging" when done
   - A notification shows how many data points were saved
   - The CSV file is automatically created in `backend/logs/`

### File Location

All CSV files are saved to: `backend/logs/`

File naming format: `fitness_data_<exercise>_<timestamp>.csv`

Example: `fitness_data_squat_20251103_143530.csv`

## CSV Data Structure

Each CSV file contains the following columns:

### Timestamp & Exercise
- `timestamp` - ISO 8601 format (e.g., "2025-11-03T14:35:30.123456")
- `exercise` - Exercise name (squat, pushup, bicep_curl)
- `repCount` - Current rep count
- `formScore` - AI form score (0-100)
- `feedback` - Real-time form feedback

### Accelerometer (g-force)
- `ax` - X-axis acceleration
- `ay` - Y-axis acceleration  
- `az` - Z-axis acceleration

### Gyroscope (°/s)
- `gx` - X-axis angular velocity
- `gy` - Y-axis angular velocity
- `gz` - Z-axis angular velocity

### Orientation (degrees)
- `pitch` - Forward/backward tilt
- `roll` - Left/right tilt
- `yaw` - Rotation (compass heading)

### Heart Rate
- `heartRate` - Heart rate in BPM
- `pulse` - Pulse measurement
- `beatDetected` - Boolean (True/False)

## API Endpoints

### Start Logging
```bash
POST http://localhost:5000/api/start_logging
```
Response:
```json
{
  "status": "logging_started"
}
```

### Stop Logging
```bash
POST http://localhost:5000/api/stop_logging
```
Response:
```json
{
  "status": "logging_stopped",
  "data_points": 1234,
  "filename": "fitness_data_squat_20251103_143530.csv",
  "filepath": "/path/to/backend/logs/fitness_data_squat_20251103_143530.csv"
}
```

### List All Logs
```bash
GET http://localhost:5000/api/logs
```
Response:
```json
{
  "logs": [
    {
      "filename": "fitness_data_squat_20251103_143530.csv",
      "size": 45632,
      "created": "2025-11-03T14:35:30.123456",
      "modified": "2025-11-03T14:36:45.789012"
    }
  ]
}
```

### Download Log File
```bash
GET http://localhost:5000/api/logs/<filename>
```
Returns the CSV file as a download.

## Data Analysis

### Python (Pandas)

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load the CSV
df = pd.read_csv('logs/fitness_data_squat_20251103_143530.csv')

# Convert timestamp to datetime
df['timestamp'] = pd.to_datetime(df['timestamp'])

# Basic statistics
print(df.describe())

# Plot acceleration over time
df.plot(x='timestamp', y=['ax', 'ay', 'az'], figsize=(12, 6))
plt.title('Acceleration During Squat Exercise')
plt.xlabel('Time')
plt.ylabel('Acceleration (g)')
plt.legend(['X-axis', 'Y-axis', 'Z-axis'])
plt.show()

# Plot form score
df.plot(x='timestamp', y='formScore', figsize=(12, 4))
plt.title('Form Score Over Time')
plt.ylabel('Form Score (0-100)')
plt.show()

# Count reps
total_reps = df['repCount'].max()
print(f"Total reps completed: {total_reps}")

# Average form score
avg_form = df['formScore'].mean()
print(f"Average form score: {avg_form:.1f}/100")
```

### Excel/Google Sheets

1. Open Excel or Google Sheets
2. File → Import → Upload CSV
3. Use built-in charts and pivot tables for analysis
4. Create graphs for acceleration, form score, heart rate trends

### R

```r
# Load data
library(readr)
library(ggplot2)

data <- read_csv("logs/fitness_data_squat_20251103_143530.csv")

# Plot
ggplot(data, aes(x = timestamp)) +
  geom_line(aes(y = ax, color = "X")) +
  geom_line(aes(y = ay, color = "Y")) +
  geom_line(aes(y = az, color = "Z")) +
  labs(title = "Acceleration During Exercise",
       y = "Acceleration (g)", color = "Axis") +
  theme_minimal()
```

## Testing

Run the test script to verify logging works:

```bash
cd backend
python test_logging.py
```

This will:
1. Start demo mode
2. Begin logging
3. Record data for 10 seconds
4. Stop logging and save CSV
5. List all log files

## Troubleshooting

### No data being saved
- Check that you clicked "Start Logging" before the workout
- Ensure you're connected (ESP32 or Demo Mode)
- Verify the backend server is running

### Cannot find log files
- Check `backend/logs/` directory
- Logs are only created when you stop logging
- Need at least 1 data point to create a file

### Error saving CSV
- Ensure the `backend/logs/` directory exists (created automatically)
- Check file permissions
- View server console for error messages

## Technical Details

- **Sampling Rate**: ~10 Hz (100ms intervals)
- **Data Size**: ~50-100 KB per minute of recording
- **Format**: UTF-8 encoded CSV with headers
- **Thread Safety**: Uses Flask-SocketIO background tasks
- **Memory**: Data stored in memory until logging stops

## Future Enhancements

Potential improvements:
- [ ] Real-time CSV streaming (append mode)
- [ ] Export to JSON format
- [ ] Built-in data visualization in dashboard
- [ ] Automatic cloud backup
- [ ] Exercise comparison analytics
- [ ] Machine learning model training from logs
