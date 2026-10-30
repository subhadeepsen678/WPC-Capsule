/**
 * Pressure-Based Path Planning Engine (E_pp Algorithm)
 * Simulates a 33-sensor tactile matrix across the capsule dome and body.
 * Computes estimated pressure points and collision-avoidance steering vectors when wall contact exceeds 3.4 kPa.
 */

import { PressureSensorNode } from '../../types/simulation';

// Geometry of the 33 tactile nodes (dome cap + cylindrical rings)
export function initialize33PressureNodes(): PressureSensorNode[] {
  const nodes: PressureSensorNode[] = [];
  
  // Apex node
  nodes.push({ id: 0, phiDeg: 0, thetaDeg: 0, pressureKpa: 0.8, isExceeded: false });

  // Ring 1 (Front dome, 8 nodes at theta = 30°)
  for (let i = 0; i < 8; i++) {
    nodes.push({
      id: nodes.length,
      phiDeg: i * 45,
      thetaDeg: 30,
      pressureKpa: 0.9,
      isExceeded: false,
    });
  }

  // Ring 2 (Shoulder, 8 nodes at theta = 60°)
  for (let i = 0; i < 8; i++) {
    nodes.push({
      id: nodes.length,
      phiDeg: i * 45 + 22.5,
      thetaDeg: 60,
      pressureKpa: 1.1,
      isExceeded: false,
    });
  }

  // Ring 3 (Equator, 8 nodes at theta = 90°)
  for (let i = 0; i < 8; i++) {
    nodes.push({
      id: nodes.length,
      phiDeg: i * 45,
      thetaDeg: 90,
      pressureKpa: 1.2,
      isExceeded: false,
    });
  }

  // Ring 4 (Aft body, 8 nodes at theta = 120°)
  for (let i = 0; i < 8; i++) {
    nodes.push({
      id: nodes.length,
      phiDeg: i * 45 + 22.5,
      thetaDeg: 120,
      pressureKpa: 0.7,
      isExceeded: false,
    });
  }

  return nodes;
}

export interface PressurePlanningResult {
  nodes: PressureSensorNode[];
  maxPressureKpa: number;
  thresholdExceeded: boolean;
  activeHighPressureCount: number;
  estimatedPressurePointMm: number; // E_pp
  steeringCorrectionRad: [number, number]; // [deltaPitch, deltaYaw]
  safeNavVector: [number, number, number];
}

/**
 * Computes tactile wall pressure from lumen curvature and tissue contact
 */
export function evaluateCapsulePressure(
  nodes: PressureSensorNode[],
  lumenCurvatureRadM: number, // local curvature of GI bend
  contactOffsetMm: [number, number], // displacement from lumen center [dx, dy]
  thresholdKpa: number = 3.4,
  peristalsisPhase: number = 0
): PressurePlanningResult {
  const capsuleRadiusMm = 5.5;
  const updatedNodes: PressureSensorNode[] = [];
  let maxP = 0;
  const highPressureNodes: { node: PressureSensorNode; p: number }[] = [];

  // Peristaltic rhythmic contraction wave
  const peristalsisBaseP = 0.5 + 0.8 * Math.sin(peristalsisPhase);

  for (const node of nodes) {
    const phiRad = (node.phiDeg * Math.PI) / 180;
    const thetaRad = (node.thetaDeg * Math.PI) / 180;

    // Contact projection
    const nx = Math.sin(thetaRad) * Math.cos(phiRad);
    const ny = Math.sin(thetaRad) * Math.sin(phiRad);
    const nz = Math.cos(thetaRad);

    // Wall impingement pressure proportional to offset toward that side
    const impingement = Math.max(0, nx * contactOffsetMm[0] + ny * contactOffsetMm[1]);
    const curvatureStress = Math.max(0, Math.abs(lumenCurvatureRadM) * 1.8 * Math.cos(phiRad));

    // Total pressure calculation (kPa)
    const baseP = 0.8 + peristalsisBaseP;
    const p = baseP + impingement * 1.5 + curvatureStress;
    const isExceeded = p >= thresholdKpa;

    if (p > maxP) maxP = p;
    if (isExceeded) {
      highPressureNodes.push({ node, p });
    }

    updatedNodes.push({
      ...node,
      pressureKpa: parseFloat(p.toFixed(2)),
      isExceeded,
    });
  }

  // Sort high pressure nodes descending
  highPressureNodes.sort((a, b) => b.p - a.p);

  let Epp = 0;
  let steerPitch = 0;
  let steerYaw = 0;

  if (highPressureNodes.length >= 2) {
    const pn1 = highPressureNodes[0].p;
    const pn2 = highPressureNodes[1].p;
    const n1 = highPressureNodes[0].node;
    const n2 = highPressureNodes[1].node;

    // Angular spherical distance omega between the two highest pressure nodes
    const dPhi = Math.abs(n1.phiDeg - n2.phiDeg) * (Math.PI / 180);
    const theta1 = (n1.thetaDeg * Math.PI) / 180;
    const theta2 = (n2.thetaDeg * Math.PI) / 180;
    
    // Spherical cosine law
    const cosOmega = Math.cos(theta1) * Math.cos(theta2) + Math.sin(theta1) * Math.sin(theta2) * Math.cos(dPhi);
    const omegaDeg = Math.acos(Math.max(-1, Math.min(1, cosOmega))) * (180 / Math.PI);

    // Arc length Dang = (2 * pi * r * omega) / 360
    const Dang = (2 * Math.PI * capsuleRadiusMm * omegaDeg) / 360;

    // E_pp = (pn1 / (pn1 + pn2)) * Dang
    Epp = (pn1 / (pn1 + pn2)) * Dang;

    // Steering direction is OPPOSITE to the high-pressure contact center
    const contactCenterPhi = (n1.phiDeg + n2.phiDeg) / 2;
    const contactCenterTheta = (n1.thetaDeg + n2.thetaDeg) / 2;

    const deflectAngleRad = 0.25; // 14° deflection impulse
    steerYaw = -Math.cos((contactCenterPhi * Math.PI) / 180) * deflectAngleRad;
    steerPitch = -Math.sin((contactCenterTheta * Math.PI) / 180) * deflectAngleRad;
  } else if (highPressureNodes.length === 1) {
    const n = highPressureNodes[0].node;
    Epp = 1.2;
    steerYaw = -Math.cos((n.phiDeg * Math.PI) / 180) * 0.2;
    steerPitch = -Math.sin((n.thetaDeg * Math.PI) / 180) * 0.2;
  }

  // Unit safe vector
  const safeNavVector: [number, number, number] = [
    Math.sin(steerYaw),
    Math.sin(steerPitch),
    Math.cos(steerYaw) * Math.cos(steerPitch),
  ];

  return {
    nodes: updatedNodes,
    maxPressureKpa: parseFloat(maxP.toFixed(2)),
    thresholdExceeded: highPressureNodes.length > 0,
    activeHighPressureCount: highPressureNodes.length,
    estimatedPressurePointMm: parseFloat(Epp.toFixed(2)),
    steeringCorrectionRad: [steerPitch, steerYaw],
    safeNavVector,
  };
}
