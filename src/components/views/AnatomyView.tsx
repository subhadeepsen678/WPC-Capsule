/**
 * GI Anatomy & Dielectric Tissue Environment View
 * Displays multi-layer tissue properties (Skin, Fat, Muscle, Small Intestine),
 * dielectric permittivity/conductivity tables @ 4 GHz, and 3D tract geometry selection.
 */

import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { TractViewport3D } from '../viewport/TractViewport3D';
import { Layers, Dna, Activity, ShieldCheck } from 'lucide-react';

export const AnatomyView: React.FC = () => {
  const { parameters, updateParameters, updateTissueLayer, setGIPathType } = useSimulation();

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 3D Viewport Header */}
      <div className="h-[380px] w-full">
        <TractViewport3D />
      </div>

      {/* GI Tract Curvature Selector */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Gastrointestinal Pathway Geometry Model</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select between synthetic standardized testbeds or patient-derived anatomical loops.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['curved', 'straight', 'spiral', 'phantom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setGIPathType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                parameters.pathType === type
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {type === 'curved' ? 'Duodeno-Jejunal' : type === 'phantom' ? 'CT-Derived Phantom' : type}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Tissue Layers Dielectric Specifications */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-cyan-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Human Tissue Dielectric Attenuation Model (IT'IS Foundation Standard @ 4.0 GHz)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {parameters.tissues.map((layer) => (
            <div key={layer.id} className="bg-slate-50 border border-slate-200 shadow-xs rounded-xl p-4 text-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-800">{layer.name}</span>
                <span className="text-[11px] text-cyan-700 font-mono font-medium">β = {layer.pathLossExponent}</span>
              </div>

              <div className="flex flex-col gap-2.5">
                <div>
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>Thickness:</span>
                    <span className="font-mono text-slate-800 font-bold">{layer.thicknessMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={layer.thicknessMm}
                    onChange={(e) => updateTissueLayer(layer.id, { thicknessMm: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>Permittivity (ε_r):</span>
                    <span className="font-mono text-cyan-700 font-bold">{layer.relativePermittivity}</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="65"
                    step="0.5"
                    value={layer.relativePermittivity}
                    onChange={(e) => updateTissueLayer(layer.id, { relativePermittivity: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>Conductivity (σ):</span>
                    <span className="font-mono text-emerald-700 font-bold">{layer.conductivity} S/m</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.05"
                    value={layer.conductivity}
                    onChange={(e) => updateTissueLayer(layer.id, { conductivity: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>Path Loss Exponent (β):</span>
                    <span className="font-mono text-amber-700 font-bold">{layer.pathLossExponent}</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="6.0"
                    step="0.1"
                    value={layer.pathLossExponent}
                    onChange={(e) => updateTissueLayer(layer.id, { pathLossExponent: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Peristalsis Motion Parameters */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <div className="flex justify-between text-slate-500 mb-1 font-medium">
            <span>Peristalsis Amplitude:</span>
            <span className="font-mono text-cyan-700 font-semibold">{parameters.peristalsisAmpMm} mm</span>
          </div>
          <input
            type="range"
            min="0"
            max="6"
            step="0.2"
            value={parameters.peristalsisAmpMm}
            onChange={(e) => updateParameters({ peristalsisAmpMm: parseFloat(e.target.value) })}
            className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
          />
          <p className="text-[11px] text-slate-500 mt-1">Simulates rhythmic radial gut lumen contraction.</p>
        </div>

        <div>
          <div className="flex justify-between text-slate-500 mb-1 font-medium">
            <span>Peristalsis Frequency:</span>
            <span className="font-mono text-cyan-700 font-semibold">{parameters.peristalsisFreqHz} Hz</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.4"
            step="0.02"
            value={parameters.peristalsisFreqHz}
            onChange={(e) => updateParameters({ peristalsisFreqHz: parseFloat(e.target.value) })}
            className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
          />
          <p className="text-[11px] text-slate-500 mt-1">Normal human small bowel migrating motor complex rate.</p>
        </div>

        <div>
          <div className="flex justify-between text-slate-500 mb-1 font-medium">
            <span>Nominal Lumen Diameter:</span>
            <span className="font-mono text-cyan-700 font-semibold">{parameters.lumenDiameterMm} mm</span>
          </div>
          <input
            type="range"
            min="18"
            max="36"
            step="1"
            value={parameters.lumenDiameterMm}
            onChange={(e) => updateParameters({ lumenDiameterMm: parseFloat(e.target.value) })}
            className="w-full accent-cyan-600 h-1 bg-slate-200 rounded"
          />
          <p className="text-[11px] text-slate-500 mt-1">Resting diameter of jejunal and ileal folds.</p>
        </div>
      </div>
    </div>
  );
};
