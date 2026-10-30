/**
 * EndoSim-WCE System Types & State Definitions
 * Multi-physics simulation for Wireless Capsule Endoscopy
 */

export type GIPathType = 'straight' | 'curved' | 'spiral' | 'phantom';

export type LocomotionMode = 'peristalsis' | 'magnetic' | 'pressure-guided' | 'manual-step';

export type LocalizationAlgorithmType = 'trilateration' | 'tdoa-chan' | 'ekf' | 'particle-filter';

export type DetectionModelType = 'rtmdet-tiny' | 'rtmdet-s' | 'yolov3' | 'ssd300';

export interface TissueLayerProperties {
  id: 'skin' | 'fat' | 'muscle' | 'intestine';
  name: string;
  thicknessMm: number;
  relativePermittivity: number; // ε_r @ 4 GHz
  conductivity: number;         // σ (S/m) @ 4 GHz
  pathLossExponent: number;     // β
}

export interface AnchorNode {
  id: number;
  name: string;
  position: [number, number, number]; // [x, y, z] in mm
  enabled: boolean;
  frequencyGhz: number;
}

export interface CoilConfig {
  id: number;
  name: string;
  position: [number, number, number]; // mm
  axis: [number, number, number];     // orientation vector [dx, dy, dz]
  radiusMm: number;
  lengthMm: number;
  turnsPerMeter: number;
  currentAmps: number;                // 0 - 50 A
  active: boolean;
}

export interface CapsuleState {
  // Pose
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
  vx: number;
  vy: number;
  vz: number;
  
  // Motion statistics
  progress: number; // 0 to 1 along GI path
  transitDistanceMm: number;
  stepCount: number;
  stepSizeMm: number;
  isHolding: boolean;
  
  // Physics parameters
  massGrams: number;
  magnetizationAm: number; // A/m (default: 1.2e6)
  frictionCoeff: number;
  
  // Electromagnetic force vector acting on capsule
  magneticForceN: [number, number, number];
  magneticFieldB: [number, number, number]; // Tesla
}

export interface PressureSensorNode {
  id: number;
  phiDeg: number;   // azimuth
  thetaDeg: number; // elevation
  pressureKpa: number;
  isExceeded: boolean;
}

export interface PathologyClassDef {
  id: string;
  name: string;
  color: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  clinicalDescription: string;
}

export interface DetectedLesion {
  id: string;
  classId: string;
  className: string;
  confidence: number;
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in normalized 0-1
  timestampSec: number;
  capsulePositionMm: [number, number, number];
  worldPositionMm: [number, number, number];
  depthMm: number;
  distanceFromStartMm: number;
  anatomicalRegion: string;
  notes?: string;
  thumbnailUrl?: string;
}

export interface LocalizationEstimate {
  timestampSec: number;
  groundTruth: [number, number, number];
  trilateration: [number, number, number];
  tdoaChan: [number, number, number];
  ekf: [number, number, number];
  particleFilter: [number, number, number];
  crlbBoundMm: number;
  errors: {
    trilateration: number;
    tdoaChan: number;
    ekf: number;
    particleFilter: number;
  };
}

export interface TrajectoryPoint {
  timestamp: number;
  groundTruth: [number, number, number];
  estimated: [number, number, number];
  orientation: [number, number, number]; // roll, pitch, yaw
  pressureMaxKpa: number;
  stepSizeMm: number;
  lesionDetected?: DetectedLesion;
}

export interface TelemetryDataPoint {
  timeSec: number;
  magFluxDensityMt: number; // |B| in mT
  magBx: number;            // Bx in mT
  magBy: number;            // By in mT
  magBz: number;            // Bz in mT
  magForceMn: number;       // Lorentz force in mN
  avgSnrDb: number;         // Average UWB SNR in dB
  anchor1SnrDb: number;     // Anchor 1 SNR
  anchor2SnrDb: number;     // Anchor 2 SNR
  anchor3SnrDb: number;     // Anchor 3 SNR
  avgPathLossDb: number;    // Path loss in dB
  maxPressureKpa: number;   // Wall stress in kPa
  distanceMm: number;       // Progress distance in mm
}

export interface CollisionAlertEvent {
  id: string;
  timestampSec: number;
  maxPressureKpa: number;
  contactNodesCount: number;
  estimatedDeflectionMm: number;
  anatomicalRegion: string;
  transitDistanceMm: number;
  resolved: boolean;
}

export interface SimulationParameters {
  // Environment
  pathType: GIPathType;
  tissues: TissueLayerProperties[];
  peristalsisAmpMm: number;
  peristalsisFreqHz: number;
  lumenDiameterMm: number;
  
  // Localization & RF
  anchors: AnchorNode[];
  shadowingSigmaDb: number;
  referenceDistanceMm: number;
  particleCount: number;
  processNoiseQ: number;
  measurementNoiseR: number;
  activeLocalizationAlgorithm: LocalizationAlgorithmType;
  
  // Locomotion & Magnetic
  coils: CoilConfig[];
  capsuleMassG: number;
  magnetMagnetization: number;
  frictionCoeff: number;
  nominalStepSizeMm: number;
  pressureThresholdKpa: number;
  locomotionMode: LocomotionMode;
  
  // Vision & Detection
  detectionModel: DetectionModelType;
  confidenceThreshold: number;
  nmsIouThreshold: number;
  inputResolution: number;
  spotlightIntensity: number;
  mucosaShininess: number;
}

export interface PatientProfile {
  patientId: string;
  name: string;
  age: number;
  gender: string;
  indication: string;
  capsuleSerial: string;
  examDate: string;
  attendingPhysician: string;
}
