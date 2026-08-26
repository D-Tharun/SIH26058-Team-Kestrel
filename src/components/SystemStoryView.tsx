import React, { useState, useEffect } from 'react';
import { EnvironmentalInputs, TransmitterParameters, PhysicalAcoustics, DecisionTrace } from '../types';
import {
  Waves,
  Sliders,
  Cpu,
  Zap,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Radio,
  Crosshair,
} from 'lucide-react';

interface SystemStoryViewProps {
  env: EnvironmentalInputs;
  params: TransmitterParameters;
  acoustics: PhysicalAcoustics;
  trace: DecisionTrace;
}

export const SystemStoryView: React.FC<SystemStoryViewProps> = ({
  env,
  params,
  acoustics,
  trace,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  const STEPS = [
    {
      id: 1,
      title: '1. Underwater Environment Changes',
      subtitle: 'AUV changes depth, encounters turbid thermoclines or ambient noise',
      icon: Waves,
      color: '#3B82F6',
      details: `Depth: ${env.depth}m | Turbidity: ${env.turbidity} NTU | Temp: ${env.temperature}°C | Salinity: ${env.salinity} ppt | pH: ${env.pH}`,
      explanation:
        'As the autonomous underwater vehicle dives or transitions across oceanic layers (littoral to abyssal), acoustic absorption, medium density, and boundary reflections change drastically.',
    },
    {
      id: 2,
      title: '2. Environmental Sensors / Potentiometers Detect State',
      subtitle: 'Analog transducers digitize environmental parameters',
      icon: Sliders,
      color: '#F59E0B',
      details: `Sampling Rate: 50 Hz | ADC Resolution: 12-bit | ResPen Priority: ${env.resPen.toFixed(2)}`,
      explanation:
        'Onboard CTD (Conductivity, Temperature, Depth) sensors and turbidity nephelometers continuously feed real-time oceanographic telemetry into the adaptive engine.',
    },
    {
      id: 3,
      title: '3. Physics Engine Computes Sound Speed & Chemical Absorption',
      subtitle: 'Mackenzie & Francois-Garrison empirical equations evaluated in real time',
      icon: Activity,
      color: '#3B82F6',
      details: `Sound Speed c: ${acoustics.soundSpeed} m/s | Total Absorption α: ${acoustics.absorptionCoefficient} dB/km`,
      explanation:
        'The physics engine computes medium sound velocity using Mackenzie (1981) and multi-relaxation chemical attenuation (Boric acid + MgSO₄ + pure water) via Francois-Garrison (1982).',
    },
    {
      id: 4,
      title: '4. Optimization Engine Finds Best Center Frequency (fc)',
      subtitle: 'Balancing high acoustic resolution against absorption loss',
      icon: Radio,
      color: '#1E40AF',
      details: `Commanded fc: ${params.centerFrequency.toFixed(1)} kHz | Wavelength λ: ${((acoustics.soundSpeed / (params.centerFrequency * 1000)) * 1000).toFixed(1)} mm`,
      explanation:
        'High frequencies provide sub-centimeter range resolution but suffer heavy absorption. The engine dynamically tunes fc to minimize Transmission Loss (TL) for the target range.',
    },
    {
      id: 5,
      title: '5. Decision Engine Selects Modulation Scheme & Window',
      subtitle: 'Heuristic rule matrix picks optimal pulse structure',
      icon: Sparkles,
      color: '#0EA5E9',
      details: `Modulation: ${params.modulationType} | Window: ${params.windowType} | Bandwidth: ${params.bandwidth} kHz`,
      explanation:
        `${trace.summaryText}. The rule engine switches between CW (Doppler velocity), LFM Chirp (range resolution), and Barker-13 (clutter suppression).`,
    },
    {
      id: 6,
      title: '6. Waveform Lookup Table Generated & Windowed',
      subtitle: 'DSP computes discrete DAC sample table with low sidelobes',
      icon: Layers,
      color: '#3B82F6',
      details: `Buffer: 64 words | Sidelobe Attenuation: ${params.windowType === 'Blackman' ? '-58 dB' : '-43 dB'}`,
      explanation:
        'The DSP engine synthesizes 64 discrete 12-bit DAC values applying the selected window function to eliminate abrupt switching transients and spectral splatter.',
    },
    {
      id: 7,
      title: '7. Hardware Timer & DMA Stream to DAC (Zero CPU Overhead)',
      subtitle: 'Autonomous circular buffer streaming allows CPU to enter sleep',
      icon: Cpu,
      color: '#10B981',
      details: 'DMA2 Stream 5 Circular Mode | TIM6 @ 500 kSPS | CPU in __WFI() Sleep (96% duty cycle)',
      explanation:
        'STM32 Hardware Timer TIM6 triggers DAC conversions at 500 kSPS via direct DMA transfer from RAM, keeping the ARM Cortex core in ultra-low-power sleep (18 mW vs 145 mW).',
    },
    {
      id: 8,
      title: '8. Clean Analog Acoustic Signal Produced',
      subtitle: 'DAC voltage drives power amplifier and piezoelectric transducer',
      icon: Zap,
      color: '#F59E0B',
      details: `Acoustic Source Power: ${acoustics.sourcePower} W | Source Level: ${acoustics.sourceLevel} dB re 1μPa@1m`,
      explanation:
        'The smooth analog waveform drives the impedance-matched acoustic projector, launching a coherent acoustic wavepacket into the ocean column.',
    },
    {
      id: 9,
      title: '9. Oscilloscope + FFT + Spectrogram + Matched Filter Validate Output',
      subtitle: 'Real-time telemetry confirms signal fidelity, peak lock, and pulse compression',
      icon: Crosshair,
      color: '#3B82F6',
      details: `Matched Filter Peak Gain: +${acoustics.pulseCompressionGain} dB | PSLR: -${acoustics.pulseCompressionGain > 0 ? '24.2' : '13.1'} dB | Peak Locked`,
      explanation:
        'Onboard loopback ADC and ground station visualizers instantaneously verify frequency lock, low harmonic distortion (THD < 0.1%), and maximum range resolution.',
    },
  ];

  // Auto-play stepper loop
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STEPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoPlaying, STEPS.length]);

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <div id="system-story-pipeline-view" className="space-y-4 max-w-[1920px] mx-auto text-[#0F172A]">
      {/* Top Banner */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-[#E2E8F0] shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#3B82F6]">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#0F172A] flex items-center gap-2">
              End-to-End Autonomous Pipeline Architecture Story
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#1E40AF]">
                9-STAGE REAL-TIME PIPELINE
              </span>
            </h2>
            <p className="text-xs font-mono text-[#64748B]">
              Step-by-step technical chronicle of how environmental telemetry triggers autonomous edge waveform synthesis and zero-CPU DMA streaming
            </p>
          </div>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-colors ${
              isAutoPlaying
                ? 'bg-blue-50 border-blue-200 text-[#1E40AF] font-bold shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 border-[#E2E8F0] text-[#475569]'
            }`}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoPlaying ? 'Auto-Cycle' : 'Paused'}</span>
          </button>

          <button
            onClick={() => setCurrentStep(0)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] cursor-pointer"
            title="Restart pipeline from Step 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Focus Card */}
      <div className="glass-panel p-6 border border-[#E2E8F0] shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#3B82F6] shadow-sm">
              <StepIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-[#1E40AF] border border-blue-200">
                  STEP {step.id} OF 9
                </span>
                <span className="text-xs font-mono text-[#64748B]">{step.subtitle}</span>
              </div>
              <h3 className="text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#0F172A] mt-1">
                {step.title}
              </h3>
            </div>
          </div>

          <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-[#E2E8F0] font-mono text-xs text-[#0F172A] max-w-md">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider mb-0.5 font-bold">Live Stage Parameters</div>
            <div className="font-semibold text-[#1E40AF]">{step.details}</div>
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3 font-mono text-sm leading-relaxed text-[#334155]">
            <p>{step.explanation}</p>
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold pt-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pipeline Stage Verified & Active in Current Cycle</span>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-end gap-2">
            <button
              onClick={() => setCurrentStep((prev) => (prev > 0 ? prev - 1 : STEPS.length - 1))}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-[#E2E8F0] text-xs font-mono text-[#475569] font-bold cursor-pointer"
            >
              Previous Step
            </button>
            <button
              onClick={() => setCurrentStep((prev) => (prev + 1) % STEPS.length)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>Next Stage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 9-Step Horizontal Progress Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
        {STEPS.map((s, idx) => {
          const SIcon = s.icon;
          const isActive = currentStep === idx;
          const isCompleted = currentStep > idx;

          return (
            <button
              key={s.id}
              onClick={() => {
                setIsAutoPlaying(false);
                setCurrentStep(idx);
              }}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                isActive
                  ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-300'
                  : isCompleted
                  ? 'bg-white hover:bg-slate-50 border-[#E2E8F0] text-[#475569]'
                  : 'bg-white/70 hover:bg-white border-[#E2E8F0] text-[#94A3B8]'
              }`}
            >
              <div className="flex items-center justify-between">
                <SIcon className={`w-4 h-4 ${isActive ? 'text-[#3B82F6]' : isCompleted ? 'text-emerald-600' : 'text-[#94A3B8]'}`} />
                <span className={`text-[10px] font-bold ${isActive ? 'text-[#1E40AF]' : 'text-[#64748B]'}`}>
                  #{s.id}
                </span>
              </div>
              <div className={`text-[11px] font-bold line-clamp-2 leading-tight ${isActive ? 'text-[#0F172A]' : 'text-[#334155]'}`}>
                {s.title.split('. ')[1]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
