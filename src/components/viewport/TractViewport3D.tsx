/**
 * 3D Anatomical GI Tract & Robotic Capsule Viewport
 * Built with Three.js WebGL rendering for 60 FPS spatial inspection.
 * Displays translucent GI tract, 4-coil magnetic actuation rig, 6 UWB anchors, and trajectory trail.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSimulation } from '../../context/SimulationContext';
import { evaluateGIPathPoint, PATHOLOGY_CLASSES } from '../../engine/environment/giTractGeometry';
import { Eye, RotateCcw, Maximize2, Compass, Layers, AlertOctagon } from 'lucide-react';

export const TractViewport3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    capsule,
    parameters,
    currentEstimate,
    uniqueLoggedLesions,
    activeNavTab,
    pressureData,
    trajectory,
    collisionAlerts,
    deflectCapsuleFromWall,
  } = useSimulation();

  const [viewPreset, setViewPreset] = useState<'perspective' | 'top' | 'side'>('perspective');
  const [showAnchors, setShowAnchors] = useState<boolean>(true);
  const [showCoils, setShowCoils] = useState<boolean>(true);
  const [showFieldLines, setShowFieldLines] = useState<boolean>(true);
  const [showRangingRays, setShowRangingRays] = useState<boolean>(true);

  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const capsuleMeshRef = useRef<THREE.Group | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const anchorMeshesRef = useRef<THREE.Group[]>([]);
  const coilMeshesRef = useRef<THREE.Group[]>([]);
  const lesionMarkersRef = useRef<THREE.Group[]>([]);
  const collisionMarkersRef = useRef<THREE.Group[]>([]);
  const rangingLinesRef = useRef<THREE.LineSegments | null>(null);
  const fieldLinesGroupRef = useRef<THREE.Group | null>(null);
  const tractMeshRef = useRef<THREE.Mesh | null>(null);

  // Mouse interaction state
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    radius: 340,
  });

  // Setup Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.0012);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(220, 200, 260);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight1.position.set(150, 300, 200);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight2.position.set(-200, -100, -150);
    scene.add(dirLight2);

    // Coordinate Grid (subtle light grid lines)
    const gridHelper = new THREE.GridHelper(400, 20, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = -100;
    scene.add(gridHelper);

    // 5. Construct GI Tract Tube Geometry
    updateTractMesh(scene, parameters.pathType);

    // 6. Capsule Robot Model Group
    const capsuleGroup = new THREE.Group();
    
    // Titanium Body Cylinder (11mm dia x 26mm length)
    const bodyGeo = new THREE.CylinderGeometry(5.5, 5.5, 20, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.25,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.rotation.x = Math.PI / 2;
    capsuleGroup.add(bodyMesh);

    // Front Optical Dome (transparent polycarbonate)
    const domeGeo = new THREE.SphereGeometry(5.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.9,
      opacity: 0.85,
      transparent: true,
      roughness: 0.1,
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    domeMesh.position.z = 10;
    capsuleGroup.add(domeMesh);

    // LED Ring Light
    const ledRingGeo = new THREE.TorusGeometry(4.2, 0.6, 8, 16);
    const ledRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ledRing = new THREE.Mesh(ledRingGeo, ledRingMat);
    ledRing.position.z = 9.8;
    capsuleGroup.add(ledRing);

    // Forward Spotlight
    const spotLight = new THREE.SpotLight(0xffffff, 4, 80, Math.PI / 4, 0.5);
    spotLight.position.set(0, 0, 10);
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, 0, 50);
    capsuleGroup.add(spotLight);
    capsuleGroup.add(spotTarget);
    spotLight.target = spotTarget;

    // Internal Neodymium Magnet Cylinder (gold plated)
    const magnetGeo = new THREE.CylinderGeometry(3.5, 3.5, 12, 16);
    const magnetMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.1,
    });
    const magnetMesh = new THREE.Mesh(magnetGeo, magnetMat);
    magnetMesh.rotation.x = Math.PI / 2;
    capsuleGroup.add(magnetMesh);

    scene.add(capsuleGroup);
    capsuleMeshRef.current = capsuleGroup;

    // 7. Trajectory Line
    const trajGeo = new THREE.BufferGeometry();
    const trajPositions = new Float32Array(500 * 3);
    trajGeo.setAttribute('position', new THREE.BufferAttribute(trajPositions, 3));
    const trajMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
    const trajLine = new THREE.Line(trajGeo, trajMat);
    scene.add(trajLine);
    trajectoryLineRef.current = trajLine;

    // 8. Ranging rays linesegments
    const rayGeo = new THREE.BufferGeometry();
    const rayPos = new Float32Array(6 * 2 * 3);
    rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPos, 3));
    const rayMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45 });
    const rayLines = new THREE.LineSegments(rayGeo, rayMat);
    scene.add(rayLines);
    rangingLinesRef.current = rayLines;

    // 9. Rebuild Anchors & Coils
    rebuildAnchors(scene, parameters.anchors);
    rebuildCoils(scene, parameters.coils);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update GI Tract mesh when path type changes
  const updateTractMesh = (scene: THREE.Scene, pathType: string) => {
    if (tractMeshRef.current) {
      scene.remove(tractMeshRef.current);
      tractMeshRef.current.geometry.dispose();
    }

    const points: THREE.Vector3[] = [];
    const samples = 80;
    for (let i = 0; i <= samples; i++) {
      const u = i / samples;
      const pt = evaluateGIPathPoint(pathType as any, u);
      points.push(new THREE.Vector3(pt[0], pt[1], pt[2]));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 100, 14, 20, false);
    const tubeMat = new THREE.MeshPhysicalMaterial({
      color: 0xec4899,
      roughness: 0.35,
      metalness: 0.05,
      transmission: 0.82,
      opacity: 0.65,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: false,
    });

    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tubeMesh);
    tractMeshRef.current = tubeMesh;
  };

  // Rebuild anchors in 3D scene
  const rebuildAnchors = (scene: THREE.Scene, anchors: typeof parameters.anchors) => {
    anchorMeshesRef.current.forEach((g) => scene.remove(g));
    anchorMeshesRef.current = [];

    anchors.forEach((a) => {
      const g = new THREE.Group();
      g.position.set(a.position[0], a.position[1], a.position[2]);

      // Anchor node housing (cyan sphere + antenna ring)
      const sphGeo = new THREE.SphereGeometry(6, 16, 16);
      const sphMat = new THREE.MeshStandardMaterial({
        color: a.enabled ? 0x06b6d4 : 0x64748b,
        emissive: a.enabled ? 0x0891b2 : 0x000000,
        emissiveIntensity: 0.4,
        metalness: 0.8,
        roughness: 0.2,
      });
      g.add(new THREE.Mesh(sphGeo, sphMat));

      // Antenna beacon ring
      const ringGeo = new THREE.TorusGeometry(8, 0.8, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);

      scene.add(g);
      anchorMeshesRef.current.push(g);
    });
  };

  // Rebuild electromagnetic coils
  const rebuildCoils = (scene: THREE.Scene, coils: typeof parameters.coils) => {
    coilMeshesRef.current.forEach((g) => scene.remove(g));
    coilMeshesRef.current = [];

    coils.forEach((c) => {
      const g = new THREE.Group();
      g.position.set(c.position[0], c.position[1], c.position[2]);

      // Copper Solenoid Cylinder
      const coilGeo = new THREE.CylinderGeometry(c.radiusMm * 0.4, c.radiusMm * 0.4, c.lengthMm * 0.4, 24);
      const coilMat = new THREE.MeshStandardMaterial({
        color: c.active ? 0xd97706 : 0x475569,
        metalness: 0.9,
        roughness: 0.3,
        wireframe: false,
      });
      const mesh = new THREE.Mesh(coilGeo, coilMat);

      // Align cylinder with coil axis
      const axis = new THREE.Vector3(c.axis[0], c.axis[1], c.axis[2]).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
      g.add(mesh);

      // Core iron shaft
      const coreGeo = new THREE.CylinderGeometry(c.radiusMm * 0.15, c.radiusMm * 0.15, c.lengthMm * 0.45, 16);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.1 });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.quaternion.copy(mesh.quaternion);
      g.add(coreMesh);

      scene.add(g);
      coilMeshesRef.current.push(g);
    });
  };

  // React to parameter changes
  useEffect(() => {
    if (sceneRef.current) {
      updateTractMesh(sceneRef.current, parameters.pathType);
      rebuildAnchors(sceneRef.current, parameters.anchors);
      rebuildCoils(sceneRef.current, parameters.coils);
    }
  }, [parameters.pathType, parameters.anchors, parameters.coils]);

  // Update capsule pose and ranging rays every render frame
  useEffect(() => {
    if (!capsuleMeshRef.current) return;
    capsuleMeshRef.current.position.set(capsule.x, capsule.y, capsule.z);
    capsuleMeshRef.current.rotation.set(capsule.roll, capsule.pitch, capsule.yaw);

    // Update capsule optical dome color and spotlight on collision hazard
    if (capsuleMeshRef.current) {
      capsuleMeshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhysicalMaterial) {
          if (pressureData.thresholdExceeded) {
            child.material.color.setHex(0xf43f5e);
            child.material.emissive.setHex(0xe11d48);
            child.material.emissiveIntensity = 0.8;
          } else {
            child.material.color.setHex(0x38bdf8);
            child.material.emissive.setHex(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }
      });
    }

    // Update UWB ranging rays to enabled anchors
    if (rangingLinesRef.current && showRangingRays) {
      const posAttr = rangingLinesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      let ptr = 0;
      parameters.anchors.forEach((a) => {
        if (!a.enabled) return;
        // From capsule
        posAttr.setXYZ(ptr++, capsule.x, capsule.y, capsule.z);
        // To anchor
        posAttr.setXYZ(ptr++, a.position[0], a.position[1], a.position[2]);
      });
      posAttr.needsUpdate = true;
      rangingLinesRef.current.visible = true;
    } else if (rangingLinesRef.current) {
      rangingLinesRef.current.visible = false;
    }

    // Toggle visibility of coils and anchors
    anchorMeshesRef.current.forEach((g) => (g.visible = showAnchors));
    coilMeshesRef.current.forEach((g) => (g.visible = showCoils));
  }, [capsule, parameters.anchors, showAnchors, showCoils, showRangingRays, pressureData.thresholdExceeded]);

  // Update Trajectory Buffer in 3D Scene
  useEffect(() => {
    if (!trajectoryLineRef.current) return;
    const line = trajectoryLineRef.current;
    const posAttr = line.geometry.attributes.position as THREE.BufferAttribute;

    const count = Math.min(trajectory.length, 500);
    for (let i = 0; i < count; i++) {
      const pt = trajectory[i].groundTruth;
      posAttr.setXYZ(i, pt[0], pt[1], pt[2]);
    }
    line.geometry.setDrawRange(0, count);
    posAttr.needsUpdate = true;

    // Dynamically highlight trajectory line on collision or safe transit
    if (line.material instanceof THREE.LineBasicMaterial) {
      if (pressureData.thresholdExceeded) {
        line.material.color.setHex(0xf43f5e); // Red hazard warning
      } else if (pressureData.maxPressureKpa >= parameters.pressureThresholdKpa * 0.75) {
        line.material.color.setHex(0xf59e0b); // Amber proximity warning
      } else {
        line.material.color.setHex(0x10b981); // Emerald nominal clearance
      }
    }
  }, [trajectory, pressureData.thresholdExceeded, pressureData.maxPressureKpa, parameters.pressureThresholdKpa]);

  // Update 3D Collision Alert Markers along Trajectory
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    collisionMarkersRef.current.forEach((m) => scene.remove(m));
    collisionMarkersRef.current = [];

    collisionAlerts.forEach((alert) => {
      // Find matching trajectory point near alert timestamp
      const match = trajectory.find((t) => Math.abs(t.timestamp - alert.timestampSec) < 1.0);
      const pos = match ? match.groundTruth : null;
      if (!pos) return;

      const g = new THREE.Group();
      g.position.set(pos[0], pos[1], pos[2]);

      // Impingement Warning Beacon
      const beaconGeo = new THREE.OctahedronGeometry(3.5, 0);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: alert.resolved ? 0x10b981 : 0xf43f5e,
      });
      g.add(new THREE.Mesh(beaconGeo, beaconMat));

      // Warning Ring
      const ringGeo = new THREE.RingGeometry(4.5, 6, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: alert.resolved ? 0x10b981 : 0xf43f5e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);

      scene.add(g);
      collisionMarkersRef.current.push(g);
    });
  }, [collisionAlerts, trajectory]);

  // Update 3D Lesion Markers
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    lesionMarkersRef.current.forEach((m) => scene.remove(m));
    lesionMarkersRef.current = [];

    uniqueLoggedLesions.forEach((l) => {
      const g = new THREE.Group();
      g.position.set(l.worldPositionMm[0], l.worldPositionMm[1], l.worldPositionMm[2]);

      const cls = PATHOLOGY_CLASSES.find((c) => c.id === l.classId);
      const hexColor = cls ? parseInt(cls.color.replace('#', '0x')) : 0xef4444;

      // Beacon Marker Pin
      const pinGeo = new THREE.SphereGeometry(3.5, 12, 12);
      const pinMat = new THREE.MeshBasicMaterial({ color: hexColor });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      g.add(pin);

      // Stalk line into tissue
      const stalkGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -8, 0),
      ]);
      const stalkMat = new THREE.LineBasicMaterial({ color: hexColor });
      g.add(new THREE.Line(stalkGeo, stalkMat));

      scene.add(g);
      lesionMarkersRef.current.push(g);
    });
  }, [uniqueLoggedLesions]);

  // Camera preset views
  const applyViewPreset = (preset: 'perspective' | 'top' | 'side') => {
    if (!cameraRef.current) return;
    setViewPreset(preset);
    if (preset === 'perspective') {
      cameraAngleRef.current = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 340 };
    } else if (preset === 'top') {
      cameraAngleRef.current = { theta: 0.001, phi: Math.PI / 2, radius: 360 };
    } else if (preset === 'side') {
      cameraAngleRef.current = { theta: Math.PI / 2, phi: 0, radius: 360 };
    }
    updateCameraFromAngles();
  };

  const updateCameraFromAngles = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);
  };

  // Mouse orbit controls handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !cameraRef.current) return;
    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    cameraAngleRef.current.theta -= dx * 0.008;
    cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngleRef.current.phi - dy * 0.008));
    updateCameraFromAngles();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraAngleRef.current.radius = Math.max(100, Math.min(600, cameraAngleRef.current.radius + e.deltaY * 0.2));
    updateCameraFromAngles();
  };

  return (
    <div className="relative w-full h-full min-h-[440px] bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xs flex flex-col">
      {/* 3D Canvas Stage */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing select-none"
      />

      {/* Top Floating Viewport HUD Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Left Telemetry Badges */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-xs">
          <span className="font-semibold text-slate-800">3D ANATOMICAL VIEWPORT</span>
          <span className="text-slate-400">·</span>
          <span className="font-mono text-cyan-600 font-medium">
            X:{capsule.x.toFixed(1)} Y:{capsule.y.toFixed(1)} Z:{capsule.z.toFixed(1)} mm
          </span>
          <span className="text-slate-400">·</span>
          <span className="font-mono text-emerald-600 font-medium">
            DIST: {capsule.transitDistanceMm.toFixed(1)} mm
          </span>
        </div>

        {/* Right Perspective Controls */}
        <div className="flex items-center gap-1 pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-xs">
          <button
            onClick={() => applyViewPreset('perspective')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              viewPreset === 'perspective' ? 'bg-cyan-50 text-cyan-700 border border-cyan-300 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3D Orbit
          </button>
          <button
            onClick={() => applyViewPreset('top')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              viewPreset === 'top' ? 'bg-cyan-50 text-cyan-700 border border-cyan-300 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Top Coronal
          </button>
          <button
            onClick={() => applyViewPreset('side')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              viewPreset === 'side' ? 'bg-cyan-50 text-cyan-700 border border-cyan-300 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lateral Sagittal
          </button>
        </div>
      </div>

      {/* Floating 3D Wall Collision Warning Alert Badge */}
      {pressureData.thresholdExceeded && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-auto bg-white/95 border-2 border-rose-500 text-rose-900 px-4 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-2.5 shadow-xl animate-pulse z-10 backdrop-blur-md">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
          <span>WALL COLLISION: {pressureData.maxPressureKpa} kPa &gt; {parameters.pressureThresholdKpa} kPa</span>
          <button
            onClick={deflectCapsuleFromWall}
            className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-sans font-semibold transition-all active:scale-95 shadow-xs"
          >
            Auto-Deflect ({pressureData.estimatedPressurePointMm}mm)
          </button>
        </div>
      )}

      {/* Bottom Floating Layer Toggles & Landmark Legend */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Layer Visibility Checkers */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 shadow-xs">
          <Layers className="w-3.5 h-3.5 text-cyan-600 mr-1" />
          <button
            onClick={() => setShowAnchors(!showAnchors)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              showAnchors ? 'bg-cyan-50 text-cyan-800 border border-cyan-300 font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            UWB Anchors ({parameters.anchors.filter((a) => a.enabled).length})
          </button>
          <button
            onClick={() => setShowCoils(!showCoils)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              showCoils ? 'bg-amber-50 text-amber-800 border border-amber-300 font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            4-Coil Actuators
          </button>
          <button
            onClick={() => setShowRangingRays(!showRangingRays)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              showRangingRays ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            RF Ranging Rays
          </button>
        </div>

        {/* Lesions Count Tag */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 shadow-xs flex items-center gap-2">
          <span>Logged Lesions:</span>
          <span className="font-mono font-semibold text-rose-600">{uniqueLoggedLesions.length}</span>
          <span className="text-slate-300">·</span>
          <span>Curvature:</span>
          <span className="capitalize text-slate-700 font-medium">{parameters.pathType}</span>
        </div>
      </div>
    </div>
  );
};
