import React, { useState } from 'react';
import {
  WaveformData,
  TransmitterParameters,
  PhysicalAcoustics,
  SystemStatus,
} from '../types';
import { playSonarPing } from '../utils/audioSynth';
import {
  Activity,
  Cpu,
  Zap,
  Radio,
  Volume2,
  Gauge,
} from 'lucide-react';

interface LiveTransmitterViewProps {
  data: WaveformData;
  params: TransmitterParameters;
  acoustics: PhysicalAcoustics;
  status: SystemStatus;
  onManualBurst: () => void;
}

export const LiveTransmitterView: React.FC<LiveTransmitterViewProps> = ({
  data,
  params,
  acoustics,
  onManualBurst,
}) => {
  const handlePing = () => {
    playSonarPing(params.modulationType, params.centerFrequency, params.bandwidth, 300, 0.35);
    onManualBurst();
  };

  return (
    <div id="live-transmitter-deep-dive" className="space-y-4 max-w-[1920px] mx-auto text-white">
      {/* Top Header Card */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-[#38BDF8] shadow-[0_0_15px_rgba(56,189,248,0.25)]">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] text-white flex items-center gap-2">
              STM32 Software-Defined Sonar Transmitter Core
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 border border-white/15 text-[#38BDF8]">
                DMA CIRCULAR TX
              </span>
            </h2>
            <p className="text-xs font-mono text-[#CBD5E1]">
              Direct Memory Access (DMA1 Stream 5) driving Dual 12-bit DAC with Timber/Windowing Co-Processor
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-live-transmit-ping"
            onClick={handlePing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs shadow-[0_0_15px_rgba(56,189,248,0.35)] transition-all hover:scale-105 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-slate-950" />
            <span>TRANSMIT PING BURST</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: High-Resolution Multi-Domain Oscilloscope & Math Trajectory */}
        <div className="lg:col-span-2 space-y-4">
          {/* High-Resolution Oscilloscope Card */}
          <div className="glass-panel p-4 border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#38BDF8]" />
                <span className="text-sm font-bold font-mono text-white">
                  DAC Output Voltage Profile s(t) & Instantaneous Phase
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#CBD5E1]">
                <span className="text-[#38BDF8]">64-Word Circular Buffer</span>
                <span className="text-white/20">|</span>
                <span className="text-[#FBBF24]">12-Bit Resolution (0-4095)</span>
              </div>
            </div>

            {/* Custom High-Res Canvas */}
            <div className="mt-3 glass-panel-nested rounded-lg p-3 border border-white/10">
              <div className="flex justify-between text-[11px] font-mono text-[#CBD5E1] pb-2 border-b border-white/10">
                <span>+3.30V (Vref+)</span>
                <span className="text-[#38BDF8] font-semibold">{params.modulationType} Modulated Waveform</span>
                <span>0.00V (GND)</span>
              </div>

              {/* Sample Visualizer Grid */}
              <div className="h-44 flex items-end justify-between gap-1 pt-2">
                {data.timeSamples.map((sample, idx) => {
                  const normalizedAmp = (sample + 1) / 2; // 0.0 to 1.0
                  const heightPct = Math.max(4, Math.round(normalizedAmp * 100));
                  const dacValue = Math.round(normalizedAmp * 4095);

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-xs transition-all duration-75 ${
                          idx % 2 === 0
                            ? 'bg-gradient-to-t from-cyan-900/60 via-[#38BDF8] to-white'
                            : 'bg-gradient-to-t from-slate-900/60 via-sky-400 to-amber-200'
                        }`}
                      />
                      {/* Hover Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 border border-white/20 text-[10px] font-mono px-2 py-0.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap shadow-lg backdrop-blur-md">
                        Word[{idx}]: {dacValue} ({(normalizedAmp * 3.3).toFixed(2)}V)
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[10px] font-mono text-[#CBD5E1] pt-2 border-t border-white/10">
                <span>t = 0.0 μs (Sample #0)</span>
                <span>Sample Rate: {params.dacSampleRate} kSPS</span>
                <span>t = {params.pulseDuration} ms (Sample #63)</span>
              </div>
            </div>
          </div>

          {/* Mathematical Signal Model Equation Box */}
          <div className="glass-panel p-4 border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <h3 className="text-xs font-bold font-mono uppercase text-[#CBD5E1] mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#38BDF8]" /> Analytical Signal Model Equations
            </h3>
            <div className="glass-panel-nested p-3 rounded-lg border border-white/10 font-mono text-xs space-y-2 text-white">
              {params.modulationType === 'LFM Chirp' ? (
                <div>
                  <div className="text-[#38BDF8] font-bold">
                    s(t) = A(t) · w(t) · cos(2π · [f₀ · t + (B / 2τ) · t²] + φ₀)
                  </div>
                  <p className="text-[11px] text-[#CBD5E1] mt-1">
                    Instantaneous frequency sweeps linearly from{' '}
                    <strong className="text-white">
                      {(params.centerFrequency - params.bandwidth / 2).toFixed(1)} kHz
                    </strong>{' '}
                    to{' '}
                    <strong className="text-white">
                      {(params.centerFrequency + params.bandwidth / 2).toFixed(1)} kHz
                    </strong>{' '}
                    with chirp rate k = {params.chirpRate} kHz/ms.
                  </p>
                </div>
              ) : params.modulationType === 'Barker-13' ? (
                <div>
                  <div className="text-[#FBBF24] font-bold">
                    s(t) = A(t) · w(t) · c_n · cos(2π · f_c · t) , where c_n ∈ &#123;+1, +1, +1, +1, +1, -1, -1, +1, +1, -1, +1, -1, +1&#125;
                  </div>
                  <p className="text-[11px] text-[#CBD5E1] mt-1">
                    13-Chip binary phase shift keying (BPSK) providing 11.1 dB compression gain and minimal range sidelobes.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-white font-bold">
                    s(t) = A(t) · w(t) · cos(2π · f_c · t + φ₀)
                  </div>
                  <p className="text-[11px] text-[#CBD5E1] mt-1">
                    Narrowband tonal transmission at carrier frequency fc = {params.centerFrequency} kHz.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: STM32 Hardware Registers & Power Amp Telemetry */}
        <div className="space-y-4">
          {/* Hardware Register Status Card */}
          <div className="glass-panel p-4 border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <h3 className="text-xs font-bold font-mono uppercase text-[#CBD5E1] mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#38BDF8]" /> STM32 Peripherals
              </span>
              <span className="text-[10px] text-[#38BDF8]">HARDWARE REGISTER MAP</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="glass-panel-nested p-2 rounded-lg border border-white/10 flex justify-between items-center">
                <span className="text-[#CBD5E1]">DAC1_CR (Control):</span>
                <span className="text-white font-bold">0x00001001 (EN + DMA)</span>
              </div>

              <div className="glass-panel-nested p-2 rounded-lg border border-white/10 flex justify-between items-center">
                <span className="text-[#CBD5E1]">TIM6_ARR (Trigger):</span>
                <span className="text-[#38BDF8] font-bold">168 Counts (500 kHz)</span>
              </div>

              <div className="glass-panel-nested p-2 rounded-lg border border-white/10 flex justify-between items-center">
                <span className="text-[#CBD5E1]">DMA1_S5NDTR (Words):</span>
                <span className="text-[#FBBF24] font-bold">64 Words Circular</span>
              </div>

              <div className="glass-panel-nested p-2 rounded-lg border border-white/10 flex justify-between items-center">
                <span className="text-[#CBD5E1]">Core Junction Temp:</span>
                <span className="text-white font-bold">41.8 °C</span>
              </div>

              <div className="glass-panel-nested p-2 rounded-lg border border-white/10 flex justify-between items-center">
                <span className="text-[#CBD5E1]">Power Amp Rail (Vpa):</span>
                <span className="text-[#38BDF8] font-bold">48.0 V DC</span>
              </div>
            </div>
          </div>

          {/* Transmitter Pulse Budget Card */}
          <div className="glass-panel p-4 border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <h3 className="text-xs font-bold font-mono uppercase text-[#CBD5E1] mb-3 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-[#38BDF8]" /> Acoustic Pulse Energy Budget
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-[#CBD5E1] mb-1">
                  <span>Pulse Energy (E_tx):</span>
                  <span className="text-white font-bold">
                    {((acoustics.sourcePower * params.pulseDuration) / 1000).toFixed(2)} Joules
                  </span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-cyan-400 h-full rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                    style={{ width: `${Math.min(100, params.pulseDuration * 2)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#CBD5E1] mb-1">
                  <span>Duty Cycle (PRI 100ms):</span>
                  <span className="text-[#FBBF24] font-bold">
                    {((params.pulseDuration / params.pulseRepetitionInterval) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-[#FBBF24] h-full rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                    style={{
                      width: `${((params.pulseDuration / params.pulseRepetitionInterval) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="glass-panel-nested p-2.5 rounded-lg border border-white/10 text-[11px] text-[#CBD5E1] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#CBD5E1]">Transducer Bandwidth:</span>
                  <span className="text-white font-semibold">20 kHz - 160 kHz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#CBD5E1]">Peak Sound Pressure (SL):</span>
                  <span className="text-white font-semibold">{acoustics.sourceLevel} dB re 1μPa @ 1m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
