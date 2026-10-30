/**
 * Data Export & Clinical Report Generator Modal
 * Exports CSV trajectories, structured JSON clinical files, and ROS-Bag schema.
 */

import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { X, Download, Copy, Check, FileSpreadsheet, FileCode, FileText } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { trajectory, uniqueLoggedLesions, patient, parameters, currentEstimate, metrics } = useSimulation();

  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'rosbag'>('json');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Generate CSV content
  const generateCSV = (): string => {
    const headers = [
      'timestamp_sec',
      'gt_x_mm', 'gt_y_mm', 'gt_z_mm',
      'est_x_mm', 'est_y_mm', 'est_z_mm',
      'roll_rad', 'pitch_rad', 'yaw_rad',
      'max_pressure_kpa',
      'lesion_detected',
    ];

    const rows = trajectory.map((pt) => [
      pt.timestamp,
      pt.groundTruth[0], pt.groundTruth[1], pt.groundTruth[2],
      pt.estimated[0], pt.estimated[1], pt.estimated[2],
      pt.orientation[0].toFixed(3), pt.orientation[1].toFixed(3), pt.orientation[2].toFixed(3),
      pt.pressureMaxKpa,
      pt.lesionDetected ? pt.lesionDetected.className : 'None',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  // Generate Comprehensive JSON Report
  const generateJSON = (): string => {
    const report = {
      framework: 'EndoSim-WCE (Version 1.0)',
      exportTimestamp: new Date().toISOString(),
      patient: patient,
      examination: {
        totalTransitDistanceMm: 280.0,
        giPathType: parameters.pathType,
        detectionModel: parameters.detectionModel,
        nominalStepSizeMm: parameters.nominalStepSizeMm,
        anchorsCount: parameters.anchors.filter((a) => a.enabled).length,
      },
      localizationBenchmarking: {
        theoreticalCRLB_mm: currentEstimate.crlbBoundMm,
        ekf_rmse_mm: metrics['ekf'].rmse,
        ekf_mae_mm: metrics['ekf'].mae,
        ekf_p95_mm: metrics['ekf'].p95,
        chan_rmse_mm: metrics['tdoa-chan'].rmse,
        nls_rmse_mm: metrics['trilateration'].rmse,
        pf_rmse_mm: metrics['particle-filter'].rmse,
      },
      pathologicalFindings: uniqueLoggedLesions.map((l) => ({
        id: l.id,
        classification: l.className,
        confidencePct: (l.confidence * 100).toFixed(1),
        anatomicalRegion: l.anatomicalRegion,
        transitDepthMm: l.distanceFromStartMm,
        worldPositionMm: l.worldPositionMm,
        depthFromLensMm: l.depthMm,
        notes: l.notes || 'Unspecified',
      })),
      trajectorySummary: {
        recordedPointsCount: trajectory.length,
        sampleIntervalMs: 50,
      },
    };

    return JSON.stringify(report, null, 2);
  };

  // Generate ROS Bag Message Stream Preview
  const generateROSBagJSON = (): string => {
    const rosbag = {
      header: {
        stamp: { sec: Math.floor(Date.now() / 1000), nanosec: 0 },
        frame_id: 'world_gi_phantom',
      },
      topic_streams: [
        {
          topic: '/wce/localization/pose',
          type: 'geometry_msgs/msg/PoseStamped',
          count: trajectory.length,
        },
        {
          topic: '/wce/tactile/pressure_array',
          type: 'std_msgs/msg/Float32MultiArray',
          num_nodes: 33,
        },
        {
          topic: '/wce/vision/detected_lesions',
          type: 'vision_msgs/msg/Detection2DArray',
          count: uniqueLoggedLesions.length,
        },
      ],
    };
    return JSON.stringify(rosbag, null, 2);
  };

  const getPayload = (): string => {
    if (exportFormat === 'csv') return generateCSV();
    if (exportFormat === 'rosbag') return generateROSBagJSON();
    return generateJSON();
  };

  const handleDownload = () => {
    const content = getPayload();
    const mime = exportFormat === 'csv' ? 'text/csv' : 'application/json';
    const ext = exportFormat === 'csv' ? 'csv' : 'json';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `endosim-${patient.patientId}-${exportFormat}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getPayload());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-cyan-600" />
            <h3 className="text-base font-semibold text-slate-900">Export Examination Data & Diagnostics</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Format Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExportFormat('json')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                exportFormat === 'json'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <FileCode className="w-4 h-4" />
              Clinical Summary (JSON)
            </button>

            <button
              onClick={() => setExportFormat('csv')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                exportFormat === 'csv'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Trajectory Points (CSV)
            </button>

            <button
              onClick={() => setExportFormat('rosbag')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                exportFormat === 'rosbag'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              ROS 2 Bridge Schema
            </button>
          </div>

          {/* Code Preview Box */}
          <div className="relative">
            <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-cyan-300 max-h-72 overflow-y-auto overflow-x-auto shadow-inner">
              {getPayload()}
            </pre>

            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>

          <div className="text-xs text-slate-600 flex items-center justify-between">
            <span>Logged lesions included: <strong className="text-rose-600">{uniqueLoggedLesions.length}</strong></span>
            <span>Trajectory samples: <strong className="text-cyan-700">{trajectory.length}</strong></span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download {exportFormat.toUpperCase()} File
          </button>
        </div>
      </div>
    </div>
  );
};
