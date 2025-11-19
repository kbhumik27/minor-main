import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HumanVisualizerProps {
  pitch: number;
  roll: number;
  yaw: number;
  exercise: string;
}

const HumanVisualizer: React.FC<HumanVisualizerProps> = ({ pitch, roll, yaw, exercise }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const bodyPartsRef = useRef<{
    torso: THREE.Group;
    head: THREE.Mesh;
    leftUpperArm: THREE.Group;
    rightUpperArm: THREE.Group;
    leftForearm: THREE.Mesh;
    rightForearm: THREE.Mesh;
    leftThigh: THREE.Group;
    rightThigh: THREE.Group;
    leftCalf: THREE.Mesh;
    rightCalf: THREE.Mesh;
    hips: THREE.Group;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 5, 15);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 1, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0x00ffff, 1);
    spotLight.position.set(3, 5, 3);
    spotLight.castShadow = true;
    scene.add(spotLight);

    const backLight = new THREE.PointLight(0xff00ff, 0.5);
    backLight.position.set(-3, 3, -3);
    scene.add(backLight);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2e,
      roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const gridHelper = new THREE.GridHelper(10, 20, 0x00ffff, 0x333344);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Materials
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x00d4ff,
      emissive: 0x001a33,
      shininess: 100
    });
    
    const jointMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff3366,
      emissive: 0x330011,
      shininess: 100
    });

    // BUILD HUMAN MODEL WITH PROPER HIERARCHY

    // Main hips group (root of skeleton)
    const hips = new THREE.Group();
    hips.position.y = 0.9;

    // Torso
    const torso = new THREE.Group();
    const torsoMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.25, 0.7, 8),
      bodyMaterial
    );
    torsoMesh.castShadow = true;
    torsoMesh.position.y = 0.35;
    torso.add(torsoMesh);
    hips.add(torso);

    // Head (child of torso)
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      bodyMaterial
    );
    headMesh.castShadow = true;
    headMesh.position.y = 0.85;
    torso.add(headMesh);

    // Neck
    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8),
      bodyMaterial
    );
    neckMesh.position.y = 0.72;
    torso.add(neckMesh);

    // LEFT ARM
    const leftUpperArm = new THREE.Group();
    leftUpperArm.position.set(-0.3, 0.55, 0);
    
    const leftUpperArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.45, 8),
      bodyMaterial
    );
    leftUpperArmMesh.castShadow = true;
    leftUpperArmMesh.position.y = -0.225;
    leftUpperArm.add(leftUpperArmMesh);
    
    const leftShoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      jointMaterial
    );
    leftShoulder.position.y = 0;
    leftUpperArm.add(leftShoulder);
    
    const leftForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.4, 8),
      bodyMaterial
    );
    leftForearm.castShadow = true;
    leftForearm.position.y = -0.425;
    leftUpperArm.add(leftForearm);
    
    const leftElbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      jointMaterial
    );
    leftElbow.position.y = -0.225;
    leftUpperArm.add(leftElbow);
    
    torso.add(leftUpperArm);

    // RIGHT ARM
    const rightUpperArm = new THREE.Group();
    rightUpperArm.position.set(0.3, 0.55, 0);
    
    const rightUpperArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.45, 8),
      bodyMaterial
    );
    rightUpperArmMesh.castShadow = true;
    rightUpperArmMesh.position.y = -0.225;
    rightUpperArm.add(rightUpperArmMesh);
    
    const rightShoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      jointMaterial
    );
    rightShoulder.position.y = 0;
    rightUpperArm.add(rightShoulder);
    
    const rightForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.4, 8),
      bodyMaterial
    );
    rightForearm.castShadow = true;
    rightForearm.position.y = -0.425;
    rightUpperArm.add(rightForearm);
    
    const rightElbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      jointMaterial
    );
    rightElbow.position.y = -0.225;
    rightUpperArm.add(rightElbow);
    
    torso.add(rightUpperArm);

    // LEFT LEG
    const leftThigh = new THREE.Group();
    leftThigh.position.set(-0.12, 0, 0);
    
    const leftThighMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.09, 0.5, 8),
      bodyMaterial
    );
    leftThighMesh.castShadow = true;
    leftThighMesh.position.y = -0.25;
    leftThigh.add(leftThighMesh);
    
    const leftHip = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      jointMaterial
    );
    leftHip.position.y = 0;
    leftThigh.add(leftHip);
    
    const leftCalf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.07, 0.5, 8),
      bodyMaterial
    );
    leftCalf.castShadow = true;
    leftCalf.position.y = -0.5;
    leftThigh.add(leftCalf);
    
    const leftKnee = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 8, 8),
      jointMaterial
    );
    leftKnee.position.y = -0.25;
    leftThigh.add(leftKnee);
    
    const leftFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.22),
      bodyMaterial
    );
    leftFoot.position.set(0, -0.76, 0.08);
    leftThigh.add(leftFoot);
    
    hips.add(leftThigh);

    // RIGHT LEG
    const rightThigh = new THREE.Group();
    rightThigh.position.set(0.12, 0, 0);
    
    const rightThighMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.09, 0.5, 8),
      bodyMaterial
    );
    rightThighMesh.castShadow = true;
    rightThighMesh.position.y = -0.25;
    rightThigh.add(rightThighMesh);
    
    const rightHip = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      jointMaterial
    );
    rightHip.position.y = 0;
    rightThigh.add(rightHip);
    
    const rightCalf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.07, 0.5, 8),
      bodyMaterial
    );
    rightCalf.castShadow = true;
    rightCalf.position.y = -0.5;
    rightThigh.add(rightCalf);
    
    const rightKnee = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 8, 8),
      jointMaterial
    );
    rightKnee.position.y = -0.25;
    rightThigh.add(rightKnee);
    
    const rightFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.22),
      bodyMaterial
    );
    rightFoot.position.set(0, -0.76, 0.08);
    rightThigh.add(rightFoot);
    
    hips.add(rightThigh);

    scene.add(hips);

    // Store references
    bodyPartsRef.current = {
      torso,
      head: headMesh,
      leftUpperArm,
      rightUpperArm,
      leftForearm,
      rightForearm,
      leftThigh,
      rightThigh,
      leftCalf,
      rightCalf,
      hips
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update pose based on sensor data
  useEffect(() => {
    if (!bodyPartsRef.current) return;

    const parts = bodyPartsRef.current;
    
    // Handle undefined or null values
    const safePitch = pitch ?? 0;
    const safeRoll = roll ?? 0;
    const safeYaw = yaw ?? 0;
    
    // Reset all rotations
    parts.hips.rotation.set(0, 0, 0);
    parts.torso.rotation.set(0, 0, 0);
    parts.leftUpperArm.rotation.set(0, 0, 0);
    parts.rightUpperArm.rotation.set(0, 0, 0);
    parts.leftThigh.rotation.set(0, 0, 0);
    parts.rightThigh.rotation.set(0, 0, 0);

    const pitchRad = (safePitch * Math.PI) / 180;
    const rollRad = (safeRoll * Math.PI) / 180;

    console.log(`Exercise: ${exercise}, Pitch: ${safePitch.toFixed(1)}°, Roll: ${safeRoll.toFixed(1)}°`);

    if (exercise === 'squat') {
      // SQUAT: Pitch controls depth (-90 to 0)
      // Negative pitch = squatting down
      const normalizedPitch = Math.max(-90, Math.min(0, safePitch));
      const squatDepth = Math.abs(normalizedPitch) / 90; // 0 = standing, 1 = deep squat
      
      console.log(`Squat depth: ${(squatDepth * 100).toFixed(0)}%`);
      
      // Lower the hips
      parts.hips.position.y = 0.9 - (squatDepth * 0.45);
      
      // Lean torso forward
      parts.torso.rotation.x = squatDepth * 0.5;
      
      // Bend legs at hips
      parts.leftThigh.rotation.x = squatDepth * 1.2;
      parts.rightThigh.rotation.x = squatDepth * 1.2;
      
      // Bend knees (calves rotate opposite direction)
      parts.leftCalf.rotation.x = -squatDepth * 1.5;
      parts.rightCalf.rotation.x = -squatDepth * 1.5;
      
      // Arms go forward for balance
      parts.leftUpperArm.rotation.x = squatDepth * 1.2;
      parts.rightUpperArm.rotation.x = squatDepth * 1.2;
      parts.leftUpperArm.rotation.z = 0.1;
      parts.rightUpperArm.rotation.z = -0.1;
      
      // Roll affects balance
      parts.hips.rotation.z = rollRad * 0.4;

    } else if (exercise === 'pushup') {
      // PUSHUP: Pitch controls up/down (0 = up, 40 = down)
      const normalizedPitch = Math.max(0, Math.min(45, safePitch));
      const pushupDepth = normalizedPitch / 45; // 0 = up, 1 = down
      
      console.log(`Pushup depth: ${(pushupDepth * 100).toFixed(0)}%`);
      
      // Rotate body to plank position
      parts.hips.rotation.x = Math.PI / 2;
      parts.hips.position.y = 0.5 + (pushupDepth * 0.2);
      
      // Legs straight back
      parts.leftThigh.rotation.x = 0;
      parts.rightThigh.rotation.x = 0;
      
      // Arms bend during pushup
      parts.leftUpperArm.rotation.x = -Math.PI / 2;
      parts.rightUpperArm.rotation.x = -Math.PI / 2;
      parts.leftUpperArm.rotation.z = 0.8 + (pushupDepth * 0.6);
      parts.rightUpperArm.rotation.z = -0.8 - (pushupDepth * 0.6);
      
      // Forearms bend
      parts.leftForearm.rotation.z = -pushupDepth * 1.2;
      parts.rightForearm.rotation.z = pushupDepth * 1.2;
      
      // Roll affects alignment
      parts.hips.rotation.y = rollRad * 0.3;

    } else if (exercise === 'bicep_curl') {
      // BICEP CURL: Pitch controls curl angle (0 = down, 120 = fully curled)
      const normalizedPitch = Math.max(0, Math.min(120, safePitch));
      const curlAmount = normalizedPitch / 120; // 0 = extended, 1 = fully curled
      
      console.log(`Curl amount: ${(curlAmount * 100).toFixed(0)}%`);
      
      // Keep body upright
      parts.hips.position.y = 0.9;
      parts.torso.rotation.x = -curlAmount * 0.15; // Slight lean back
      
      // Position arms at sides
      parts.leftUpperArm.rotation.x = -0.3;
      parts.rightUpperArm.rotation.x = -0.3;
      parts.leftUpperArm.rotation.z = 0.3;
      parts.rightUpperArm.rotation.z = -0.3;
      
      // Curl forearms up
      parts.leftForearm.rotation.z = curlAmount * 2.6;
      parts.rightForearm.rotation.z = -curlAmount * 2.6;
      
      // Adjust forearm position for natural curl
      parts.leftForearm.position.x = curlAmount * 0.05;
      parts.rightForearm.position.x = -curlAmount * 0.05;
      
      // Roll affects stability
      parts.torso.rotation.z = rollRad * 0.3;

    } else {
      // READY / DEFAULT POSE
      parts.hips.position.y = 0.9;
      parts.torso.rotation.x = pitchRad * 0.2;
      parts.torso.rotation.z = rollRad * 0.2;
      parts.leftUpperArm.rotation.z = 0.15;
      parts.rightUpperArm.rotation.z = -0.15;
    }

  }, [pitch, roll, yaw, exercise]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '300px',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#0a0a1a',
        border: '2px solid #00ffff33',
        boxShadow: '0 0 20px rgba(0,255,255,0.2)'
      }} 
    />
  );
};

export default HumanVisualizer;