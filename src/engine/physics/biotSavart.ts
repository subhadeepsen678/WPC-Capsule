/**
 * Biot-Savart Cylindrical Coil Magnetic Field & Locomotion Force Engine
 * Simulates external electromagnetic coil actuation for permanent magnet robotic capsules.
 */

import { CoilConfig } from '../../types/simulation';

const MU_0 = 4 * Math.PI * 1e-7; // Permeability of free space (H/m)
const CAPSULE_VOLUME_M3 = Math.PI * Math.pow(0.0055, 2) * 0.026; // Capsule cylinder: ~11mm diameter, 26mm length

export interface MagneticFieldResult {
  B: [number, number, number]; // Tesla [Bx, By, Bz]
  magnitudeTesla: number;
  gradientB: [number, number, number]; // dB/dx, dB/dy, dB/dz (T/m)
  forceVectorN: [number, number, number]; // Force in Newtons
  stepTimeSec: number;
  requiredCurrentPerStepA: number;
}

/**
 * Computes the magnetic flux density B at a point in space due to a cylindrical coil.
 * Using Biot-Savart axial and radial field expansions with finite coil length integration.
 */
export function computeSingleCoilField(
  pointMm: [number, number, number],
  coil: CoilConfig
): { B: [number, number, number]; gradB: [number, number, number] } {
  if (!coil.active || Math.abs(coil.currentAmps) < 1e-4) {
    return { B: [0, 0, 0], gradB: [0, 0, 0] };
  }

  // Convert mm to meters
  const px = (pointMm[0] - coil.position[0]) * 1e-3;
  const py = (pointMm[1] - coil.position[1]) * 1e-3;
  const pz = (pointMm[2] - coil.position[2]) * 1e-3;

  const a = coil.radiusMm * 1e-3; // radius in meters
  const L = coil.lengthMm * 1e-3; // length in meters
  const n = coil.turnsPerMeter;
  const i = coil.currentAmps;

  // Transform point into coil coordinate frame
  // Coil axis unit vector
  const axisLen = Math.hypot(coil.axis[0], coil.axis[1], coil.axis[2]) || 1;
  const uz = [coil.axis[0] / axisLen, coil.axis[1] / axisLen, coil.axis[2] / axisLen];

  // Axial projection z_coil and radial distance r_coil
  const zCoil = px * uz[0] + py * uz[1] + pz * uz[2];
  const rx = px - zCoil * uz[0];
  const ry = py - zCoil * uz[1];
  const rz = pz - zCoil * uz[2];
  const rCoil = Math.hypot(rx, ry, rz);

  // Unit vector in radial direction
  const ur = rCoil > 1e-6 ? [rx / rCoil, ry / rCoil, rz / rCoil] : [1, 0, 0];

  // Analytical integration limits for finite solenoid: zeta+ = z + L/2, zeta- = z - L/2
  const zetaPlus = zCoil + L / 2;
  const zetaMinus = zCoil - L / 2;

  // On-axis and near-axis Biot-Savart series approximation
  const factor = (MU_0 * n * i) / 2;
  const termPlus = zetaPlus / Math.sqrt(zetaPlus * zetaPlus + a * a);
  const termMinus = zetaMinus / Math.sqrt(zetaMinus * zetaMinus + a * a);
  
  // Axial field Bz
  let Bz = factor * (termPlus - termMinus);
  
  // Radial correction: Br ~ - (r/2) * d(Bz)/dz
  const dTermPlus = (a * a) / Math.pow(zetaPlus * zetaPlus + a * a, 1.5);
  const dTermMinus = (a * a) / Math.pow(zetaMinus * zetaMinus + a * a, 1.5);
  const dBz_dz = factor * (dTermPlus - dTermMinus);
  
  let Br = -0.5 * rCoil * dBz_dz;

  // Convert from coil (ur, uz) back to world coordinates
  const Bx = Br * ur[0] + Bz * uz[0];
  const By = Br * ur[1] + Bz * uz[1];
  const Bz_world = Br * ur[2] + Bz * uz[2];

  // Gradient approximation for force calculation
  const gradBx = dBz_dz * uz[0];
  const gradBy = dBz_dz * uz[1];
  const gradBz = dBz_dz * uz[2];

  return {
    B: [Bx, By, Bz_world],
    gradB: [gradBx, gradBy, gradBz],
  };
}

/**
 * Calculates superposition of magnetic fields from all 4 coils and resultant force on capsule
 */
export function computeTotalMagneticActuation(
  capsulePosMm: [number, number, number],
  capsuleOrientationRad: [number, number, number],
  coils: CoilConfig[],
  capsuleMassGrams: number,
  magnetizationAm: number,
  stepDistanceMm: number,
  frictionCoeff: number
): MagneticFieldResult {
  let totalBx = 0;
  let totalBy = 0;
  let totalBz = 0;
  let totalGradX = 0;
  let totalGradY = 0;
  let totalGradZ = 0;

  for (const coil of coils) {
    if (!coil.active) continue;
    const { B, gradB } = computeSingleCoilField(capsulePosMm, coil);
    totalBx += B[0];
    totalBy += B[1];
    totalBz += B[2];
    totalGradX += gradB[0];
    totalGradY += gradB[1];
    totalGradZ += gradB[2];
  }

  const magB = Math.hypot(totalBx, totalBy, totalBz);

  // Magnetic force F = V * M * grad(B)
  // Permanent magnet inside capsule has magnetic moment m = V * M
  const magneticMoment = CAPSULE_VOLUME_M3 * magnetizationAm; // A*m^2
  
  // Direction of magnetization aligned with capsule orientation
  const pitch = capsuleOrientationRad[1];
  const yaw = capsuleOrientationRad[2];
  const mx = Math.cos(pitch) * Math.sin(yaw);
  const my = Math.sin(pitch);
  const mz = Math.cos(pitch) * Math.cos(yaw);

  // Force component: F = (m . nabla) B
  // We approximate dominant gradient along transit axis
  const rawFx = magneticMoment * totalGradX;
  const rawFy = magneticMoment * totalGradY;
  const rawFz = magneticMoment * totalGradZ;

  // Account for mucosal tissue friction opposing motion: F_friction = mu * m_capsule * g
  const massKg = capsuleMassGrams * 1e-3;
  const g = 9.81;
  const normalForce = massKg * g;
  const frictionForceN = frictionCoeff * normalForce;

  const rawForceMagnitude = Math.hypot(rawFx, rawFy, rawFz);
  const netForceMagnitude = Math.max(0.001, rawForceMagnitude - frictionForceN);

  const scale = rawForceMagnitude > 1e-6 ? netForceMagnitude / rawForceMagnitude : 1;
  const forceVectorN: [number, number, number] = [
    rawFx * scale,
    rawFy * scale,
    rawFz * scale,
  ];

  // Step time: t = sqrt(2 * m * d / F_L)
  const dMeters = stepDistanceMm * 1e-3;
  const stepTimeSec = Math.sqrt((2 * massKg * dMeters) / Math.max(netForceMagnitude, 1e-5));

  // Required current to achieve desired nominal step:
  // F_needed = 2 * m * d / t_target^2 + F_friction
  const targetTimeSec = 0.5; // 500ms target step
  const fNeeded = (2 * massKg * dMeters) / (targetTimeSec * targetTimeSec) + frictionForceN;
  const currentRatio = rawForceMagnitude > 1e-5 ? fNeeded / rawForceMagnitude : 1;
  const requiredCurrentPerStepA = Math.min(50, Math.max(0.5, 10 * currentRatio));

  return {
    B: [totalBx, totalBy, totalBz],
    magnitudeTesla: magB,
    gradientB: [totalGradX, totalGradY, totalGradZ],
    forceVectorN,
    stepTimeSec: Number.isFinite(stepTimeSec) ? Math.min(stepTimeSec, 5.0) : 1.0,
    requiredCurrentPerStepA,
  };
}
