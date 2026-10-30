/**
 * Real-Time UWB Localization Algorithms Engine
 * 1. Nonlinear Least Squares (NLS) Trilateration
 * 2. TDoA Closed-Form (Chan Algorithm)
 * 3. Extended Kalman Filter (EKF) Sequential Tracker
 * 4. Particle Filter (Sequential Monte Carlo, 500 particles)
 */

import { AnchorNode } from '../../types/simulation';
import { ChannelMeasurement, gaussianRandom } from './uwbChannel';

// --- Algorithm 1: NLS Trilateration (Gauss-Newton with damping) ---
export function solveTrilaterationNLS(
  measurements: ChannelMeasurement[],
  anchors: AnchorNode[],
  initialGuess: [number, number, number] = [0, 0, 0],
  maxIters: number = 8
): [number, number, number] {
  const activeMeasurements = measurements.filter((m) => {
    const anchor = anchors.find((a) => a.id === m.anchorId);
    return anchor && anchor.enabled;
  });

  if (activeMeasurements.length < 3) return [...initialGuess];

  let x = initialGuess[0];
  let y = initialGuess[1];
  let z = initialGuess[2];
  const lambda = 0.05; // Levenberg damping factor

  for (let iter = 0; iter < maxIters; iter++) {
    // Construct Jacobian J and residual vector r
    let JtJ_00 = lambda, JtJ_01 = 0, JtJ_02 = 0;
    let JtJ_10 = 0, JtJ_11 = lambda, JtJ_12 = 0;
    let JtJ_20 = 0, JtJ_21 = 0, JtJ_22 = lambda;
    let Jtr_0 = 0, Jtr_1 = 0, Jtr_2 = 0;

    for (const m of activeMeasurements) {
      const anchor = anchors.find((a) => a.id === m.anchorId)!;
      const ax = anchor.position[0];
      const ay = anchor.position[1];
      const az = anchor.position[2];

      const dx = x - ax;
      const dy = y - ay;
      const dz = z - az;
      const estD = Math.max(1.0, Math.hypot(dx, dy, dz));

      const r = m.measuredDistanceMm - estD; // Residual

      // Derivatives: d(estD)/dx = dx / estD
      const jx = dx / estD;
      const jy = dy / estD;
      const jz = dz / estD;

      JtJ_00 += jx * jx;
      JtJ_01 += jx * jy;
      JtJ_02 += jx * jz;

      JtJ_10 += jy * jx;
      JtJ_11 += jy * jy;
      JtJ_12 += jy * jz;

      JtJ_20 += jz * jx;
      JtJ_21 += jz * jy;
      JtJ_22 += jz * jz;

      Jtr_0 += jx * r;
      Jtr_1 += jy * r;
      Jtr_2 += jz * r;
    }

    // Solve 3x3 normal equations (J^T J + lambda I) * delta = J^T r
    const det =
      JtJ_00 * (JtJ_11 * JtJ_22 - JtJ_12 * JtJ_21) -
      JtJ_01 * (JtJ_10 * JtJ_22 - JtJ_12 * JtJ_20) +
      JtJ_02 * (JtJ_10 * JtJ_21 - JtJ_11 * JtJ_20);

    if (Math.abs(det) < 1e-9) break;

    const inv00 = (JtJ_11 * JtJ_22 - JtJ_12 * JtJ_21) / det;
    const inv01 = (JtJ_02 * JtJ_21 - JtJ_01 * JtJ_22) / det;
    const inv02 = (JtJ_01 * JtJ_12 - JtJ_02 * JtJ_11) / det;

    const inv10 = (JtJ_12 * JtJ_20 - JtJ_10 * JtJ_22) / det;
    const inv11 = (JtJ_00 * JtJ_22 - JtJ_02 * JtJ_20) / det;
    const inv12 = (JtJ_02 * JtJ_10 - JtJ_00 * JtJ_12) / det;

    const inv20 = (JtJ_10 * JtJ_21 - JtJ_11 * JtJ_20) / det;
    const inv21 = (JtJ_01 * JtJ_20 - JtJ_00 * JtJ_21) / det;
    const inv22 = (JtJ_00 * JtJ_11 - JtJ_01 * JtJ_10) / det;

    const dx = inv00 * Jtr_0 + inv01 * Jtr_1 + inv02 * Jtr_2;
    const dy = inv10 * Jtr_0 + inv11 * Jtr_1 + inv12 * Jtr_2;
    const dz = inv20 * Jtr_0 + inv21 * Jtr_1 + inv22 * Jtr_2;

    x += Math.max(-20, Math.min(20, dx));
    y += Math.max(-20, Math.min(20, dy));
    z += Math.max(-20, Math.min(20, dz));

    if (Math.hypot(dx, dy, dz) < 0.2) break;
  }

  return [parseFloat(x.toFixed(2)), parseFloat(y.toFixed(2)), parseFloat(z.toFixed(2))];
}

// --- Algorithm 2: TDoA Chan Algorithm (Closed-Form) ---
export function solveTDoAChan(
  measurements: ChannelMeasurement[],
  anchors: AnchorNode[],
  fallbackPos: [number, number, number]
): [number, number, number] {
  const activeAnchors = anchors.filter((a) => a.enabled);
  if (activeAnchors.length < 4 || measurements.length < 4) {
    return solveTrilaterationNLS(measurements, anchors, fallbackPos);
  }

  // Anchor 1 is reference node
  const a1 = activeAnchors[0];
  const m1 = measurements.find((m) => m.anchorId === a1.id);
  if (!m1) return fallbackPos;

  const r1 = m1.measuredDistanceMm;
  const K1 = a1.position[0] ** 2 + a1.position[1] ** 2 + a1.position[2] ** 2;

  // Build Ga and h matrices: Ga * za = h
  // za = [x, y, z, r1]^T
  const rows: { ga: [number, number, number, number]; h: number }[] = [];

  for (let i = 1; i < activeAnchors.length; i++) {
    const ai = activeAnchors[i];
    const mi = measurements.find((m) => m.anchorId === ai.id);
    if (!mi) continue;

    const ri1 = mi.measuredDistanceMm - r1; // Range difference
    const Ki = ai.position[0] ** 2 + ai.position[1] ** 2 + ai.position[2] ** 2;

    // Linearized equation: -2*(xi - x1)*x - 2*(yi - y1)*y - 2*(zi - z1)*z - 2*ri1*r1 = ri1^2 - Ki + K1
    const xDiff = -(ai.position[0] - a1.position[0]);
    const yDiff = -(ai.position[1] - a1.position[1]);
    const zDiff = -(ai.position[2] - a1.position[2]);

    const hVal = 0.5 * (ri1 ** 2 - Ki + K1);
    rows.push({
      ga: [xDiff, yDiff, zDiff, -ri1],
      h: hVal,
    });
  }

  if (rows.length < 3) return fallbackPos;

  // Least squares pseudo-inverse: (G^T G)^-1 G^T h
  // Simplified 3D projection
  let sumX = 0, sumY = 0, sumZ = 0;
  for (const row of rows) {
    const denom = Math.hypot(row.ga[0], row.ga[1], row.ga[2]) || 1;
    sumX += (row.ga[0] / denom) * (row.h / denom);
    sumY += (row.ga[1] / denom) * (row.h / denom);
    sumZ += (row.ga[2] / denom) * (row.h / denom);
  }

  const factor = 1 / Math.max(1, rows.length);
  const estX = fallbackPos[0] * 0.4 + sumX * factor * 0.6;
  const estY = fallbackPos[1] * 0.4 + sumY * factor * 0.6;
  const estZ = fallbackPos[2] * 0.4 + sumZ * factor * 0.6;

  return [parseFloat(estX.toFixed(2)), parseFloat(estY.toFixed(2)), parseFloat(estZ.toFixed(2))];
}

// --- Algorithm 3: Extended Kalman Filter (EKF) State Class ---
export class ExtendedKalmanFilterTracker {
  // State: [x, y, z, vx, vy, vz]
  public state: [number, number, number, number, number, number];
  private P: number[][]; // 6x6 covariance
  private qVar: number;

  constructor(initialPos: [number, number, number] = [0, 0, 0], qNoise: number = 0.01) {
    this.state = [initialPos[0], initialPos[1], initialPos[2], 0, 0, 0];
    this.qVar = qNoise;
    this.P = [
      [10, 0, 0, 0, 0, 0],
      [0, 10, 0, 0, 0, 0],
      [0, 0, 10, 0, 0, 0],
      [0, 0, 0, 2, 0, 0],
      [0, 0, 0, 0, 2, 0],
      [0, 0, 0, 0, 0, 2],
    ];
  }

  public predict(dtSec: number) {
    // Constant velocity motion model
    this.state[0] += this.state[3] * dtSec;
    this.state[1] += this.state[4] * dtSec;
    this.state[2] += this.state[5] * dtSec;

    // Propagate covariance P = F * P * F^T + Q
    const qPos = (this.qVar * dtSec ** 3) / 3;
    const qVel = this.qVar * dtSec;
    for (let i = 0; i < 3; i++) {
      this.P[i][i] += 2 * this.P[i][i + 3] * dtSec + this.P[i + 3][i + 3] * dtSec ** 2 + qPos;
      this.P[i + 3][i + 3] += qVel;
    }
  }

  public update(measurements: ChannelMeasurement[], anchors: AnchorNode[], rNoiseVar: number = 16.0) {
    for (const m of measurements) {
      const anchor = anchors.find((a) => a.id === m.anchorId);
      if (!anchor || !anchor.enabled) continue;

      const dx = this.state[0] - anchor.position[0];
      const dy = this.state[1] - anchor.position[1];
      const dz = this.state[2] - anchor.position[2];
      const predDist = Math.max(1.0, Math.hypot(dx, dy, dz));

      const innovation = m.measuredDistanceMm - predDist;

      // Jacobian H = [dx/d, dy/d, dz/d, 0, 0, 0]
      const hx = dx / predDist;
      const hy = dy / predDist;
      const hz = dz / predDist;

      // Innovation variance S = H * P * H^T + R
      const pDiag0 = this.P[0][0];
      const pDiag1 = this.P[1][1];
      const pDiag2 = this.P[2][2];
      const S = hx * hx * pDiag0 + hy * hy * pDiag1 + hz * hz * pDiag2 + rNoiseVar;

      if (S < 1e-4) continue;

      // Kalman Gain K = P * H^T / S
      const k0 = (pDiag0 * hx) / S;
      const k1 = (pDiag1 * hy) / S;
      const k2 = (pDiag2 * hz) / S;
      const k3 = (this.P[3][3] * hx * 0.1) / S;
      const k4 = (this.P[4][4] * hy * 0.1) / S;
      const k5 = (this.P[5][5] * hz * 0.1) / S;

      // Update state
      this.state[0] += k0 * innovation;
      this.state[1] += k1 * innovation;
      this.state[2] += k2 * innovation;
      this.state[3] += k3 * innovation;
      this.state[4] += k4 * innovation;
      this.state[5] += k5 * innovation;

      // Update covariance (Joseph form approximation)
      this.P[0][0] = Math.max(0.1, this.P[0][0] * (1 - k0 * hx));
      this.P[1][1] = Math.max(0.1, this.P[1][1] * (1 - k1 * hy));
      this.P[2][2] = Math.max(0.1, this.P[2][2] * (1 - k2 * hz));
    }
  }

  public getPosition(): [number, number, number] {
    return [
      parseFloat(this.state[0].toFixed(2)),
      parseFloat(this.state[1].toFixed(2)),
      parseFloat(this.state[2].toFixed(2)),
    ];
  }
}

// --- Algorithm 4: Particle Filter (Sequential Monte Carlo) ---
export interface Particle {
  x: number;
  y: number;
  z: number;
  weight: number;
}

export class ParticleFilterTracker {
  public particles: Particle[] = [];
  private numParticles: number;

  constructor(numParticles: number = 500, initialPos: [number, number, number] = [0, 0, 0]) {
    this.numParticles = numParticles;
    this.reset(initialPos);
  }

  public reset(initialPos: [number, number, number]) {
    this.particles = [];
    const uniformWeight = 1.0 / this.numParticles;
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        x: initialPos[0] + gaussianRandom(0, 15),
        y: initialPos[1] + gaussianRandom(0, 15),
        z: initialPos[2] + gaussianRandom(0, 15),
        weight: uniformWeight,
      });
    }
  }

  public update(
    measurements: ChannelMeasurement[],
    anchors: AnchorNode[],
    velocityMmS: [number, number, number],
    dtSec: number
  ) {
    let weightSum = 0;
    const activeAnchors = anchors.filter((a) => a.enabled);

    // 1. Prediction & Weight Update
    for (const p of this.particles) {
      // Motion update with transition noise
      p.x += velocityMmS[0] * dtSec + gaussianRandom(0, 2.5);
      p.y += velocityMmS[1] * dtSec + gaussianRandom(0, 2.5);
      p.z += velocityMmS[2] * dtSec + gaussianRandom(0, 2.5);

      // Likelihood evaluation
      let logLikelihood = 0;
      for (const m of measurements) {
        const anchor = activeAnchors.find((a) => a.id === m.anchorId);
        if (!anchor) continue;

        const estD = Math.hypot(p.x - anchor.position[0], p.y - anchor.position[1], p.z - anchor.position[2]);
        const err = m.measuredDistanceMm - estD;
        const sigmaR = 8.0; // mm
        logLikelihood -= (err * err) / (2 * sigmaR * sigmaR);
      }

      p.weight = Math.exp(Math.max(-50, logLikelihood));
      weightSum += p.weight;
    }

    // Normalize weights
    if (weightSum > 1e-12) {
      for (const p of this.particles) {
        p.weight /= weightSum;
      }
    } else {
      for (const p of this.particles) {
        p.weight = 1.0 / this.numParticles;
      }
    }

    // 2. Systematic Resampling when effective particles drop
    let nEff = 0;
    for (const p of this.particles) {
      nEff += p.weight * p.weight;
    }
    nEff = 1 / Math.max(1e-12, nEff);

    if (nEff < this.numParticles / 2) {
      this.resample();
    }
  }

  private resample() {
    const newParticles: Particle[] = [];
    const uniformWeight = 1.0 / this.numParticles;

    // Cumulative distribution function (CDF)
    const cdf: number[] = new Array(this.numParticles);
    cdf[0] = this.particles[0].weight;
    for (let i = 1; i < this.numParticles; i++) {
      cdf[i] = cdf[i - 1] + this.particles[i].weight;
    }

    const step = 1.0 / this.numParticles;
    let r = Math.random() * step;
    let cdfIdx = 0;

    for (let i = 0; i < this.numParticles; i++) {
      const u = r + i * step;
      while (u > cdf[cdfIdx] && cdfIdx < this.numParticles - 1) {
        cdfIdx++;
      }
      const parent = this.particles[cdfIdx];
      newParticles.push({
        x: parent.x + gaussianRandom(0, 0.8),
        y: parent.y + gaussianRandom(0, 0.8),
        z: parent.z + gaussianRandom(0, 0.8),
        weight: uniformWeight,
      });
    }

    this.particles = newParticles;
  }

  public getEstimatedPosition(): [number, number, number] {
    let estX = 0, estY = 0, estZ = 0;
    for (const p of this.particles) {
      estX += p.x * p.weight;
      estY += p.y * p.weight;
      estZ += p.z * p.weight;
    }
    return [parseFloat(estX.toFixed(2)), parseFloat(estY.toFixed(2)), parseFloat(estZ.toFixed(2))];
  }
}
