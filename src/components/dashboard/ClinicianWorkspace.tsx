/**
 * Clinician Workspace Dashboard
 * Focuses on patient diagnostic safety, intraluminal endoscopy review, lesion mapping, and follow-up planning.
 */

import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { TractViewport3D } from '../viewport/TractViewport3D';
import { EndoscopicFeed } from '../viewport/EndoscopicFeed';
import { TelemetryCharts } from '../telemetry/TelemetryCharts';
import { PATHOLOGY_CLASSES } from '../../engine/environment/giTractGeometry';
import {
  Play,
  Pause,
  RotateCcw,
  Footprints,
  Anchor,
  FileText,
  MapPin,
  Clock,
  Gauge,
  Activity,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Zap,
  ChevronRight,
  Download,
  CheckCircle,
  Eye,
} from 'lucide-react';

export const ClinicianWorkspace: React.FC<{ onOpenExport: () => void }> = ({ onOpenExport }) => {
  const {
    isRunning,
    toggleRunning,
    stepCapsule,
    resetSimulation,
    deflectCapsuleFromWall,
    capsule,
    parameters,
    pressureData,
    uniqueLoggedLesions,
    collisionAlerts,
    trajectory,
    patient,
    jumpToLesion,
    addClinicalNote,
    setGIPathType,
  } = useSimulation();

  const [selectedLesionId, setSelectedLesionId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string>('');
  const [showTelemetryChart, setShowTelemetryChart] = useState<boolean>(true);
  const [activeLogTab, setActiveLogTab] = useState<'lesions' | 'collisions'>('lesions');

  const threshold = parameters.pressureThresholdKpa;
  const isCollisionHazard = pressureData.thresholdExceeded || pressureData.maxPressureKpa >= threshold;
  const isProximityElevated = !isCollisionHazard && pressureData.maxPressureKpa >= threshold * 0.75;

  const currentLesion = uniqueLoggedLesions.find((l) => l.id === selectedLesionId);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Patient Banner & Procedural Status */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Patient Metadata */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-800 font-bold text-sm">
            {patient.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">{patient.name}</h2>
              <span className="text-xs text-slate-500 font-mono">({patient.patientId})</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-600">{patient.age} y/o {patient.gender}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              <span>Indication: {patient.indication}</span>
              <span className="text-slate-300 mx-2">|</span>
              <span className="text-slate-600">{patient.attendingPhysician}</span>
            </div>
          </div>
        </div>

        {/* Real-time Trajectory Collision Safety Alert Badge */}
        <div className="flex items-center gap-2">
          {isCollisionHazard ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border-2 border-rose-500 text-rose-900 text-xs font-mono font-bold animate-pulse shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <span>WALL COLLISION DETECTED ({pressureData.maxPressureKpa.toFixed(2)} kPa)</span>
              <button
                onClick={deflectCapsuleFromWall}
                className="ml-1 px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-sans text-[11px] font-bold shadow transition-all active:scale-95"
              >
                Deflect E_pp
              </button>
            </div>
          ) : isProximityElevated ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>PROXIMITY ELEVATED ({pressureData.maxPressureKpa.toFixed(2)} kPa)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>TRAJECTORY NOMINAL ({pressureData.maxPressureKpa.toFixed(2)} kPa)</span>
            </div>
          )}
        </div>

        {/* Global Motion Transport Controls */}
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <button
            onClick={toggleRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Pause Transit' : 'Start Transit'}
          </button>

          <button
            onClick={() => stepCapsule(5)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-xs"
            title="Step 5 mm forward"
          >
            <Footprints className="w-3.5 h-3.5 text-cyan-600" />
            Step 5mm
          </button>

          <button
            onClick={resetSimulation}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
            title="Reset Examination"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-slate-200 mx-1" />

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Real-Time Collision Warning Alert Banner */}
      {isCollisionHazard && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0 shadow-xs">
              <AlertOctagon className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-rose-950 uppercase tracking-wide">
                  Critical Intestinal Wall Collision Detected
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white">
                  {pressureData.maxPressureKpa.toFixed(2)} kPa &gt; {threshold} kPa SAFETY LIMIT
                </span>
                <span className="text-xs font-mono text-rose-700 font-semibold">
                  ({pressureData.activeHighPressureCount} tactile nodes engaged)
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1">
                Impingement along mucosal fold boundary. Estimated Pressure Point (E_pp): <strong className="font-mono text-rose-950">{pressureData.estimatedPressurePointMm.toFixed(2)} mm</strong> deflection required.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={deflectCapsuleFromWall}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow active:scale-95"
            >
              <Zap className="w-4 h-4" />
              Engage E_pp Auto-Deflection Steering
            </button>
            {isRunning && (
              <button
                onClick={toggleRunning}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-rose-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Emergency Hold
              </button>
            )}
          </div>
        </div>
      )}

      {isProximityElevated && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-slate-800 transition-all">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Proximity Alert: Capsule Approaching Intestinal Mucosal Margin
                </span>
                <span className="text-[11px] font-mono text-amber-800 font-semibold">
                  Contact Stress: {pressureData.maxPressureKpa.toFixed(2)} kPa
                </span>
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Narrowing clearance in lumen loop. Deflection angle vector available ({pressureData.estimatedPressurePointMm.toFixed(2)} mm).
              </p>
            </div>
          </div>

          <button
            onClick={deflectCapsuleFromWall}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
          >
            Pre-Emptive Deflect
          </button>
        </div>
      )}

      {/* Main Dual Viewport Split with Visual Hazard Outline */}
      <div className="relative">
        {/* Floating Real-Time Hazard Alert Badge on Viewports */}
        {isCollisionHazard && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-white/95 border-2 border-rose-500 text-rose-900 px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2.5 font-mono text-xs font-bold animate-pulse backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>TRAJECTORY WALL COLLISION: {pressureData.maxPressureKpa.toFixed(2)} kPa &gt; {threshold} kPa</span>
            <button
              onClick={deflectCapsuleFromWall}
              className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-0.5 rounded text-[11px] font-sans font-bold shadow transition-all active:scale-95"
            >
              Engage Auto-Deflection ({pressureData.estimatedPressurePointMm.toFixed(1)}mm)
            </button>
          </div>
        )}

        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-4 h-[460px] p-1.5 rounded-2xl transition-all duration-300 ${
            isCollisionHazard
              ? 'ring-4 ring-rose-500 shadow-md bg-rose-50/50'
              : isProximityElevated
              ? 'ring-2 ring-amber-500 shadow-sm bg-amber-50/50'
              : 'ring-1 ring-slate-200 bg-slate-100/50'
          }`}
        >
          {/* Left: 3D Anatomical GI Tract Viewport */}
          <div className="h-full">
            <TractViewport3D />
          </div>

          {/* Right: Procedural Endoscopic Camera Feed */}
          <div className="h-full">
            <EndoscopicFeed />
          </div>
        </div>
      </div>

      {/* Real-Time Clinical Telemetry & Vital Indices */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Transit Progress</span>
            <Activity className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {(capsule.progress * 100).toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-slate-500">
              ({capsule.transitDistanceMm.toFixed(1)} / 280 mm)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-cyan-500 h-1.5 rounded-full transition-all duration-100"
              style={{ width: `${Math.min(100, capsule.progress * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5 relative overflow-hidden">
          {/* Top colored status indicator bar */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 ${
              isCollisionHazard
                ? 'bg-rose-500 animate-pulse'
                : isProximityElevated
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Wall Pressure Stress</span>
            <Gauge
              className={`w-3.5 h-3.5 ${
                isCollisionHazard ? 'text-rose-600' : isProximityElevated ? 'text-amber-600' : 'text-emerald-600'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold font-mono ${
                  isCollisionHazard ? 'text-rose-600' : isProximityElevated ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {pressureData.maxPressureKpa.toFixed(2)}
              </span>
              <span className="text-xs font-mono text-slate-500">kPa</span>
            </div>

            {/* Alert Badge */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase ${
                isCollisionHazard
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                  : isProximityElevated
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {isCollisionHazard ? 'Collision Hazard' : isProximityElevated ? 'Proximity Alert' : 'Clearance Nominal'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {isCollisionHazard
              ? `● Impingement on ${pressureData.activeHighPressureCount} tactile nodes`
              : isProximityElevated
              ? `● Clearance margin narrowing (E_pp: ${pressureData.estimatedPressurePointMm} mm)`
              : '● Safe intraluminal clearance'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Pathology Tally</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-600">
              {uniqueLoggedLesions.length}
            </span>
            <span className="text-xs text-slate-500">distinct lesions logged</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Critical findings: {uniqueLoggedLesions.filter((l) => l.className === 'Ulcer' || l.className === 'Blood-fresh').length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-3.5">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Tracking Confidence</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">
              98.2%
            </span>
            <span className="text-xs font-mono text-slate-500">EKF sequential filter</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            CRLB lower bound: ±3.4 mm
          </div>
        </div>
      </div>

      {/* Real-Time Sensor Telemetry Chart Drawer */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-800">
            Real-Time Signal & Magnetic Field Monitoring
          </span>
          <button
            onClick={() => setShowTelemetryChart(!showTelemetryChart)}
            className="text-xs text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
          >
            {showTelemetryChart ? 'Hide Telemetry Waveforms' : 'Show Telemetry Waveforms'}
          </button>
        </div>
        {showTelemetryChart && <TelemetryCharts />}
      </div>

      {/* Pathological Findings & Collision Safety Alerts Log */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveLogTab('lesions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeLogTab === 'lesions'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Diagnostic Lesions ({uniqueLoggedLesions.length})
            </button>

            <button
              onClick={() => setActiveLogTab('collisions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeLogTab === 'collisions'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : isCollisionHazard
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Wall Collision Warnings ({collisionAlerts.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">GI Anatomy Curve:</span>
            <select
              value={parameters.pathType}
              onChange={(e) => setGIPathType(e.target.value as any)}
              className="bg-white border border-slate-300 text-xs text-slate-700 rounded px-2 py-1 shadow-xs"
            >
              <option value="curved">Curved Duodeno-Jejunal</option>
              <option value="straight">Straight Enteric Phantoms</option>
              <option value="spiral">Spiral Ileal Loops</option>
              <option value="phantom">Patient CT-Derived Phantom</option>
            </select>
          </div>
        </div>

        {activeLogTab === 'collisions' ? (
          /* Collision Warnings & Wall Impingement Alerts List */
          <div className="flex flex-col gap-3">
            {collisionAlerts.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-slate-800 font-medium">Zero Wall Collision Hazards Recorded</p>
                <p className="text-xs text-slate-500 mt-1">
                  The robotic capsule maintains safe intraluminal clearance within normal pressure limits (&lt; 3.4 kPa).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {collisionAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-lg border flex flex-col justify-between gap-3 text-xs ${
                      !alert.resolved
                        ? 'bg-rose-50 border-rose-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-rose-800 flex items-center gap-1.5">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                          Wall Contact Alert
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          T+{alert.timestampSec}s
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-700 flex flex-col gap-1 mt-2">
                        <div className="flex justify-between">
                          <span>Peak Contact Stress:</span>
                          <span className="text-rose-600 font-bold">{alert.maxPressureKpa} kPa</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tactile Nodes Engaged:</span>
                          <span>{alert.contactNodesCount} / 33</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Required Deflection (E_pp):</span>
                          <span className="text-cyan-700 font-bold">{alert.estimatedDeflectionMm} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Anatomical Segment:</span>
                          <span className="text-slate-800 font-medium">{alert.anatomicalRegion}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-bold font-mono ${alert.resolved ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {alert.resolved ? '✓ STEERING RESOLVED' : '● ACTIVE COLLISION'}
                      </span>
                      {!alert.resolved && (
                        <button
                          onClick={deflectCapsuleFromWall}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Zap className="w-3 h-3" />
                          Deflect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : uniqueLoggedLesions.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg">
            <Eye className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-medium">Scanning intraluminal mucosa...</p>
            <p className="text-xs text-slate-500 mt-1">
              Lesions detected by the vision model during transit will be automatically indexed here with exact 3D coordinates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {uniqueLoggedLesions.map((lesion) => {
              const cls = PATHOLOGY_CLASSES.find((c) => c.id === lesion.classId);
              const isSelected = selectedLesionId === lesion.id;

              return (
                <div
                  key={lesion.id}
                  onClick={() => {
                    setSelectedLesionId(lesion.id);
                    setEditingNote(lesion.notes || '');
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-50/70 border-cyan-500 shadow-sm ring-1 ring-cyan-500/50'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">{lesion.className}</span>
                    <span
                      style={{ color: cls?.color || '#dc2626' }}
                      className="text-[11px] font-mono font-semibold"
                    >
                      {(lesion.confidence * 100).toFixed(1)}% conf
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-600 flex flex-col gap-1 font-mono">
                    <div className="flex items-center justify-between">
                      <span>Region:</span>
                      <span className="text-slate-800 font-medium">{lesion.anatomicalRegion}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Transit Depth:</span>
                      <span className="text-cyan-700 font-semibold">{lesion.distanceFromStartMm} mm</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>3D Coords:</span>
                      <span className="text-slate-700">
                        [{lesion.worldPositionMm[0]}, {lesion.worldPositionMm[1]}, {lesion.worldPositionMm[2]}]
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        jumpToLesion(lesion);
                      }}
                      className="text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      Center Capsule View
                    </button>
                    <span className="text-[10px] text-slate-500 uppercase">{cls?.severity} risk</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Lesion Note Drawer */}
        {currentLesion && (
          <div className="mt-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                Clinical Annotation for {currentLesion.className} ({currentLesion.anatomicalRegion})
              </span>
              <button
                onClick={() => setSelectedLesionId(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <textarea
              value={editingNote}
              onChange={(e) => setEditingNote(e.target.value)}
              placeholder="Enter physician observations, follow-up enteroscopy recommendations, or biopsy target plan..."
              className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 h-16 resize-none shadow-xs"
            />
            <div className="flex justify-end">
              <button
                onClick={() => addClinicalNote(currentLesion.id, editingNote)}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors shadow-xs"
              >
                Save Clinical Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
