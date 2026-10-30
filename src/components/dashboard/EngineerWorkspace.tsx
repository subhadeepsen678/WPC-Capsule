/**
 * Engineer & Researcher Console
 * Complete parameter tuning panel (30+ RF, magnetic, and vision parameters),
 * live CRLB vs RMSE graphs, 33-node tactile matrix, and algorithm benchmarking.
 */

import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { TractViewport3D } from '../viewport/TractViewport3D';
import { TelemetryCharts } from '../telemetry/TelemetryCharts';
import { MODEL_BENCHMARKS } from '../../engine/vision/pathologyDetector';
import {
  Sliders,
  Radio,
  Magnet,
  Camera,
  Activity,
  Layers,
  Zap,
  TrendingDown,
  RefreshCw,
  Cpu,
  Shield,
  Gauge,
} from 'lucide-react';

export const EngineerWorkspace: React.FC = () => {
  const {
    parameters,
    updateParameters,
    updateTissueLayer,
    updateAnchor,
    updateCoil,
    magneticData,
    pressureData,
    currentEstimate,
    metrics,
    capsule,
  } = useSimulation();

  const [activeParamTab, setActiveParamTab] = useState<'rf' | 'locomotion' | 'vision' | 'tactile'>('rf');

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 3D Viewport in Engineer Context */}
      <div className="h-[400px] w-full">
        <TractViewport3D />
      </div>

      {/* Engineering Live Analytics: CRLB vs Algorithm Benchmark Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Theoretical CRLB Bound</span>
            <TrendingDown className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-700">
              {currentEstimate.crlbBoundMm.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500">mm lower bound</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Fisher Info Matrix F = J^T R^-1 J
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>EKF Tracking RMSE</span>
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">
              {metrics['ekf'].rmse.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500">mm (P95: {metrics['ekf'].p95.toFixed(1)}mm)</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Q = {parameters.processNoiseQ} · R = {parameters.measurementNoiseR}
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Biot-Savart Flux Density</span>
            <Magnet className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600">
              {(magneticData.magnitudeTesla * 1000).toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500">mT net field</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Lorentz Force: {(Math.hypot(...magneticData.forceVectorN) * 1000).toFixed(1)} mN
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>E_pp Estimated Deflection</span>
            <Gauge className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-600">
              {pressureData.estimatedPressurePointMm.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500">mm contact arc</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Active wall nodes: {pressureData.activeHighPressureCount} / 33
          </div>
        </div>
      </div>

      {/* Real-Time Telemetry Line Charts (Recharts) */}
      <TelemetryCharts />

      {/* Algorithm Benchmark Comparison Matrix */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Localization Algorithm Benchmark Comparison (Real-Time vs. CRLB)
        </h3>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-mono">
              <th className="py-2 px-3">Algorithm</th>
              <th className="py-2 px-3">RMSE (mm)</th>
              <th className="py-2 px-3">MAE (mm)</th>
              <th className="py-2 px-3">95th %-ile (mm)</th>
              <th className="py-2 px-3">CRLB Gap</th>
              <th className="py-2 px-3">Convergence</th>
              <th className="py-2 px-3">Complexity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
            <tr>
              <td className="py-2 px-3 font-semibold text-cyan-700">Extended Kalman Filter (EKF)</td>
              <td className="py-2 px-3 text-emerald-700 font-bold">{metrics['ekf'].rmse.toFixed(2)}</td>
              <td className="py-2 px-3">{metrics['ekf'].mae.toFixed(2)}</td>
              <td className="py-2 px-3">{metrics['ekf'].p95.toFixed(2)}</td>
              <td className="py-2 px-3 text-emerald-700">
                +{(metrics['ekf'].rmse - currentEstimate.crlbBoundMm).toFixed(2)} mm
              </td>
              <td className="py-2 px-3 text-emerald-700 font-medium">Instant (Recursive)</td>
              <td className="py-2 px-3 text-slate-500">O(m³) Low</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-semibold text-cyan-700">Particle Filter (500 pts)</td>
              <td className="py-2 px-3 text-emerald-700 font-bold">{metrics['particle-filter'].rmse.toFixed(2)}</td>
              <td className="py-2 px-3">{metrics['particle-filter'].mae.toFixed(2)}</td>
              <td className="py-2 px-3">{metrics['particle-filter'].p95.toFixed(2)}</td>
              <td className="py-2 px-3 text-emerald-700">
                +{(metrics['particle-filter'].rmse - currentEstimate.crlbBoundMm).toFixed(2)} mm
              </td>
              <td className="py-2 px-3 text-emerald-700 font-medium">Resampled (20 Hz)</td>
              <td className="py-2 px-3 text-amber-700">O(N·m) Moderate</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-semibold text-cyan-700">TDoA (Chan Algorithm)</td>
              <td className="py-2 px-3">{metrics['tdoa-chan'].rmse.toFixed(2)}</td>
              <td className="py-2 px-3">{metrics['tdoa-chan'].mae.toFixed(2)}</td>
              <td className="py-2 px-3">{metrics['tdoa-chan'].p95.toFixed(2)}</td>
              <td className="py-2 px-3 text-amber-700">
                +{(metrics['tdoa-chan'].rmse - currentEstimate.crlbBoundMm).toFixed(2)} mm
              </td>
              <td className="py-2 px-3 text-cyan-700">Closed-Form</td>
              <td className="py-2 px-3 text-slate-500">O(m) Low</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-semibold text-cyan-700">Trilateration (NLS Levenberg)</td>
              <td className="py-2 px-3">{metrics['trilateration'].rmse.toFixed(2)}</td>
              <td className="py-2 px-3">{metrics['trilateration'].mae.toFixed(2)}</td>
              <td className="py-2 px-3">{metrics['trilateration'].p95.toFixed(2)}</td>
              <td className="py-2 px-3 text-amber-700">
                +{(metrics['trilateration'].rmse - currentEstimate.crlbBoundMm).toFixed(2)} mm
              </td>
              <td className="py-2 px-3 text-slate-600">8 Iterations</td>
              <td className="py-2 px-3 text-slate-500">O(k·m) Low</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 30+ Parameter Engineering Tuning Console */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4">
        {/* Parameter Sub-Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Micro-System Parameters & Sensor Calibration Panel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tune tissue dielectric layers, UWB anchor arrays, electromagnetic coils, and vision thresholds.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveParamTab('rf')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeParamTab === 'rf' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              RF & Dielectric
            </button>
            <button
              onClick={() => setActiveParamTab('locomotion')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeParamTab === 'locomotion' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Magnet className="w-3.5 h-3.5" />
              4-Coil Actuators
            </button>
            <button
              onClick={() => setActiveParamTab('tactile')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeParamTab === 'tactile' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              33-Sensor Matrix
            </button>
            <button
              onClick={() => setActiveParamTab('vision')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeParamTab === 'vision' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              CV Model Benchmark
            </button>
          </div>
        </div>

        {/* Tab 1: RF, UWB & Tissue Dielectric Parameters */}
        {activeParamTab === 'rf' && (
          <div className="flex flex-col gap-5">
            {/* 4 Tissue Layers Grid */}
            <div>
              <span className="text-xs font-semibold text-slate-800 block mb-2">
                Tissue Dielectric Layers (Relative Permittivity ε_r, Conductivity σ, Path Loss β @ 4 GHz)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {parameters.tissues.map((tissue) => (
                  <div key={tissue.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs shadow-xs">
                    <div className="font-semibold text-slate-800 mb-2">{tissue.name}</div>
                    
                    <div className="flex flex-col gap-2">
                      <div>
                        <div className="flex justify-between text-slate-500 mb-1">
                          <span>Thickness:</span>
                          <span className="font-mono text-cyan-700 font-medium">{tissue.thicknessMm} mm</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={tissue.thicknessMm}
                          onChange={(e) => updateTissueLayer(tissue.id, { thicknessMm: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-500 mb-1">
                          <span>Permittivity ε_r:</span>
                          <span className="font-mono text-cyan-700 font-medium">{tissue.relativePermittivity}</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="70"
                          step="0.5"
                          value={tissue.relativePermittivity}
                          onChange={(e) => updateTissueLayer(tissue.id, { relativePermittivity: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-500 mb-1">
                          <span>Path Loss β:</span>
                          <span className="font-mono text-cyan-700 font-medium">{tissue.pathLossExponent}</span>
                        </div>
                        <input
                          type="range"
                          min="2.0"
                          max="6.5"
                          step="0.1"
                          value={tissue.pathLossExponent}
                          onChange={(e) => updateTissueLayer(tissue.id, { pathLossExponent: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shadowing & Kalman Noise Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs shadow-xs">
              <div>
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>Log-Normal Shadowing σ:</span>
                  <span className="font-mono text-cyan-700 font-medium">{parameters.shadowingSigmaDb} dB</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.25"
                  value={parameters.shadowingSigmaDb}
                  onChange={(e) => updateParameters({ shadowingSigmaDb: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>EKF Process Noise Q:</span>
                  <span className="font-mono text-cyan-700 font-medium">{parameters.processNoiseQ}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.1"
                  step="0.002"
                  value={parameters.processNoiseQ}
                  onChange={(e) => updateParameters({ processNoiseQ: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>Measurement Variance R:</span>
                  <span className="font-mono text-cyan-700 font-medium">{parameters.measurementNoiseR} mm²</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="64"
                  step="1"
                  value={parameters.measurementNoiseR}
                  onChange={(e) => updateParameters({ measurementNoiseR: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                />
              </div>
            </div>

            {/* 6 UWB Anchor Array Editor */}
            <div>
              <span className="text-xs font-semibold text-slate-800 block mb-2">
                UWB Anchor Geometry Matrix (3D Abdominal Placement)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {parameters.anchors.map((anchor) => (
                  <div key={anchor.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs flex items-center justify-between shadow-xs">
                    <div>
                      <div className="font-medium text-slate-800">{anchor.name}</div>
                      <div className="font-mono text-[11px] text-cyan-700 mt-0.5">
                        [{anchor.position[0]}, {anchor.position[1]}, {anchor.position[2]}] mm
                      </div>
                    </div>
                    <button
                      onClick={() => updateAnchor(anchor.id, { enabled: !anchor.enabled })}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                        anchor.enabled ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {anchor.enabled ? 'ENABLED' : 'MUTED'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Locomotion & 4-Coil Actuators */}
        {activeParamTab === 'locomotion' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {parameters.coils.map((coil) => (
                <div key={coil.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800">{coil.name}</span>
                    <button
                      onClick={() => updateCoil(coil.id, { active: !coil.active })}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        coil.active ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {coil.active ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div>
                      <div className="flex justify-between text-slate-500 mb-1">
                        <span>Drive Current:</span>
                        <span className="font-mono text-amber-700 font-semibold">{coil.currentAmps} A</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={coil.currentAmps}
                        onChange={(e) => updateCoil(coil.id, { currentAmps: parseFloat(e.target.value) })}
                        className="w-full accent-amber-600 h-1 bg-slate-200 rounded"
                      />
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      Radius: {coil.radiusMm}mm · Turns: {coil.turnsPerMeter}/m
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mechanics Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs shadow-xs">
              <div>
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>Capsule Mass:</span>
                  <span className="font-mono text-amber-700 font-semibold">{parameters.capsuleMassG} g</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  step="0.5"
                  value={parameters.capsuleMassG}
                  onChange={(e) => updateParameters({ capsuleMassG: parseFloat(e.target.value) })}
                  className="w-full accent-amber-600 h-1 bg-slate-200 rounded"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>Tissue Friction μ:</span>
                  <span className="font-mono text-amber-700 font-semibold">{parameters.frictionCoeff}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.7"
                  step="0.05"
                  value={parameters.frictionCoeff}
                  onChange={(e) => updateParameters({ frictionCoeff: parseFloat(e.target.value) })}
                  className="w-full accent-amber-600 h-1 bg-slate-200 rounded"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>Step Size Increment:</span>
                  <span className="font-mono text-amber-700 font-semibold">{parameters.nominalStepSizeMm} mm</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={parameters.nominalStepSizeMm}
                  onChange={(e) => updateParameters({ nominalStepSizeMm: parseFloat(e.target.value) })}
                  className="w-full accent-amber-600 h-1 bg-slate-200 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: 33-Node Tactile Sensor Matrix */}
        {activeParamTab === 'tactile' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="font-semibold">Capsule Tactile Matrix (33 Surface Nodes, Limit: {parameters.pressureThresholdKpa} kPa)</span>
              <span className="font-mono text-rose-600 font-bold">
                Peak Pressure: {pressureData.maxPressureKpa} kPa
              </span>
            </div>

            {/* 33-Node Heatmap Grid */}
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

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-center justify-between shadow-xs">
              <div>
                <strong>Estimated Pressure Point (E_pp):</strong> {pressureData.estimatedPressurePointMm} mm
                <span className="text-slate-300 mx-2">|</span>
                <strong>Deflection Vector:</strong> [{pressureData.steeringCorrectionRad[0].toFixed(2)}, {pressureData.steeringCorrectionRad[1].toFixed(2)}] rad
              </div>
              <span className="text-emerald-700 font-mono font-semibold">
                {pressureData.thresholdExceeded ? 'AUTONOMOUS DEFLECTION ENGAGED' : 'NOMINAL CLEARANCE'}
              </span>
            </div>
          </div>
        )}

        {/* Tab 4: CV Model Benchmarks */}
        {activeParamTab === 'vision' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {(Object.keys(MODEL_BENCHMARKS) as (keyof typeof MODEL_BENCHMARKS)[]).map((mKey) => {
                const spec = MODEL_BENCHMARKS[mKey];
                const isSelected = parameters.detectionModel === mKey;

                return (
                  <div
                    key={mKey}
                    onClick={() => updateParameters({ detectionModel: mKey })}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-50/70 border-cyan-500 shadow-sm ring-1 ring-cyan-500/50'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 text-xs">{spec.name}</div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">{spec.architecture}</div>

                    <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-600">
                      <div>mAP@0.5: <strong className="text-emerald-700">{spec.mAP50}%</strong></div>
                      <div>FPS: <strong className="text-cyan-700">{spec.fps}</strong></div>
                      <div>VRAM: <strong className="text-slate-700">{spec.vramMiB}M</strong></div>
                      <div>F1-Score: <strong className="text-slate-800">{spec.f1Score}%</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Threshold Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs shadow-xs">
              <div>
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>Confidence Threshold:</span>
                  <span className="font-mono text-cyan-700 font-medium">{(parameters.confidenceThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={parameters.confidenceThreshold}
                  onChange={(e) => updateParameters({ confidenceThreshold: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>NMS IoU Threshold:</span>
                  <span className="font-mono text-cyan-700 font-medium">{parameters.nmsIouThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="0.8"
                  step="0.05"
                  value={parameters.nmsIouThreshold}
                  onChange={(e) => updateParameters({ nmsIouThreshold: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
