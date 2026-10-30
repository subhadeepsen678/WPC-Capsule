/**
 * DICOM CT-Scan Phantom Generator Modal
 * Imports/synthesizes patient-specific DICOM volumetric scans to generate personalized GI tract models.
 */

import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { X, Upload, Check, FileText, AlertCircle, Scan } from 'lucide-react';

interface DicomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DicomImportModal: React.FC<DicomModalProps> = ({ isOpen, onClose }) => {
  const { setGIPathType, patient } = useSimulation();
  const [sliceIndex, setSliceIndex] = useState<number>(42);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApplyPhantom = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsDone(true);
      setGIPathType('phantom');
      setTimeout(() => {
        onClose();
        setIsDone(false);
      }, 1000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-cyan-600" />
            <h3 className="text-base font-semibold text-slate-900">Patient-Specific DICOM CT Phantom Loader</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 shadow-xs">
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 mb-1">
              <span>Patient: <strong className="text-slate-800">{patient.name}</strong> ({patient.patientId})</span>
              <span>Modality: CT Enterography (Contrast)</span>
            </div>
            <span>Reconstructs 3D patient lumen mesh and predicts acute curvature risk zones for robotic capsule transit.</span>
          </div>

          {/* Simulated CT Axial Slice Canvas */}
          <div className="flex flex-col items-center justify-center bg-slate-900 rounded-xl p-4 border border-slate-800 relative shadow-inner">
            <div className="w-64 h-64 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden">
              {/* Simulated anatomical cross-section */}
              <div className="absolute inset-8 rounded-full border border-slate-700/60 bg-slate-900/40" />
              <div className="absolute inset-16 rounded-full border border-cyan-500/40 bg-cyan-950/20" />
              <div className="absolute w-12 h-8 rounded-full border-2 border-rose-500/80 bg-rose-950/40" />
              <div className="absolute text-[10px] font-mono text-cyan-400 bottom-3">
                Slice #{sliceIndex} / 120 (HU: -120 to +450)
              </div>
            </div>

            {/* Slider */}
            <div className="w-full mt-3 flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">L1</span>
              <input
                type="range"
                min="1"
                max="120"
                value={sliceIndex}
                onChange={(e) => setSliceIndex(parseInt(e.target.value))}
                className="flex-1 accent-cyan-400 h-1 bg-slate-700 rounded"
              />
              <span className="text-xs text-slate-400 font-mono">L5</span>
            </div>
          </div>

          <div className="text-xs text-slate-600">
            Predicted high pressure zones: <strong className="text-rose-600">2 acute hairpin flexures</strong> at duodenojejunal junction.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyPhantom}
            disabled={isProcessing || isDone}
            className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
          >
            {isDone ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                Phantom Applied!
              </>
            ) : isProcessing ? (
              'Reconstructing 3D Mesh...'
            ) : (
              'Apply Patient Phantom Model'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
