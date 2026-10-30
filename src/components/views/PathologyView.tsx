/**
 * Computer Vision Pathology Detection View
 * Benchmarks RTMDet, YOLOv3, SSD300 on 10 endoscopic classes,
 * with confusion matrix and 2D-to-3D landmark coordinate mapping.
 */

import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { EndoscopicFeed } from '../viewport/EndoscopicFeed';
import { PATHOLOGY_CLASSES } from '../../engine/environment/giTractGeometry';
import { getModelConfusionMatrix, MODEL_BENCHMARKS } from '../../engine/vision/pathologyDetector';
import { Camera, CheckCircle, Table, Eye, Sparkles } from 'lucide-react';

export const PathologyView: React.FC = () => {
  const { parameters, updateParameters, activeDetections, uniqueLoggedLesions } = useSimulation();

  const confusionMatrix = getModelConfusionMatrix(parameters.detectionModel);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Endoscopic Camera Feed & Model Selector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[440px]">
          <EndoscopicFeed />
        </div>

        {/* Vision Architecture Selector & Benchmarks */}
        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  WCE Deep Learning Pathology Models (Literature Benchmarks)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {(Object.keys(MODEL_BENCHMARKS) as (keyof typeof MODEL_BENCHMARKS)[]).map((mKey) => {
                const spec = MODEL_BENCHMARKS[mKey];
                const isSelected = parameters.detectionModel === mKey;

                return (
                  <div
                    key={mKey}
                    onClick={() => updateParameters({ detectionModel: mKey })}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-50/70 border-cyan-500 shadow-sm ring-1 ring-cyan-500/50'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">{spec.name}</span>
                      <span className="text-[11px] font-mono text-cyan-700 font-semibold">{spec.fps} FPS</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{spec.architecture}</div>

                    <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] font-mono border-t border-slate-200 pt-1.5">
                      <div>mAP@0.5: <strong className="text-emerald-700">{spec.mAP50}%</strong></div>
                      <div>mAP@0.75: <strong className="text-slate-700">{spec.mAP75}%</strong></div>
                      <div>VRAM: <strong className="text-slate-700">{spec.vramMiB}M</strong></div>
                      <div>F1: <strong className="text-amber-700">{spec.f1Score}%</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Time Detection to 3D Landmark Conversion Note */}
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 shadow-xs">
            <strong className="text-slate-800">Detection-to-3D Coordinate Transform:</strong>
            <div className="font-mono text-cyan-700 font-semibold mt-1">
              p_lesion = p_capsule + R(θ, φ) · d_lesion
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Estimates 3D coordinates on lumen surface via monocular depth map and capsule attitude matrix.
            </div>
          </div>
        </div>
      </div>

      {/* 10 Pathology Classes Reference Roster */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          10 Standard WCE Pathology Target Classes & Diagnostic Signatures
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PATHOLOGY_CLASSES.map((cls) => (
            <div key={cls.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col gap-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">{cls.name}</span>
                <span
                  style={{ backgroundColor: cls.color }}
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                />
              </div>
              <span className="text-[10px] uppercase font-mono text-slate-500 font-medium">{cls.severity} priority</span>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{cls.clinicalDescription}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Normalized Confusion Matrix */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Normalized Multi-Class Confusion Matrix ({MODEL_BENCHMARKS[parameters.detectionModel].name})
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Diagonal reflects True Positive classification rates across the 10 target classes.
        </p>

        <table className="w-full text-[10px] font-mono text-center">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-1 px-2 text-left font-semibold">Target / Pred</th>
              {PATHOLOGY_CLASSES.map((c) => (
                <th key={c.id} className="py-1 px-1 font-semibold">{c.name.slice(0, 4)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {confusionMatrix.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="py-1.5 px-2 text-left font-semibold text-slate-800">
                  {PATHOLOGY_CLASSES[rIdx].name}
                </td>
                {row.map((val, cIdx) => {
                  const isDiag = rIdx === cIdx;
                  const bg = isDiag
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : val > 0.05
                    ? 'bg-amber-50 text-amber-800'
                    : 'text-slate-400';

                  return (
                    <td key={cIdx} className={`py-1.5 px-1 ${bg}`}>
                      {(val * 100).toFixed(0)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
