# EndoSim-WCE: Real-Time Wireless Capsule Endoscopy Simulation Framework

A unified, real-time web simulation framework for Wireless Capsule Endoscopy (WCE) integrating multi-layer GI tract dielectric modeling, ultra-wideband (UWB) sequential localization, electromagnetic locomotion with pressure-guided path planning, procedural endoscopic vision with real-time pathology detection, and dual-perspective clinical/engineering traceability.

> [!IMPORTANT]
> **User Clarifications Confirmed in Phase 1:**
> - **Simulation Engine Architecture**: Hybrid execution model featuring an in-browser 60 FPS numerical simulation engine and procedural 3D renderer backed by an Express REST API with session state and trajectory serialization.
> - **Primary Workspace Persona**: Dual-persona cockpit with an instant toggle between **Clinician Mode** (diagnostic camera feed, 3D anatomical trajectory mapping, lesion inspect & procedural plan) and **Engineer Mode** (30+ tunable RF/dielectric/magnetic parameters, real-time CRLB curves, coil current vectors, algorithm benchmark matrices).
> - **Camera & Vision Stream**: Procedural 3D endoscopic GI lumen camera feed with simulated mucosal tissue textures, vascular patterns, and 10 dynamic lesion pathology classes with real-time object detection inference overlays (RTMDet-Tiny/S, YOLOv3, SSD300 benchmarks).

---

## 1. Overview & Core Concept

### What It Does
EndoSim-WCE is a web-based research and clinical simulation platform that unifies the complete physical and algorithmic lifecycle of an active robotic wireless capsule endoscope. It models the electromagnetic interaction between an external 4-coil magnetic actuation system and an internal permanent magnet capsule, simulates UWB RF propagation through multi-layer human tissues (skin, fat, muscle, intestine), performs sequential real-time localization (Trilateration, TDoA Chan, EKF, Particle Filter), generates an interactive procedural endoscopic camera view with simulated mucosal pathologies, runs real-time object detection benchmarking, and records comprehensive clinical trajectory logs.

### Target Personas
1. **Clinical Gastroenterologists & Endoscopists**: Monitor capsule transit in real time, inspect automated lesion detections with confidence scoring, map discovered pathologies to 3D anatomical coordinates, and replay previous examinations as motion priors for follow-up procedures.
2. **Robotics, RF & Computer Vision Engineers**: Optimize anchor placement geometries, evaluate localization error against the theoretical Cramér-Rao Lower Bound (CRLB), tune Biot-Savart coil drive currents to negotiate tight intestinal bends, and benchmark detection networks (RTMDet, YOLOv3, SSD300) under variable illumination and tissue deformation.

### Key Value Delivered
Eliminates the fragmented workflow between offline electromagnetic solvers (e.g., CST Studio), robotic hardware testbenches, and disjointed computer vision datasets by providing a single, zero-install, real-time interactive simulation sandbox accessible directly in the browser.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Dual-Persona Experience Switch**:
   - **Clinician Workspace**: Dominated by an active dual-view canvas—a 3D transparent GI tract highlighting the capsule path and landmark pins alongside an intra-luminal endoscopic camera feed with real-time bounding box annotations and a clinical lesion log.
   - **Engineer Workspace**: Expands into an asymmetric telemetry console with real-time CRLB vs. RMSE comparative plots, an interactive 4-coil magnetic field vector inspector, anchor geometry coordinate editor, and a 30+ parameter live tuning panel.

2. **Real-Time Actuation & Locomotion**:
   - The user selects the GI tract geometry (Straight, Curved, Spiral, or Patient Phantom) and chooses locomotion mode: **Autonomous Peristalsis**, **Magnetic Actuation** (Biot-Savart field step control), or **Pressure-Guided Navigation** ($E_{pp}$ algorithm triggered when wall contact exceeds $3.4\text{ kPa}$).
   - Users can step the capsule in discrete $5\text{ mm}$ increments, hold position for detailed inspection, or run automated transit.

3. **Multi-Algorithm Localization Comparison**:
   - Users compare 4 estimation algorithms simultaneously: **Trilateration (NLS)**, **TDoA (Chan Algorithm)**, **Extended Kalman Filter (EKF)**, and **Particle Filter (500 particles)** against the ground truth trajectory and analytical CRLB bound.

4. **Pathology Inspection & Export**:
   - As the capsule navigates through the lumen, 10 pathology classes (Angiectasia, Bleeding, Polyp, Ulcer, Erosion, Erythema, Lymphangiectasia, Foreign Body, Ampulla of Vater) are detected.
   - Clinicians can click any detected lesion to inspect its monocular depth-mapped 3D position, view the high-resolution frame capture, and export a complete clinical examination report in JSON/CSV format.

### Visual Identity & Theme
- **Aesthetic Direction**: High-precision medical & scientific instrumentation console. Clean, clinical, and authoritative with zero superficial decorative clutter.
- **Color Palette (60-30-10 Rule)**:
  - *Canvas (60%)*: Clinical dark obsidian slate (`#090D16` / `#0F172A`) providing maximum optical contrast for 3D fluorescent GI tracts and endoscopic feeds.
  - *Structural Surfaces (30%)*: Monochromatic slate cards (`#1E293B`) with hairline borders (`#334155`), clean coordinate grids, and subtle section dividers.
  - *Precision Accents (10%)*: Surgical laser cyan (`#06B6D4`) for RF anchors and primary trajectories, telemetry amber (`#F59E0B`) for high pressure nodes and warnings, and clinical emerald (`#10B981`) for nominal tracking and verified diagnoses.
- **Typography**:
  - *Interface & Display*: `Plus Jakarta Sans` for clean, unambiguous clinical controls and section headers.
  - *Telemetry & Measurements*: `IBM Plex Mono` / `font-mono tabular-nums` for coordinates, millivolts, decibels, CRLB bounds, and timestamps.
- **Top Bar Contract**:
  - Left: Single clean wordmark `EndoSim-WCE` in bold sans.
  - Center: Nav views `Overview` · `GI Environment` · `Localization Engine` · `Magnetic Locomotion` · `Pathology Vision` · `Trajectory Log`.
  - Right: Dual-Persona Segmented Switch `Clinician | Engineer` and Export CTA.

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Rationale | Alternatives Considered |
|:---|:---|:---|:---|
| **3D Rendering Engine** | High-performance Three.js with WebGL shader enhancements and procedural lumen generator | Delivers smooth 60 FPS in-browser rendering with real-time camera manipulation without heavy external engine dependencies. | WebGPU (limited Safari compatibility), Babylon.js (heavier bundle). |
| **Simulation Computation** | Client-side vectorized physics & estimation engine with optional Express REST sync | Ensures zero network latency for 60 FPS real-time control, interactive parameter scrubbers, and instantaneous CRLB updates. | Server-only simulation via WebSockets (introduces lag and network jitters in browser preview). |
| **Vision & Lesion Simulation** | Procedural 3D internal lumen camera shader + simulated bounding box detector with real-world benchmark metrics (RTMDet, YOLOv3, SSD300) | Allows interactive real-time inspection, dynamic lighting, and accurate model metric switching without loading gigabytes of PyTorch weights. | Pre-recorded video playback (lacks interactive locomotion sync and dynamic step control). |
| **Path Planning Model** | Estimated Pressure Point ($E_{pp}$) algorithm with 33-point pressure array | Faithfully implements the PRD mathematical model for wall contact avoidance and magnetic steering. | Simple kinematic path constraint (fails to simulate robotic contact dynamics). |

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION TIER                                │
│                                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ Top Navigation & Preset │  │  Dual-Persona Toggle (Clinician / Eng)   │  │
│  └────────────┬────────────┘  └────────────────────┬─────────────────────┘  │
│               │                                    │                        │
│  ┌────────────▼─────────────────────────┐  ┌───────▼─────────────────────┐  │
│  │     3D Multi-Viewport Stage          │  │    Real-Time HUD & Logs     │  │
│  │  • Anatomical GI Tract (Three.js)    │  │  • Position Telemetry (x,y,z)│  │
│  │  • Procedural Endoscopic Cam Feed    │  │  • 33-Point Pressure Matrix │  │
│  │  • 4-Coil Magnetic Field Vectors     │  │  • Live CRLB vs RMSE Graph  │  │
│  │  • UWB Anchors & Trilateration Rays  │  │  • Lesion Detection Roster  │  │
│  └──────────────────────────────────────┘  └─────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Real-time State (Zustand / Event Emitter)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       SIMULATION COMPUTATION CORE                           │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ GI Environment Model │  │  UWB Channel & Estim │  │ Locomotion Engine│  │
│  │ • 4 Tissue Layers    │  │  • Multi-layer Path  │  │ • Biot-Savart    │  │
│  │   (Skin/Fat/Muscle/  │  │    Loss (β_zone)     │  │   4-Coil Solver  │  │
│  │    Intestine)        │  │  • Trilateration NLS │  │ • Step Size &    │  │
│  │ • Dielectric Perm.   │  │  • TDoA Chan Alg.    │  │   Step Time Calc │  │
│  │ • Peristalsis Math   │  │  • EKF & Particle F. │  │ • E_pp Pressure  │  │
│  │                      │  │  • CRLB Matrix Calc  │  │   Avoidance      │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Pathology Vision & Coordinate Mapper                                  │  │
│  │ • 10 Pathology Classes (Polyp, Bleeding, Ulcer, Angiectasia...)      │  │
│  │ • Detection Models (RTMDet-Tiny/S, YOLOv3, SSD300 benchmarking)       │  │
│  │ • Monocular Depth to 3D Landmark Conversion: p_lesion = p_cap + R·d  │  │
│  │ • Trajectory History Recorder & Clinical JSON/CSV Exporter            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Sync / Export
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    EXPRESS BACKEND (Proxy & Storage)                        │
│  • GET/POST /api/simulation/state  • GET /api/trajectory/export             │
│  • POST /api/patient/profile       • GET /api/benchmark/metrics             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Entities & State Model

```typescript
// Core Capsule State
interface CapsulePose {
  x: number; y: number; z: number; // Position in mm
  roll: number; pitch: number; yaw: number; // Orientation in rad
  vx: number; vy: number; vz: number;
}

// Multi-Layer Dielectric Configuration
interface TissueLayerProperties {
  name: 'Skin' | 'Fat' | 'Muscle' | 'SmallIntestine';
  thicknessMm: number;
  relativePermittivity: number; // ε_r @ 4 GHz
  conductivity: number;         // σ (S/m) @ 4 GHz
  pathLossExponent: number;     // β
}

// UWB Localization Frame
interface LocalizationEstimate {
  groundTruth: [number, number, number];
  trilateration: [number, number, number];
  tdoaChan: [number, number, number];
  ekf: [number, number, number];
  particleFilter: [number, number, number];
  crlbBoundMm: number;
  rmse: { trilat: number; chan: number; ekf: number; pf: number };
}

// Electromagnetic Coil Configuration
interface CoilConfiguration {
  id: number;
  position: [number, number, number];
  axis: [number, number, number];
  radiusMm: number;
  lengthMm: number;
  turnsPerM: number;
  currentAmps: number;
}

// Pathology Detection Annotation
interface DetectedLesion {
  id: string;
  className: 'Angiectasia' | 'Blood-fresh' | 'Blood-hematin' | 'Erosion' |
             'Erythema' | 'Foreign Body' | 'Lymphangiectasia' | 'Polyp' |
             'Ulcer' | 'Ampulla of Vater';
  confidence: number;
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  timestampSec: number;
  capsulePositionMm: [number, number, number];
  lesionWorldPositionMm: [number, number, number];
  depthMm: number;
}
```

### Interactive Control & State Transitions
- **Parameter Control Panel**: Real-time slider and stepper updates trigger instant recomputation of Biot-Savart magnetic vectors, channel attenuation matrices, and anchor CRLB ellipses without simulation stalls.
- **Replay & Follow-Up Inspection**: Clinicians can scrub through the recorded timeline, jump directly to lesion timestamps, and view the capsule pose with camera replay.
- **Export & Report Generation**: Generates comprehensive structured examination logs, patient summary reports, and raw trajectory coordinates formatted for clinical follow-ups.

---

## 5. Implementation Steps & Planned Sequence

1. **Environment & Core Dependencies**:
   - Install `three` and `@types/three` for standard 3D WebGL rendering.
   - Update `metadata.json` and `index.html` with official app title and description.
2. **Mathematical & Physics Engines**:
   - `src/engine/physics/biotSavart.ts`: Coil magnetic field and force calculations.
   - `src/engine/physics/pressurePlanner.ts`: 33-sensor array and $E_{pp}$ algorithm.
   - `src/engine/rf/uwbChannel.ts`: Multi-tissue path loss and signal attenuation.
   - `src/engine/rf/localizationAlgorithms.ts`: Trilateration NLS, Chan TDoA, EKF, Particle Filter, and CRLB calculator.
   - `src/engine/vision/pathologyDetector.ts`: 10-class pathology generator and benchmark metrics.
3. **Three.js Visualizers & Shaders**:
   - `src/components/viewport/TractViewport.tsx`: 3D GI tract anatomical model (straight, curved, spiral, phantom), capsule marker, anchor rays, magnetic coil rigs.
   - `src/components/viewport/EndoscopicCamera.tsx`: Procedural intra-luminal camera view with tissue mucosa shader and real-time bounding box overlays.
4. **Interactive HUD & Telemetry Panels**:
   - `src/components/dashboard/ClinicianView.tsx`: Camera feed, 3D anatomical map, lesion roster, clinical diagnostic summary.
   - `src/components/dashboard/EngineerConsole.tsx`: 30+ parameter controls, live CRLB vs. RMSE curves, coil current dials, algorithm benchmark matrix.
5. **Express REST Endpoints & Data Export**:
   - Trajectory export (JSON/CSV), parameter preset persistence, patient profile simulator.
6. **Verification & Testing**:
   - Run compilation and lint checks; verify all 30+ parameters are wired and functional.
