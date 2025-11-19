import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Activity } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface HeartRateWaveformProps {
  heartRate: number;
  pulse: number;
  beatDetected: boolean;
}

const HeartRateWaveform = ({ heartRate, pulse, beatDetected }: HeartRateWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ppgData, setPpgData] = useState<number[]>(new Array(100).fill(512));
  const animationRef = useRef<number>();

  useEffect(() => {
    // Update PPG waveform with real pulse data
    setPpgData(prevData => {
      const newPpgData = [...prevData];
      newPpgData.shift();
      
      // Use actual pulse value from backend (PPG sensor reading)
      // Add small variation for realistic display
      const newValue = pulse + Math.random() * 10 - 5;
      
      newPpgData.push(newValue);
      return newPpgData;
    });
  }, [pulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      // Set canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // Clear canvas
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = "rgba(239, 68, 68, 0.1)";
      ctx.lineWidth = 1;
      
      // Horizontal lines
      for (let i = 0; i < canvas.height; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      
      // Vertical lines
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      // Draw center line
      ctx.strokeStyle = "rgba(239, 68, 68, 0.2)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw PPG waveform
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.3)");
      gradient.addColorStop(0.5, "rgba(239, 68, 68, 0.8)");
      gradient.addColorStop(1, "rgba(239, 68, 68, 1)");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.beginPath();

      const stepX = canvas.width / ppgData.length;
      const scaleY = canvas.height / 1024;

      ppgData.forEach((value, index) => {
        const x = index * stepX;
        const y = canvas.height - value * scaleY;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw glow effect for recent beat
      if (beatDetected) {
        const lastX = canvas.width - stepX * 5;
        const lastY = canvas.height - ppgData[ppgData.length - 5] * scaleY;
        
        const glowGradient = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 40);
        glowGradient.addColorStop(0, "rgba(239, 68, 68, 0.8)");
        glowGradient.addColorStop(1, "rgba(239, 68, 68, 0)");
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw labels
      ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
      ctx.font = "12px sans-serif";
      ctx.fillText("PPG Signal", 10, 20);
      ctx.fillText(`${heartRate} BPM`, canvas.width - 70, 20);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ppgData, heartRate, beatDetected]);

  const getHeartRateZone = (hr: number) => {
    if (hr < 60) return { zone: "Resting", color: "text-blue-500" };
    if (hr < 100) return { zone: "Light", color: "text-green-500" };
    if (hr < 140) return { zone: "Moderate", color: "text-yellow-500" };
    if (hr < 170) return { zone: "Hard", color: "text-orange-500" };
    return { zone: "Maximum", color: "text-red-500" };
  };

  const zone = getHeartRateZone(heartRate);

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-red-500/30 shadow-elevated transition-all duration-300 hover:shadow-xl hover:shadow-red-500/20">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className={`w-5 h-5 text-red-500 ${beatDetected ? 'animate-pulse' : ''}`} />
          Heart Rate Monitor
        </CardTitle>
        <CardDescription>Real-time PPG waveform and pulse detection</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Waveform Canvas */}
        <div className="mb-6">
          <canvas 
            ref={canvasRef} 
            className="w-full h-[200px] rounded-lg border border-red-500/20 shadow-lg"
          />
        </div>

        {/* Heart Rate Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-red-500" />
              <div className="text-xs font-semibold text-red-500">HEART RATE</div>
            </div>
            <div className="text-3xl font-bold text-red-500">{heartRate}</div>
            <div className="text-xs text-muted-foreground mt-1">BPM</div>
          </div>

          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-pink-500" />
              <div className="text-xs font-semibold text-pink-500">PULSE</div>
            </div>
            <div className="text-3xl font-bold text-pink-500">{pulse}</div>
            <div className="text-xs text-muted-foreground mt-1">signal</div>
          </div>

          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-500" />
              <div className="text-xs font-semibold text-purple-500">ZONE</div>
            </div>
            <div className={`text-xl font-bold ${zone.color}`}>{zone.zone}</div>
            <div className="text-xs text-muted-foreground mt-1">intensity</div>
          </div>
        </div>

        {/* Beat Indicator */}
        {beatDetected && (
          <div className="mt-4 flex items-center justify-center gap-2 text-red-500 animate-pulse">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium">Beat Detected</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HeartRateWaveform;
