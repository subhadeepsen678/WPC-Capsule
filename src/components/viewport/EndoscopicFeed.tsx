/**
 * Procedural Endoscopic Camera Feed & Pathology Detection Visualizer
 * Simulates circular aperture endoscopic view with mucosal vascularity, folds, and live AI bounding boxes.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { MODEL_BENCHMARKS } from '../../engine/vision/pathologyDetector';
import { PATHOLOGY_CLASSES } from '../../engine/environment/giTractGeometry';
import { Camera, Eye, Zap, Crosshair, Pause, Play, Sparkles, AlertOctagon } from 'lucide-react';

export const EndoscopicFeed: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { capsule, parameters, activeDetections, simTimeSec, pressureData } = useSimulation();

  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);

  const modelSpecs = MODEL_BENCHMARKS[parameters.detectionModel];

  // Procedural Mucosal Rendering Canvas
  useEffect(() => {
    if (isFrozen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.46;

    // 1. Clear background
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, width, height);

    // 2. Circular Endoscope Aperture Clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // 3. Base Intestinal Mucosa Gradient (Lumen depth falloff)
    const lumenGrad = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 0.1,
      centerX,
      centerY,
      radius
    );
    lumenGrad.addColorStop(0, '#1a0505'); // Deep lumen dark center
    lumenGrad.addColorStop(0.35, '#5c1919'); // Transitional pinkish-red
    lumenGrad.addColorStop(0.7, '#8f2929'); // Mucosal surface
    lumenGrad.addColorStop(1, '#a83b3b'); // Outer wall
    ctx.fillStyle = lumenGrad;
    ctx.fillRect(0, 0, width, height);

    // 4. Peristaltic Rhythmic Fold Lines (Plicae Circulares)
    const peristalsisWave = Math.sin(simTimeSec * 2.5);
    const numFolds = 12;
    ctx.strokeStyle = 'rgba(255, 140, 140, 0.25)';
    ctx.lineWidth = 3.5;

    for (let i = 1; i <= numFolds; i++) {
      const r = (radius / numFolds) * i + peristalsisWave * (i * 0.8);
      ctx.beginPath();
      // Add wavy noise to circular fold
      for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
        const distort = Math.sin(angle * 7 + capsule.roll * 4) * 4;
        const x = centerX + (r + distort) * Math.cos(angle);
        const y = centerY + (r + distort) * Math.sin(angle);
        if (angle === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 5. Mucosal Capillary Micro-Vessels (Procedural vascular spiders)
    ctx.strokeStyle = 'rgba(160, 20, 20, 0.4)';
    ctx.lineWidth = 1.2;
    for (let v = 0; v < 8; v++) {
      const baseAngle = v * (Math.PI / 4) + capsule.roll;
      ctx.beginPath();
      let vx = centerX + Math.cos(baseAngle) * (radius * 0.4);
      let vy = centerY + Math.sin(baseAngle) * (radius * 0.4);
      ctx.moveTo(vx, vy);
      for (let s = 0; s < 4; s++) {
        vx += Math.cos(baseAngle + s * 0.3) * 16;
        vy += Math.sin(baseAngle + s * 0.3) * 16;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }

    // 6. Draw Pathology Lesions in Camera View if active
    if (activeDetections.length > 0) {
      for (const det of activeDetections) {
        const [ymin, xmin, ymax, xmax] = det.bbox;
        const boxX = xmin * width;
        const boxY = ymin * height;
        const boxW = (xmax - xmin) * width;
        const boxH = (ymax - ymin) * height;

        const lesionCenterX = boxX + boxW / 2;
        const lesionCenterY = boxY + boxH / 2;

        ctx.save();
        if (det.classId === 'polyp') {
          // Adenomatous Polyp Protrusion (nodular flesh pink/salmon)
          const polypGrad = ctx.createRadialGradient(lesionCenterX, lesionCenterY, 2, lesionCenterX, lesionCenterY, boxW * 0.4);
          polypGrad.addColorStop(0, '#fca5a5');
          polypGrad.addColorStop(0.7, '#ef4444');
          polypGrad.addColorStop(1, '#991b1b');
          ctx.fillStyle = polypGrad;
          ctx.beginPath();
          ctx.arc(lesionCenterX, lesionCenterY, boxW * 0.38, 0, Math.PI * 2);
          ctx.fill();
        } else if (det.classId === 'ulcer') {
          // Deep Ulcer Crater with white fibrin exudate base
          ctx.fillStyle = '#7f1d1d';
          ctx.beginPath();
          ctx.ellipse(lesionCenterX, lesionCenterY, boxW * 0.4, boxH * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();

          // White fibrin exudate center
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.ellipse(lesionCenterX, lesionCenterY, boxW * 0.22, boxH * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (det.classId === 'blood-fresh' || det.classId === 'blood-hematin') {
          // Luminal pool of blood
          ctx.fillStyle = det.classId === 'blood-fresh' ? 'rgba(220, 38, 38, 0.85)' : 'rgba(80, 10, 10, 0.9)';
          ctx.beginPath();
          ctx.ellipse(lesionCenterX, lesionCenterY, boxW * 0.45, boxH * 0.3, 0.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Erythema / Angiectasia vascular cluster
          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.beginPath();
          ctx.arc(lesionCenterX, lesionCenterY, boxW * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 7. Dynamic LED Spotlight Specular Hot-Spot (polycarbonate optical reflection)
    const spotX = centerX + Math.cos(capsule.yaw) * 15;
    const spotY = centerY + Math.sin(capsule.pitch) * 15;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, radius * 0.85);
    spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    spotGrad.addColorStop(0.2, 'rgba(255, 240, 240, 0.15)');
    spotGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, width, height);

    // 8. Wet Mucosal Specular Highlights (glistening droplets)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let h = 0; h < 6; h++) {
      const hx = centerX + Math.cos(h * 1.1 + simTimeSec * 1.5) * (radius * 0.5);
      const hy = centerY + Math.sin(h * 1.1 + simTimeSec * 1.5) * (radius * 0.5);
      ctx.beginPath();
      ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // Restore clip

    // 9. Outer Dark Lens Bezel & Reticle
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 7, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle crosshair tick marks at 12, 3, 6, 9 o'clock
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY); ctx.lineTo(centerX + 10, centerY);
    ctx.moveTo(centerX, centerY - 10); ctx.lineTo(centerX, centerY + 10);
    ctx.stroke();

  }, [capsule, activeDetections, simTimeSec, isFrozen]);

  const handleCaptureSnapshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setCapturedSnapshot(dataUrl);
  };

  return (
    <div className="relative w-full h-full min-h-[440px] bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xs flex flex-col">
      {/* Top Telemetry Header */}
      <div className="px-3.5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-xs">
          <Camera className="w-4 h-4 text-rose-500" />
          <span className="font-semibold text-slate-800">INTRALUMINAL ENDOSCOPIC CAM</span>
          <span className="text-slate-300">·</span>
          <span className="text-cyan-700 font-mono font-medium">{modelSpecs.name}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500 font-mono">{modelSpecs.fps} FPS</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              showOverlays ? 'bg-cyan-50 text-cyan-700 border border-cyan-300 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {showOverlays ? 'AI Overlay: ON' : 'AI Overlay: OFF'}
          </button>
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title={isFrozen ? 'Resume live feed' : 'Freeze frame'}
          >
            {isFrozen ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleCaptureSnapshot}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Capture HD frame"
          >
            <Camera className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main Endoscopic Viewport Canvas Container */}
      <div className="relative flex-1 flex items-center justify-center p-2 bg-slate-900">
        <canvas
          ref={canvasRef}
          width={480}
          height={480}
          className="max-w-full max-h-[380px] aspect-square rounded-full shadow-2xl border border-slate-700"
        />

        {/* Real-Time Mucosal Wall Contact Alert Overlay */}
        {pressureData.thresholdExceeded && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none bg-rose-50 border-2 border-rose-500 text-rose-900 px-3.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-xl animate-pulse z-15">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            WALL CONTACT HAZARD ({pressureData.maxPressureKpa} kPa)
          </div>
        )}

        {/* Real-time Bounding Box Overlays */}
        {showOverlays && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-2">
            <div className="relative w-[380px] h-[380px] max-w-full max-h-full">
              {activeDetections.map((det) => {
                const [ymin, xmin, ymax, xmax] = det.bbox;
                const topPct = ymin * 100;
                const leftPct = xmin * 100;
                const widthPct = (xmax - xmin) * 100;
                const heightPct = (ymax - ymin) * 100;

                const cls = PATHOLOGY_CLASSES.find((c) => c.id === det.classId);
                const borderClass =
                  det.classId === 'polyp' ? 'border-emerald-500' :
                  det.classId === 'ulcer' ? 'border-orange-500' :
                  det.classId === 'blood-fresh' ? 'border-rose-500' : 'border-amber-500';

                return (
                  <div
                    key={det.id}
                    style={{
                      top: `${topPct}%`,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                    className={`absolute border-2 ${borderClass} rounded transition-all duration-75`}
                  >
                    {/* Bounding Box Header Tag */}
                    <div className="absolute -top-6 left-0 flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/90 border border-slate-700/80 rounded text-[10px] font-mono whitespace-nowrap shadow-md">
                      <span className="font-semibold text-slate-100">{det.className}</span>
                      <span className="text-emerald-400 font-bold">{(det.confidence * 100).toFixed(1)}%</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-cyan-300">d:{det.depthMm.toFixed(1)}mm</span>
                    </div>

                    {/* Corner Reticle Accents */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-white" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-white" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Snapshot Modal Preview if triggered */}
        {capturedSnapshot && (
          <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 max-w-sm w-full flex flex-col items-center gap-3">
              <span className="text-xs font-semibold text-slate-200">Captured Endoscopic Frame</span>
              <img src={capturedSnapshot} alt="Snapshot" className="w-48 h-48 rounded-full border border-slate-700" />
              <div className="text-[11px] text-slate-400 font-mono text-center">
                Pose: [{capsule.x.toFixed(1)}, {capsule.y.toFixed(1)}, {capsule.z.toFixed(1)}] mm
              </div>
              <div className="flex items-center gap-2 w-full">
                <a
                  href={capturedSnapshot}
                  download={`wce-frame-${Math.floor(simTimeSec)}.png`}
                  className="flex-1 py-1.5 text-center text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
                >
                  Save Image
                </a>
                <button
                  onClick={() => setCapturedSnapshot(null)}
                  className="flex-1 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="px-3.5 py-2 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Active Inferences: <strong className="text-cyan-700 font-mono font-semibold">{activeDetections.length}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            mAP@0.5: <strong className="text-emerald-700 font-mono font-semibold">{modelSpecs.mAP50}%</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            VRAM: <strong className="text-slate-800 font-mono font-semibold">{modelSpecs.vramMiB} MiB</strong>
          </span>
        </div>

        <div className="font-mono text-slate-500">
          FOV: 75° · Res: {parameters.inputResolution}×{parameters.inputResolution}px
        </div>
      </div>
    </div>
  );
};
