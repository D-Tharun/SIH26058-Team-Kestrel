import React from 'react';
import { TransmitterParameters, DecisionTrace, PhysicalAcoustics } from '../types';
import {
  Radio,
  Sliders,
  TreeDeciduous,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { AnimeCounter } from './animations/AnimeCounter';

interface DecisionParametersCardProps {
  params: TransmitterParameters;
  trace: DecisionTrace;
  acoustics: PhysicalAcoustics;
}

export const DecisionParametersCard: React.FC<DecisionParametersCardProps> = ({
  params,
  trace,
  acoustics,
}) => {
  const prf = Math.round(1000 / (params.pulseRepetitionInterval || 100));

  return (
    <div
      id="aquachirp-decision-parameters-card"
      className="glass-panel p-4 flex flex-col justify-between h-full text-[#112D4E]"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#3F72AF]">
            <Radio className="w-4 h-4 text-[#3F72AF]" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] uppercase tracking-wider text-[#112D4E]">
              Commanded Carrier & Synthesizer State
            </h2>
            <p className="text-[11px] font-mono text-[#3F72AF]">
              Deterministic STM32 TIM3 PWM Registers
            </p>
          </div>
        </div>

        {/* Optimum Badge */}
        <div className="flex items-center gap-1 bg-[#DBE2EF] px-2 py-0.5 rounded-full border border-[#3F72AF]/30 text-[#112D4E] text-[10px] font-mono font-bold">
          <Activity className="w-3 h-3 text-[#3F72AF]" />
          <span>PREDICTED OPTIMUM</span>
        </div>
      </div>

      {/* Main Focus: Center Frequency Big Metric */}
      <div className="my-3 p-3.5 rounded-xl bg-[#F9F7F7] border border-[#DBE2EF] flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-[#3F72AF] uppercase tracking-wide font-semibold">Commanded Carrier (fc)</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] border border-[#3F72AF]/30">
            argmax M(fc)
          </span>
        </div>

        <div className="flex items-baseline gap-2 my-1">
          <div className="text-3xl font-extrabold font-['Plus_Jakarta_Sans',sans-serif] text-[#112D4E] tracking-tight">
            <AnimeCounter value={params.centerFrequency} decimals={1} />
          </div>
          <span className="text-sm font-mono text-[#3F72AF] font-bold">kHz</span>
        </div>

        <div className="flex items-center justify-between font-mono text-[11px] text-[#112D4E]/80 pt-2 border-t border-[#DBE2EF]">
          <span>
            Wavelength λ:{' '}
            <strong className="text-[#112D4E]">
              <AnimeCounter
                value={(acoustics.soundSpeed / (params.centerFrequency * 1000)) * 1000}
                decimals={1}
                suffix=" mm"
              />
            </strong>
          </span>
          <span>
            Bandwidth (B_used):{' '}
            <strong className="text-[#3F72AF]">
              <AnimeCounter value={params.bandwidth} decimals={2} suffix=" kHz" />
            </strong>
          </span>
        </div>

        {/* Resolution & Bandwidth Status Strip */}
        <div className="flex items-center justify-between font-mono text-[10px] pt-1.5 mt-1 border-t border-dashed border-[#DBE2EF]">
          <span>
            Req: <strong className="text-[#112D4E]">{(params.requestedResolutionM ?? params.rangeResolution).toFixed(3)}m</strong>
            {' → '}
            Ach: <strong className="text-emerald-800">{(params.achievableResolutionM ?? params.rangeResolution).toFixed(3)}m</strong>
          </span>
          <span className={`px-1.5 py-0.2 rounded font-bold border ${
            params.bandwidthLimited
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
          }`}>
            {params.bandwidthStatus ?? (params.bandwidthLimited ? 'BW Limited' : 'Within Limit')}
          </span>
        </div>
      </div>

      {/* 2-Column Grid for Key Synthesizer Registers */}
      <div className="space-y-2 font-mono text-xs flex-1">
        <div className="flex items-center gap-1.5 text-[#3F72AF] text-[10px] uppercase tracking-wider font-semibold">
          <Sliders className="w-3.5 h-3.5 text-[#3F72AF]" />
          <span>Synthesizer State Registers</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Modulation Scheme */}
          <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF] hover:border-[#3F72AF] transition-colors">
            <div className="text-[10px] text-[#3F72AF]">Modulation Scheme</div>
            <div className="font-bold text-amber-600 truncate mt-0.5">
              {params.modulationType}
            </div>
            <div className="text-[9px] text-[#112D4E]/60">
              {params.modulationType === 'CW' ? 'Doppler-Optimized' : 'Resolution-Optimized'}
            </div>
          </div>

          {/* Window Function */}
          <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF] hover:border-[#3F72AF] transition-colors">
            <div className="text-[10px] text-[#3F72AF]">Spectral Window</div>
            <div className="font-bold text-[#112D4E] truncate mt-0.5">
              {params.windowType}
            </div>
            <div className="text-[9px] text-[#112D4E]/60">
              {params.windowType === 'Blackman' ? '-58 dB Sidelobes' : '-43 dB Sidelobes'}
            </div>
          </div>

          {/* Pulse Duration */}
          <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF] hover:border-[#3F72AF] transition-colors">
            <div className="text-[10px] text-[#3F72AF]">Pulse Duration (τ)</div>
            <div className="font-bold text-[#112D4E] mt-0.5">
              <AnimeCounter value={params.pulseDuration} decimals={1} suffix=" ms" />
            </div>
            <div className="text-[9px] text-[#112D4E]/60">
              Spatial: <AnimeCounter value={(acoustics.soundSpeed * params.pulseDuration) / 1000} decimals={1} suffix=" m" />
            </div>
          </div>

          {/* PRF */}
          <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF] hover:border-[#3F72AF] transition-colors">
            <div className="text-[10px] text-[#3F72AF]">Ping Repetition (PRF)</div>
            <div className="font-bold text-emerald-700 mt-0.5">
              <AnimeCounter value={prf} suffix=" Hz" />
            </div>
            <div className="text-[9px] text-[#112D4E]/60">
              Max Range: <AnimeCounter value={Math.round(acoustics.soundSpeed / (2 * prf))} suffix=" m" />
            </div>
          </div>

          {/* PWM Amplitude */}
          <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF] hover:border-[#3F72AF] transition-colors">
            <div className="text-[10px] text-[#3F72AF]">PWM Duty Level</div>
            <div className="font-bold text-[#112D4E] mt-0.5">
              <AnimeCounter value={params.amplitude} suffix="%" />
            </div>
            <div className="text-[9px] text-[#112D4E]/60">
              {(params.amplitude * 0.033).toFixed(2)} V Peak (PA6 PWM Out)
            </div>
          </div>

          {/* Time-Bandwidth Product */}
          <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF] hover:border-[#3F72AF] transition-colors">
            <div className="text-[10px] text-[#3F72AF]">Time-Bandwidth (BT)</div>
            <div className="font-bold text-[#112D4E] mt-0.5">
              <AnimeCounter value={(params.bandwidth * params.pulseDuration)} decimals={1} />
            </div>
            <div className="text-[9px] text-[#112D4E]/60">
              Gain: +<AnimeCounter value={acoustics.pulseCompressionGain} decimals={1} suffix=" dB" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Decision Tree Rationale Box */}
      <div className="pt-2.5 flex flex-col gap-1 text-[11px] font-mono">
        <div className="flex items-center justify-between text-[#3F72AF]">
          <span className="flex items-center gap-1">
            <TreeDeciduous className="w-3.5 h-3.5 text-emerald-700" />
            <span>Decision Rationale</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Optimum Reached</span>
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF] text-[#112D4E] leading-snug">
          {trace.summaryText}
        </div>
      </div>
    </div>
  );
};
