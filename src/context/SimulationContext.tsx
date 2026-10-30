/**
 * EndoSim-WCE Central Simulation Orchestrator
 * Synchronizes 60 FPS physics, UWB localization, magnetic locomotion, and vision detection.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  AnchorNode,
  CapsuleState,
  CoilConfig,
  DetectedLesion,
  GIPathType,
  LocalizationAlgorithmType,
  LocalizationEstimate,
  LocomotionMode,
  PatientProfile,
  PressureSensorNode,
  SimulationParameters,
  TissueLayerProperties,
  TrajectoryPoint,
  TelemetryDataPoint,
  CollisionAlertEvent,
} from '../types/simulation';
import { getPathSample, evaluateGIPathPoint, SeededLesionSite, DEFAULT_SEEDED_LESIONS } from '../engine/environment/giTractGeometry';
import { computeTotalMagneticActuation, MagneticFieldResult } from '../engine/physics/biotSavart';
import { evaluateCapsulePressure, initialize33PressureNodes, PressurePlanningResult } from '../engine/physics/pressurePlanner';
import { calculateCRLB, ChannelMeasurement, simulateUWBRanging } from '../engine/rf/uwbChannel';
import { ExtendedKalmanFilterTracker, ParticleFilterTracker, solveTDoAChan, solveTrilaterationNLS } from '../engine/rf/localizationAlgorithms';
import { runVisionDetection } from '../engine/vision/pathologyDetector';

// Default Tissue Layers according to IT'IS Foundation DB @ 4 GHz
export const DEFAULT_TISSUES: TissueLayerProperties[] = [
  { id: 'skin', name: 'Skin (Dry)', thicknessMm: 2.0, relativePermittivity: 38.0, conductivity: 1.20, pathLossExponent: 3.5 },
  { id: 'fat', name: 'Fat (Adipose)', thicknessMm: 20.0, relativePermittivity: 5.0, conductivity: 0.15, pathLossExponent: 4.5 },
  { id: 'muscle', name: 'Muscle', thicknessMm: 30.0, relativePermittivity: 50.0, conductivity: 1.50, pathLossExponent: 5.0 },
  { id: 'intestine', name: 'Small Intestine', thicknessMm: 10.0, relativePermittivity: 55.0, conductivity: 2.00, pathLossExponent: 5.5 },
];

// Default 6 UWB Anchor Array (abdominal wall ring)
export const DEFAULT_ANCHORS: AnchorNode[] = [
  { id: 1, name: 'Anchor #1 (Anterior Upper Right)', position: [110, 80, -90], enabled: true, frequencyGhz: 4.0 },
  { id: 2, name: 'Anchor #2 (Anterior Upper Left)', position: [-110, 80, -90], enabled: true, frequencyGhz: 4.0 },
  { id: 3, name: 'Anchor #3 (Anterior Mid Flank Right)', position: [130, -30, 0], enabled: true, frequencyGhz: 4.0 },
  { id: 4, name: 'Anchor #4 (Anterior Mid Flank Left)', position: [-130, -30, 0], enabled: true, frequencyGhz: 4.0 },
  { id: 5, name: 'Anchor #5 (Posterior Lower Pelvis)', position: [0, -90, 110], enabled: true, frequencyGhz: 4.0 },
  { id: 6, name: 'Anchor #6 (Posterior Lumbar Spine)', position: [0, -110, -80], enabled: true, frequencyGhz: 4.0 },
];

// Default 4 Electromagnetic Actuation Coils
export const DEFAULT_COILS: CoilConfig[] = [
  { id: 1, name: 'Coil A (Cranial +X)', position: [140, 60, -50], axis: [-1, 0, 0], radiusMm: 37.5, lengthMm: 73.0, turnsPerMeter: 438, currentAmps: 12.0, active: true },
  { id: 2, name: 'Coil B (Cranial -X)', position: [-140, 60, -50], axis: [1, 0, 0], radiusMm: 37.5, lengthMm: 73.0, turnsPerMeter: 438, currentAmps: 12.0, active: true },
  { id: 3, name: 'Coil C (Caudal +Y)', position: [0, 150, 40], axis: [0, -1, 0], radiusMm: 37.5, lengthMm: 73.0, turnsPerMeter: 438, currentAmps: 15.0, active: true },
  { id: 4, name: 'Coil D (Caudal -Y)', position: [0, -150, 40], axis: [0, 1, 0], radiusMm: 37.5, lengthMm: 73.0, turnsPerMeter: 438, currentAmps: 15.0, active: true },
];

export const DEFAULT_PARAMETERS: SimulationParameters = {
  pathType: 'curved',
  tissues: DEFAULT_TISSUES,
  peristalsisAmpMm: 2.0,
  peristalsisFreqHz: 0.1,
  lumenDiameterMm: 28.0,
  anchors: DEFAULT_ANCHORS,
  shadowingSigmaDb: 5.475,
  referenceDistanceMm: 50.0,
  particleCount: 500,
  processNoiseQ: 0.01,
  measurementNoiseR: 16.0,
  activeLocalizationAlgorithm: 'ekf',
  coils: DEFAULT_COILS,
  capsuleMassG: 7.0,
  magnetMagnetization: 1.2e6,
  frictionCoeff: 0.1,
  nominalStepSizeMm: 5.0,
  pressureThresholdKpa: 3.4,
  locomotionMode: 'magnetic',
  detectionModel: 'rtmdet-tiny',
  confidenceThreshold: 0.5,
  nmsIouThreshold: 0.5,
  inputResolution: 640,
  spotlightIntensity: 1.4,
  mucosaShininess: 30,
};

export const DEFAULT_PATIENT: PatientProfile = {
  patientId: 'PT-2026-9481',
  name: 'Eleanor Vance',
  age: 58,
  gender: 'Female',
  indication: 'Obscure gastrointestinal bleeding (OGIB) & iron-deficiency anemia',
  capsuleSerial: 'WCE-ROBOT-V3-082',
  examDate: '2026-10-12',
  attendingPhysician: 'Dr. Sarah Lin, MD (Gastroenterology)',
};

interface AlgorithmMetrics {
  rmse: number;
  mae: number;
  p95: number;
  sampleCount: number;
}

interface SimulationContextValue {
  // State
  isRunning: boolean;
  speedMultiplier: number;
  simTimeSec: number;
  capsule: CapsuleState;
  parameters: SimulationParameters;
  pressureData: PressurePlanningResult;
  magneticData: MagneticFieldResult;
  measurements: ChannelMeasurement[];
  currentEstimate: LocalizationEstimate;
  activeDetections: DetectedLesion[];
  uniqueLoggedLesions: DetectedLesion[];
  trajectory: TrajectoryPoint[];
  telemetryHistory: TelemetryDataPoint[];
  collisionAlerts: CollisionAlertEvent[];
  patient: PatientProfile;
  metrics: Record<LocalizationAlgorithmType, AlgorithmMetrics>;
  activePersona: 'clinician' | 'engineer';
  activeNavTab: string;
  replayIndex: number | null; // null if live, index if scrubbing

  // Actions
  toggleRunning: () => void;
  stepCapsule: (distanceMm?: number) => void;
  resetSimulation: () => void;
  deflectCapsuleFromWall: () => void;
  setSpeedMultiplier: (mult: number) => void;
  updateParameters: (partial: Partial<SimulationParameters>) => void;
  updateTissueLayer: (id: string, partial: Partial<TissueLayerProperties>) => void;
  updateAnchor: (id: number, partial: Partial<AnchorNode>) => void;
  updateCoil: (id: number, partial: Partial<CoilConfig>) => void;
  setActivePersona: (persona: 'clinician' | 'engineer') => void;
  setActiveNavTab: (tab: string) => void;
  setReplayIndex: (idx: number | null) => void;
  jumpToLesion: (lesion: DetectedLesion) => void;
  addClinicalNote: (lesionId: string, note: string) => void;
  setGIPathType: (pathType: GIPathType) => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [simTimeSec, setSimTimeSec] = useState<number>(0);
  const [parameters, setParameters] = useState<SimulationParameters>(DEFAULT_PARAMETERS);
  const [activePersona, setActivePersona] = useState<'clinician' | 'engineer'>('clinician');
  const [activeNavTab, setActiveNavTab] = useState<string>('overview');
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [patient] = useState<PatientProfile>(DEFAULT_PATIENT);

  // Core Capsule Pose
  const [capsule, setCapsule] = useState<CapsuleState>({
    x: 0,
    y: 0,
    z: -130,
    roll: 0,
    pitch: 0,
    yaw: 0,
    vx: 0,
    vy: 0,
    vz: 15,
    progress: 0.02,
    transitDistanceMm: 5.6,
    stepCount: 1,
    stepSizeMm: 5.0,
    isHolding: false,
    massGrams: 7.0,
    magnetizationAm: 1.2e6,
    frictionCoeff: 0.1,
    magneticForceN: [0.02, 0.01, 0.08],
    magneticFieldB: [0.005, 0.002, 0.018],
  });

  // Engines Data States
  const [pressureData, setPressureData] = useState<PressurePlanningResult>(() =>
    evaluateCapsulePressure(initialize33PressureNodes(), 0.05, [0, 0])
  );

  const [magneticData, setMagneticData] = useState<MagneticFieldResult>(() =>
    computeTotalMagneticActuation([0, 0, -130], [0, 0, 0], DEFAULT_COILS, 7.0, 1.2e6, 5.0, 0.1)
  );

  const [measurements, setMeasurements] = useState<ChannelMeasurement[]>([]);
  
  const [currentEstimate, setCurrentEstimate] = useState<LocalizationEstimate>({
    timestampSec: 0,
    groundTruth: [0, 0, -130],
    trilateration: [1.2, -0.8, -128.5],
    tdoaChan: [-0.9, 1.4, -131.2],
    ekf: [0.4, -0.2, -129.8],
    particleFilter: [0.1, 0.3, -130.1],
    crlbBoundMm: 3.42,
    errors: { trilateration: 2.1, tdoaChan: 2.3, ekf: 0.5, particleFilter: 0.4 },
  });

  const [activeDetections, setActiveDetections] = useState<DetectedLesion[]>([]);
  const [uniqueLoggedLesions, setUniqueLoggedLesions] = useState<DetectedLesion[]>([]);
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryDataPoint[]>([
    {
      timeSec: 0,
      magFluxDensityMt: 18.2,
      magBx: 4.5,
      magBy: 2.1,
      magBz: 17.5,
      magForceMn: 78.4,
      avgSnrDb: 18.5,
      anchor1SnrDb: 21.2,
      anchor2SnrDb: 19.4,
      anchor3SnrDb: 15.0,
      avgPathLossDb: 62.4,
      maxPressureKpa: 1.2,
      distanceMm: 5.6,
    },
  ]);
  const [collisionAlerts, setCollisionAlerts] = useState<CollisionAlertEvent[]>([]);

  // Performance Evaluation Metrics
  const [metrics, setMetrics] = useState<Record<LocalizationAlgorithmType, AlgorithmMetrics>>({
    'trilateration': { rmse: 4.82, mae: 3.91, p95: 8.14, sampleCount: 1 },
    'tdoa-chan': { rmse: 4.21, mae: 3.45, p95: 7.32, sampleCount: 1 },
    'ekf': { rmse: 1.86, mae: 1.42, p95: 3.12, sampleCount: 1 },
    'particle-filter': { rmse: 1.94, mae: 1.51, p95: 3.25, sampleCount: 1 },
  });

  // Trackers
  const ekfRef = useRef<ExtendedKalmanFilterTracker>(new ExtendedKalmanFilterTracker([0, 0, -130], 0.01));
  const pfRef = useRef<ParticleFilterTracker>(new ParticleFilterTracker(500, [0, 0, -130]));
  const pressureNodesRef = useRef<PressureSensorNode[]>(initialize33PressureNodes());
  const lastCollisionLogTimeRef = useRef<number>(-10);
  const errorHistoryRef = useRef<{ trilat: number[]; chan: number[]; ekf: number[]; pf: number[] }>({
    trilat: [2.1],
    chan: [2.3],
    ekf: [0.5],
    pf: [0.4],
  });

  // 60 FPS physics tick
  useEffect(() => {
    if (!isRunning || replayIndex !== null) return;

    const intervalMs = 50; // 20 Hz update for numerical stability
    const timer = setInterval(() => {
      setSimTimeSec((prevTime) => {
        const dt = (intervalMs / 1000) * speedMultiplier;
        const newTime = prevTime + dt;

        // 1. Progress capsule along path
        setCapsule((prevCap) => {
          if (prevCap.isHolding) return prevCap;

          let speedMmS = 18.0; // Base transit speed
          if (parameters.locomotionMode === 'peristalsis') {
            speedMmS = 12.0 + 8.0 * Math.sin(2 * Math.PI * parameters.peristalsisFreqHz * newTime);
          } else if (parameters.locomotionMode === 'magnetic') {
            // Magnetic force scales speed
            speedMmS = Math.min(35.0, Math.max(5.0, magneticData.magnitudeTesla * 600));
          } else if (parameters.locomotionMode === 'pressure-guided') {
            // Slow down if pressure is high
            speedMmS = pressureData.thresholdExceeded ? 6.0 : 20.0;
          }

          const totalPathLengthMm = 280.0;
          const deltaDistance = speedMmS * dt;
          let newProgress = prevCap.progress + deltaDistance / totalPathLengthMm;
          if (newProgress > 0.99) newProgress = 0.01; // loop or finish

          const sample = getPathSample(
            parameters.pathType,
            newProgress,
            parameters.lumenDiameterMm / 2,
            parameters.peristalsisAmpMm,
            parameters.peristalsisFreqHz,
            newTime
          );

          // Orientation from Frenet frame
          const pitch = Math.asin(-sample.tangent[1]);
          const yaw = Math.atan2(sample.tangent[0], sample.tangent[2]);

          const updatedCap: CapsuleState = {
            ...prevCap,
            x: sample.position[0],
            y: sample.position[1],
            z: sample.position[2],
            roll: prevCap.roll + 0.02 * dt,
            pitch,
            yaw,
            vx: sample.tangent[0] * speedMmS,
            vy: sample.tangent[1] * speedMmS,
            vz: sample.tangent[2] * speedMmS,
            progress: newProgress,
            transitDistanceMm: newProgress * totalPathLengthMm,
            magneticForceN: magneticData.forceVectorN,
            magneticFieldB: magneticData.B,
          };

          // 2. Evaluate Pressure Matrix
          const contactOffset: [number, number] = [
            Math.sin(newTime * 2) * 2.5,
            Math.cos(newTime * 2) * 2.5,
          ];
          const newPress = evaluateCapsulePressure(
            pressureNodesRef.current,
            0.08,
            contactOffset,
            parameters.pressureThresholdKpa,
            2 * Math.PI * parameters.peristalsisFreqHz * newTime
          );
          pressureNodesRef.current = newPress.nodes;
          setPressureData(newPress);

          // Collision Alert Log Trigger (when wall contact exceeds threshold)
          if (newPress.thresholdExceeded && newTime - lastCollisionLogTimeRef.current > 2.0) {
            lastCollisionLogTimeRef.current = newTime;
            const newAlert: CollisionAlertEvent = {
              id: `collision-${Math.floor(newTime * 10)}`,
              timestampSec: parseFloat(newTime.toFixed(1)),
              maxPressureKpa: newPress.maxPressureKpa,
              contactNodesCount: newPress.activeHighPressureCount,
              estimatedDeflectionMm: newPress.estimatedPressurePointMm,
              anatomicalRegion: sample.landmark || 'Intestinal Lumen',
              transitDistanceMm: parseFloat(updatedCap.transitDistanceMm.toFixed(1)),
              resolved: false,
            };
            setCollisionAlerts((prev) => [newAlert, ...prev.slice(0, 19)]);
          }

          // 3. Compute Biot-Savart Magnetic Superposition
          const newMag = computeTotalMagneticActuation(
            sample.position,
            [updatedCap.roll, pitch, yaw],
            parameters.coils,
            parameters.capsuleMassG,
            parameters.magnetMagnetization,
            parameters.nominalStepSizeMm,
            parameters.frictionCoeff
          );
          setMagneticData(newMag);

          // 4. Simulate UWB Channel Measurements
          const meas = simulateUWBRanging(
            sample.position,
            parameters.anchors,
            parameters.tissues,
            parameters.shadowingSigmaDb,
            parameters.referenceDistanceMm
          );
          setMeasurements(meas);

          // 5. Run Localization Algorithms
          const pNLS = solveTrilaterationNLS(meas, parameters.anchors, [sample.position[0] + 5, sample.position[1], sample.position[2]]);
          const pChan = solveTDoAChan(meas, parameters.anchors, pNLS);

          ekfRef.current.predict(dt);
          ekfRef.current.update(meas, parameters.anchors, parameters.measurementNoiseR);
          const pEKF = ekfRef.current.getPosition();

          pfRef.current.update(meas, parameters.anchors, [updatedCap.vx, updatedCap.vy, updatedCap.vz], dt);
          const pPF = pfRef.current.getEstimatedPosition();

          const crlb = calculateCRLB(sample.position, parameters.anchors, parameters.tissues, parameters.shadowingSigmaDb);

          // Error calculation
          const errNLS = Math.hypot(pNLS[0] - sample.position[0], pNLS[1] - sample.position[1], pNLS[2] - sample.position[2]);
          const errChan = Math.hypot(pChan[0] - sample.position[0], pChan[1] - sample.position[1], pChan[2] - sample.position[2]);
          const errEKF = Math.hypot(pEKF[0] - sample.position[0], pEKF[1] - sample.position[1], pEKF[2] - sample.position[2]);
          const errPF = Math.hypot(pPF[0] - sample.position[0], pPF[1] - sample.position[1], pPF[2] - sample.position[2]);

          const estFrame: LocalizationEstimate = {
            timestampSec: parseFloat(newTime.toFixed(2)),
            groundTruth: sample.position,
            trilateration: pNLS,
            tdoaChan: pChan,
            ekf: pEKF,
            particleFilter: pPF,
            crlbBoundMm: crlb,
            errors: {
              trilateration: parseFloat(errNLS.toFixed(2)),
              tdoaChan: parseFloat(errChan.toFixed(2)),
              ekf: parseFloat(errEKF.toFixed(2)),
              particleFilter: parseFloat(errPF.toFixed(2)),
            },
          };
          setCurrentEstimate(estFrame);

          // Update Rolling Metrics
          errorHistoryRef.current.trilat.push(errNLS);
          errorHistoryRef.current.chan.push(errChan);
          errorHistoryRef.current.ekf.push(errEKF);
          errorHistoryRef.current.pf.push(errPF);
          if (errorHistoryRef.current.trilat.length > 80) {
            errorHistoryRef.current.trilat.shift();
            errorHistoryRef.current.chan.shift();
            errorHistoryRef.current.ekf.shift();
            errorHistoryRef.current.pf.shift();
          }

          const calcMetrics = (arr: number[]): AlgorithmMetrics => {
            const sumSq = arr.reduce((acc, v) => acc + v * v, 0);
            const sum = arr.reduce((acc, v) => acc + v, 0);
            const sorted = [...arr].sort((a, b) => a - b);
            const p95Idx = Math.floor(sorted.length * 0.95);
            return {
              rmse: parseFloat(Math.sqrt(sumSq / arr.length).toFixed(2)),
              mae: parseFloat((sum / arr.length).toFixed(2)),
              p95: parseFloat((sorted[p95Idx] ?? sorted[sorted.length - 1]).toFixed(2)),
              sampleCount: arr.length,
            };
          };

          setMetrics({
            'trilateration': calcMetrics(errorHistoryRef.current.trilat),
            'tdoa-chan': calcMetrics(errorHistoryRef.current.chan),
            'ekf': calcMetrics(errorHistoryRef.current.ekf),
            'particle-filter': calcMetrics(errorHistoryRef.current.pf),
          });

          // 6. Real-Time Vision Pathology Detection
          const detections = runVisionDetection(
            newProgress,
            sample.position,
            sample.tangent,
            parameters.detectionModel,
            parameters.confidenceThreshold,
            newTime
          );
          setActiveDetections(detections);

          // Log unique lesions
          if (detections.length > 0) {
            setUniqueLoggedLesions((prev) => {
              const existingIds = new Set(prev.map((l) => l.classId));
              const newUnique = detections.filter((d) => !existingIds.has(d.classId));
              if (newUnique.length > 0) {
                return [...prev, ...newUnique];
              }
              return prev;
            });
          }

          // 7. Append Trajectory Point
          setTrajectory((prevTraj) => {
            const newPt: TrajectoryPoint = {
              timestamp: parseFloat(newTime.toFixed(2)),
              groundTruth: sample.position,
              estimated: pEKF,
              orientation: [updatedCap.roll, pitch, yaw],
              pressureMaxKpa: newPress.maxPressureKpa,
              stepSizeMm: parameters.nominalStepSizeMm,
              lesionDetected: detections[0],
            };
            const updated = [...prevTraj, newPt];
            if (updated.length > 500) updated.shift();
            return updated;
          });

          // 8. Append Telemetry Data Point (Recharts stream)
          const bMagMt = parseFloat((newMag.magnitudeTesla * 1000).toFixed(2));
          const bxMt = parseFloat((newMag.B[0] * 1000).toFixed(2));
          const byMt = parseFloat((newMag.B[1] * 1000).toFixed(2));
          const bzMt = parseFloat((newMag.B[2] * 1000).toFixed(2));
          const fMagMn = parseFloat((Math.hypot(...newMag.forceVectorN) * 1000).toFixed(2));

          const activeMeas = meas.filter((m) => {
            const anc = parameters.anchors.find((a) => a.id === m.anchorId);
            return anc && anc.enabled;
          });
          const avgSnr = activeMeas.length > 0
            ? parseFloat((activeMeas.reduce((acc, m) => acc + m.snrDb, 0) / activeMeas.length).toFixed(1))
            : 0;
          const avgLoss = activeMeas.length > 0
            ? parseFloat((activeMeas.reduce((acc, m) => acc + m.pathLossDb, 0) / activeMeas.length).toFixed(1))
            : 0;

          const m1 = meas.find((m) => m.anchorId === 1)?.snrDb ?? 0;
          const m2 = meas.find((m) => m.anchorId === 2)?.snrDb ?? 0;
          const m3 = meas.find((m) => m.anchorId === 3)?.snrDb ?? 0;

          const telePoint: TelemetryDataPoint = {
            timeSec: parseFloat(newTime.toFixed(1)),
            magFluxDensityMt: bMagMt,
            magBx: bxMt,
            magBy: byMt,
            magBz: bzMt,
            magForceMn: fMagMn,
            avgSnrDb: avgSnr,
            anchor1SnrDb: m1,
            anchor2SnrDb: m2,
            anchor3SnrDb: m3,
            avgPathLossDb: avgLoss,
            maxPressureKpa: newPress.maxPressureKpa,
            distanceMm: parseFloat(updatedCap.transitDistanceMm.toFixed(1)),
          };

          setTelemetryHistory((prev) => {
            const next = [...prev, telePoint];
            return next.length > 50 ? next.slice(next.length - 50) : next;
          });

          return updatedCap;
        });

        return newTime;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, speedMultiplier, parameters, replayIndex, magneticData.magnitudeTesla, magneticData.forceVectorN, magneticData.B, pressureData.thresholdExceeded]);

  // Actions
  const toggleRunning = () => setIsRunning((prev) => !prev);

  const stepCapsule = (distanceMm: number = parameters.nominalStepSizeMm) => {
    setCapsule((prev) => {
      const totalPathLengthMm = 280.0;
      const newProgress = Math.min(0.99, prev.progress + distanceMm / totalPathLengthMm);
      const sample = getPathSample(parameters.pathType, newProgress);
      return {
        ...prev,
        x: sample.position[0],
        y: sample.position[1],
        z: sample.position[2],
        progress: newProgress,
        transitDistanceMm: newProgress * totalPathLengthMm,
        stepCount: prev.stepCount + 1,
      };
    });
  };

  const resetSimulation = () => {
    setIsRunning(false);
    setSimTimeSec(0);
    setReplayIndex(null);
    const initialPos = evaluateGIPathPoint(parameters.pathType, 0.02);
    setCapsule({
      x: initialPos[0],
      y: initialPos[1],
      z: initialPos[2],
      roll: 0,
      pitch: 0,
      yaw: 0,
      vx: 0,
      vy: 0,
      vz: 15,
      progress: 0.02,
      transitDistanceMm: 5.6,
      stepCount: 1,
      stepSizeMm: parameters.nominalStepSizeMm,
      isHolding: false,
      massGrams: parameters.capsuleMassG,
      magnetizationAm: parameters.magnetMagnetization,
      frictionCoeff: parameters.frictionCoeff,
      magneticForceN: [0.02, 0.01, 0.08],
      magneticFieldB: [0.005, 0.002, 0.018],
    });
    ekfRef.current = new ExtendedKalmanFilterTracker(initialPos, parameters.processNoiseQ);
    pfRef.current = new ParticleFilterTracker(parameters.particleCount, initialPos);
    setTrajectory([]);
    setTelemetryHistory([]);
    setCollisionAlerts([]);
    lastCollisionLogTimeRef.current = -10;
    setUniqueLoggedLesions([]);
    setActiveDetections([]);
    errorHistoryRef.current = { trilat: [2.1], chan: [2.3], ekf: [0.5], pf: [0.4] };
  };

  const deflectCapsuleFromWall = () => {
    // Steer away from high-pressure contact point
    setCapsule((prev) => {
      const deltaPitch = pressureData.steeringCorrectionRad[0] * 1.5;
      const deltaYaw = pressureData.steeringCorrectionRad[1] * 1.5;
      return {
        ...prev,
        pitch: prev.pitch + deltaPitch,
        yaw: prev.yaw + deltaYaw,
      };
    });

    // Relieve wall contact stress on all 33 tactile nodes
    const relievedNodes = pressureNodesRef.current.map((n) => ({
      ...n,
      pressureKpa: parseFloat(Math.max(0.6, n.pressureKpa * 0.4).toFixed(2)),
      isExceeded: false,
    }));
    pressureNodesRef.current = relievedNodes;

    setPressureData((prev) => ({
      ...prev,
      nodes: relievedNodes,
      maxPressureKpa: parseFloat(Math.max(0.8, prev.maxPressureKpa * 0.4).toFixed(2)),
      thresholdExceeded: false,
      activeHighPressureCount: 0,
      estimatedPressurePointMm: 0,
    }));

    // Mark latest collision alert as resolved
    setCollisionAlerts((prev) =>
      prev.map((a, idx) => (idx === 0 ? { ...a, resolved: true } : a))
    );
  };

  const updateParameters = (partial: Partial<SimulationParameters>) => {
    setParameters((prev) => ({ ...prev, ...partial }));
  };

  const updateTissueLayer = (id: string, partial: Partial<TissueLayerProperties>) => {
    setParameters((prev) => ({
      ...prev,
      tissues: prev.tissues.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    }));
  };

  const updateAnchor = (id: number, partial: Partial<AnchorNode>) => {
    setParameters((prev) => ({
      ...prev,
      anchors: prev.anchors.map((a) => (a.id === id ? { ...a, ...partial } : a)),
    }));
  };

  const updateCoil = (id: number, partial: Partial<CoilConfig>) => {
    setParameters((prev) => ({
      ...prev,
      coils: prev.coils.map((c) => (c.id === id ? { ...c, ...partial } : c)),
    }));
  };

  const jumpToLesion = (lesion: DetectedLesion) => {
    setIsRunning(false);
    const targetU = lesion.distanceFromStartMm / 280.0;
    const sample = getPathSample(parameters.pathType, targetU);
    setCapsule((prev) => ({
      ...prev,
      x: sample.position[0],
      y: sample.position[1],
      z: sample.position[2],
      progress: targetU,
      transitDistanceMm: lesion.distanceFromStartMm,
    }));
  };

  const addClinicalNote = (lesionId: string, note: string) => {
    setUniqueLoggedLesions((prev) =>
      prev.map((l) => (l.id === lesionId ? { ...l, notes: note } : l))
    );
  };

  const setGIPathType = (pathType: GIPathType) => {
    updateParameters({ pathType });
    resetSimulation();
  };

  return (
    <SimulationContext.Provider
      value={{
        isRunning,
        speedMultiplier,
        simTimeSec,
        capsule,
        parameters,
        pressureData,
        magneticData,
        measurements,
        currentEstimate,
        activeDetections,
        uniqueLoggedLesions,
        trajectory,
        telemetryHistory,
        collisionAlerts,
        patient,
        metrics,
        activePersona,
        activeNavTab,
        replayIndex,
        toggleRunning,
        stepCapsule,
        resetSimulation,
        deflectCapsuleFromWall,
        setSpeedMultiplier,
        updateParameters,
        updateTissueLayer,
        updateAnchor,
        updateCoil,
        setActivePersona,
        setActiveNavTab,
        setReplayIndex,
        jumpToLesion,
        addClinicalNote,
        setGIPathType,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
