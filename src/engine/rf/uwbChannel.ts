/**
 * Multi-Layer UWB RF Propagation & Channel Attenuation Model
 * Simulates in-body to on-body path loss across Skin, Fat, Muscle, and Small Intestine.
 */

import { AnchorNode, TissueLayerProperties } from '../../types/simulation';

export interface ChannelMeasurement {
  anchorId: number;
  trueDistanceMm: number;
  measuredDistanceMm: number;
  pathLossDb: number;
  shadowingErrorDb: number;
  snrDb: number;
}

// Box-Muller transform for normal distribution
export function gaussianRandom(mean: number = 0, stdev: number = 1): number {
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdev + mean;
}

/**
 * Calculates effective path loss exponent based on tissue thicknesses traversed
 */
export function calculateEffectiveBeta(tissues: TissueLayerProperties[]): number {
  let totalThickness = 0;
  let weightedBeta = 0;

  for (const tissue of tissues) {
    totalThickness += tissue.thicknessMm;
    weightedBeta += tissue.thicknessMm * tissue.pathLossExponent;
  }

  return totalThickness > 0 ? weightedBeta / totalThickness : 4.5;
}

/**
 * Simulates UWB ranging measurements from capsule to an array of anchors
 */
export function simulateUWBRanging(
  capsulePosMm: [number, number, number],
  anchors: AnchorNode[],
  tissues: TissueLayerProperties[],
  shadowingSigmaDb: number = 5.475,
  referenceDistMm: number = 50.0 // d0 = 50mm
): ChannelMeasurement[] {
  const betaEff = calculateEffectiveBeta(tissues);
  const L0 = 42.0; // Reference path loss at d0 in dB

  const measurements: ChannelMeasurement[] = [];

  for (const anchor of anchors) {
    if (!anchor.enabled) continue;

    const dx = capsulePosMm[0] - anchor.position[0];
    const dy = capsulePosMm[1] - anchor.position[1];
    const dz = capsulePosMm[2] - anchor.position[2];
    const trueDist = Math.max(5.0, Math.hypot(dx, dy, dz));

    // Shadowing noise from multi-path and in-body inhomogeneity
    const shadowingDb = gaussianRandom(0, shadowingSigmaDb);

    // Path loss: L_n = L_0 + 10 * beta * log10(d / d0) + S
    const pathLoss = L0 + 10 * betaEff * Math.log10(trueDist / referenceDistMm) + shadowingDb;

    // Inverted distance estimate from received power
    // d_est = d0 * 10^((L_n - L0) / (10 * beta))
    const rawEstDist = referenceDistMm * Math.pow(10, (pathLoss - L0) / (10 * betaEff));

    // Hardware range limiter (capsule body limits)
    const measuredDist = Math.max(2.0, rawEstDist);

    // Signal-to-noise ratio: P_tx (dBm) - PathLoss - NoiseFloor
    const pTxDbm = -14.0;
    const noiseFloorDbm = -95.0;
    const snr = pTxDbm - pathLoss - noiseFloorDbm;

    measurements.push({
      anchorId: anchor.id,
      trueDistanceMm: parseFloat(trueDist.toFixed(2)),
      measuredDistanceMm: parseFloat(measuredDist.toFixed(2)),
      pathLossDb: parseFloat(pathLoss.toFixed(2)),
      shadowingErrorDb: parseFloat(shadowingDb.toFixed(2)),
      snrDb: parseFloat(snr.toFixed(1)),
    });
  }

  return measurements;
}

/**
 * Computes Cramér-Rao Lower Bound (CRLB) for the current capsule position and anchor setup
 * F = J^T * R^-1 * J
 * CRLB = sqrt(trace(inv(F)))
 */
export function calculateCRLB(
  capsulePosMm: [number, number, number],
  anchors: AnchorNode[],
  tissues: TissueLayerProperties[],
  shadowingSigmaDb: number
): number {
  const activeAnchors = anchors.filter((a) => a.enabled);
  if (activeAnchors.length < 3) return 999.0;

  const betaEff = calculateEffectiveBeta(tissues);
  const factor = (Math.LN10 / (10 * betaEff)) * shadowingSigmaDb;

  // Initialize 3x3 Fisher Information Matrix
  const F = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (const anchor of activeAnchors) {
    const dx = capsulePosMm[0] - anchor.position[0];
    const dy = capsulePosMm[1] - anchor.position[1];
    const dz = capsulePosMm[2] - anchor.position[2];
    const d = Math.max(5.0, Math.hypot(dx, dy, dz));

    // Unit direction vector
    const ux = dx / d;
    const uy = dy / d;
    const uz = dz / d;

    // Measurement variance: sigma_r^2 = (factor * d)^2
    const sigmaR = Math.max(0.5, factor * d);
    const invVar = 1 / (sigmaR * sigmaR);

    // Outer product contribution: J_i * J_i^T * invVar
    F[0][0] += ux * ux * invVar;
    F[0][1] += ux * uy * invVar;
    F[0][2] += ux * uz * invVar;

    F[1][0] += uy * ux * invVar;
    F[1][1] += uy * uy * invVar;
    F[1][2] += uy * uz * invVar;

    F[2][0] += uz * ux * invVar;
    F[2][1] += uz * uy * invVar;
    F[2][2] += uz * uz * invVar;
  }

  // Regularize to prevent singular matrix inversion
  for (let i = 0; i < 3; i++) {
    F[i][i] += 1e-6;
  }

  // 3x3 Matrix Inversion
  const det =
    F[0][0] * (F[1][1] * F[2][2] - F[1][2] * F[2][1]) -
    F[0][1] * (F[1][0] * F[2][2] - F[1][2] * F[2][0]) +
    F[0][2] * (F[1][0] * F[2][1] - F[1][1] * F[2][0]);

  if (Math.abs(det) < 1e-12) return 999.0;

  const invF00 = (F[1][1] * F[2][2] - F[1][2] * F[2][1]) / det;
  const invF11 = (F[0][0] * F[2][2] - F[0][2] * F[2][0]) / det;
  const invF22 = (F[0][0] * F[1][1] - F[0][1] * F[1][0]) / det;

  const traceInv = invF00 + invF11 + invF22;
  return traceInv > 0 ? parseFloat(Math.sqrt(traceInv).toFixed(2)) : 999.0;
}
