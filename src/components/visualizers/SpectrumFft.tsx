import React from 'react';
import { WaveformData, TransmitterParameters } from '../../types';
import { BarChart3, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SpectrumFftProps {
  data: WaveformData;
  params: TransmitterParameters;
}

export const SpectrumFft: React.FC<SpectrumFftProps> = ({ data, params }) => {
  const { fftBins, fftFrequencies, peakFrequencyKhz, commandedFrequencyKhz, peakMatchDeltaKhz, isPeakMatched } = data;

  return (
    <div
      id="spectrum-fft-card"
      className="glass-panel p-3 flex flex-col h-full text-[#112D4E]"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#3F72AF]" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#112D4E] font-['Plus_Jakarta_Sans',sans-serif]">
            Spectrum / FFT
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#112D4E] font-bold">
            32 FREQ BINS
          </span>
        </div>

        {/* Peak Match Indicator */}
        <div
          id="peak-match-indicator-badge"
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${isPeakMatched
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-amber-50 border-amber-300 text-amber-700'
            }`}
        >
          {isPeakMatched ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-amber-600" />
          )}
          <span>
            {isPeakMatched ? 'PEAK LOCKED' : 'FREQ OFFSET'}: Δf {peakMatchDeltaKhz.toFixed(1)} kHz
          </span>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="relative flex-1 min-h-[140px] w-full rounded-xl overflow-hidden border border-white/30 bg-[#07172C]/75 backdrop-blur-xl p-2 flex flex-col justify-between shadow-inner">
        {/* Top Frequency Readout Bar */}
        <div className="flex items-center justify-between text-[11px] font-mono pb-1 border-b border-white/10">
          <div className="flex items-center gap-1 text-[#DBE2EF]">
            <span>Commanded fc:</span>
            <span className="text-[#38BDF8] font-bold">{commandedFrequencyKhz.toFixed(1)} kHz</span>
          </div>
          <div className="flex items-center gap-1 text-[#DBE2EF]">
            <span>Measured Peak:</span>
            <span className="text-[#FBBF24] font-bold">{peakFrequencyKhz.toFixed(1)} kHz</span>
          </div>
        </div>

        {/* 32 Equalizer Bars */}
        <div className="flex items-end justify-between gap-[2px] h-[95px] pt-2 px-1">
          {fftBins.map((binVal, idx) => {
            const freq = fftFrequencies[idx] || 0;
            const isPeak = Math.abs(freq - peakFrequencyKhz) < 2.5;
            const isNearCommand = Math.abs(freq - commandedFrequencyKhz) < (params.bandwidth / 2);

            let barBg = 'bg-[#DBE2EF]/30';
            let barGlow = '';

            if (isPeak) {
              barBg = 'bg-gradient-to-t from-[#3F72AF] via-sky-300 to-white';
              barGlow = 'shadow-[0_0_10px_rgba(56,189,248,0.9)] ring-1 ring-cyan-300';
            } else if (isNearCommand) {
              barBg = 'bg-gradient-to-t from-[#3F72AF] to-sky-400';
            } else if (binVal > 0.3) {
              barBg = 'bg-[#DBE2EF]/60';
            }

            const heightPct = Math.max(6, Math.round(binVal * 100));

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Bar */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-xs transition-all duration-75 ${barBg} ${barGlow}`}
                />

                {/* Peak Indicator Marker Flag */}
                {isPeak && (
                  <div className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                )}

                {/* Hover Tooltip */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#112D4E] border border-[#3F72AF]/40 text-[9px] font-mono px-1.5 py-0.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-md">
                  {freq} kHz ({Math.round(binVal * 100)}%)
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis Frequency Scale Labels */}
        <div className="flex justify-between text-[9px] font-mono text-[#DBE2EF]/70 pt-1 border-t border-white/10">
          <span>10 kHz</span>
          <span>40 kHz</span>
          <span>75 kHz</span>
          <span>110 kHz</span>
          <span>140 kHz</span>
        </div>
      </div>
    </div>
  );
};
