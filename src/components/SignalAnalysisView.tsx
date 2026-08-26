import React, { useState, useRef, useEffect } from 'react';
import { WaveformData, TransmitterParameters, PhysicalAcoustics, SystemStatus } from '../types';
import { AnimeCounter } from './animations/AnimeCounter';
import {
  Activity,
  Sliders,
  Crosshair,
  Calculator,
} from 'lucide-react';

interface SignalAnalysisViewProps {
  data: WaveformData;
  params: TransmitterParameters;
  acoustics: PhysicalAcoustics;
  status: SystemStatus;
}

export const SignalAnalysisView: React.FC<SignalAnalysisViewProps> = ({
  data,
  params,
  acoustics,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dsp_lab' | 'ambiguity' | 'link_budget' | 'target_telemetry'>('dsp_lab');
  const [cursorA, setCursorA] = useState<number>(18);
  const [cursorB, setCursorB] = useState<number>(46);

  // Target Strength and Directivity for Sonar Equation Link Budget
  const [targetStrengthDb, setTargetStrengthDb] = useState<number>(15);
  const [directivityIndexDb, setDirectivityIndexDb] = useState<number>(18);
  const [detectionThresholdDb, setDetectionThresholdDb] = useState<number>(12);

  // Canvas refs
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ambiguityCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Oscilloscope rendering with cursors
  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const midY = h / 2;

    // Background: Clean dark navy grid canvas
    ctx.fillStyle = '#112D4E';
    ctx.fillRect(0, 0, w, h);

    // Reticle
    ctx.strokeStyle = 'rgba(219, 226, 239, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    for (let i = 1; i < 8; i++) {
      const y = (h / 8) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 1; i < 12; i++) {
      const x = (w / 12) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Zero axis
    ctx.strokeStyle = 'rgba(63, 114, 175, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    const samples = data.timeSamples;
    const N = samples.length;
    if (N < 2) return;

    const stepX = w / (N - 1);
    const ampScale = (h / 2) * 0.85;

    // Draw Waveform in Cyan Glow
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const x = i * stepX;
      const y = midY - samples[i] * ampScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Envelope in Amber
    if (data.envelope) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = i * stepX;
        const y = midY - data.envelope[i] * ampScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = i * stepX;
        const y = midY + data.envelope[i] * ampScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Cursor A (#38BDF8 Cyan)
    const curAX = (cursorA / (N - 1)) * w;
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(curAX, 0);
    ctx.lineTo(curAX, h);
    ctx.stroke();

    // Draw Cursor B (#F59E0B Amber)
    const curBX = (cursorB / (N - 1)) * w;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(curBX, 0);
    ctx.lineTo(curBX, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [data, cursorA, cursorB]);

  // Ambiguity Function 2D Heatmap
  useEffect(() => {
    if (activeSubTab !== 'ambiguity') return;
    const canvas = ambiguityCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, w, h);

    const cols = 50;
    const rows = 40;
    const cellW = w / cols;
    const cellH = h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const normX = (c - cols / 2) / (cols / 2);
        const normY = (r - rows / 2) / (rows / 2);
        const dist = Math.sqrt(normX * normX + normY * normY);

        let intensity = 0;
        if (params.modulationType === 'CW') {
          // Narrow Doppler ridge
          intensity = Math.exp(-(normX * normX) * 2 - (normY * normY) * 25);
        } else if (params.modulationType === 'Barker-13') {
          // Thumbtack
          intensity = Math.exp(-dist * 8);
        } else {
          // LFM Chirp ridge
          const chirpDist = Math.abs(normX - 0.7 * normY);
          intensity = Math.exp(-chirpDist * 6) * Math.exp(-(normX * normX + normY * normY) * 1.5);
        }

        const red = Math.floor(Math.min(255, intensity * 240));
        const green = Math.floor(Math.min(255, intensity * 190 + 30));
        const blue = Math.floor(Math.min(255, (1 - intensity) * 100 + intensity * 255));
        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Grid overlays
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, [activeSubTab, params.modulationType]);

  // Sonar Equation calculations
  const sourceLevel = acoustics.sourceLevel;
  const twoWayTransmissionLoss = acoustics.transmissionLoss * 2;
  const signalExcessDb =
    sourceLevel - twoWayTransmissionLoss + targetStrengthDb - (65 - directivityIndexDb) - detectionThresholdDb;

  return (
    <div id="signal-analysis-master-view" className="space-y-4 max-w-[1920px] mx-auto text-[#112D4E]">
      {/* Subtab Navigation Pill Switcher */}
      <div className="glass-panel p-2 flex items-center justify-between gap-3 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
        <div className="flex items-center gap-2">
          <button
            id="subtab-dsp-lab"
            onClick={() => setActiveSubTab('dsp_lab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition-all cursor-pointer ${activeSubTab === 'dsp_lab'
                ? 'bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30 shadow-xs'
                : 'text-[#3F72AF] hover:text-[#112D4E] hover:bg-[#F9F7F7]'
              }`}
          >
            Time/Freq DSP Lab
          </button>
          <button
            id="subtab-ambiguity"
            onClick={() => setActiveSubTab('ambiguity')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition-all cursor-pointer ${activeSubTab === 'ambiguity'
                ? 'bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30 shadow-xs'
                : 'text-[#3F72AF] hover:text-[#112D4E] hover:bg-[#F9F7F7]'
              }`}
          >
            Ambiguity Surface
          </button>
          <button
            id="subtab-link-budget"
            onClick={() => setActiveSubTab('link_budget')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition-all cursor-pointer ${activeSubTab === 'link_budget'
                ? 'bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30 shadow-xs'
                : 'text-[#3F72AF] hover:text-[#112D4E] hover:bg-[#F9F7F7]'
              }`}
          >
            Sonar Link Budget
          </button>
          <button
            id="subtab-target-telemetry"
            onClick={() => setActiveSubTab('target_telemetry')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition-all cursor-pointer ${activeSubTab === 'target_telemetry'
                ? 'bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30 shadow-xs'
                : 'text-[#3F72AF] hover:text-[#112D4E] hover:bg-[#F9F7F7]'
              }`}
          >
            Target Telemetry
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: DSP Laboratory */}
      {activeSubTab === 'dsp_lab' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Oscilloscope with Cursors */}
            <div className="lg:col-span-8">
              <div className="glass-panel p-4 flex flex-col h-full border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
                <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF] mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#3F72AF]" />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#112D4E]">
                      Primary Time-Domain Oscilloscope (DAC DMA Buffer)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[#3F72AF] font-semibold">Cursor A: {((cursorA / 64) * params.pulseDuration).toFixed(2)} ms</span>
                    <span className="text-[#DBE2EF]">|</span>
                    <span className="text-amber-700 font-semibold">Cursor B: {((cursorB / 64) * params.pulseDuration).toFixed(2)} ms</span>
                    <span className="text-[#DBE2EF]">|</span>
                    <span className="text-[#112D4E] font-bold">
                      Δt: {(Math.abs(cursorB - cursorA) / 64 * params.pulseDuration).toFixed(2)} ms
                    </span>
                  </div>
                </div>

                {/* Canvas */}
                <div className="relative h-[280px] w-full rounded-lg overflow-hidden border border-[#3F72AF]/30 bg-[#112D4E]">
                  <canvas ref={scopeCanvasRef} className="w-full h-full block" />
                </div>

                {/* Cursor Sliders */}
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#DBE2EF] text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-[#3F72AF] font-semibold mb-1">
                      <span>Cursor A Position</span>
                      <span>Sample #{cursorA}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="63"
                      value={cursorA}
                      onChange={(e) => setCursorA(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-[#DBE2EF] rounded appearance-none cursor-pointer accent-[#3F72AF]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-amber-700 font-semibold mb-1">
                      <span>Cursor B Position</span>
                      <span>Sample #{cursorB}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="63"
                      value={cursorB}
                      onChange={(e) => setCursorB(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-[#DBE2EF] rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Measurements Panel */}
            <div className="lg:col-span-4">
              <div className="glass-panel p-4 flex flex-col justify-between h-full border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF] mb-3">
                    <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-[#3F72AF]" /> DSP Signal Telemetry
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] border border-[#3F72AF]/30 font-bold">
                      VALIDATED
                    </span>
                  </div>

                  <div className="space-y-2 font-mono text-xs text-[#112D4E]">
                    <div className="flex justify-between p-2 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Peak-to-Peak (Vpp):</span>
                      <span className="text-[#112D4E] font-bold">±{(params.amplitude * 0.033).toFixed(3)} V</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">RMS Voltage (Vrms):</span>
                      <span className="text-[#112D4E] font-bold">
                        {(params.amplitude * 0.033 * 0.707).toFixed(3)} V
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Crest Factor (C):</span>
                      <span className="text-[#112D4E] font-bold">
                        {params.modulationType === 'CW' ? '1.414 (3.0 dB)' : '1.821 (5.2 dB)'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Total Harmonic Distortion (THD):</span>
                      <span className="text-[#112D4E] font-bold">0.082 % (-61.7 dB)</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Dynamic Range (SFDR):</span>
                      <span className="text-[#3F72AF] font-bold">72.4 dBc</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Pulse Compression Gain (Gp):</span>
                      <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">+{acoustics.pulseCompressionGain} dB</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Matched Filter PSLR:</span>
                      <span className="text-[#112D4E] font-bold">-{data.pslrDb} dB</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF] text-[11px] font-mono text-[#3F72AF] mt-3">
                  <span className="text-[#112D4E] font-bold">DAC DMA Status:</span> 12-bit Timer-synchronized DMA2 Stream 5 circular mode. Output Jitter: &lt; 12 ps.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Ambiguity Surface */}
      {activeSubTab === 'ambiguity' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <div className="glass-panel p-4 h-full border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
              <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF] mb-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-[#3F72AF]" />
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#112D4E]">
                    2D Woodward Ambiguity Function Contour |χ(τ, ν)|²
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#3F72AF] font-bold">{params.modulationType}</span>
              </div>

              <div className="relative h-[320px] w-full rounded-lg overflow-hidden border border-[#3F72AF]/30 bg-[#112D4E]">
                <canvas ref={ambiguityCanvasRef} className="w-full h-full block" />

                <div className="absolute bottom-2 left-3 text-[10px] font-mono text-[#DBE2EF] bg-[#112D4E]/85 backdrop-blur-md p-1.5 rounded border border-[#3F72AF]/30">
                  Horizontal: Delay τ (Range Error) | Vertical: Doppler Shift ν (Velocity Error)
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="glass-panel p-4 flex flex-col justify-between h-full border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
              <div>
                <h3 className="text-xs font-bold font-mono uppercase text-[#112D4E] pb-2 border-b border-[#DBE2EF] mb-3">
                  Range-Doppler Coupling Analysis
                </h3>
                <div className="space-y-3 text-xs font-mono text-[#112D4E]/80">
                  <p>
                    <strong className="text-[#112D4E]">Active Scheme:</strong>{' '}
                    <span className="text-[#3F72AF] font-bold">{params.modulationType}</span>
                  </p>
                  <p className="leading-relaxed">
                    {params.modulationType === 'LFM Chirp' || params.modulationType === 'Geometric Sweep' ? (
                      <>
                        Linear Frequency Modulation exhibits a classic tilted knife-edge ambiguity surface. While it has Doppler-Range coupling, target detection remains robust under high-speed AUV relative motion without velocity filter banks.
                      </>
                    ) : params.modulationType === 'Barker-13' ? (
                      <>
                        Barker-13 phase code produces an ideal "thumbtack" ambiguity surface with sharp peak in both Range and Doppler, eliminating range-velocity ambiguity.
                      </>
                    ) : (
                      <>
                        CW tone produces a narrow Doppler ambiguity ridge with wide time delay, ideal for precision velocity Doppler velocimetry but low range resolution.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] font-mono text-xs space-y-1.5 mt-3 text-[#112D4E]">
                <div className="flex justify-between">
                  <span className="text-[#3F72AF]">Doppler Tolerance:</span>
                  <span className="text-[#112D4E] font-bold">±12.5 knots</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3F72AF]">Range Resolution ΔR:</span>
                  <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{params.rangeResolution} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3F72AF]">Velocity Res Δv:</span>
                  <span className="text-[#3F72AF] font-bold">0.42 m/s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Sonar Link Budget */}
      {activeSubTab === 'link_budget' && (
        <div className="glass-panel p-5 space-y-4 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF]">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#3F72AF]" />
              <div>
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#112D4E]">
                  Active Sonar Equation Link Budget Analyzer
                </h3>
                <p className="text-xs font-mono text-[#3F72AF]">
                  SL - 2TL + TS - (NL - DI) = Signal Excess (SE)
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="text-xs text-[#3F72AF]">Signal Excess: </span>
              <span
                className={`text-base font-bold ${signalExcessDb >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
              >
                <AnimeCounter value={signalExcessDb} decimals={1} prefix={signalExcessDb >= 0 ? '+' : ''} suffix=" dB" />
                {signalExcessDb >= 0 ? ' (DETECTED)' : ' (LOST)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">Source Level (SL)</span>
              <div className="text-lg font-bold text-[#112D4E] mt-1">
                <AnimeCounter value={sourceLevel} decimals={1} suffix=" dB" />
              </div>
              <span className="text-[10px] text-[#3F72AF]">Power: {acoustics.sourcePower}W</span>
            </div>
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">2-Way Path Loss (2TL)</span>
              <div className="text-lg font-bold text-rose-600 mt-1">
                -<AnimeCounter value={twoWayTransmissionLoss} decimals={1} suffix=" dB" />
              </div>
              <span className="text-[10px] text-[#3F72AF]">20log(R) + 2αR</span>
            </div>
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">Target Strength (TS)</span>
              <div className="text-lg font-bold text-amber-700 mt-1">
                +<AnimeCounter value={targetStrengthDb} decimals={0} suffix=" dB" />
              </div>
              <span className="text-[10px] text-[#3F72AF]">Acoustic Cross-Section</span>
            </div>
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">Directivity Gain (DI)</span>
              <div className="text-lg font-bold text-[#3F72AF] mt-1">
                +<AnimeCounter value={directivityIndexDb} decimals={0} suffix=" dB" />
              </div>
              <span className="text-[10px] text-[#3F72AF]">Transducer Beamforming</span>
            </div>
          </div>

          {/* Interactive Parameters Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] text-xs font-mono">
              <div className="flex justify-between text-[#112D4E] mb-1">
                <span>Target Strength (TS)</span>
                <span className="text-amber-700 font-bold">{targetStrengthDb} dB</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={targetStrengthDb}
                onChange={(e) => setTargetStrengthDb(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#DBE2EF] rounded appearance-none cursor-pointer accent-amber-500"
              />
            </div>
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] text-xs font-mono">
              <div className="flex justify-between text-[#112D4E] mb-1">
                <span>Array Directivity Index (DI)</span>
                <span className="text-[#3F72AF] font-bold">{directivityIndexDb} dB</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={directivityIndexDb}
                onChange={(e) => setDirectivityIndexDb(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#DBE2EF] rounded appearance-none cursor-pointer accent-[#3F72AF]"
              />
            </div>
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] text-xs font-mono">
              <div className="flex justify-between text-[#112D4E] mb-1">
                <span>Detection Threshold (DT)</span>
                <span className="text-[#112D4E] font-bold">{detectionThresholdDb} dB</span>
              </div>
              <input
                type="range"
                min="6"
                max="24"
                value={detectionThresholdDb}
                onChange={(e) => setDetectionThresholdDb(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#DBE2EF] rounded appearance-none cursor-pointer accent-[#3F72AF]"
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: Tactical Target & Spatial Propagation Telemetry */}
      {activeSubTab === 'target_telemetry' && (
        <div className="glass-panel p-5 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)] text-[#112D4E]">
          <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF] mb-4">
            <div className="flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-[#3F72AF]" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#112D4E]">
                Tactical Target & Beamforming Propagation Telemetry
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30">
              ACOUSTIC LINK ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs mb-5">
            <div className="bg-[#F9F7F7] p-4 rounded-xl border border-[#DBE2EF]">
              <span className="text-[#3F72AF] text-[11px] block">Carrier Wavelength (λ)</span>
              <span className="text-xl font-bold text-[#112D4E]">
                {((acoustics.soundSpeed / (params.centerFrequency * 1000)) * 1000).toFixed(2)} mm
              </span>
            </div>

            <div className="bg-[#F9F7F7] p-4 rounded-xl border border-[#DBE2EF]">
              <span className="text-[#3F72AF] text-[11px] block">Beamwidth (θ-3dB)</span>
              <span className="text-xl font-bold text-[#112D4E]">
                {(50.8 * (acoustics.soundSpeed / (params.centerFrequency * 1000)) / 0.12).toFixed(1)}°
              </span>
            </div>

            <div className="bg-[#F9F7F7] p-4 rounded-xl border border-[#DBE2EF]">
              <span className="text-[#3F72AF] text-[11px] block">Max Unambiguous Range</span>
              <span className="text-xl font-bold text-amber-700">
                {((acoustics.soundSpeed * (params.pulseRepetitionInterval / 1000)) / 2).toFixed(0)} m
              </span>
            </div>
          </div>

          {/* Detected Echo Tracks Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border border-[#DBE2EF] rounded-xl overflow-hidden">
              <thead className="bg-[#DBE2EF]/60 text-[#112D4E] text-xs uppercase font-bold">
                <tr>
                  <th className="p-3">Track ID</th>
                  <th className="p-3">Range</th>
                  <th className="p-3">Bearing</th>
                  <th className="p-3">Doppler Speed</th>
                  <th className="p-3">Echo SNR</th>
                  <th className="p-3">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DBE2EF] text-[#112D4E]">
                <tr className="hover:bg-[#F9F7F7]">
                  <td className="p-3 font-bold text-[#3F72AF]">T-01 (Echo Alpha)</td>
                  <td className="p-3 font-semibold">1,420 m</td>
                  <td className="p-3 font-semibold">038° (NE)</td>
                  <td className="p-3 text-emerald-700 font-bold">+4.2 kts</td>
                  <td className="p-3 text-amber-700 font-bold">+18.4 dB</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">Subsurface Contact</span></td>
                </tr>
                <tr className="hover:bg-[#F9F7F7]">
                  <td className="p-3 font-bold text-[#3F72AF]">T-02 (Echo Bravo)</td>
                  <td className="p-3 font-semibold">2,100 m</td>
                  <td className="p-3 font-semibold">225° (SW)</td>
                  <td className="p-3 text-rose-700 font-bold">-1.8 kts</td>
                  <td className="p-3 text-amber-700 font-bold">+14.1 dB</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-semibold">Stationary Seafloor</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
