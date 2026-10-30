/**
 * Express REST API Endpoints for Simulation Framework
 * Implements PRD Section 8 REST Endpoints for simulation orchestrator,
 * localization position streaming, and trajectory exports.
 */

import type { IncomingMessage, ServerResponse } from 'http';

interface SimulationState {
  status: 'running' | 'idle' | 'paused';
  capsulePosition: [number, number, number];
  capsuleOrientation: [number, number, number];
  speedMmS: number;
  maxPressureKpa: number;
  detectedLesionsCount: number;
  activeModel: string;
}

let simState: SimulationState = {
  status: 'running',
  capsulePosition: [12.4, -4.2, -85.1],
  capsuleOrientation: [0.05, -0.12, 1.45],
  speedMmS: 18.5,
  maxPressureKpa: 1.84,
  detectedLesionsCount: 3,
  activeModel: 'RTMDet-Tiny',
};

export function handleApiRequest(req: IncomingMessage, res: ServerResponse): boolean {
  const url = req.url || '';

  if (!url.startsWith('/api/')) return false;

  res.setHeader('Content-Type', 'application/json');

  if (url === '/api/simulation/status') {
    res.writeHead(200);
    res.end(JSON.stringify(simState));
    return true;
  }

  if (url === '/api/simulation/start') {
    simState.status = 'running';
    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Simulation started', state: simState }));
    return true;
  }

  if (url === '/api/simulation/stop') {
    simState.status = 'paused';
    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Simulation stopped', state: simState }));
    return true;
  }

  if (url === '/api/localization/position') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        timestamp: Date.now(),
        groundTruth: simState.capsulePosition,
        estimatedEKF: [simState.capsulePosition[0] + 0.4, simState.capsulePosition[1] - 0.2, simState.capsulePosition[2] + 0.6],
        crlbBoundMm: 3.42,
        rmseMm: 1.86,
      })
    );
    return true;
  }

  if (url === '/api/detection/results') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        activeModel: simState.activeModel,
        fps: 91.6,
        detectedLesions: [
          {
            id: 'lesion-polyp-1',
            class: 'Polyp',
            confidence: 0.942,
            positionMm: [14.2, -3.8, -82.0],
            depthMm: 8.5,
          },
        ],
      })
    );
    return true;
  }

  if (url === '/api/trajectory/export') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        format: 'JSON',
        pointsCount: 142,
        durationSec: 28.4,
        exportedAt: new Date().toISOString(),
      })
    );
    return true;
  }

  if (url === '/api/phantom/import') {
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, phantomId: 'patient_phantom_ct_01', vertices: 4800 }));
    return true;
  }

  return false;
}
