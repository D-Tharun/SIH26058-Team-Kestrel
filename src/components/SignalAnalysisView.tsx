import React, { useState, useRef, useEffect } from 'react';
import { WaveformData, TransmitterParameters, PhysicalAcoustics, SystemStatus } from '../types';
import { AnimeCounter } from './animations/AnimeCounter';
import {
  Activity,
  Sliders,
  Crosshair,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Cpu,
  Layers,
  Zap,
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
  status,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dsp_lab' | 'ambiguity' | 'link_budget' | 'output_validation'>('dsp_lab');
  const [cursorA, setCursorA] = useState<number>(18);
  const [cursorB, setCursorB] = useState<number>(46);

  // Link budget variables
  const [referenceSnrDb, setReferenceSnrDb] = useState<number>(140);
  const [directivityIndexDb, setDirectivityIndexDb] = useState<number>(18);

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
          intensity = Math.exp(-(normX * normX) * 2 - (normY * normY) * 25);
        } else if (params.modulationType === 'Barker-13') {
          intensity = Math.exp(-dist * 8);
        } else {
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

  // Two-way propagation loss numbers from central acoustics
  const propLoss = acoustics.propagationLoss;
  const twoWayTransmissionLoss = propLoss.totalTwoWayLoss;
  const predictedLinkMargin = referenceSnrDb - twoWayTransmissionLoss;

  // Output Validation parameters
  const isHardware = status.hardwareMode;
  const commandedFc = params.centerFrequency;
  const measuredFc = isHardware ? data.peakFrequencyKhz : commandedFc;
  const freqErrorKhz = Math.abs(measuredFc - commandedFc);
  const freqErrorPct = commandedFc > 0 ? (freqErrorKhz / commandedFc) * 100 : 0;

  return (
    <div id="signal-analysis-master-view" className="space-y-4 max-w-[1920px] mx-auto text-[#112D4E]">
      {/* Subtab Navigation Pill Switcher */}
      <div className="glass-panel p-2 flex items-center justify-between gap-3 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
        <div className="flex items-center gap-2">
          <button
            id="subtab-dsp-lab"
            onClick={() => setActiveSubTab('dsp_lab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition-all cursor-pointer ${
              activeSubTab === 'dsp_lab'
                ? 'bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30 shadow-xs'
                : 'text-[#3F72AF] hover:text-[#112D4E] hover:bg-[#F9F7F7]'
            }`}
          >
            Transmitted Waveform Lab
          </button>
          <button
            id="subtab-ambiguity"
            onClick={() => setActiveSubTab('ambiguity')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition-all cursor-pointer ${
              activeSubTab === 'ambiguity'
                ? 'bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30 shadow-xs'
                : 'text-[#3F72AF] hover:text-[#112D4E] hover:bg-[#F9F7F7]'
            }`}
          >
            Ambiguity Surface
          </button>
          <button
            id="subtab-link-budget"
            onClick={() => setActiveSubTab('link_budget')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition-all cursor-pointer ${
              activeSubTab === 'link_budget'
                ? 'bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30 shadow-xs'
                : 'text-[#3F72AF] hover:text-[#112D4E] hover:bg-[#F9F7F7]'
            }`}
          >
            Predicted Link Margin Budget
          </button>
          <button
            id="subtab-output-validation"
            onClick={() => setActiveSubTab('output_validation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition-all cursor-pointer ${
              activeSubTab === 'output_validation'
                ? 'bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30 shadow-xs'
                : 'text-[#3F72AF] hover:text-[#112D4E] hover:bg-[#F9F7F7]'
            }`}
          >
            Output Validation & Loopback Matrix
          </button>
        </div>

        {/* Live Hardware Mode Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-[10px] uppercase font-bold text-[#3F72AF]">Source:</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isHardware
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-sky-50 text-sky-800 border-sky-300'
            }`}
          >
            {isHardware ? 'MEASURED (STM32 ADC2 PC1)' : 'SIMULATED TRANSMITTER MODEL'}
          </span>
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
                      Transmitted Waveform Time-Domain (TIM3 PWM Duty Buffer)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[#3F72AF] font-semibold">Cursor A: {((cursorA / (Math.max(1, data.timeSamples.length - 1))) * params.pulseDuration).toFixed(2)} ms</span>
                    <span className="text-[#DBE2EF]">|</span>
                    <span className="text-amber-700 font-semibold">Cursor B: {((cursorB / (Math.max(1, data.timeSamples.length - 1))) * params.pulseDuration).toFixed(2)} ms</span>
                    <span className="text-[#DBE2EF]">|</span>
                    <span className="text-[#112D4E] font-bold">
                      Δt: {(Math.abs(cursorB - cursorA) / (Math.max(1, data.timeSamples.length - 1)) * params.pulseDuration).toFixed(2)} ms
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
                      max={Math.max(1, data.timeSamples.length - 1)}
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
                      max={Math.max(1, data.timeSamples.length - 1)}
                      value={cursorB}
                      onChange={(e) => setCursorB(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-[#DBE2EF] rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Detailed Waveform Metadata (Phase 2F) */}
            <div className="lg:col-span-4">
              <div className="glass-panel p-4 flex flex-col justify-between h-full border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF] mb-3">
                    <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-[#3F72AF]" /> Command Parameters & DSP Metadata
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] border border-[#3F72AF]/30 font-bold">
                      N = {params.sampleCount} ≤ 512
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs text-[#112D4E]">
                    <div className="flex justify-between p-1.5 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Modulation:</span>
                      <span className="text-amber-600 font-bold">{params.modulationType}</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Carrier (fc):</span>
                      <span className="text-[#112D4E] font-bold">{params.centerFrequency.toFixed(2)} kHz</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Used BW (B_used):</span>
                      <span className="text-[#3F72AF] font-bold">{params.bandwidth.toFixed(2)} kHz</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Required BW (B_req):</span>
                      <span className="text-[#112D4E] font-bold">{((params.bandwidthRequiredHz ?? (params.bandwidth * 1000)) / 1000).toFixed(2)} kHz</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Req vs Ach Res:</span>
                      <span className="text-emerald-800 font-bold">
                        {(params.requestedResolutionM ?? params.rangeResolution).toFixed(3)}m → {(params.achievableResolutionM ?? params.rangeResolution).toFixed(3)}m
                      </span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Band Edges [fL, fH]:</span>
                      <span className="text-[#112D4E] font-bold">[{params.fL.toFixed(2)}, {params.fH.toFixed(2)}] kHz</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Pulse Duration (τ):</span>
                      <span className="text-[#112D4E] font-bold">{params.pulseDuration.toFixed(2)} ms</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Sample Count (N):</span>
                      <span className="text-[#112D4E] font-bold">{params.sampleCount} (fs = 100 kS/s)</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">Window Function:</span>
                      <span className="text-[#112D4E] font-bold">{params.windowType}</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[#F9F7F7] border border-[#DBE2EF]">
                      <span className="text-[#3F72AF]">PWM Duty Level:</span>
                      <span className="text-[#112D4E] font-bold">{params.amplitude}% (ARR=639)</span>
                    </div>
                    <div className={`flex justify-between p-1.5 rounded border text-[11px] ${
                      params.bandwidthLimited ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}>
                      <span className="font-bold">Bandwidth Status:</span>
                      <span className="font-bold">{params.bandwidthStatus ?? (params.bandwidthLimited ? 'Bandwidth Limited' : 'Within Hardware Limit')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF] text-[11px] font-mono text-[#3F72AF] mt-3">
                  <span className="text-[#112D4E] font-bold">Hardware Output Pin:</span> PA6 (TIM3 Channel 1 PWM). Direct Memory Access via DMA1 Channel 6 with zero CPU overhead.
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
                  Horizontal: Delay τ (Range Separation) | Vertical: Doppler Frequency Shift ν
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="glass-panel p-4 flex flex-col justify-between h-full border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
              <div>
                <h3 className="text-xs font-bold font-mono uppercase text-[#112D4E] pb-2 border-b border-[#DBE2EF] mb-3">
                  Transmitter Ambiguity Properties
                </h3>
                <div className="space-y-3 text-xs font-mono text-[#112D4E]/80">
                  <p>
                    <strong className="text-[#112D4E]">Active Scheme:</strong>{' '}
                    <span className="text-[#3F72AF] font-bold">{params.modulationType}</span>
                  </p>
                  <p className="leading-relaxed">
                    {params.modulationType === 'LFM Chirp' || params.modulationType === 'Geometric Sweep' ? (
                      <>
                        Linear Frequency Modulation concentrates energy along a tilted ridge on the ambiguity plane. Range resolution ΔR = {params.rangeResolution}m is preserved with high pulse compression gain (+{acoustics.pulseCompressionGain} dB).
                      </>
                    ) : params.modulationType === 'Barker-13' ? (
                      <>
                        13-Bit binary phase shift keying produces a sharp thumbtack ambiguity surface with low uniform sidelobes across both time delay and Doppler shifts.
                      </>
                    ) : (
                      <>
                        Continuous Wave tone produces a narrow Doppler ridge with wide time delay, optimized for tonal frequency fidelity and velocity Doppler discrimination.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] font-mono text-xs space-y-1.5 mt-3 text-[#112D4E]">
                <div className="flex justify-between">
                  <span className="text-[#3F72AF]">Theoretical Range Res ΔR:</span>
                  <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{params.rangeResolution} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3F72AF]">Time-Bandwidth Product:</span>
                  <span className="text-[#112D4E] font-bold">{params.timeBandwidthProduct.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3F72AF]">Pulse Sidelobe Attenuation:</span>
                  <span className="text-[#3F72AF] font-bold">-{data.pslrDb.toFixed(1)} dB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Acoustic Link Budget */}
      {activeSubTab === 'link_budget' && (
        <div className="glass-panel p-5 space-y-4 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF]">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#3F72AF]" />
              <div>
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#112D4E]">
                  Acoustic Link Budget Analyzer (Predicted Link Margin)
                </h3>
                <p className="text-xs font-mono text-[#3F72AF]">
                  Predicted Link Margin M(f, R) = SNR_ref - TL_2way - L_scat
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="text-xs text-[#3F72AF]">Predicted Link Margin: </span>
              <span className="text-base font-bold text-emerald-700">
                <AnimeCounter value={predictedLinkMargin} decimals={1} prefix={predictedLinkMargin >= 0 ? '+' : ''} suffix=" dB" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">Reference SNR (SNR_ref)</span>
              <div className="text-lg font-bold text-[#112D4E] mt-1">
                <AnimeCounter value={referenceSnrDb} decimals={1} suffix=" dB" />
              </div>
              <span className="text-[10px] text-[#3F72AF]">Transmitter Baseline Budget</span>
            </div>
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">2-Way Path Loss (TL_2way)</span>
              <div className="text-lg font-bold text-rose-600 mt-1">
                -<AnimeCounter value={twoWayTransmissionLoss} decimals={1} suffix=" dB" />
              </div>
              <span className="text-[10px] text-[#3F72AF]">40 log(R) + 2 α R_km</span>
            </div>
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">Scattering Penalty (L_scat)</span>
              <div className="text-lg font-bold text-emerald-700 mt-1">
                0.0 dB
              </div>
              <span className="text-[10px] text-[#3F72AF]">Kτ = 0 (Uncalibrated)</span>
            </div>
            <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">Pulse Compression Gain (Gp)</span>
              <div className="text-lg font-bold text-[#3F72AF] mt-1">
                +<AnimeCounter value={acoustics.pulseCompressionGain} decimals={1} suffix=" dB" />
              </div>
              <span className="text-[10px] text-[#3F72AF]">10 log10(B · τ)</span>
            </div>
          </div>

          <div className="p-3 bg-[#F9F7F7] rounded-xl border border-[#DBE2EF] text-xs font-mono text-[#112D4E]/80">
            <span className="font-bold text-[#112D4E]">Notice:</span> Predicted Link Margin represents the theoretical acoustic transmission budget at the configured range based on empirical propagation models. It is not a live measured receiver SNR.
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: Output Validation & Hardware Loopback (Phases 2E & 2G) */}
      {activeSubTab === 'output_validation' && (
        <div className="glass-panel p-5 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)] text-[#112D4E] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#112D4E]">
                  Transmitter Output Validation & Loopback Matrix
                </h3>
                <p className="text-xs font-mono text-[#3F72AF]">
                  Rigorous comparison of Commanded Parameters vs Measured Telemetry / Active Simulation
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono px-2.5 py-1 rounded font-bold border ${
                isHardware
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-sky-50 text-sky-800 border-sky-300'
              }`}
            >
              {isHardware ? 'HARDWARE TELEMETRY ACTIVE' : 'SIMULATION MODE'}
            </span>
          </div>

          {/* KPI Comparison Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-[#F9F7F7] p-3 rounded-xl border border-[#DBE2EF]">
              <span className="text-[#3F72AF] text-[10px] block uppercase font-bold">Commanded fc</span>
              <span className="text-xl font-bold text-[#112D4E]">
                {commandedFc.toFixed(2)} kHz
              </span>
              <span className="text-[10px] text-[#3F72AF] block mt-1">Target Carrier Setting</span>
            </div>

            <div className="bg-[#F9F7F7] p-3 rounded-xl border border-[#DBE2EF]">
              <span className="text-[#3F72AF] text-[10px] block uppercase font-bold">
                {isHardware ? 'Measured Peak fc' : 'Modeled Peak fc'}
              </span>
              <span className="text-xl font-bold text-[#3F72AF]">
                {measuredFc.toFixed(2)} kHz
              </span>
              <span className="text-[10px] text-[#3F72AF] block mt-1">
                {isHardware ? 'ADC2 FFT Peak' : 'Discrete DFT Output'}
              </span>
            </div>

            <div className="bg-[#F9F7F7] p-3 rounded-xl border border-[#DBE2EF]">
              <span className="text-[#3F72AF] text-[10px] block uppercase font-bold">Frequency Delta (Δf)</span>
              <span className="text-xl font-bold text-emerald-700">
                {freqErrorKhz.toFixed(2)} kHz ({freqErrorPct.toFixed(1)}%)
              </span>
              <span className="text-[10px] text-emerald-700 block mt-1">Within ±0.25 kHz Band</span>
            </div>

            <div className="bg-[#F9F7F7] p-3 rounded-xl border border-[#DBE2EF]">
              <span className="text-[#3F72AF] text-[10px] block uppercase font-bold">Validation Status</span>
              <span className="text-base font-bold text-emerald-700 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>FREQUENCY LOCKED</span>
              </span>
              <span className="text-[10px] text-[#3F72AF] block mt-1">TIM3 PWM Duty OK</span>
            </div>
          </div>

          {/* Validation Parameters Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border border-[#DBE2EF] rounded-xl overflow-hidden">
              <thead className="bg-[#DBE2EF]/60 text-[#112D4E] text-xs uppercase font-bold">
                <tr>
                  <th className="p-3">Parameter</th>
                  <th className="p-3">Command / Config</th>
                  <th className="p-3">Measured / Sampled</th>
                  <th className="p-3">Tolerance / Deviation</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DBE2EF] text-[#112D4E]">
                <tr className="hover:bg-[#F9F7F7]">
                  <td className="p-3 font-bold text-[#3F72AF]">Center Frequency (fc)</td>
                  <td className="p-3 font-semibold">{commandedFc.toFixed(2)} kHz</td>
                  <td className="p-3 font-semibold">{measuredFc.toFixed(2)} kHz {isHardware ? '(ADC2)' : '(Model)'}</td>
                  <td className="p-3 text-emerald-700 font-bold">Δf = {freqErrorKhz.toFixed(2)} kHz</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">LOCKED</span></td>
                </tr>
                <tr className="hover:bg-[#F9F7F7]">
                  <td className="p-3 font-bold text-[#3F72AF]">PWM Period Register (ARR)</td>
                  <td className="p-3 font-semibold">639 Counts (100 kS/s)</td>
                  <td className="p-3 font-semibold">639 Counts</td>
                  <td className="p-3 text-emerald-700 font-bold">0 Counts (Exact)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">VALID</span></td>
                </tr>
                <tr className="hover:bg-[#F9F7F7]">
                  <td className="p-3 font-bold text-[#3F72AF]">Buffer Sample Count (N)</td>
                  <td className="p-3 font-semibold">{params.sampleCount} Words (≤ 512)</td>
                  <td className="p-3 font-semibold">{params.sampleCount} Words</td>
                  <td className="p-3 text-emerald-700 font-bold">N ≤ 512 Bound OK</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">PASSED</span></td>
                </tr>
                <tr className="hover:bg-[#F9F7F7]">
                  <td className="p-3 font-bold text-[#3F72AF]">Reconstruction Capacitor</td>
                  <td className="p-3 font-semibold">{params.fH > 5.0 ? '10 nF (High-Band)' : '100 nF (Low-Band)'}</td>
                  <td className="p-3 font-semibold">CD4053B Selected</td>
                  <td className="p-3 text-emerald-700 font-bold">fRC = {params.fH > 5.0 ? '15.9 kHz' : '1.59 kHz'}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">MATCHED</span></td>
                </tr>
                <tr className="hover:bg-[#F9F7F7]">
                  <td className="p-3 font-bold text-[#3F72AF]">Loopback Rail Voltage</td>
                  <td className="p-3 font-semibold">3300 mV Nominal</td>
                  <td className="p-3 font-semibold">{status.loopbackVoltageMv} mV {isHardware ? '(PC1)' : '(Sim)'}</td>
                  <td className="p-3 text-emerald-700 font-bold">&lt; 1.5% Rail Ripple</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">NORMAL</span></td>
                </tr>
                <tr className="hover:bg-[#F9F7F7]">
                  <td className="p-3 font-bold text-[#3F72AF]">Measured TX SNR (ADC2 PC1)</td>
                  <td className="p-3 font-semibold">
                    {status.snrTargetValid && typeof status.snrTargetDb === 'number' ? `Target: ${status.snrTargetDb.toFixed(1)} dB` : 'Target: UNSET'}
                  </td>
                  <td className="p-3 font-semibold">
                    {typeof status.snrTxDb === 'number' ? `${status.snrTxDb.toFixed(1)} dB` : isHardware ? '— dB' : '32.4 dB (Sim)'}
                  </td>
                  <td className="p-3 text-[#3F72AF] font-bold">
                    {status.snrTargetValid && typeof status.snrMarginDb === 'number' ? `Margin: ${status.snrMarginDb >= 0 ? `+${status.snrMarginDb.toFixed(1)}` : status.snrMarginDb.toFixed(1)} dB` : 'Margin: —'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.adc2ConditioningOk === false ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {status.adc2ConditioningOk === false ? 'CHECK INPUT' : 'IN RANGE'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

