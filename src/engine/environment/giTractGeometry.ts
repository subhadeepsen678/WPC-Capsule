/**
 * Parametric 3D GI Tract Anatomy & Peristalsis Engine
 * Generates centerlines and mesh profiles for Straight, Curved, Spiral, and Phantom anatomies.
 */

import { GIPathType } from '../../types/simulation';

export interface PathSample {
  u: number; // 0 to 1
  position: [number, number, number]; // mm
  tangent: [number, number, number];
  normal: [number, number, number];
  binormal: [number, number, number];
  lumenRadiusMm: number;
  landmark?: string;
}

export interface SeededLesionSite {
  id: string;
  classId: string;
  className: string;
  uProgress: number; // position along GI curve
  phiAngleDeg: number; // angle on lumen circumference
  sizeMm: number;
  depthMm: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export const PATHOLOGY_CLASSES = [
  { id: 'angiectasia', name: 'Angiectasia', color: '#EF4444', severity: 'high', clinicalDescription: 'Vascular ectasia of mucosal capillary tufts with bleeding propensity.' },
  { id: 'blood-fresh', name: 'Blood-fresh', color: '#DC2626', severity: 'critical', clinicalDescription: 'Active arterial or venous intraluminal hemorrhage.' },
  { id: 'blood-hematin', name: 'Blood-hematin', color: '#7F1D1D', severity: 'high', clinicalDescription: 'Degraded coffee-ground hematin indicating recent upper or mid-gut bleeding.' },
  { id: 'erosion', name: 'Erosion', color: '#F59E0B', severity: 'medium', clinicalDescription: 'Superficial mucosal defect not extending beyond the lamina propria.' },
  { id: 'erythema', name: 'Erythema', color: '#EC4899', severity: 'low', clinicalDescription: 'Focal or diffuse mucosal redness secondary to vascular congestion.' },
  { id: 'foreign-body', name: 'Foreign Body', color: '#8B5CF6', severity: 'medium', clinicalDescription: 'Exogenous non-absorbable particulate or bezoar remnant.' },
  { id: 'lymphangiectasia', name: 'Lymphangiectasia', color: '#FCD34D', severity: 'medium', clinicalDescription: 'Dilated mucosal lymphatic lacteals with whitish granular appearance.' },
  { id: 'polyp', name: 'Polyp', color: '#10B981', severity: 'high', clinicalDescription: 'Pedunculated or sessile adenomatous lesion with neoplastic potential.' },
  { id: 'ulcer', name: 'Ulcer', color: '#EA580C', severity: 'critical', clinicalDescription: 'Deep transmucosal necrotic crater with white fibrin exudate base.' },
  { id: 'ampulla', name: 'Ampulla of Vater', color: '#3B82F6', severity: 'low', clinicalDescription: 'Normal duodenal papilla landmark for pancreatico-biliary drainage.' },
] as const;

export const DEFAULT_SEEDED_LESIONS: SeededLesionSite[] = [
  { id: 'lesion-1', classId: 'ampulla', className: 'Ampulla of Vater', uProgress: 0.12, phiAngleDeg: 45, sizeMm: 6.2, depthMm: 12.0, severity: 'low', description: 'Major duodenal papilla with characteristic smooth papillary orifice.' },
  { id: 'lesion-2', classId: 'erythema', className: 'Erythema', uProgress: 0.28, phiAngleDeg: 190, sizeMm: 4.8, depthMm: 10.5, severity: 'low', description: 'Focal mucosal congestion and superficial hypervascularity.' },
  { id: 'lesion-3', classId: 'polyp', className: 'Polyp', uProgress: 0.44, phiAngleDeg: 80, sizeMm: 8.5, depthMm: 8.0, severity: 'high', description: 'Sessile mucosal protrusion (Paris 0-Is) measuring 8.5mm, requiring follow-up enteroscopy.' },
  { id: 'lesion-4', classId: 'erosion', className: 'Erosion', uProgress: 0.58, phiAngleDeg: 310, sizeMm: 3.2, depthMm: 11.2, severity: 'medium', description: 'Superficial aphthous mucosal erosion with slight central pallor.' },
  { id: 'lesion-5', classId: 'angiectasia', className: 'Angiectasia', uProgress: 0.72, phiAngleDeg: 120, sizeMm: 5.0, depthMm: 9.4, severity: 'high', description: 'Spidery bright red telangiectasia with risk of occult gastrointestinal bleeding.' },
  { id: 'lesion-6', classId: 'ulcer', className: 'Ulcer', uProgress: 0.86, phiAngleDeg: 240, sizeMm: 7.1, depthMm: 7.5, severity: 'critical', description: 'Circumferential mucosal ulceration with fibrin base and erythematous borders.' },
  { id: 'lesion-7', classId: 'blood-fresh', className: 'Blood-fresh', uProgress: 0.89, phiAngleDeg: 250, sizeMm: 9.0, depthMm: 6.0, severity: 'critical', description: 'Active luminal pool of bright red blood distal to ulcerated mucosa.' },
];

/**
 * Evaluates center-line coordinate at progress u in [0, 1]
 */
export function evaluateGIPathPoint(pathType: GIPathType, u: number): [number, number, number] {
  const clampedU = Math.max(0, Math.min(1, u));

  switch (pathType) {
    case 'straight': {
      // Linear transit along Z-axis (length 300 mm)
      const x = 0;
      const y = 0;
      const z = (clampedU - 0.5) * 280;
      return [x, y, z];
    }
    case 'curved': {
      // S-curve mimicking duodenal-jejunal flexure
      const z = (clampedU - 0.5) * 260;
      const angle = clampedU * Math.PI * 2.5;
      const x = Math.sin(angle) * 45;
      const y = Math.cos(angle * 0.8) * 25;
      return [x, y, z];
    }
    case 'spiral': {
      // Helical small bowel coils
      const coils = 3.5;
      const angle = clampedU * Math.PI * 2 * coils;
      const radius = 55 - clampedU * 15; // slightly tapering helix
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * (radius * 0.7);
      const z = (clampedU - 0.5) * 260;
      return [x, y, z];
    }
    case 'phantom': {
      // Patient-specific anatomical phantom with realistic hairpin loops
      const t = clampedU * Math.PI * 4;
      const x = 50 * Math.sin(t) + 15 * Math.sin(3 * t);
      const y = 30 * Math.cos(t * 0.9) + 10 * Math.cos(2.5 * t);
      const z = (clampedU - 0.5) * 270;
      return [x, y, z];
    }
  }
}

/**
 * Returns continuous Frenet frame and radius at u
 */
export function getPathSample(
  pathType: GIPathType,
  u: number,
  nominalRadiusMm: number = 14.0,
  peristalsisAmpMm: number = 2.0,
  peristalsisFreqHz: number = 0.1,
  timeSec: number = 0
): PathSample {
  const p = evaluateGIPathPoint(pathType, u);
  const eps = 0.002;
  const pNext = evaluateGIPathPoint(pathType, Math.min(1, u + eps));
  const pPrev = evaluateGIPathPoint(pathType, Math.max(0, u - eps));

  // Tangent vector
  const tx = pNext[0] - pPrev[0];
  const ty = pNext[1] - pPrev[1];
  const tz = pNext[2] - pPrev[2];
  const tLen = Math.hypot(tx, ty, tz) || 1;
  const tangent: [number, number, number] = [tx / tLen, ty / tLen, tz / tLen];

  // Up vector & Normal
  const up = [0, 1, 0];
  let nx = up[1] * tangent[2] - up[2] * tangent[1];
  let ny = up[2] * tangent[0] - up[0] * tangent[2];
  let nz = up[0] * tangent[1] - up[1] * tangent[0];
  let nLen = Math.hypot(nx, ny, nz);
  if (nLen < 1e-4) {
    nx = 1; ny = 0; nz = 0; nLen = 1;
  }
  const normal: [number, number, number] = [nx / nLen, ny / nLen, nz / nLen];

  // Binormal = tangent x normal
  const bx = tangent[1] * normal[2] - tangent[2] * normal[1];
  const by = tangent[2] * normal[0] - tangent[0] * normal[2];
  const bz = tangent[0] * normal[1] - tangent[1] * normal[0];
  const binormal: [number, number, number] = [bx, by, bz];

  // Dynamic peristaltic wave radius
  const phase = 2 * Math.PI * peristalsisFreqHz * timeSec - 8 * Math.PI * u;
  const peristalticDelta = peristalsisAmpMm * Math.sin(phase);
  const lumenRadiusMm = Math.max(8.0, nominalRadiusMm + peristalticDelta);

  // Anatomical landmarks
  let landmark: string | undefined;
  if (u < 0.15) landmark = 'Duodenum (D2/D3)';
  else if (u < 0.45) landmark = 'Proximal Jejunum';
  else if (u < 0.75) landmark = 'Mid Jejunum / Proximal Ileum';
  else if (u < 0.95) landmark = 'Distal Ileum';
  else landmark = 'Ileo-Cecal Valve Junction';

  return {
    u,
    position: p,
    tangent,
    normal,
    binormal,
    lumenRadiusMm,
    landmark,
  };
}
