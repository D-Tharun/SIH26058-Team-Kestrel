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
} from 'lucide-react';

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
              Autonomous Environmental Decision Engine
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#112D4E] font-bold">
                ACTIVE HEURISTIC MATRIX
              </span>
            </h2>
            <p className="text-xs font-mono text-[#3F72AF]">
              Multi-parameter oceanographic rule engine adapting transmitter carrier fc, modulation, and pulse shape to minimize transmission loss
            </p>
          </div>
        </div>

        <div className="bg-[#F9F7F7] px-3 py-2 rounded-lg border border-[#DBE2EF] font-mono text-xs text-right">
          <div className="text-[#3F72AF] text-[11px]">Active Engine Rule Confidence</div>
          <div className="text-[#112D4E] font-bold text-base">{(trace.confidence * 100).toFixed(0)}% OPTIMAL MATCH</div>
        </div>
      </div>

      {/* Decision Tree Flow Graph Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Node 1: Environmental Inputs */}
        <div className="glass-panel p-4 h-full flex flex-col border border-[#DBE2EF]">
          <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
            <span className="text-xs font-bold font-mono text-[#112D4E] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#DBE2EF] border border-[#3F72AF]/30 text-[10px] flex items-center justify-center font-bold text-[#112D4E]">1</span>
              Ocean Medium State
            </span>
          </div>
          <div className="space-y-1.5 font-mono text-xs text-[#112D4E]">
            <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">Depth (D):</span>
              <span className="text-[#112D4E] font-bold">{env.depth} m</span>
            </div>
            <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">Turbidity:</span>
              <span className="text-amber-600 font-bold">{env.turbidity} NTU</span>
            </div>
            <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">Salinity:</span>
              <span className="text-[#3F72AF] font-bold">{env.salinity} ppt</span>
            </div>
            <div className="flex justify-between bg-[#F9F7F7] p-1.5 rounded border border-[#DBE2EF]">
              <span className="text-[#3F72AF]">ResPen Index:</span>
              <span className="text-[#112D4E] font-bold">{env.resPen.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Node 2: Frequency Allocator */}
        <div className="glass-panel p-4 h-full flex flex-col border border-[#DBE2EF]">
          <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
            <span className="text-xs font-bold font-mono text-[#112D4E] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#DBE2EF] border border-[#3F72AF]/30 text-[10px] flex items-center justify-center font-bold text-[#112D4E]">2</span>
              Frequency Allocator (fc)
            </span>
          </div>
          <div className="space-y-1.5 font-mono text-xs text-[#112D4E]">
            <div className="bg-[#F9F7F7] p-2 rounded border border-[#DBE2EF]">
              <div className="text-[10px] text-[#3F72AF]">Target Carrier</div>
              <div className="text-lg font-bold text-[#112D4E] font-['Plus_Jakarta_Sans',sans-serif]">
                {params.centerFrequency.toFixed(1)} kHz
              </div>
              <div className="text-[10px] text-[#3F72AF] mt-1">
                Absorption α = {acoustics.absorptionCoefficient} dB/km
              </div>
            </div>
          </div>
        </div>

        {/* Node 3: Modulation Strategy */}
        <div className="glass-panel p-4 h-full flex flex-col border border-[#DBE2EF]">
          <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
            <span className="text-xs font-bold font-mono text-amber-600 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 text-[10px] flex items-center justify-center font-bold text-amber-700">3</span>
              Modulation & Code
            </span>
          </div>
          <div className="space-y-1.5 font-mono text-xs text-[#112D4E]">
            <div className="bg-[#F9F7F7] p-2 rounded border border-[#DBE2EF]">
              <div className="text-[10px] text-[#3F72AF]">Active Scheme</div>
              <div className="text-base font-bold text-amber-600 font-mono">
                {params.modulationType}
              </div>
              <div className="text-[10px] text-[#3F72AF] mt-1">
                BW: {params.bandwidth} kHz | τ: {params.pulseDuration} ms
              </div>
            </div>
          </div>
        </div>

        {/* Node 4: Pulse Compression Result */}
        <div className="glass-panel p-4 h-full flex flex-col border border-[#DBE2EF]">
          <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
            <span className="text-xs font-bold font-mono text-emerald-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 text-[10px] flex items-center justify-center font-bold text-emerald-700">4</span>
              Resolution & Gain
            </span>
          </div>
          <div className="space-y-1.5 font-mono text-xs text-[#112D4E]">
            <div className="bg-[#F9F7F7] p-2 rounded border border-[#DBE2EF]">
              <div className="text-[10px] text-[#3F72AF]">Resolution (ΔR)</div>
              <div className="text-base font-bold text-emerald-700 font-mono">
                {params.rangeResolution} m
              </div>
              <div className="text-[10px] text-[#3F72AF] mt-1">
                Gain: +{acoustics.pulseCompressionGain} dB
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Rationale Details */}
      <div className="glass-panel p-5 border border-[#DBE2EF]">
        <h3 className="text-sm font-bold font-mono uppercase text-[#112D4E] flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-[#3F72AF]" /> Active Heuristic Rules & Firing Trace
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] space-y-2">
            <div className="font-bold text-[#112D4E] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Rule 1: High Turbidity Dispersion Mitigation
            </div>
            <p className="text-[#112D4E]/80 leading-relaxed">
              When NTU &gt; 35, acoustic scattering off suspended particles increases as f⁴ (Rayleigh regime).
              The decision engine lowers center frequency to {params.centerFrequency.toFixed(1)} kHz to maximize penetration.
            </p>
          </div>
          <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] space-y-2">
            <div className="font-bold text-[#112D4E] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Rule 2: Multi-path Reverb Spread
            </div>
            <p className="text-[#112D4E]/80 leading-relaxed">
              In shallow water (Depth &lt; 80m), surface/bottom bounce causes inter-symbol interference.
              Selecting {params.modulationType} with {params.windowType} windowing suppresses range sidelobes to {params.windowType === 'Blackman' ? '-58 dB' : '-43 dB'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
