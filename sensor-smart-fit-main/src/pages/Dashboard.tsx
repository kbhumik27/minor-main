import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, Heart, TrendingUp, User, Wifi, WifiOff, 
  Play, Pause, RotateCcw, Save, Gauge, Zap, Download
} from "lucide-react";
import SensorVisualizer from "@/components/SensorVisualizer";
import RepCounter from "@/components/RepCounter";
import FormFeedback from "@/components/FormFeedback";
import HeartRateWaveform from "@/components/HeartRateWaveform";
import io from "socket.io-client";

interface SensorData {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  pitch: number;
  roll: number;
  yaw: number;
  heartRate: number;
  pulse: number;
  beatDetected: boolean;
  repCount: number;
  exercise: string;
  formScore?: number;
  feedback?: string;
  stepCount?: number;
  stepDetected?: boolean;
  activity?: string;
  activityConfidence?: number;
  runningSpeedKmh?: number;
  caloriesTotal?: number;
  mode?: string;
  timestamp: number;
  meshData?: {
    joints: {
      [key: string]: {
        position: { x: number; y: number; z: number };
        children: string[];
        name: string;
      };
    };
  };
}

const Dashboard = () => {
  const [connected, setConnected] = useState(false);
  const [esp32Url, setEsp32Url] = useState("ws://192.168.1.100:81");
  const [sensorData, setSensorData] = useState<SensorData>({
    ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0,
    pitch: 0, roll: 0, yaw: 0,
    heartRate: 0, pulse: 0, beatDetected: false,
    repCount: 0, exercise: "Ready", timestamp: 0
  });
  const [selectedExercise, setSelectedExercise] = useState("bicep_curl");
  const [mode, setMode] = useState<string>("normal");
  const [heightCm, setHeightCm] = useState<number | ''>(170);
  const [weightKg, setWeightKg] = useState<number | ''>(70);
  const [age, setAge] = useState<number | ''>(30);
  const [isLogging, setIsLogging] = useState(false);
  const [availableLogs, setAvailableLogs] = useState<{filename: string; size: number; created: string}[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Connect to Flask backend via Socket.IO
    const socket = io("http://localhost:5000");

    socket.on("connect", () => {
      console.log("Connected to backend");
      // Fetch available logs on connect
      fetchLogs();
    });

    socket.on("sensor_data", (data: SensorData) => {
      setSensorData(data);
      if (data.mode) setMode(data.mode);
      
      // Debug log to verify heart rate data is being received
      console.log('Received sensor data:', {
        heartRate: data.heartRate,
        pulse: data.pulse,
        beatDetected: data.beatDetected,
        timestamp: new Date().toISOString()
      });
    });

    socket.on("esp32_status", (status: { connected: boolean; error?: string }) => {
      setConnected(status.connected);
      if (status.error) {
        toast({
          title: "Connection Error",
          description: status.error,
          variant: "destructive",
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [toast]);

  const handleConnect = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/connect_esp32", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: esp32Url }),
      });
      const data = await response.json();
      toast({
        title: "Connecting...",
        description: `Connecting to ${data.url}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to backend",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("http://localhost:5000/api/disconnect_esp32", {
        method: "POST",
      });
      setConnected(false);
      toast({
        title: "Disconnected",
        description: "ESP32 connection closed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not disconnect",
        variant: "destructive",
      });
    }
  };

  const handleStartDemo = async (exercise: string) => {
    try {
      const response = await fetch("http://localhost:5000/api/start_demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise }),
      });
      const data = await response.json();
      setConnected(true);
      toast({
        title: "Demo Mode Started",
        description: `Running ${exercise} simulation`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not start demo mode",
        variant: "destructive",
      });
    }
  };

  const handleStopDemo = async () => {
    try {
      await fetch("http://localhost:5000/api/stop_demo", {
        method: "POST",
      });
      setConnected(false);
      toast({
        title: "Demo Mode Stopped",
        description: "Demo simulation ended",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not stop demo mode",
        variant: "destructive",
      });
    }
  };

  const handleStartWorkout = async () => {
    try {
      await fetch("http://localhost:5000/api/set_exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise: selectedExercise }),
      });
      await fetch("http://localhost:5000/api/reset_reps", { method: "POST" });
      toast({
        title: "Workout Started",
        description: `Starting ${selectedExercise} tracking`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not start workout",
        variant: "destructive",
      });
    }
  };

  const handleModeChange = async (newMode: string) => {
    try {
      const response = await fetch("http://localhost:5000/api/set_mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode })
      });
      const data = await response.json();
      // Immediately clear any workout-only UI when switching to normal mode
      if (newMode === 'normal') {
        setSensorData((prev) => ({ ...prev, formScore: 0, feedback: '' } as SensorData));
      }
      setMode(newMode);
      toast({ title: 'Mode set', description: `Mode: ${newMode}` });
    } catch (err) {
      toast({ title: 'Error', description: 'Could not set mode', variant: 'destructive' });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const body = { height_cm: Number(heightCm), weight_kg: Number(weightKg), age: Number(age) };
      const response = await fetch("http://localhost:5000/api/set_profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      toast({ title: 'Profile saved', description: `Height ${data.profile.height_cm}cm • Weight ${data.profile.weight_kg}kg` });
    } catch (err) {
      toast({ title: 'Error', description: 'Could not save profile', variant: 'destructive' });
    }
  };

  const handleResetSteps = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/reset_steps", {
        method: "POST",
      });
      const data = await response.json();
      // optimistic UI update
      setSensorData((prev) => ({ ...prev, stepCount: 0 } as SensorData));
      toast({ title: 'Steps reset', description: 'Step counter has been reset' });
    } catch (err) {
      toast({ title: 'Error', description: 'Could not reset steps', variant: 'destructive' });
    }
  };

  const handleResetReps = async () => {
    try {
      await fetch("http://localhost:5000/api/reset_reps", { method: "POST" });
      toast({
        title: "Reps Reset",
        description: "Rep counter has been reset",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not reset reps",
        variant: "destructive",
      });
    }
  };

  const handleToggleLogging = async () => {
    try {
      const endpoint = isLogging ? "/api/stop_logging" : "/api/start_logging";
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
      });
      const data = await response.json();
      setIsLogging(!isLogging);
      
      if (!isLogging) {
        toast({
          title: "📊 Logging Started",
          description: "Recording workout data to CSV file...",
        });
      } else {
        const points = data.data_points || 0;
        if (points > 0) {
          toast({
            title: "✅ Logging Stopped",
            description: `Saved ${points} data points to ${data.filename || 'CSV file'}`,
            duration: 5000,
          });
          // Refresh logs list
          fetchLogs();
        } else {
          toast({
            title: "Logging Stopped",
            description: data.message || "No data was recorded",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not toggle logging",
        variant: "destructive",
      });
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/logs");
      const data = await response.json();
      setAvailableLogs(data.logs || []);
    } catch (error) {
      console.error("Could not fetch logs:", error);
    }
  };

  const handleDownloadLog = async (filename: string) => {
    try {
      window.open(`http://localhost:5000/api/logs/${filename}`, '_blank');
      toast({
        title: "📥 Downloading CSV",
        description: `Downloading ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not download log file",
        variant: "destructive",
      });
    }
  };

  const handleViewLogs = async () => {
    await fetchLogs();
    setShowLogs(!showLogs);
  };

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-xl">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      AI Fitness Trainer
                    </h1>
                    <p className="text-sm text-muted-foreground">Real-time form analysis and rep counting</p>
                  </div>
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  {isLogging && (
                    <Badge className="px-4 py-2 text-sm font-medium bg-blue-500/20 text-blue-500 border-blue-500/30 animate-pulse">
                      <Save className="w-4 h-4 mr-2" />
                      Recording Data
                    </Badge>
                  )}
                  <Link to="/profile">
                    <Button variant="outline" className="border-primary/50 hover:bg-primary/10">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  <Badge 
                    className={`px-4 py-2 text-sm font-medium ${
                      connected 
                        ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                        : 'bg-red-500/20 text-red-500 border-red-500/30'
                    }`}
                  >
                    {connected ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
                    {connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connection Card */}
        {!connected && (
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated mb-8">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-primary" />
                Connect to ESP32
              </CardTitle>
              <CardDescription>Enter your ESP32 WebSocket URL to start tracking your workout</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="esp32-url" className="text-sm font-medium">ESP32 WebSocket URL</Label>
                  <Input
                    id="esp32-url"
                    value={esp32Url}
                    onChange={(e) => setEsp32Url(e.target.value)}
                    placeholder="ws://192.168.1.100:81"
                    className="bg-secondary/50 mt-2 h-11"
                  />
                </div>
                <div className="flex items-end gap-3">
                  <Button onClick={handleConnect} className="bg-gradient-to-r from-primary to-accent hover:shadow-glow h-11 px-6">
                    <Wifi className="w-4 h-4 mr-2" />
                    Connect
                  </Button>
                  <Button 
                      onClick={() => handleStartDemo("bicep_curl")} 
                      variant="outline" 
                      className="border-primary/50 hover:bg-primary/10 h-11 px-6"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Demo Mode
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {connected && (
          <>
            {/* Controls */}
            {mode === 'workout' ? (
              <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated mb-8">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="text-lg">Workout Controls</CardTitle>
                    <CardDescription>Configure and control your workout session</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="lg:col-span-1">
                        <Label htmlFor="exercise" className="text-sm font-medium">Exercise Type</Label>
                        <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                          <SelectTrigger id="exercise" className="bg-secondary/50 mt-2 h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bicep_curl">💪 Bicep Curls</SelectItem>
                            <SelectItem value="lateral_raise">🦾 Lateral Raises</SelectItem>
                            <SelectItem value="shoulder_press">🏋️ Shoulder Press</SelectItem>
                            <SelectItem value="running">🏃 Running</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleStartWorkout} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-glow hover:shadow-green-500/20 mt-auto h-11">
                        <Play className="w-4 h-4 mr-2" />
                        Start Workout
                      </Button>
                      <Button onClick={handleResetReps} variant="outline" className="border-accent/50 hover:bg-accent/10 mt-auto h-11">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset Reps
                      </Button>
                      <Button 
                        onClick={handleToggleLogging} 
                        variant={isLogging ? "destructive" : "outline"}
                        className={!isLogging ? "border-primary/50 hover:bg-primary/10" : ""}
                      >
                        {isLogging ? <Pause className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {isLogging ? "Stop Logging" : "Start Logging"}
                      </Button>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <Button 
                        onClick={handleViewLogs}
                        variant="outline"
                        className={`border-blue-500/50 text-blue-500 hover:bg-blue-500/10 ${availableLogs.length > 0 ? 'animate-pulse' : ''}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {showLogs ? 'Hide' : 'View'} CSV Logs {availableLogs.length > 0 && `(${availableLogs.length})`}
                      </Button>
                      <Button 
                        onClick={() => {
                          handleDisconnect();
                          handleStopDemo();
                        }} 
                        variant="outline" 
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                      >
                        <WifiOff className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            ) : (
              <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated mb-8">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="text-lg">Normal Mode</CardTitle>
                  <CardDescription>Background monitoring: steps, activity and heart rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">In Normal mode the system focuses on continuous monitoring (steps, activity, HR). Switch to Workout to track reps and form for wrist exercises.</p>
                    <div className="flex gap-2">
                      <Button onClick={() => handleModeChange('workout')} className="h-10">Switch to Workout</Button>
                      <Button variant="outline" className="h-10" onClick={() => handleStartDemo('bicep_curl')}>Run Demo (Bicep)</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CSV Logs Viewer */}
            {showLogs && (
              <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated mb-8">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-500" />
                    Available CSV Logs
                  </CardTitle>
                  <CardDescription>Download your recorded workout data</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {availableLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No logs available yet. Start logging to record workout data!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableLogs.map((log) => (
                        <div 
                          key={log.filename}
                          className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all border border-border/50"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">{log.filename}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(log.created).toLocaleString()} • {(log.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDownloadLog(log.filename)}
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {mode === 'workout' ? (
                    <RepCounter 
                      repCount={sensorData.repCount} 
                      exercise={selectedExercise}
                    />
                  ) : (
                    <div />
                  )}

                  {mode === 'workout' ? (
                    <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border-blue-500/30 hover:shadow-glow hover:shadow-blue-500/20 transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Gauge className="w-5 h-5 text-blue-500" />
                          Form Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-5xl font-bold text-blue-500 mb-2">
                          {sensorData.formScore || 0}
                          <span className="text-2xl text-muted-foreground">/100</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {sensorData.feedback || "Ready to start"}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div />
                  )}

                  <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated">
                    <CardHeader className="border-b border-border/50">
                      <CardTitle className="text-lg">Mode & Profile</CardTitle>
                      <CardDescription>Normal vs Workout • User profile for calories/speed</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Mode</Label>
                          <Select value={mode} onValueChange={handleModeChange}>
                            <SelectTrigger className="mt-2 h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="workout">Workout</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Height (cm)</Label>
                            <Input value={heightCm} onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Weight (kg)</Label>
                            <Input value={weightKg} onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Age</Label>
                            <Input value={age} onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1" />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={handleSaveProfile} className="h-10">Save Profile</Button>
                          <Button onClick={() => handleModeChange(mode === 'normal' ? 'workout' : 'normal')} variant="outline" className="h-10">Toggle Mode</Button>
                          <Button onClick={handleResetSteps} variant="destructive" className="h-10">Reset Steps</Button>
                        </div>

                        <div className="pt-2 border-t border-border/30">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 rounded-lg bg-secondary/20">
                              <div className="text-xs text-muted-foreground">Steps</div>
                              <div className="text-2xl font-bold">{sensorData.stepCount ?? 0}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary/20">
                              <div className="text-xs text-muted-foreground">Activity</div>
                              <div className="text-2xl font-bold">{sensorData.activity ?? 'unknown'}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary/20">
                              <div className="text-xs text-muted-foreground">Speed (km/h)</div>
                              <div className="text-2xl font-bold">{sensorData.runningSpeedKmh?.toFixed(2) ?? '0.00'}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary/20">
                              <div className="text-xs text-muted-foreground">Calories</div>
                              <div className="text-2xl font-bold">{sensorData.caloriesTotal?.toFixed(2) ?? '0.00'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

            {/* Heart Rate Waveform */}
            <div className="mb-8">
              <HeartRateWaveform 
                heartRate={sensorData.heartRate}
                pulse={sensorData.pulse}
                beatDetected={sensorData.beatDetected}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Sensor Visualization - Takes up 2 columns */}
              <div className={mode === 'workout' ? "lg:col-span-2" : "lg:col-span-3"}>
                <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated h-full transition-all duration-300 hover:shadow-xl">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary animate-pulse" />
                      3D Motion Visualization
                    </CardTitle>
                    <CardDescription>Real-time device orientation and acceleration vectors</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <SensorVisualizer sensorData={sensorData} />
                  </CardContent>
                </Card>
              </div>

              {/* Form Feedback - Takes up 1 column (only visible in workout mode) */}
              {mode === 'workout' && (
                <div className="transition-all duration-300">
                  <FormFeedback 
                    formScore={sensorData.formScore || 0}
                    feedback={sensorData.feedback || "Ready to start"}
                  />
                </div>
              )}
            </div>

            {/* Orientation Metrics */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated mb-8 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Device Orientation & Motion
                </CardTitle>
                <CardDescription>Real-time 3-axis rotation and acceleration data</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-primary/20">
                    <div className="text-xs font-semibold text-primary mb-1">PITCH</div>
                    <div className="text-sm text-muted-foreground mb-3">Forward/Backward Tilt</div>
                    <div className="text-4xl font-bold text-primary transition-all duration-300">{sensorData.pitch.toFixed(1)}°</div>
                  </div>
                  <div className="text-center p-5 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-accent/20">
                    <div className="text-xs font-semibold text-accent mb-1">ROLL</div>
                    <div className="text-sm text-muted-foreground mb-3">Left/Right Tilt</div>
                    <div className="text-4xl font-bold text-accent transition-all duration-300">{sensorData.roll.toFixed(1)}°</div>
                  </div>
                  <div className="text-center p-5 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-success/20">
                    <div className="text-xs font-semibold text-success mb-1">YAW</div>
                    <div className="text-sm text-muted-foreground mb-3">Rotation (Compass)</div>
                    <div className="text-4xl font-bold text-success transition-all duration-300">{sensorData.yaw.toFixed(1)}°</div>
                  </div>
                  <div className="text-center p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20">
                    <div className="text-xs font-semibold text-blue-500 mb-1">VERTICAL</div>
                    <div className="text-sm text-muted-foreground mb-3">Z-Axis Acceleration</div>
                    <div className="text-4xl font-bold text-blue-500 transition-all duration-300">{sensorData.az.toFixed(2)} g</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Sensor Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Accelerometer
                  </CardTitle>
                  <CardDescription>Linear acceleration in g-force units</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary transition-all duration-300 hover:from-primary/20">
                      <span className="text-sm font-medium">X-Axis (Forward/Back)</span>
                      <span className="text-2xl font-bold text-primary transition-all duration-300">{sensorData.ax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent transition-all duration-300 hover:from-accent/20">
                      <span className="text-sm font-medium">Y-Axis (Left/Right)</span>
                      <span className="text-2xl font-bold text-accent transition-all duration-300">{sensorData.ay.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-success/10 to-transparent border-l-4 border-success transition-all duration-300 hover:from-success/20">
                      <span className="text-sm font-medium">Z-Axis (Up/Down)</span>
                      <span className="text-2xl font-bold text-success transition-all duration-300">{sensorData.az.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-elevated transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    Gyroscope
                  </CardTitle>
                  <CardDescription>Angular velocity in degrees per second</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary transition-all duration-300 hover:from-primary/20">
                      <span className="text-sm font-medium">X-Axis (Pitch Rate)</span>
                      <span className="text-2xl font-bold text-primary transition-all duration-300">{sensorData.gx.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent transition-all duration-300 hover:from-accent/20">
                      <span className="text-sm font-medium">Y-Axis (Roll Rate)</span>
                      <span className="text-2xl font-bold text-accent transition-all duration-300">{sensorData.gy.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-success/10 to-transparent border-l-4 border-success transition-all duration-300 hover:from-success/20">
                      <span className="text-sm font-medium">Z-Axis (Yaw Rate)</span>
                      <span className="text-2xl font-bold text-success transition-all duration-300">{sensorData.gz.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
