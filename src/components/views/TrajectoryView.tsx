/**
 * Trajectory Mapping & Traceability Log View
 * Full examination timeline recording, scrubber playback, pose traceability, and clinical export.
 */

import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { TractViewport3D } from '../viewport/TractViewport3D';
import { Play, Pause, RotateCcw, FastForward, Download, Clock, MapPin, Gauge } from 'lucide-react';

export const TrajectoryView: React.FC<{ onOpenExport: () => void }> = ({ onOpenExport }) => {
  const { trajectory, isRunning, toggleRunning, speedMultiplier, setSpeedMultiplier, replayIndex, setReplayIndex } = useSimulation();

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 3D Anatomical Viewport with Trajectory Trail */}
      <div className="h-[380px] w-full">
        <TractViewport3D />
      </div>

      {/* Trajectory Playback Scrubber & Motion Controls */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Examination Journey Playback & Trajectory Scrubber
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              ({trajectory.length} pose frames recorded)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs ${
                isRunning ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? 'Pause' : 'Play Live'}
            </button>

            {/* Speed Multiplier */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs">
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSpeedMultiplier(speed)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                    speedMultiplier === speed ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Timeline Scrubber Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500">0.0s</span>
          <input
            type="range"
            min="0"
            max={Math.max(1, trajectory.length - 1)}
            value={replayIndex !== null ? replayIndex : trajectory.length - 1}
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              setReplayIndex(idx);
            }}
            className="flex-1 accent-cyan-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-cyan-700 font-semibold">
            {trajectory.length > 0 ? `${trajectory[trajectory.length - 1].timestamp}s` : '0.0s'}
          </span>
          {replayIndex !== null && (
            <button
              onClick={() => setReplayIndex(null)}
              className="text-xs text-cyan-600 hover:text-cyan-700 hover:underline font-mono font-semibold"
            >
              Resume Live
            </button>
          )}
        </div>
      </div>

      {/* Trajectory Recorded Frames Table */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Chronological Pose & Sensor Telemetry Log
        </h3>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-mono">
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Ground Truth (x, y, z)</th>
              <th className="py-2 px-3">Estimated EKF (x, y, z)</th>
              <th className="py-2 px-3">Error (mm)</th>
              <th className="py-2 px-3">Peak Pressure</th>
              <th className="py-2 px-3">Event / Detection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
            {trajectory.slice(-15).reverse().map((pt, idx) => {
              const err = Math.hypot(
                pt.groundTruth[0] - pt.estimated[0],
                pt.groundTruth[1] - pt.estimated[1],
                pt.groundTruth[2] - pt.estimated[2]
              );

              return (
                <tr key={idx}>
                  <td className="py-2 px-3 text-cyan-700 font-bold">{pt.timestamp}s</td>
                  <td className="py-2 px-3 text-slate-800">
                    [{pt.groundTruth[0].toFixed(1)}, {pt.groundTruth[1].toFixed(1)}, {pt.groundTruth[2].toFixed(1)}]
                  </td>
                  <td className="py-2 px-3 text-slate-500">
                    [{pt.estimated[0].toFixed(1)}, {pt.estimated[1].toFixed(1)}, {pt.estimated[2].toFixed(1)}]
                  </td>
                  <td className="py-2 px-3 text-emerald-700 font-bold">
                    {err.toFixed(2)} mm
                  </td>
                  <td className="py-2 px-3 text-amber-700 font-medium">
                    {pt.pressureMaxKpa.toFixed(2)} kPa
                  </td>
                  <td className="py-2 px-3">
                    {pt.lesionDetected ? (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        ● {pt.lesionDetected.className} ({(pt.lesionDetected.confidence * 100).toFixed(0)}%)
                      </span>
                    ) : (
                      <span className="text-slate-400">Transit nominal</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
