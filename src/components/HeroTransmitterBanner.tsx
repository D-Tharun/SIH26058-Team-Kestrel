import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Sparkles,
  Volume2,
  ArrowRight,
  Activity,
} from 'lucide-react';
import {
  EnvironmentalInputs,
  TransmitterParameters,
  PhysicalAcoustics,
  DecisionTrace,
  SystemStatus,
  TabType,
} from '../types';
import { playSonarPing } from '../utils/audioSynth';
import { HeroWaveformVisualizer } from './HeroWaveformVisualizer';

interface HeroTransmitterBannerProps {
  env: EnvironmentalInputs;
  params: TransmitterParameters;
  acoustics: PhysicalAcoustics;
  trace: DecisionTrace;
  status: SystemStatus;
  setActiveTab: (tab: TabType) => void;
  onManualPing: () => void;
  onResetToDefaults: () => void;
}

export const HeroTransmitterBanner: React.FC<HeroTransmitterBannerProps> = ({
  params,
  acoustics,
  setActiveTab,
  onManualPing,
}) => {
  const [isAudioMuted] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handlePingBurst = () => {
    if (isAudioMuted) return;
    setIsPinging(true);
    playSonarPing(params.modulationType, params.centerFrequency, params.bandwidth, 320, 0.35);
    onManualPing();
    setTimeout(() => setIsPinging(false), 350);
  };

  const handleTriggerOptimization = () => {
    setIsOptimizing(true);
    onManualPing();

    setTimeout(() => {
      setIsOptimizing(false);
    }, 700);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      id="hero-transmitter-banner"
      className="w-full mb-6"
    >
      <div className="glass-panel p-6 md:p-8 lg:p-10 relative z-10 text-[#112D4E]">
        {/* Top Eyebrow Badge Pill */}
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 border border-white/60 text-xs font-mono text-[#112D4E] shadow-2xs backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#3F72AF] animate-pulse shadow-sm" />
            <span className="font-bold text-[#112D4E]">Acoustic Edge Intelligence</span>
            <span className="text-[#3F72AF]">•</span>
            <span className="text-[#112D4E]/80">Autonomous Sonar Waveform Optimization</span>
          </div>
        </div>

        {/* Main Grid: Content + Visualizer Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Title, Description & Action Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold font-['Plus_Jakarta_Sans',sans-serif] tracking-tight text-[#112D4E] leading-[1.15]">
              Autonomous Waveform Optimization for Adaptive Sonar Transmitters
            </h1>

            <p className="text-sm sm:text-base text-[#112D4E]/80 leading-relaxed font-normal max-w-2xl">
              Maximize underwater acoustic detection range and target penetration by dynamically
              synthesizing center frequency, chirp bandwidth, and windowing envelopes at the edge.
              Eliminates thermocline dispersion, mitigates reverberation, and adapts in under{' '}
              <strong className="text-[#112D4E] font-bold font-mono bg-white/60 px-1.5 py-0.5 rounded border border-white/70 shadow-2xs">
                8 milliseconds
              </strong>.
            </p>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              {/* Primary Action Button */}
              <button
                id="hero-launch-dsp-lab-btn"
                onClick={() => setActiveTab('signal_analysis')}
                className="group flex items-center gap-2.5 px-5 py-3 rounded-xl bg-[#3F72AF] hover:bg-[#112D4E] text-white font-bold font-['Plus_Jakarta_Sans',sans-serif] text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Zap className="w-4 h-4 text-white fill-current" />
                <span>Launch Live DSP Lab</span>
                <ArrowRight className="w-4 h-4 text-white transition-transform group-hover:translate-x-1" />
              </button>

              {/* Secondary Action: Trigger AI Optimization */}
              <button
                id="hero-optimize-btn"
                onClick={handleTriggerOptimization}
                disabled={isOptimizing}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/50 hover:bg-white/70 border border-white/60 text-[#112D4E] font-bold font-mono text-xs transition-all cursor-pointer shadow-2xs backdrop-blur-md"
              >
                <Sparkles className={`w-4 h-4 text-[#3F72AF] ${isOptimizing ? 'animate-spin' : ''}`} />
                <span>{isOptimizing ? 'Synthesizing...' : 'Trigger Adaptive Optimization'}</span>
              </button>

              {/* Audible Sonar Ping Test */}
              <button
                id="hero-ping-sound-btn"
                onClick={handlePingBurst}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-mono text-xs transition-all cursor-pointer backdrop-blur-md shadow-2xs ${
                  isPinging
                    ? 'bg-[#3F72AF]/20 text-[#112D4E] border-[#3F72AF] font-bold scale-95 shadow-sm'
                    : 'bg-white/50 hover:bg-white/70 border-white/60 text-[#112D4E]'
                }`}
              >
                <Volume2 className={`w-4 h-4 ${isPinging ? 'text-[#112D4E]' : 'text-[#3F72AF]'}`} />
                <span>{isPinging ? 'Transmitting Burst...' : 'Transmit Ping Burst'}</span>
              </button>
            </div>

            {/* Bottom Structured Metric Checklist */}
            <div className="pt-4 border-t border-white/50 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs font-mono text-[#112D4E]/80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3F72AF] shadow-2xs" />
                <span className="text-[#112D4E] font-medium">Autonomous DMA Streaming</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3F72AF] shadow-2xs" />
                <span className="text-[#112D4E] font-medium">+{acoustics.pulseCompressionGain} dB Pulse Compression</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shadow-2xs" />
                <span className="text-[#112D4E] font-medium">&lt;12 ps Hardware Jitter</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#112D4E] shadow-2xs" />
                <span className="text-[#112D4E] font-medium">Mackenzie & Francois-Garrison Rigor</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Oscilloscope Stage (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="relative w-full h-[260px] sm:h-[280px] bg-[#0B192C] rounded-2xl border border-[#3F72AF]/30 overflow-hidden shadow-2xl flex flex-col justify-between p-3">
              {/* Top Tag Badge */}
              <div className="flex items-center justify-between z-10 pointer-events-none">
                <span className="text-[11px] font-mono text-[#DBE2EF] flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                  <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>{params.modulationType} Modulated Waveform</span>
                </span>

                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-[#3F72AF]/30 text-[#DBE2EF] border border-[#3F72AF]/50">
                  {params.dacSampleRate} kSPS DAC DMA
                </span>
              </div>

              {/* Dynamic Ultra-Smooth Traveling Wave Visualizer */}
              <HeroWaveformVisualizer
                params={params}
                acoustics={acoustics}
                onPing={handlePingBurst}
              />

              {/* Bottom Live Metrics Over Stage */}
              <div className="flex items-center justify-between z-10 text-[11px] font-mono text-[#DBE2EF] bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 pointer-events-none">
                <div>
                  <span className="text-[#DBE2EF]/70">Carrier (fc): </span>
                  <span className="text-[#38BDF8] font-bold">{params.centerFrequency.toFixed(1)} kHz</span>
                </div>
                <div className="text-white/15">|</div>
                <div>
                  <span className="text-[#DBE2EF]/70">Bandwidth: </span>
                  <span className="text-[#FBBF24] font-bold">{params.bandwidth.toFixed(1)} kHz</span>
                </div>
                <div className="text-white/15">|</div>
                <div>
                  <span className="text-[#DBE2EF]/70">Sound Speed: </span>
                  <span className="text-emerald-400 font-bold">{acoustics.soundSpeed} m/s</span>
                </div>
              </div>
            </div>

            {/* Quick Helper Subtext */}
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] font-mono text-[#3F72AF]">
              <span>● Interactive canvas: click to pulse</span>
              <span>12-Bit Dual DAC DMA Stream</span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};
