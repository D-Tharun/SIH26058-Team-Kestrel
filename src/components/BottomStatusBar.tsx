import React from 'react';
import {
  Activity,
  Zap,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Compass,
  Cpu,
  Radio,
  Waves,
} from 'lucide-react';
import {
  PhysicalAcoustics,
  TransmitterParameters,
  SystemStatus,
  EnvironmentalInputs,
} from '../types';
import { AnimeCounter } from './animations/AnimeCounter';

interface BottomStatusBarProps {
  acoustics: PhysicalAcoustics;
  params: TransmitterParameters;
  status: SystemStatus;
  env: EnvironmentalInputs;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  acoustics,
  params,
  status,
}) => {
  const isSelfMonConnected = status.selfMonitorStatus === 'connected';

  return (
    <div className="pb-3 px-2 sm:px-4 lg:px-6 max-w-[1920px] w-full mx-auto shrink-0 z-30 pointer-events-auto">
      <footer
        id="aquachirp-bottom-status-bar"
        className="bg-[#F9F7F7] border border-[#DBE2EF] rounded-2xl px-3 sm:px-4 py-2 text-xs font-mono text-[#112D4E] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)] w-full max-w-full overflow-hidden"
      >
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-2.5">
          {/* Left: Real-time Ocean Physics Telemetry Blocks */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center md:justify-start">
            {/* Sound Speed (c) */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#DBE2EF] shadow-2xs text-[11px]">
              <Compass className="w-3 h-3 text-[#3F72AF] shrink-0" />
              <span className="text-[#3F72AF]">c:</span>
              <span className="text-[#112D4E] font-bold">
                <AnimeCounter value={acoustics.soundSpeed} decimals={1} suffix=" m/s" />
              </span>
            </div>

            {/* Francois-Garrison Absorption (α) */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#DBE2EF] shadow-2xs text-[11px]">
              <Activity className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="text-[#3F72AF]">α:</span>
              <span className="text-amber-700 font-bold">
                <AnimeCounter value={acoustics.absorptionCoefficient} decimals={2} suffix=" dB/km" />
              </span>
            </div>

            {/* Range Resolution (ΔR) */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#DBE2EF] shadow-2xs text-[11px]">
              <Waves className="w-3 h-3 text-[#3F72AF] shrink-0" />
              <span className="text-[#3F72AF]">ΔR:</span>
              <span className="text-[#112D4E] font-bold">
                <AnimeCounter value={params.rangeResolution} decimals={2} suffix=" m" />
              </span>
            </div>

            {/* Pulse Compression Gain (Gp) */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#DBE2EF] shadow-2xs text-[11px]">
              <Zap className="w-3 h-3 text-[#3F72AF] shrink-0" />
              <span className="text-[#3F72AF]">Gain:</span>
              <span className="text-[#112D4E] font-bold">
                +<AnimeCounter value={acoustics.pulseCompressionGain} decimals={1} suffix=" dB" />
              </span>
            </div>

            {/* Estimated Transmission Loss (TL) */}
            <div className="hidden xl:flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#DBE2EF] shadow-2xs text-[11px]">
              <Gauge className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="text-[#3F72AF]">TL:</span>
              <span className="text-amber-700 font-bold">
                <AnimeCounter value={acoustics.transmissionLoss} decimals={1} suffix=" dB" />
              </span>
            </div>
          </div>

          {/* Right: Low-Power Hardware & System Health Status */}
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end text-[11px]">
            {/* DAC DMA Rate */}
            <div className="flex items-center gap-1 text-[#3F72AF] shrink-0">
              <Radio className="w-3 h-3 text-[#3F72AF]" />
              <span>DAC: <strong className="text-[#112D4E]">{params.dacSampleRate} kSPS</strong></span>
            </div>

            <span className="text-[#DBE2EF]">|</span>

            {/* STM32 Low Power Sleep Mode Indicator */}
            <div className="flex items-center gap-1 shrink-0">
              <Cpu className="w-3 h-3 text-[#3F72AF]" />
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  status.isCpuSleeping
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border border-amber-300'
                }`}
              >
                {status.isCpuSleeping ? 'SLEEP_WFI' : 'ACTIVE_RUN'}
              </span>
            </div>

            <span className="text-[#DBE2EF]">|</span>

            {/* Self-Monitoring Closed-Loop Verification */}
            <div className="flex items-center gap-1 shrink-0">
              {isSelfMonConnected ? (
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  <span>Loopback OK</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-600 font-semibold">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  <span>Loopback ERR</span>
                </span>
              )}
            </div>

            <span className="text-[#DBE2EF] hidden sm:inline">|</span>

            {/* Hardware DMA Power Consumption Benchmark */}
            <div className="hidden sm:flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#DBE2EF] text-[10px] shadow-2xs shrink-0">
              <span className="text-[#3F72AF]">PA:</span>
              <span className="text-[#112D4E] font-bold">48V / 18mW</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
