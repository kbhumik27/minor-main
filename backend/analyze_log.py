"""
Quick demonstration of CSV logging feature
"""

import pandas as pd
import matplotlib.pyplot as plt
import glob
import os

def analyze_latest_log():
    """Analyze the most recent log file"""
    
    # Find the most recent log file
    logs_dir = "logs"
    if not os.path.exists(logs_dir):
        print("No logs directory found. Record some data first!")
        return
    
    log_files = glob.glob(os.path.join(logs_dir, "fitness_data_*.csv"))
    
    if not log_files:
        print("No log files found. Record some data first!")
        return
    
    # Get the most recent file
    latest_log = max(log_files, key=os.path.getctime)
    print(f"Analyzing: {latest_log}")
    print("=" * 60)
    
    # Load the data
    df = pd.read_csv(latest_log)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Calculate duration
    duration = (df['timestamp'].max() - df['timestamp'].min()).total_seconds()
    
    # Basic statistics
    print(f"\n📊 Workout Summary")
    print(f"   Duration: {duration:.1f} seconds")
    print(f"   Exercise: {df['exercise'].iloc[0]}")
    print(f"   Total Reps: {df['repCount'].max()}")
    print(f"   Data Points: {len(df)}")
    print(f"   Average Form Score: {df['formScore'].mean():.1f}/100")
    print(f"   Average Heart Rate: {df['heartRate'].mean():.1f} BPM")
    
    # Acceleration statistics
    print(f"\n🎯 Acceleration Metrics")
    print(f"   Max X: {df['ax'].max():.2f} g")
    print(f"   Max Y: {df['ay'].max():.2f} g")
    print(f"   Max Z: {df['az'].max():.2f} g")
    
    # Create visualizations
    fig, axes = plt.subplots(3, 1, figsize=(12, 10))
    
    # Plot 1: Acceleration
    axes[0].plot(df['timestamp'], df['ax'], label='X', alpha=0.7)
    axes[0].plot(df['timestamp'], df['ay'], label='Y', alpha=0.7)
    axes[0].plot(df['timestamp'], df['az'], label='Z', alpha=0.7)
    axes[0].set_title('Acceleration Over Time', fontsize=14, fontweight='bold')
    axes[0].set_ylabel('Acceleration (g)')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # Plot 2: Form Score
    axes[1].plot(df['timestamp'], df['formScore'], color='green', linewidth=2)
    axes[1].fill_between(df['timestamp'], df['formScore'], alpha=0.3, color='green')
    axes[1].set_title('Form Score Over Time', fontsize=14, fontweight='bold')
    axes[1].set_ylabel('Form Score (0-100)')
    axes[1].set_ylim([0, 105])
    axes[1].axhline(y=80, color='orange', linestyle='--', alpha=0.5, label='Good Form')
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)
    
    # Plot 3: Orientation
    axes[2].plot(df['timestamp'], df['pitch'], label='Pitch', alpha=0.7)
    axes[2].plot(df['timestamp'], df['roll'], label='Roll', alpha=0.7)
    axes[2].plot(df['timestamp'], df['yaw'], label='Yaw', alpha=0.7)
    axes[2].set_title('Device Orientation Over Time', fontsize=14, fontweight='bold')
    axes[2].set_xlabel('Time')
    axes[2].set_ylabel('Angle (degrees)')
    axes[2].legend()
    axes[2].grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    # Save the plot
    plot_filename = latest_log.replace('.csv', '_analysis.png')
    plt.savefig(plot_filename, dpi=150, bbox_inches='tight')
    print(f"\n📈 Visualization saved: {plot_filename}")
    
    plt.show()
    
    print("\n" + "=" * 60)
    print("Analysis complete!")

if __name__ == "__main__":
    try:
        import pandas as pd
        import matplotlib.pyplot as plt
        analyze_latest_log()
    except ImportError as e:
        print(f"Missing required library: {e}")
        print("\nInstall with: pip install pandas matplotlib")
    except Exception as e:
        print(f"Error: {e}")
