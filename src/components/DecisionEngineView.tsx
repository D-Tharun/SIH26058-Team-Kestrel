import React from 'react';
import {
  EnvironmentalInputs,
  TransmitterParameters,
  DecisionTrace,
  PhysicalAcoustics,
} from '../types';
import {
  TreeDeciduous,
  CheckCircle2,
  GitBranch,
  Sliders,
  Target,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { AnimeCounter } from './animations/AnimeCounter';

interface DecisionEngineViewProps {
  env: EnvironmentalInputs;
  params: TransmitterParameters;
  trace: DecisionTrace;
  acoustics: PhysicalAcoustics;
}

export const DecisionEngineView: React.FC<DecisionEngineViewProps> = ({
  env,
  params,
  trace,
  acoustics,
}) => {
  const optimization = trace.optimization;
  const candidates = optimization?.candidates || [];
  const B = params.bandwidth;
  const soundSpeed = acoustics.soundSpeed;
  const desiredResolution = params.rangeResolution;
  const fc = params.centerFrequency;
  const fL = params.fL;
  const fH = params.fH;

  const minFeasibleFc = Math.round((1.0 + B / 2) * 10) / 10;
  const maxFeasibleFc = Math.round((10.0 - B / 2) * 10) / 10;

  // Find min and max margin for graph scaling
  const validCandidates = candidates.filter((c) => c.valid);
  const minMargin = validCandidates.length > 0 ? Math.min(...validCandidates.map((c) => c.predictedLinkMargin)) - 2 : 0;
  const maxMargin = validCandidates.length > 0 ? Math.max(...validCandidates.map((c) => c.predictedLinkMargin)) + 2 : 50;
  const marginRange = Math.max(1, maxMargin - minMargin);

  return (
    <div id="decision-engine-full-view" className="space-y-4 max-w-[1920px] mx-auto text-[#112D4E]">
      {/* Top Banner */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#3F72AF]">
            <TreeDeciduous className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#112D4E] flex items-center gap-2">
              Autonomous Environmental Decision & Optimization Engine
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#112D4E] font-bold">
                1–10 kHz FEASIBLE BAND OPTIMIZER
              </span>
            </h2>
            <p className="text-xs font-mono text-[#3F72AF]">
              Derives required bandwidth from target resolution, maps feasible band constraints, and selects fc via argmax Predicted Link Margin
            </p>
          </div>
        </div>

        <div className="bg-[#F9F7F7] px-3 py-2 rounded-lg border border-[#DBE2EF] font-mono text-xs text-right">
          <div className="text-[#3F72AF] text-[11px]">Selected Carrier (fc)</div>
          <div className="text-[#112D4E] font-bold text-base">{fc.toFixed(1)} kHz (M = +{optimization?.predictedLinkMargin.toFixed(1) ?? acoustics.predictedLinkMargin.toFixed(1)} dB)</div>
        </div>
      </div>

      {/* Decision Workflow Sequence Ribbon */}
      <div className="glass-panel p-3 border border-[#DBE2EF] overflow-x-auto custom-scrollbar">
        <div className="flex items-center justify-between min-w-[950px] gap-2 font-mono text-xs text-[#112D4E]">
          <div className="flex items-center gap-1.5 bg-[#F9F7F7] px-2.5 py-1.5 rounded-lg border border-[#DBE2EF]">
            <span className="w-4 h-4 rounded-full bg-[#DBE2EF] text-[10px] font-bold flex items-center justify-center text-[#112D4E]">1</span>
            <span>Env State (c = {soundSpeed}m/s)</span>
          </div>
          <span className="text-[#3F72AF]">→</span>
          <div className="flex items-center gap-1.5 bg-[#F9F7F7] px-2.5 py-1.5 rounded-lg border border-[#DBE2EF]">
            <span className="w-4 h-4 rounded-full bg-[#DBE2EF] text-[10px] font-bold flex items-center justify-center text-[#112D4E]">2</span>
            <span>Req ΔR = {(params.requestedResolutionM ?? desiredResolution).toFixed(3)}m</span>
          </div>
          <span className="text-[#3F72AF]">→</span>
          <div className="flex items-center gap-1.5 bg-[#F9F7F7] px-2.5 py-1.5 rounded-lg border border-[#DBE2EF]">
            <span className="w-4 h-4 rounded-full bg-[#DBE2EF] text-[10px] font-bold flex items-center justify-center text-[#112D4E]">3</span>
            <span>B_used = {B.toFixed(2)} kHz ({params.bandwidthStatus ?? (params.bandwidthLimited ? 'BW Limited' : 'Within Limit')})</span>
          </div>
          <span className="text-[#3F72AF]">→</span>
          <div className="flex items-center gap-1.5 bg-[#F9F7F7] px-2.5 py-1.5 rounded-lg border border-[#DBE2EF]">
            <span className="w-4 h-4 rounded-full bg-[#DBE2EF] text-[10px] font-bold flex items-center justify-center text-[#112D4E]">4</span>
            <span>[{minFeasibleFc}, {maxFeasibleFc}] kHz Interval</span>
          </div>
          <span className="text-[#3F72AF]">→</span>
          <div className="flex items-center gap-1.5 bg-[#F9F7F7] px-2.5 py-1.5 rounded-lg border border-[#DBE2EF]">
            <span className="w-4 h-4 rounded-full bg-[#DBE2EF] text-[10px] font-bold flex items-center justify-center text-[#112D4E]">5</span>
            <span>Candidate Scan</span>
          </div>
          <span className="text-[#3F72AF]">→</span>
          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-300 text-emerald-800">
            <span className="w-4 h-4 rounded-full bg-emerald-200 text-[10px] font-bold flex items-center justify-center text-emerald-800">6</span>
            <span className="font-bold">fc = {fc.toFixed(1)} kHz Selected</span>
          </div>
        </div>
      </div>

      {/* 4-Column Parameter Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Node 1: Resolution to Bandwidth */}
        <div className="glass-panel p-4 h-full flex flex-col justify-between border border-[#DBE2EF]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
              <span className="text-xs font-bold font-mono text-[#112D4E] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#DBE2EF] border border-[#3F72AF]/30 text-[10px] flex items-center justify-center font-bold text-[#112D4E]">1</span>
                Bandwidth & Resolution Flow
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#DBE2EF] text-[#3F72AF] font-bold">B = c/(2ΔR)</span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#3F72AF]">Requested Res (ΔR_req):</span>
                <span className="text-[#112D4E] font-bold">{(params.requestedResolutionM ?? desiredResolution).toFixed(3)} m</span>
              </div>
              <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#3F72AF]">Required BW (B_req):</span>
                <span className="text-[#3F72AF] font-bold">{((params.bandwidthRequiredHz ?? (soundSpeed / (2 * desiredResolution))) / 1000).toFixed(2)} kHz</span>
              </div>
              <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#3F72AF]">Used BW (B_used):</span>
                <span className="text-[#112D4E] font-bold">{B.toFixed(2)} kHz</span>
              </div>
              <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#3F72AF]">Achievable Res (ΔR_ach):</span>
                <span className="text-emerald-800 font-bold">{(params.achievableResolutionM ?? desiredResolution).toFixed(3)} m</span>
              </div>
              <div className={`flex justify-between p-1.5 rounded border text-[11px] ${
                params.bandwidthLimited
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}>
                <span className="font-bold">Bandwidth Status:</span>
                <span className="font-bold">{params.bandwidthStatus ?? (params.bandwidthLimited ? 'Bandwidth Limited' : 'Within Hardware Limit')}</span>
              </div>
            </div>
          </div>
          <div className="text-[9px] text-[#3F72AF] mt-2 pt-1 border-t border-[#DBE2EF]">
            Max contiguous bandwidth: 9.0 kHz (Operating band: 1–10 kHz)
          </div>
        </div>

        {/* Node 2: Frequency Constraints */}
        <div className="glass-panel p-4 h-full flex flex-col justify-between border border-[#DBE2EF]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
              <span className="text-xs font-bold font-mono text-[#112D4E] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#DBE2EF] border border-[#3F72AF]/30 text-[10px] flex items-center justify-center font-bold text-[#112D4E]">2</span>
                Frequency Constraints
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#DBE2EF] text-[#3F72AF] font-bold">1–10 kHz</span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF] text-[11px]">
                <div className="text-[#3F72AF]">Feasible fc Interval:</div>
                <div className="font-bold text-[#112D4E]">
                  {minFeasibleFc.toFixed(1)} kHz ≤ fc ≤ {maxFeasibleFc.toFixed(1)} kHz
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center pt-1">
                <div className="bg-[#F9F7F7] p-1 rounded border border-[#DBE2EF]">
                  <div className="text-[9px] text-[#3F72AF]">fL (Lower)</div>
                  <div className="font-bold text-[#112D4E] text-xs">{fL.toFixed(1)}k</div>
                </div>
                <div className="bg-sky-50 p-1 rounded border border-sky-300">
                  <div className="text-[9px] text-sky-700 font-bold">fc (Center)</div>
                  <div className="font-bold text-sky-900 text-xs">{fc.toFixed(1)}k</div>
                </div>
                <div className="bg-[#F9F7F7] p-1 rounded border border-[#DBE2EF]">
                  <div className="text-[9px] text-[#3F72AF]">fH (Upper)</div>
                  <div className="font-bold text-[#112D4E] text-xs">{fH.toFixed(1)}k</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Node 3: Modulation Strategy */}
        <div className="glass-panel p-4 h-full flex flex-col justify-between border border-[#DBE2EF]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
              <span className="text-xs font-bold font-mono text-amber-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 text-[10px] flex items-center justify-center font-bold text-amber-800">3</span>
                Modulation & Window
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="bg-[#F9F7F7] p-2 rounded border border-[#DBE2EF]">
                <div className="text-[10px] text-[#3F72AF]">Waveform Policy</div>
                <div className="text-sm font-bold text-amber-600 truncate">{params.modulationType}</div>
              </div>
              <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#3F72AF]">Spectral Window:</span>
                <span className="text-[#112D4E] font-bold">{params.windowType}</span>
              </div>
              <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#3F72AF]">Pulse Duration (τ):</span>
                <span className="text-[#112D4E] font-bold">{params.pulseDuration} ms (≤ 5.12ms)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node 4: Gain & Filter Selection */}
        <div className="glass-panel p-4 h-full flex flex-col justify-between border border-[#DBE2EF]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
              <span className="text-xs font-bold font-mono text-emerald-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 text-[10px] flex items-center justify-center font-bold text-emerald-800">4</span>
                Gain & Filter Selection
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="bg-[#F9F7F7] p-2 rounded border border-[#DBE2EF]">
                <div className="text-[10px] text-[#3F72AF]">Pulse Compression Gain (Gp)</div>
                <div className="text-base font-bold text-emerald-700">+{acoustics.pulseCompressionGain} dB</div>
              </div>
              <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#3F72AF]">CD4053B Cap Selection:</span>
                <span className="text-[#112D4E] font-bold">{fH > 5.0 ? '10 nF (fRC=15.9k)' : '100 nF (fRC=1.59k)'}</span>
              </div>
              <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#3F72AF]">Sample Count:</span>
                <span className="text-[#112D4E] font-bold">{params.sampleCount} words (N ≤ 512)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Frequency Optimization Scan Graph */}
      <div className="glass-panel p-4 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#DBE2EF] gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#3F72AF]" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#112D4E]">
              Candidate Center Frequency Scan (argmax Predicted Link Margin)
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-sky-700">
              <span className="w-2 h-2 rounded-xs bg-sky-500" />
              <span>Tested Candidates</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
              <span className="w-2 h-2 rounded-xs bg-emerald-500" />
              <span>Selected Optimum: fc = {fc.toFixed(1)} kHz</span>
            </span>
          </div>
        </div>

        {/* Candidate Bar / Scatter Chart */}
        <div className="h-44 w-full bg-[#07172C]/85 rounded-xl border border-white/20 p-3 flex flex-col justify-between shadow-inner">
          <div className="flex justify-between text-[10px] font-mono text-[#DBE2EF]/70 pb-1 border-b border-white/10">
            <span>X: Candidate Center Frequency fc (1.0 to 10.0 kHz)</span>
            <span>Y: Predicted Link Margin (dB)</span>
          </div>

          <div className="flex-1 flex items-end justify-between gap-1.5 pt-2 pb-1">
            {candidates.map((cand, idx) => {
              const isSelected = Math.abs(cand.fc - fc) < 0.1;
              const normalizedHeight = Math.max(8, Math.min(100, Math.round(((cand.predictedLinkMargin - minMargin) / marginRange) * 100)));

              let barColor = 'bg-[#3F72AF]/40';
              let ringClass = '';

              if (isSelected) {
                barColor = 'bg-gradient-to-t from-emerald-600 via-teal-400 to-white';
                ringClass = 'ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]';
              } else if (cand.valid) {
                barColor = 'bg-gradient-to-t from-sky-700 to-sky-400';
              } else {
                barColor = 'bg-slate-700/50';
              }

              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div
                    style={{ height: `${normalizedHeight}%` }}
                    className={`w-full rounded-t-xs transition-all duration-75 ${barColor} ${ringClass}`}
                  />
                  {isSelected && (
                    <div className="absolute -top-3 text-[9px] font-mono text-emerald-300 font-bold">
                      ★
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#112D4E] border border-[#3F72AF]/40 text-[9px] font-mono px-2 py-0.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap shadow-lg">
                    fc: {cand.fc} kHz | M: {cand.predictedLinkMargin.toFixed(1)} dB {cand.valid ? '(Feasible)' : '(Violates Band)'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] font-mono text-[#DBE2EF] pt-1 border-t border-white/10">
            <span>1.0 kHz</span>
            <span className="text-[#38BDF8]">Feasible Range: {minFeasibleFc.toFixed(1)}k - {maxFeasibleFc.toFixed(1)}k</span>
            <span>10.0 kHz</span>
          </div>
        </div>
      </div>

      {/* Decision Rationale Details ("Why this configuration?") */}
      <div className="glass-panel p-4 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
        <h3 className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5 pb-2 border-b border-[#DBE2EF] mb-3">
          <HelpCircle className="w-4 h-4 text-[#3F72AF]" /> Why this configuration? (Autonomous Decision Reasoning)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-[#F9F7F7] p-2.5 rounded-lg border border-[#DBE2EF] space-y-1">
            <div className="font-bold text-[#112D4E]">Why this bandwidth ({B.toFixed(2)} kHz)?</div>
            <p className="text-[#112D4E]/80 text-[11px] leading-relaxed">
              Derived from requested resolution ΔR_req = {(params.requestedResolutionM ?? desiredResolution).toFixed(3)}m (B_req = {((params.bandwidthRequiredHz ?? (soundSpeed / (2 * desiredResolution))) / 1000).toFixed(2)} kHz). {params.bandwidthLimited ? 'Capped at 9.0 kHz maximum contiguous bandwidth (prototype operating-band limit: 1–10 kHz).' : 'Achievable within 9.0 kHz hardware limit.'}
            </p>
          </div>

          <div className="bg-[#F9F7F7] p-2.5 rounded-lg border border-[#DBE2EF] space-y-1">
            <div className="font-bold text-[#112D4E]">Why this center frequency ({fc.toFixed(1)} kHz)?</div>
            <p className="text-[#112D4E]/80 text-[11px] leading-relaxed">
              Achieved maximum predicted Link Margin (+{optimization?.predictedLinkMargin.toFixed(1) ?? acoustics.predictedLinkMargin.toFixed(1)} dB) among candidate scans within feasible bounds [{minFeasibleFc}, {maxFeasibleFc}] kHz.
            </p>
          </div>

          <div className="bg-[#F9F7F7] p-2.5 rounded-lg border border-[#DBE2EF] space-y-1">
            <div className="font-bold text-[#112D4E]">Why this modulation ({params.modulationType})?</div>
            <p className="text-[#112D4E]/80 text-[11px] leading-relaxed">
              {params.modulationType === 'Barker-13'
                ? 'High ambient noise threshold triggered BPSK phase coding for 11.1 dB clutter suppression.'
                : params.modulationType === 'Geometric Sweep'
                ? 'High sediment penetration priority engaged logarithmic chirp sweep.'
                : params.modulationType === 'CW'
                ? 'Low-noise shallow profile engaged tonal transmission for narrowband Doppler estimation.'
                : 'Survey profile engaged Linear Frequency Modulated chirp for pulse compression.'}
            </p>
          </div>

          <div className="bg-[#F9F7F7] p-2.5 rounded-lg border border-[#DBE2EF] space-y-1">
            <div className="font-bold text-[#112D4E]">Why this window ({params.windowType})?</div>
            <p className="text-[#112D4E]/80 text-[11px] leading-relaxed">
              {params.windowType === 'Blackman'
                ? 'Suppresses range sidelobes to -58 dB to prevent masking in high-reverberation channels.'
                : 'Balanced mainlobe width with -43 dB sidelobe suppression for nominal oceanic propagation.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

