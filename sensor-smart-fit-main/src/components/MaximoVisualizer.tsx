import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MaximoVisualizerProps {
  sensorData?: {
    pitch: number;
    roll: number;
    yaw: number;
    ax: number;
    ay: number;
    az: number;
  };
  exercise: string;
}

const MaximoVisualizer = ({ sensorData, exercise }: MaximoVisualizerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mouse controls
  const mouseRef = useRef({ x: 0, y: 0, isDragging: false, lastX: 0, lastY: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(4);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x4a90e2, 0.3);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a3e,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 20, 0x4a90e2, 0x2a2a3e);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Create stick figure model
    createStickFigure(scene);

    // Mouse event handlers
    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isDragging = true;
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (mouseRef.current.isDragging) {
        const deltaX = e.clientX - mouseRef.current.lastX;
        const deltaY = e.clientY - mouseRef.current.lastY;
        
        rotationRef.current.y += deltaX * 0.01;
        rotationRef.current.x += deltaY * 0.01;
        
        mouseRef.current.lastX = e.clientX;
        mouseRef.current.lastY = e.clientY;
      }
    };

    const handleMouseUp = () => {
      mouseRef.current.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current += e.deltaY * 0.01;
      zoomRef.current = Math.max(2, Math.min(10, zoomRef.current));
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Update camera position based on rotation
      const radius = zoomRef.current;
      camera.position.x = radius * Math.sin(rotationRef.current.y) * Math.cos(rotationRef.current.x);
      camera.position.y = radius * Math.sin(rotationRef.current.x) + 1.5;
      camera.position.z = radius * Math.cos(rotationRef.current.y) * Math.cos(rotationRef.current.x);
      camera.lookAt(0, 1, 0);

      // Update model based on sensor data
      if (modelRef.current && sensorData) {
        updateModelFromSensorData(sensorData);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    setLoading(false);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, []);

  const createStickFigure = (scene: THREE.Scene) => {
    const model = new THREE.Group();
    model.name = 'stickFigure';

    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a90e2,
      roughness: 0.5,
      metalness: 0.3
    });
    
    const jointMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x66b3ff,
      roughness: 0.3,
      metalness: 0.5
    });

    // Helper function to create limb
    const createLimb = (length: number, name: string) => {
      const geometry = new THREE.CylinderGeometry(0.03, 0.03, length, 8);
      const mesh = new THREE.Mesh(geometry, bodyMaterial);
      mesh.name = name;
      mesh.castShadow = true;
      return mesh;
    };

    // Helper function to create joint
    const createJoint = (name: string) => {
      const geometry = new THREE.SphereGeometry(0.05, 16, 16);
      const mesh = new THREE.Mesh(geometry, jointMaterial);
      mesh.name = name;
      mesh.castShadow = true;
      return mesh;
    };

    // Create body parts hierarchy
    
    // Pelvis (root)
    const pelvis = new THREE.Group();
    pelvis.name = 'pelvis';
    pelvis.position.set(0, 1, 0);

    // Spine
    const spine = createLimb(0.5, 'spine');
    spine.position.y = 0.25;
    pelvis.add(spine);

    // Chest
    const chest = new THREE.Group();
    chest.name = 'chest';
    chest.position.y = 0.5;
    pelvis.add(chest);

    // Head
    const neck = createLimb(0.15, 'neck');
    neck.position.y = 0.075;
    chest.add(neck);
    
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      bodyMaterial
    );
    head.name = 'head';
    head.position.y = 0.27;
    head.castShadow = true;
    chest.add(head);

    // Left Arm
    const leftShoulder = new THREE.Group();
    leftShoulder.name = 'leftShoulder';
    leftShoulder.position.set(-0.15, 0, 0);
    chest.add(leftShoulder);

    const leftUpperArm = createLimb(0.3, 'leftUpperArm');
    leftUpperArm.position.y = -0.15;
    leftShoulder.add(leftUpperArm);

    const leftElbow = new THREE.Group();
    leftElbow.name = 'leftElbow';
    leftElbow.position.y = -0.3;
    leftShoulder.add(leftElbow);

    const leftForearm = createLimb(0.3, 'leftForearm');
    leftForearm.position.y = -0.15;
    leftElbow.add(leftForearm);

    const leftHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      jointMaterial
    );
    leftHand.name = 'leftHand';
    leftHand.position.y = -0.3;
    leftHand.castShadow = true;
    leftElbow.add(leftHand);

    // Right Arm
    const rightShoulder = new THREE.Group();
    rightShoulder.name = 'rightShoulder';
    rightShoulder.position.set(0.15, 0, 0);
    chest.add(rightShoulder);

    const rightUpperArm = createLimb(0.3, 'rightUpperArm');
    rightUpperArm.position.y = -0.15;
    rightShoulder.add(rightUpperArm);

    const rightElbow = new THREE.Group();
    rightElbow.name = 'rightElbow';
    rightElbow.position.y = -0.3;
    rightShoulder.add(rightElbow);

    const rightForearm = createLimb(0.3, 'rightForearm');
    rightForearm.position.y = -0.15;
    rightElbow.add(rightForearm);

    const rightHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      jointMaterial
    );
    rightHand.name = 'rightHand';
    rightHand.position.y = -0.3;
    rightHand.castShadow = true;
    rightElbow.add(rightHand);

    // Left Leg
    const leftHip = new THREE.Group();
    leftHip.name = 'leftHip';
    leftHip.position.set(-0.1, -0.05, 0);
    pelvis.add(leftHip);

    const leftThigh = createLimb(0.4, 'leftThigh');
    leftThigh.position.y = -0.2;
    leftHip.add(leftThigh);

    const leftKnee = new THREE.Group();
    leftKnee.name = 'leftKnee';
    leftKnee.position.y = -0.4;
    leftHip.add(leftKnee);

    const leftCalf = createLimb(0.4, 'leftCalf');
    leftCalf.position.y = -0.2;
    leftKnee.add(leftCalf);

    const leftFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.05, 0.15),
      jointMaterial
    );
    leftFoot.name = 'leftFoot';
    leftFoot.position.set(0, -0.425, 0.04);
    leftFoot.castShadow = true;
    leftKnee.add(leftFoot);

    // Right Leg
    const rightHip = new THREE.Group();
    rightHip.name = 'rightHip';
    rightHip.position.set(0.1, -0.05, 0);
    pelvis.add(rightHip);

    const rightThigh = createLimb(0.4, 'rightThigh');
    rightThigh.position.y = -0.2;
    rightHip.add(rightThigh);

    const rightKnee = new THREE.Group();
    rightKnee.name = 'rightKnee';
    rightKnee.position.y = -0.4;
    rightHip.add(rightKnee);

    const rightCalf = createLimb(0.4, 'rightCalf');
    rightCalf.position.y = -0.2;
    rightKnee.add(rightCalf);

    const rightFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.05, 0.15),
      jointMaterial
    );
    rightFoot.name = 'rightFoot';
    rightFoot.position.set(0, -0.425, 0.04);
    rightFoot.castShadow = true;
    rightKnee.add(rightFoot);

    // Add pelvis to model
    model.add(pelvis);
    
    // Add model to scene
    scene.add(model);
    modelRef.current = model;
  };

  const updateModelFromSensorData = (data: {
    pitch: number;
    roll: number;
    yaw: number;
  }) => {
    if (!modelRef.current) return;

    const { pitch, roll, yaw } = data;
    
    // Convert degrees to radians
    const pitchRad = THREE.MathUtils.degToRad(pitch);
    const rollRad = THREE.MathUtils.degToRad(roll);
    const yawRad = THREE.MathUtils.degToRad(yaw);

    // Apply transformations based on exercise type
    switch (exercise) {
      case 'squat':
        updateSquatPose(pitchRad, rollRad, yawRad);
        break;
      case 'pushup':
        updatePushupPose(pitchRad, rollRad, yawRad);
        break;
      case 'bicep_curl':
        updateBicepCurlPose(pitchRad, rollRad, yawRad);
        break;
      default:
        resetPose();
    }
  };

  const findByName = (name: string): THREE.Object3D | undefined => {
    return modelRef.current?.getObjectByName(name);
  };

  const updateSquatPose = (pitch: number, roll: number, yaw: number) => {
    // Map pitch to squat depth (more negative = deeper squat)
    const squatDepth = Math.max(-1, Math.min(0, pitch / 60)); // -60° = full squat
    
    const pelvis = findByName('pelvis');
    if (pelvis) {
      // Lower the pelvis
      pelvis.position.y = 1 + squatDepth * 0.4;
      // Slight forward tilt
      pelvis.rotation.x = pitch * 0.01;
      pelvis.rotation.z = roll * 0.01;
    }

    // Bend knees
    const leftKnee = findByName('leftKnee');
    const rightKnee = findByName('rightKnee');
    const bendAngle = Math.abs(squatDepth) * 2.5;
    
    if (leftKnee) leftKnee.rotation.x = bendAngle;
    if (rightKnee) rightKnee.rotation.x = bendAngle;

    // Bend hips forward
    const leftHip = findByName('leftHip');
    const rightHip = findByName('rightHip');
    const hipBend = -Math.abs(squatDepth) * 1.2;
    
    if (leftHip) leftHip.rotation.x = hipBend;
    if (rightHip) rightHip.rotation.x = hipBend;

    // Lean torso forward slightly
    const chest = findByName('chest');
    if (chest) {
      chest.rotation.x = squatDepth * 0.3;
    }
  };

  const updatePushupPose = (pitch: number, roll: number, yaw: number) => {
    // Map pitch to pushup depth (0-40°)
    const pushupDepth = Math.max(0, Math.min(1, pitch / 40));
    
    const pelvis = findByName('pelvis');
    if (pelvis) {
      // Adjust body height
      pelvis.position.y = 0.5 + (1 - pushupDepth) * 0.3;
      pelvis.rotation.x = -Math.PI / 4; // Plank position
      pelvis.rotation.z = roll * 0.01;
    }

    // Bend elbows during pushup
    const leftElbow = findByName('leftElbow');
    const rightElbow = findByName('rightElbow');
    const elbowBend = pushupDepth * 2.2;
    
    if (leftElbow) leftElbow.rotation.x = elbowBend;
    if (rightElbow) rightElbow.rotation.x = elbowBend;

    // Arms out to sides
    const leftShoulder = findByName('leftShoulder');
    const rightShoulder = findByName('rightShoulder');
    
    if (leftShoulder) {
      leftShoulder.rotation.z = Math.PI / 4;
      leftShoulder.rotation.x = -Math.PI / 2;
    }
    if (rightShoulder) {
      rightShoulder.rotation.z = -Math.PI / 4;
      rightShoulder.rotation.x = -Math.PI / 2;
    }
  };

  const updateBicepCurlPose = (pitch: number, roll: number, yaw: number) => {
    // Map pitch to curl position (0-90°)
    const curlAmount = Math.max(0, Math.min(1, pitch / 90));
    
    const pelvis = findByName('pelvis');
    if (pelvis) {
      pelvis.position.y = 1;
      pelvis.rotation.x = roll * 0.005;
      pelvis.rotation.z = roll * 0.01;
    }

    // Right arm curl
    const rightShoulder = findByName('rightShoulder');
    const rightElbow = findByName('rightElbow');
    
    if (rightShoulder) {
      // Keep upper arm at side
      rightShoulder.rotation.x = 0;
      rightShoulder.rotation.z = -0.2;
    }
    
    if (rightElbow) {
      // Curl forearm up
      rightElbow.rotation.x = -curlAmount * 2.5;
    }

    // Left arm relaxed
    const leftShoulder = findByName('leftShoulder');
    const leftElbow = findByName('leftElbow');
    
    if (leftShoulder) {
      leftShoulder.rotation.x = 0;
      leftShoulder.rotation.z = 0.2;
    }
    
    if (leftElbow) {
      leftElbow.rotation.x = 0.3; // Slight bend
    }

    // Slight torso compensation (bad form indicator)
    const chest = findByName('chest');
    if (chest && curlAmount > 0.7) {
      chest.rotation.x = -curlAmount * 0.2; // Lean back slightly
    }
  };

  const resetPose = () => {
    const pelvis = findByName('pelvis');
    if (pelvis) {
      pelvis.position.y = 1;
      pelvis.rotation.set(0, 0, 0);
    }

    // Reset all joints
    const joints = [
      'leftShoulder', 'rightShoulder',
      'leftElbow', 'rightElbow',
      'leftHip', 'rightHip',
      'leftKnee', 'rightKnee',
      'chest'
    ];

    joints.forEach(name => {
      const joint = findByName(name);
      if (joint) joint.rotation.set(0, 0, 0);
    });
  };

  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        className="w-full h-[400px] rounded-lg overflow-hidden border border-border/50 cursor-move"
      />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading 3D model...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-4 right-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground">
          Drag to rotate • Scroll to zoom
        </p>
      </div>

      {sensorData && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground">
            Pitch: {sensorData.pitch.toFixed(1)}° | 
            Roll: {sensorData.roll.toFixed(1)}° | 
            Yaw: {sensorData.yaw.toFixed(1)}°
          </p>
        </div>
      )}
    </div>
  );
};

export default MaximoVisualizer;