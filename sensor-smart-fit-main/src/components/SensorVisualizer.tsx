import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Compass, Move3d } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SensorData {
  ax: number;
  ay: number;
  az: number;
  gx?: number;
  gy?: number;
  gz?: number;
  pitch: number;
  roll: number;
  yaw: number;
}

interface SensorVisualizerProps {
  sensorData: SensorData;
}

const SensorVisualizer = ({ sensorData }: SensorVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prevData, setPrevData] = useState(sensorData);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Smooth interpolation between previous and current data
    const lerpFactor = 0.15;
    const smoothData = {
      ax: prevData.ax + (sensorData.ax - prevData.ax) * lerpFactor,
      ay: prevData.ay + (sensorData.ay - prevData.ay) * lerpFactor,
      az: prevData.az + (sensorData.az - prevData.az) * lerpFactor,
      pitch: prevData.pitch + (sensorData.pitch - prevData.pitch) * lerpFactor,
      roll: prevData.roll + (sensorData.roll - prevData.roll) * lerpFactor,
      yaw: prevData.yaw + (sensorData.yaw - prevData.yaw) * lerpFactor,
    };
    setPrevData(smoothData);

    // Clear canvas
    ctx.fillStyle = "rgba(31, 41, 55, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "rgba(99, 102, 241, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw 3D cube representing device orientation
    const size = 80;
    const pitch = (smoothData.pitch * Math.PI) / 180;
    const roll = (smoothData.roll * Math.PI) / 180;
    const yaw = (smoothData.yaw * Math.PI) / 180;

    // Calculate 3D cube vertices
    const vertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];

    // Rotate vertices with smooth transitions
    const rotatedVertices = vertices.map(([x, y, z]) => {
      // Rotate around X (pitch)
      const y1 = y * Math.cos(pitch) - z * Math.sin(pitch);
      const z1 = y * Math.sin(pitch) + z * Math.cos(pitch);
      
      // Rotate around Y (roll)
      const x1 = x * Math.cos(roll) + z1 * Math.sin(roll);
      const z2 = -x * Math.sin(roll) + z1 * Math.cos(roll);
      
      // Rotate around Z (yaw)
      const x2 = x1 * Math.cos(yaw) - y1 * Math.sin(yaw);
      const y2 = x1 * Math.sin(yaw) + y1 * Math.cos(yaw);

      return [x2 * size + centerX, y2 * size + centerY, z2];
    });

    // Draw cube edges with depth
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Back face
      [4, 5], [5, 6], [6, 7], [7, 4], // Front face
      [0, 4], [1, 5], [2, 6], [3, 7]  // Connecting edges
    ];

    edges.forEach(([start, end]) => {
      const [x1, y1, z1] = rotatedVertices[start];
      const [x2, y2, z2] = rotatedVertices[end];
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, `rgba(34, 211, 238, ${0.3 + z1 * 0.3})`);
      gradient.addColorStop(1, `rgba(251, 146, 60, ${0.3 + z2 * 0.3})`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Draw acceleration vector
    const accelScale = 50;
    const accelX = centerX + smoothData.ax * accelScale;
    const accelY = centerY + smoothData.ay * accelScale;
    
    const accelGradient = ctx.createLinearGradient(centerX, centerY, accelX, accelY);
    accelGradient.addColorStop(0, "rgba(34, 211, 238, 0.8)");
    accelGradient.addColorStop(1, "rgba(34, 211, 238, 0.2)");
    
    ctx.strokeStyle = accelGradient;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(accelX, accelY);
    ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(accelY - centerY, accelX - centerX);
    ctx.fillStyle = "rgba(34, 211, 238, 0.8)";
    ctx.beginPath();
    ctx.moveTo(accelX, accelY);
    ctx.lineTo(accelX - 10 * Math.cos(angle - Math.PI / 6), accelY - 10 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(accelX - 10 * Math.cos(angle + Math.PI / 6), accelY - 10 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Draw labels
    ctx.fillStyle = "rgba(203, 213, 225, 0.8)";
    ctx.font = "14px sans-serif";
    ctx.fillText("Acceleration Vector", 20, 30);

  }, [sensorData, prevData]);

  const totalAccel = Math.sqrt(sensorData.ax ** 2 + sensorData.ay ** 2 + sensorData.az ** 2);
  const totalGyro = sensorData.gx && sensorData.gy && sensorData.gz 
    ? Math.sqrt(sensorData.gx ** 2 + sensorData.gy ** 2 + sensorData.gz ** 2)
    : 0;

  return (
    <div className="space-y-4">
      <canvas 
        ref={canvasRef} 
        className="w-full h-[450px] rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-border/30 shadow-lg transition-all duration-300 hover:shadow-xl"
      />
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Move3d className="w-4 h-4 text-orange-500" />
            <div className="text-xs font-semibold text-orange-500">ACCEL X</div>
          </div>
          <div className="text-2xl font-bold text-orange-500 transition-all duration-300">{sensorData.ax.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">g-force</div>
        </div>
        
        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Move3d className="w-4 h-4 text-cyan-500" />
            <div className="text-xs font-semibold text-cyan-500">ACCEL Y</div>
          </div>
          <div className="text-2xl font-bold text-cyan-500 transition-all duration-300">{sensorData.ay.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">g-force</div>
        </div>
        
        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Move3d className="w-4 h-4 text-green-500" />
            <div className="text-xs font-semibold text-green-500">ACCEL Z</div>
          </div>
          <div className="text-2xl font-bold text-green-500 transition-all duration-300">{sensorData.az.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">g-force</div>
        </div>
        
        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-500" />
            <div className="text-xs font-semibold text-purple-500">MAGNITUDE</div>
          </div>
          <div className="text-2xl font-bold text-purple-500 transition-all duration-300">{totalAccel.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">total g</div>
        </div>
        
        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Compass className="w-4 h-4 text-blue-500" />
            <div className="text-xs font-semibold text-blue-500">YAW (HEADING)</div>
          </div>
          <div className="text-2xl font-bold text-blue-500 transition-all duration-300">{sensorData.yaw.toFixed(1)}°</div>
          <div className="text-xs text-muted-foreground mt-1">rotation</div>
        </div>
        
        {totalGyro > 0 && (
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-pink-500" />
              <div className="text-xs font-semibold text-pink-500">GYRO</div>
            </div>
            <div className="text-2xl font-bold text-pink-500 transition-all duration-300">{totalGyro.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground mt-1">°/s</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SensorVisualizer;
