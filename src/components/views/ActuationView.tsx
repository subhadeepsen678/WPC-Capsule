/**
 * Locomotion & Magnetic Actuation Engine View
 * Biot-Savart 4-coil array solver, Lorentz magnetic force, step control, and pressure-based E_pp path planning.
 */

import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { TractViewport3D } from '../viewport/TractViewport3D';
import { TelemetryCharts } from '../telemetry/TelemetryCharts';
import { Magnet, Gauge, Zap, Footprints, ShieldAlert, Cpu } from 'lucide-react';

export const ActuationView: React.FC = () => {
  const { parameters, updateCoil, updateParameters, magneticData, pressureData, stepCapsule } = useSimulation();

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 3D Viewport Stage */}
      <div className="h-[380px] w-full">
        <TractViewport3D />
      </div>

      {/* Actuation Telemetry Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Magnetic Flux Density</span>
            <Magnet className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600">
              {(magneticData.magnitudeTesla * 1000).toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500">mT</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            B: [{(magneticData.B[0] * 1000).toFixed(1)}, {(magneticData.B[1] * 1000).toFixed(1)}, {(magneticData.B[2] * 1000).toFixed(1)}] mT
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Net Magnetic Force</span>
            <Zap className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-700">
              {(Math.hypot(...magneticData.forceVectorN) * 1000).toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500">mN</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            F_L = V·M·∇B - μ·m·g
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Step Transit Time</span>
            <Footprints className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">
              {(magneticData.stepTimeSec * 1000).toFixed(0)}
            </span>
            <span className="text-xs font-mono text-slate-500">ms per {parameters.nominalStepSizeMm}mm</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            t = √(2·m·d / F_L)
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Optimal Step Current</span>
            <Cpu className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-600">
              {magneticData.requiredCurrentPerStepA.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500">Amperes</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Target 500ms step impulse
          </div>
        </div>
      </div>

      {/* Real-Time Telemetry Line Charts */}
      <TelemetryCharts />

      {/* 4 External Cylindrical Coils Control Grid */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Magnet className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              External Electromagnetic Coils (Biot-Savart Actuation Platform)
            </h3>
          </div>

          <button
            onClick={() => stepCapsule(parameters.nominalStepSizeMm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Footprints className="w-3.5 h-3.5" />
            Trigger Step ({parameters.nominalStepSizeMm} mm)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {parameters.coils.map((coil) => (
            <div key={coil.id} className="bg-slate-50 border border-slate-200 shadow-xs rounded-xl p-4 text-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-800">{coil.name}</span>
                <button
                  onClick={() => updateCoil(coil.id, { active: !coil.active })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    coil.active ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {coil.active ? 'POWERED' : 'MUTED'}
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>Coil Current (i):</span>
                    <span className="font-mono text-amber-700 font-bold">{coil.currentAmps} A</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={coil.currentAmps}
                    onChange={(e) => updateCoil(coil.id, { currentAmps: parseFloat(e.target.value) })}
                    className="w-full accent-amber-600 h-1 bg-slate-200 rounded"
                  />
                </div>

                <div className="font-mono text-[11px] text-slate-500 flex flex-col gap-1 border-t border-slate-200 pt-2">
                  <div className="flex justify-between">
                    <span>Position:</span>
                    <span className="text-slate-700">[{coil.position[0]}, {coil.position[1]}, {coil.position[2]}] mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Radius / Length:</span>
                    <span className="text-slate-700">{coil.radiusMm} mm / {coil.lengthMm} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Turns:</span>
                    <span className="text-slate-700">{coil.turnsPerMeter} turns/m</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pressure-Based Path Planning Section (E_pp Algorithm) */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Tactile Pressure Array & E_pp Collision-Avoidance Steering
            </h3>
          </div>

          <span className="text-xs font-mono text-amber-700 font-semibold">
            Peak Stress: {pressureData.maxPressureKpa} kPa (Limit: {parameters.pressureThresholdKpa} kPa)
          </span>
        </div>

        <p className="text-xs text-slate-500">
          When mucosal contact pressure exceeds 3.4 kPa, the estimated pressure point algorithm calculates
          spherical arc separation Dang and applies magnetic deflection impulse opposite to the impingement center.
        </p>

        {/* 33-Node Heatmap */}
        <div className="grid grid-cols-11 gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-xs">
          {pressureData.nodes.map((node) => {
            const ratio = Math.min(1, node.pressureKpa / 4.0);
            const bg =
              node.isExceeded ? 'bg-rose-600 text-white animate-pulse' :
              ratio > 0.6 ? 'bg-amber-100 border border-amber-300 text-amber-900' :
              ratio > 0.3 ? 'bg-cyan-100 border border-cyan-300 text-cyan-900' : 'bg-white border border-slate-200 text-slate-700 shadow-xs';

            return (
              <div
                key={node.id}
                className={`h-9 rounded flex flex-col items-center justify-center font-mono text-[10px] ${bg}`}
                title={`Node #${node.id} | Azimuth: ${node.phiDeg}° | Pressure: ${node.pressureKpa} kPa`}
              >
                <span>#{node.id}</span>
                <span className="font-bold">{node.pressureKpa}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
