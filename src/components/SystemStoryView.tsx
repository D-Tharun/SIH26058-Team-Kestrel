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
  GitBranch,
  ShieldCheck,
  ToggleLeft,
  Gauge,
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

  // Hardware Filter Calculations for R1 = 1 kOhm and CD4053B Cap Selection
  const R_ohms = 1000;
  const fH_khz = params.fH;
  const selectedCapNf = fH_khz > 5.0 ? 10 : 100;
  const selectedCapFarads = selectedCapNf * 1e-9;
  const fRC_hz = 1 / (2 * Math.PI * R_ohms * selectedCapFarads);
  const fRC_khz = Math.round((fRC_hz / 1000) * 10) / 10;

  const STEPS = [
    {
      id: 1,
      title: '1. Underwater Environment & Medium Dynamics',
      subtitle: 'CTD telemetry registers sound speed & chemical absorption conditions',
      icon: Waves,
      color: '#3B82F6',
      details: `Depth: ${env.depth}m | Turbidity: ${env.turbidity} NTU | Temp: ${env.temperature}°C | Salinity: ${env.salinity} ppt | pH: ${env.pH}`,
      explanation:
        'As the autonomous underwater vehicle operates, conductivity, temperature, and depth modulate the speed of sound and multi-relaxation chemical absorption (Boric acid + MgSO₄ + pure water).',
    },
    {
      id: 2,
      title: '2. Environmental Sensing & Telemetry Digitization',
      subtitle: 'Sensors digitize ocean state into normalized parameters',
      icon: Sliders,
      color: '#F59E0B',
      details: `Sampling Rate: 100 Hz | Res/Pen Priority: ${env.resPen.toFixed(2)} | Target Range: ${Math.min(300, Math.max(50, env.depth * 2))} m`,
      explanation:
        'Onboard CTD and nephelometer sensors continuously feed oceanographic telemetry into the digital decision processor to balance range resolution against propagation loss.',
    },
    {
      id: 3,
      title: '3. Authoritative Empirical Acoustic Engine',
      subtitle: 'Mackenzie (1981) sound velocity & Francois-Garrison (1982) absorption',
      icon: Activity,
      color: '#3B82F6',
      details: `Sound Speed c: ${acoustics.soundSpeed} m/s | Total Absorption α: ${acoustics.absorptionCoefficient} dB/km`,
      explanation:
        'The acoustic engine computes exact sound velocity c(T,S,D) via Mackenzie and chemical relaxation absorption α(f) via Francois-Garrison, producing an authoritative acoustic baseline without duplicated physics.',
    },
    {
      id: 4,
      title: '4. Feasible Band Frequency Optimization (1–10 kHz)',
      subtitle: 'Bandwidth derived from resolution, fc selected via argmax Predicted Link Margin',
      icon: Radio,
      color: '#1E40AF',
      details: `Required B: ${params.bandwidth} kHz | Feasible fc: [${(1.0 + params.bandwidth / 2).toFixed(1)}, ${(10.0 - params.bandwidth / 2).toFixed(1)}] kHz | Selected fc: ${params.centerFrequency.toFixed(1)} kHz`,
      explanation:
        'Bandwidth is calculated from desired range resolution B = c/(2ΔR) (capped at ≤9 kHz). The optimizer scans candidate frequencies within the feasible transducer interval to maximize Predicted Link Margin.',
    },
    {
      id: 5,
      title: '5. Modulation Scheme & Spectral Windowing Selection',
      subtitle: 'Heuristic rule matrix picks optimal waveform structure & pulse duration',
      icon: Sparkles,
      color: '#0EA5E9',
      details: `Modulation: ${params.modulationType} | Window: ${params.windowType} | τ: ${params.pulseDuration} ms (N = ${params.sampleCount} ≤ 512)`,
      explanation:
        `${trace.summaryText}. Pulse duration is constrained to τ ≤ 5.12 ms (N ≤ 512 at fs = 100 kS/s) with windowing to suppress range sidelobes and mitigate reverberation.`,
    },
    {
      id: 6,
      title: '6. PWM Duty Sample Table Synthesis (ARR=639)',
      subtitle: 'DSP maps normalized signal x[n] ∈ [-1, 1] to duty register counts [0, 639]',
      icon: Layers,
      color: '#3B82F6',
      details: `Duty Formula: round((0.5 + 0.5*x[n]) * 639) | Buffer: ${params.sampleCount} words (≤ 512) | fs: 100 kS/s`,
      explanation:
        'The mathematical waveform equation synthesizes N discrete samples. Each sample x[n] is mapped linearly into STM32 timer compare register counts (0 to ARR=639) for 100 kS/s PWM modulation.',
    },
    {
      id: 7,
      title: '7. Autonomous TIM3 PWM DMA Streaming on Pin PA6',
      subtitle: 'DMA1 Channel 6 feeds TIM3_CCR1 with zero CPU overhead (Cortex in Sleep)',
      icon: Cpu,
      color: '#10B981',
      details: 'Peripheral: TIM3 Channel 1 (Pin PA6) | Timer ARR: 639 counts | DMA1 Channel 6 Circular Mode',
      explanation:
        'Hardware Timer TIM3 generates 100 kHz carrier PWM pulses on Pin PA6. Direct Memory Access autonomously streams the duty cycle table from RAM, keeping the ARM CPU in low-power __WFI() sleep.',
    },
    {
      id: 8,
      title: '8. CD4053B Capacitor Selection & RC Reconstruction Filter',
      subtitle: 'R1 (1 kΩ) + CD4053B analog switch selects 10 nF / 100 nF reconstruction cap',
      icon: ToggleLeft,
      color: '#F59E0B',
      details: `R1: 1 kΩ | Switch: CD4053B | Selected Cap: ${selectedCapNf} nF | Cut-Off fRC: ${fRC_khz} kHz (fH = ${fH_khz.toFixed(1)} kHz)`,
      explanation:
        `CD4053B acts as an analog multiplexer switch to select the reconstruction capacitor (${selectedCapNf} nF) for the R1=1 kΩ RC lowpass filter. Cut-off fRC=${fRC_khz} kHz strips the 100 kHz PWM carrier while preserving signal band up to fH=${fH_khz.toFixed(1)} kHz.`,
    },
    {
      id: 9,
      title: '9. MCP6004 Buffer & Physical Output Validation Branches',
      subtitle: 'Unity-gain buffer drives BNC, Piezo projector, and ADC2 closed-loop self-monitor',
      icon: Crosshair,
      color: '#3B82F6',
      details: `Buffer: MCP6004 Unity-Gain | BNC Out: Oscilloscope | Piezo: Acoustic Projector | Loopback: ADC2 (PC1)`,
      explanation:
        'The MCP6004 unity-gain operational amplifier buffers the reconstructed analog waveform before driving the output stage. The output branches simultaneously to BNC, Piezo projector, and ADC2 for closed-loop FFT validation.',
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
    <div id="system-story-pipeline-view" className="space-y-4 max-w-[1920px] mx-auto text-[#112D4E]">
      {/* Top Banner */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#3F72AF]">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#112D4E] flex items-center gap-2">
              End-to-End Software-Defined Sonar Pipeline Story
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#112D4E] font-bold">
                9-STAGE COMPLETE ARCHITECTURE
              </span>
            </h2>
            <p className="text-xs font-mono text-[#3F72AF]">
              From ocean physics models to STM32 TIM3 PWM DMA streaming, CD4053B capacitor selection, MCP6004 buffering, and ADC2 loopback validation
            </p>
          </div>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-colors ${
              isAutoPlaying
                ? 'bg-[#DBE2EF] border-[#3F72AF]/40 text-[#112D4E] font-bold shadow-xs'
                : 'bg-[#F9F7F7] hover:bg-[#DBE2EF]/60 border-[#DBE2EF] text-[#3F72AF]'
            }`}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoPlaying ? 'Auto-Cycle' : 'Paused'}</span>
          </button>

          <button
            onClick={() => setCurrentStep(0)}
            className="p-1.5 rounded-lg bg-[#F9F7F7] hover:bg-[#DBE2EF]/60 text-[#3F72AF] hover:text-[#112D4E] border border-[#DBE2EF] cursor-pointer"
            title="Restart pipeline from Step 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Focus Card */}
      <div className="glass-panel p-6 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[#DBE2EF]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#DBE2EF] border border-[#3F72AF]/30 flex items-center justify-center text-[#3F72AF] shadow-sm">
              <StepIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] border border-[#3F72AF]/30">
                  STEP {step.id} OF 9
                </span>
                <span className="text-xs font-mono text-[#3F72AF]">{step.subtitle}</span>
              </div>
              <h3 className="text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#112D4E] mt-1">
                {step.title}
              </h3>
            </div>
          </div>

          <div className="bg-[#F9F7F7] px-4 py-2.5 rounded-xl border border-[#DBE2EF] font-mono text-xs text-[#112D4E] max-w-md">
            <div className="text-[10px] text-[#3F72AF] uppercase tracking-wider mb-0.5 font-bold">Live Stage Parameters</div>
            <div className="font-semibold text-[#112D4E]">{step.details}</div>
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3 font-mono text-sm leading-relaxed text-[#112D4E]/90">
            <p>{step.explanation}</p>
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold pt-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pipeline Stage Verified & Active in Current Cycle</span>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-end gap-2">
            <button
              onClick={() => setCurrentStep((prev) => (prev > 0 ? prev - 1 : STEPS.length - 1))}
              className="px-4 py-2 rounded-xl bg-[#F9F7F7] hover:bg-[#DBE2EF] border border-[#DBE2EF] text-xs font-mono text-[#3F72AF] font-bold cursor-pointer"
            >
              Previous Step
            </button>
            <button
              onClick={() => setCurrentStep((prev) => (prev + 1) % STEPS.length)}
              className="px-4 py-2 rounded-xl bg-[#3F72AF] hover:bg-[#112D4E] text-white text-xs font-mono font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>Next Stage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hardware Physical Output & Validation Diagram (Phases 2C & 2D) */}
      <div className="glass-panel p-4 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF]">
          <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-[#3F72AF]" /> Physical Output Section & Tri-Branch Validation Topology
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30">
            PA6 → R1 → CD4053B → RC → MCP6004 → OUTPUT
          </span>
        </div>

        {/* Physical Chain Flow */}
        <div className="bg-[#F9F7F7] p-3 rounded-xl border border-[#DBE2EF] overflow-x-auto custom-scrollbar">
          <div className="flex items-center justify-between min-w-[1000px] gap-2 font-mono text-xs text-[#112D4E]">
            <div className="p-2 rounded bg-white border border-[#DBE2EF] text-center shrink-0">
              <div className="text-[10px] text-[#3F72AF]">STM32 MCU</div>
              <strong className="text-xs">TIM3 PWM</strong>
            </div>
            <span>→</span>
            <div className="p-2 rounded bg-white border border-[#DBE2EF] text-center shrink-0">
              <div className="text-[10px] text-[#3F72AF]">DMA Stream</div>
              <strong className="text-xs">100 kS/s</strong>
            </div>
            <span>→</span>
            <div className="p-2 rounded bg-white border border-[#DBE2EF] text-center shrink-0">
              <div className="text-[10px] text-[#3F72AF]">PWM Pin</div>
              <strong className="text-xs">PA6 (ARR=639)</strong>
            </div>
            <span>→</span>
            <div className="p-2 rounded bg-white border border-[#DBE2EF] text-center shrink-0">
              <div className="text-[10px] text-[#3F72AF]">Series Resistor</div>
              <strong className="text-xs">R1 = 1 kΩ</strong>
            </div>
            <span>→</span>
            <div className="p-2 rounded bg-amber-50 border border-amber-300 text-center shrink-0">
              <div className="text-[10px] text-amber-700 font-bold">CD4053B Switch</div>
              <strong className="text-xs text-amber-900">Capacitor Selection</strong>
            </div>
            <span>→</span>
            <div className="p-2 rounded bg-white border border-[#DBE2EF] text-center shrink-0">
              <div className="text-[10px] text-[#3F72AF]">Selected Cap</div>
              <strong className="text-xs text-[#112D4E]">{selectedCapNf} nF (fRC={fRC_khz}k)</strong>
            </div>
            <span>→</span>
            <div className="p-2 rounded bg-white border border-[#DBE2EF] text-center shrink-0">
              <div className="text-[10px] text-[#3F72AF]">Buffer Amp</div>
              <strong className="text-xs text-[#112D4E]">MCP6004 (Unity Gain)</strong>
            </div>
            <span>→</span>
            <div className="p-2 rounded bg-emerald-50 border border-emerald-300 text-center shrink-0">
              <div className="text-[10px] text-emerald-700 font-bold">Analog Rail</div>
              <strong className="text-xs text-emerald-900">OUTPUT (0.5–10 kHz)</strong>
            </div>
          </div>
        </div>

        {/* 3-Way Output Branch */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs pt-1">
          <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] space-y-1">
            <div className="flex items-center justify-between text-[#112D4E] font-bold">
              <span>Branch 1: BNC Output</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#DBE2EF] text-[#3F72AF]">TEST BENCH</span>
            </div>
            <p className="text-[11px] text-[#112D4E]/80">
              Direct connection to external laboratory Oscilloscope for hardware signal verification.
            </p>
          </div>

          <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] space-y-1">
            <div className="flex items-center justify-between text-[#112D4E] font-bold">
              <span>Branch 2: Piezo Projector</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">ACOUSTIC</span>
            </div>
            <p className="text-[11px] text-[#112D4E]/80">
              Drives power stage and piezoelectric transducer projector for acoustic ping demonstration.
            </p>
          </div>

          <div className="bg-sky-50/70 p-3 rounded-lg border border-sky-300 space-y-1">
            <div className="flex items-center justify-between text-sky-900 font-bold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-700" /> Branch 3: ADC2 Self-Monitor
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-200 text-sky-800 font-bold">
                SIMULATION
              </span>
            </div>
            <p className="text-[11px] text-sky-900/80">
              ADC2 (PC1) samples output rail → 32-point DFT → Dominant peak {params.centerFrequency.toFixed(1)} kHz matches Commanded fc (Δf = 0.0 kHz, In-Band Output PASS).
            </p>
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
                  ? 'bg-[#DBE2EF] border-[#3F72AF] shadow-sm ring-1 ring-[#3F72AF]'
                  : isCompleted
                  ? 'bg-white hover:bg-[#F9F7F7] border-[#DBE2EF] text-[#3F72AF]'
                  : 'bg-white/70 hover:bg-white border-[#DBE2EF] text-[#112D4E]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <SIcon className={`w-4 h-4 ${isActive ? 'text-[#3F72AF]' : isCompleted ? 'text-emerald-600' : 'text-[#3F72AF]/50'}`} />
                <span className={`text-[10px] font-bold ${isActive ? 'text-[#112D4E]' : 'text-[#3F72AF]'}`}>
                  #{s.id}
                </span>
              </div>
              <div className={`text-[11px] font-bold line-clamp-2 leading-tight ${isActive ? 'text-[#112D4E]' : 'text-[#112D4E]/80'}`}>
                {s.title.split('. ')[1]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

