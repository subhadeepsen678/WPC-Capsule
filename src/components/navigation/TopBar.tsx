/**
 * Top Navigation Bar adhering to the Top Bar Contract:
 * [Brand title, one line] — [4-5 nav links, 1-2 word labels, single-line] — [1 primary action]
 */

import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Download, Stethoscope, Sliders } from 'lucide-react';

interface TopBarProps {
  onOpenExport: () => void;
  onOpenDicom: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenExport, onOpenDicom }) => {
  const { activePersona, setActivePersona, activeNavTab, setActiveNavTab } = useSimulation();

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setActiveNavTab('overview');
        }}
        className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-cyan-600 transition-colors flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
        EndoSim-WCE
      </a>

      {/* Zone 2: 4-5 Clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
        <button
          onClick={() => setActiveNavTab('overview')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeNavTab === 'overview' ? 'text-cyan-600 font-semibold' : 'hover:text-slate-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveNavTab('anatomy')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeNavTab === 'anatomy' ? 'text-cyan-600 font-semibold' : 'hover:text-slate-900'
          }`}
        >
          GI Anatomy
        </button>
        <button
          onClick={() => setActiveNavTab('localization')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeNavTab === 'localization' ? 'text-cyan-600 font-semibold' : 'hover:text-slate-900'
          }`}
        >
          Localization
        </button>
        <button
          onClick={() => setActiveNavTab('actuation')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeNavTab === 'actuation' ? 'text-cyan-600 font-semibold' : 'hover:text-slate-900'
          }`}
        >
          Actuation
        </button>
        <button
          onClick={() => setActiveNavTab('pathology')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeNavTab === 'pathology' ? 'text-cyan-600 font-semibold' : 'hover:text-slate-900'
          }`}
        >
          Pathology
        </button>
        <button
          onClick={() => setActiveNavTab('trajectory')}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            activeNavTab === 'trajectory' ? 'text-cyan-600 font-semibold' : 'hover:text-slate-900'
          }`}
        >
          Trajectory Log
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action Area */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Dual Persona Switcher */}
        <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
          <button
            onClick={() => setActivePersona('clinician')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activePersona === 'clinician'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            Clinician
          </button>
          <button
            onClick={() => setActivePersona('engineer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activePersona === 'engineer'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Engineer
          </button>
        </div>

        <button
          onClick={onOpenExport}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    </header>
  );
};
