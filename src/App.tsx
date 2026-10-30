/**
 * EndoSim-WCE: Real-Time Wireless Capsule Endoscopy Simulation Framework
 * Main Application Component
 */

import React, { useState } from 'react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import { TopBar } from './components/navigation/TopBar';
import { ClinicianWorkspace } from './components/dashboard/ClinicianWorkspace';
import { EngineerWorkspace } from './components/dashboard/EngineerWorkspace';
import { AnatomyView } from './components/views/AnatomyView';
import { LocalizationView } from './components/views/LocalizationView';
import { ActuationView } from './components/views/ActuationView';
import { PathologyView } from './components/views/PathologyView';
import { TrajectoryView } from './components/views/TrajectoryView';
import { ExportModal } from './components/modals/ExportModal';
import { DicomImportModal } from './components/modals/DicomImportModal';

function AppContent() {
  const { activePersona, activeNavTab } = useSimulation();
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isDicomOpen, setIsDicomOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-900">
      {/* Top Bar Contract Navigation */}
      <TopBar
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDicom={() => setIsDicomOpen(true)}
      />

      {/* Main Container Stage */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {activeNavTab === 'overview' && (
          activePersona === 'clinician' ? (
            <ClinicianWorkspace onOpenExport={() => setIsExportOpen(true)} />
          ) : (
            <EngineerWorkspace />
          )
        )}

        {activeNavTab === 'anatomy' && <AnatomyView />}
        {activeNavTab === 'localization' && <LocalizationView />}
        {activeNavTab === 'actuation' && <ActuationView />}
        {activeNavTab === 'pathology' && <PathologyView />}
        {activeNavTab === 'trajectory' && <TrajectoryView onOpenExport={() => setIsExportOpen(true)} />}
      </main>

      {/* Clean Light Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-auto">
        <div className="max-w-[1520px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">EndoSim-WCE Framework</span>
            <span aria-hidden="true">·</span>
            <span>Real-Time In-Body Simulation</span>
            <span aria-hidden="true">·</span>
            <span>UWB Localization & Magnetic Actuation</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <span>IEEE / PLOS ONE Benchmark Standards</span>
            <span aria-hidden="true">·</span>
            <span>v1.0 (2026)</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <DicomImportModal isOpen={isDicomOpen} onClose={() => setIsDicomOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <AppContent />
    </SimulationProvider>
  );
}
