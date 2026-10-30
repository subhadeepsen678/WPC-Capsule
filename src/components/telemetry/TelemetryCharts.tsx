/**
 * Real-Time Telemetry Line Chart Component (Recharts)
 * Visualizes UWB sensor signal strength (SNR / Path Loss) and magnetic flux density variations (|B|, Bx, By, Bz)
 * during robotic capsule transit through the gastrointestinal tract.
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { useSimulation } from '../../context/SimulationContext';
import { Radio, Magnet, Activity, Zap, Eye, Gauge, Pause, Play } from 'lucide-react';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

const CustomTelemetryTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 border border-slate-200 rounded-lg p-2.5 shadow-xl text-xs font-mono backdrop-blur-md">
        <div className="text-slate-600 font-semibold mb-1.5 border-b border-slate-200 pb-1">
          T+{label}s · Capsule Transit
        </div>
        <div className="flex flex-col gap-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }} className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {entry.value} {entry.unit || ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const TelemetryCharts: React.FC = () => {
  const { telemetryHistory, isRunning, toggleRunning, magneticData, parameters, capsule } = useSimulation();

  const [activeTab, setActiveTab] = useState<'combined' | 'uwb' | 'magnetic'>('combined');
  const [windowPoints, setWindowPoints] = useState<number>(30); // Last 30 points

  // Filter window
  const displayData = telemetryHistory.slice(-windowPoints);

  // Current live readouts
  const latestPoint = telemetryHistory[telemetryHistory.length - 1] || {
    timeSec: 0,
    magFluxDensityMt: 18.2,
    magBx: 4.5,
    magBy: 2.1,
    magBz: 17.5,
    magForceMn: 78.4,
    avgSnrDb: 18.5,
    anchor1SnrDb: 21.2,
    anchor2SnrDb: 19.4,
    anchor3SnrDb: 15.0,
    avgPathLossDb: 62.4,
    maxPressureKpa: 1.2,
    distanceMm: capsule.transitDistanceMm,
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4 shadow-xs">
      {/* Top Header & Channel Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Real-Time Sensor Telemetry & Actuation Waveforms
          </h3>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            ({displayData.length} samples streaming)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Channel Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('combined')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'combined' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Dual-Stream
            </button>
            <button
              onClick={() => setActiveTab('uwb')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'uwb' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              UWB Signal (SNR)
            </button>
            <button
              onClick={() => setActiveTab('magnetic')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'magnetic' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Magnet className="w-3.5 h-3.5" />
              Magnetic Flux (|B|)
            </button>
          </div>

          {/* Time Window Selector */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs font-mono">
            {[15, 30, 50].map((pts) => (
              <button
                key={pts}
                onClick={() => setWindowPoints(pts)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  windowPoints === pts ? 'bg-white text-cyan-700 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {pts}pts
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Quantitative HUD Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">UWB Avg Signal (SNR)</div>
            <div className="text-lg font-bold text-cyan-700 tabular-nums">
              {latestPoint.avgSnrDb} <span className="text-xs text-slate-500 font-normal">dB</span>
            </div>
          </div>
          <Radio className="w-4 h-4 text-cyan-600/50" />
        </div>

        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Magnetic Field (|B|)</div>
            <div className="text-lg font-bold text-amber-600 tabular-nums">
              {latestPoint.magFluxDensityMt} <span className="text-xs text-slate-500 font-normal">mT</span>
            </div>
          </div>
          <Magnet className="w-4 h-4 text-amber-600/50" />
        </div>

        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Lorentz Force (FL)</div>
            <div className="text-lg font-bold text-emerald-600 tabular-nums">
              {latestPoint.magForceMn} <span className="text-xs text-slate-500 font-normal">mN</span>
            </div>
          </div>
          <Zap className="w-4 h-4 text-emerald-600/50" />
        </div>

        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Mean Tissue Path Loss</div>
            <div className="text-lg font-bold text-rose-600 tabular-nums">
              {latestPoint.avgPathLossDb} <span className="text-xs text-slate-500 font-normal">dB</span>
            </div>
          </div>
          <Gauge className="w-4 h-4 text-rose-600/50" />
        </div>
      </div>

      {/* Main Recharts Visualization Stage */}
      <div className="w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height={280} minHeight={280}>
          {activeTab === 'combined' ? (
            /* Dual-Stream Chart: UWB Signal on Left Axis, Magnetic Flux Density on Right Axis */
            <LineChart data={displayData} margin={{ top: 10, right: 25, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="timeSec"
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(val) => `${val}s`}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="#0891b2"
                fontSize={11}
                domain={['auto', 'auto']}
                unit=" dB"
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#d97706"
                fontSize={11}
                domain={['auto', 'auto']}
                unit=" mT"
                tickLine={false}
              />
              <Tooltip content={<CustomTelemetryTooltip />} />
              <Legend
                verticalAlign="top"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgSnrDb"
                name="UWB Avg SNR"
                unit="dB"
                stroke="#0891b2"
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="anchor1SnrDb"
                name="Anchor #1 SNR"
                unit="dB"
                stroke="#0284c7"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="magFluxDensityMt"
                name="Magnetic Flux |B|"
                unit="mT"
                stroke="#d97706"
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="magForceMn"
                name="Lorentz Force"
                unit="mN"
                stroke="#059669"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          ) : activeTab === 'uwb' ? (
            /* UWB Signal Stream: Detailed multi-anchor SNR + Path Loss */
            <LineChart data={displayData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="timeSec"
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(val) => `${val}s`}
                tickLine={false}
              />
              <YAxis
                stroke="#0891b2"
                fontSize={11}
                domain={['auto', 'auto']}
                unit=" dB"
                tickLine={false}
              />
              <Tooltip content={<CustomTelemetryTooltip />} />
              <Legend
                verticalAlign="top"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
              />

              <Line
                type="monotone"
                dataKey="avgSnrDb"
                name="Average Array SNR"
                unit="dB"
                stroke="#0891b2"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="anchor1SnrDb"
                name="Anchor #1 (Anterior Upper R)"
                unit="dB"
                stroke="#0284c7"
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="anchor2SnrDb"
                name="Anchor #2 (Anterior Upper L)"
                unit="dB"
                stroke="#6366f1"
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="anchor3SnrDb"
                name="Anchor #3 (Mid Flank R)"
                unit="dB"
                stroke="#10b981"
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="avgPathLossDb"
                name="Tissue Path Loss"
                unit="dB"
                stroke="#e11d48"
                strokeWidth={1.4}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            /* Magnetic Actuation Stream: Field components Bx, By, Bz and |B| */
            <LineChart data={displayData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="timeSec"
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(val) => `${val}s`}
                tickLine={false}
              />
              <YAxis
                stroke="#d97706"
                fontSize={11}
                domain={['auto', 'auto']}
                unit=" mT"
                tickLine={false}
              />
              <Tooltip content={<CustomTelemetryTooltip />} />
              <Legend
                verticalAlign="top"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
              />

              <Line
                type="monotone"
                dataKey="magFluxDensityMt"
                name="Net Flux |B|"
                unit="mT"
                stroke="#d97706"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="magBx"
                name="Bx (Radial X)"
                unit="mT"
                stroke="#dc2626"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="magBy"
                name="By (Radial Y)"
                unit="mT"
                stroke="#059669"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="magBz"
                name="Bz (Axial Z)"
                unit="mT"
                stroke="#2563eb"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Scientific Reference Footer Note */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-mono border-t border-slate-200 pt-2">
        <div>
          <span>Biot-Savart Solenoid Model: </span>
          <span className="text-slate-600 font-medium">Bz = (μ₀·n·i/2)·[ζ/(ζ²+a²)^0.5] | FL = V·M·∇B</span>
        </div>
        <div>
          <span>UWB Channel: </span>
          <span className="text-slate-600 font-medium">L_n = L₀ + 10·β_eff·log₁₀(d/d₀) + S_σ</span>
        </div>
      </div>
    </div>
  );
};
