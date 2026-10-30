/**
 * Localization Engine View
 * In-depth comparative evaluation of Trilateration NLS, TDoA Chan, EKF, and Particle Filter vs CRLB.
 */

import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { TractViewport3D } from '../viewport/TractViewport3D';
import { TelemetryCharts } from '../telemetry/TelemetryCharts';
import { Radio, Activity, Target, ShieldAlert, Cpu } from 'lucide-react';

export const LocalizationView: React.FC = () => {
  const { parameters, updateAnchor, updateParameters, currentEstimate, measurements, metrics } = useSimulation();

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 3D Viewport Stage */}
      <div className="h-[380px] w-full">
        <TractViewport3D />
      </div>

      {/* Algorithm Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {(['ekf', 'particle-filter', 'tdoa-chan', 'trilateration'] as const).map((alg) => {
          const m = metrics[alg];
          const name =
            alg === 'ekf' ? 'Extended Kalman Filter' :
            alg === 'particle-filter' ? 'Particle Filter (500 pts)' :
            alg === 'tdoa-chan' ? 'TDoA (Chan Algorithm)' : 'Trilateration (NLS)';

          const isSelected = parameters.activeLocalizationAlgorithm === alg;

          return (
            <div
              key={alg}
              onClick={() => updateParameters({ activeLocalizationAlgorithm: alg })}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-cyan-50/70 border-cyan-500 shadow-sm ring-1 ring-cyan-500/50'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">{name}</span>
                {isSelected && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-300">
                    ACTIVE
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-700">
                  {m.rmse.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-slate-500">mm RMSE</span>
              </div>

              <div className="mt-2 text-[11px] font-mono text-slate-600 flex flex-col gap-1 border-t border-slate-200 pt-2">
                <div className="flex justify-between">
                  <span>MAE:</span>
                  <span className="text-slate-800 font-medium">{m.mae.toFixed(2)} mm</span>
                </div>
                <div className="flex justify-between">
                  <span>95th %-ile:</span>
                  <span className="text-slate-800 font-medium">{m.p95.toFixed(2)} mm</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-Time Telemetry Line Charts */}
      <TelemetryCharts />

      {/* Real-Time Anchor Channel Measurements Table */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Live UWB RF Channel Ranging Telemetry (Abdominal Array to Capsule)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            CRLB Lower Bound: <strong className="text-cyan-700 font-semibold">{currentEstimate.crlbBoundMm.toFixed(2)} mm</strong>
          </span>
        </div>

        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-mono">
              <th className="py-2 px-3">Anchor Node</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">3D Position (mm)</th>
              <th className="py-2 px-3">True Dist (mm)</th>
              <th className="py-2 px-3">Measured Dist (mm)</th>
              <th className="py-2 px-3">Path Loss (dB)</th>
              <th className="py-2 px-3">Shadowing (dB)</th>
              <th className="py-2 px-3">SNR (dB)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
            {measurements.map((m) => {
              const anchor = parameters.anchors.find((a) => a.id === m.anchorId);
              if (!anchor) return null;

              return (
                <tr key={m.anchorId}>
                  <td className="py-2 px-3 font-semibold text-slate-900">{anchor.name}</td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => updateAnchor(anchor.id, { enabled: !anchor.enabled })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        anchor.enabled ? 'bg-cyan-50 text-cyan-800 border border-cyan-300' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {anchor.enabled ? 'ACTIVE' : 'MUTED'}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-slate-500">
                    [{anchor.position[0]}, {anchor.position[1]}, {anchor.position[2]}]
                  </td>
                  <td className="py-2 px-3 text-slate-700">{m.trueDistanceMm}</td>
                  <td className="py-2 px-3 font-bold text-cyan-700">{m.measuredDistanceMm}</td>
                  <td className="py-2 px-3 text-amber-700 font-medium">{m.pathLossDb}</td>
                  <td className="py-2 px-3 text-slate-500">{m.shadowingErrorDb}</td>
                  <td className="py-2 px-3 text-emerald-700 font-bold">{m.snrDb}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
