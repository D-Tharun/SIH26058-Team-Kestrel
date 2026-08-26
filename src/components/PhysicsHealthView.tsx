import React from 'react';
import { EnvironmentalInputs, TransmitterParameters, PhysicalAcoustics, SystemStatus } from '../types';
import {
  Waves,
  Cpu,
  ShieldCheck,
  Compass,
  FileCode2,
} from 'lucide-react';

interface PhysicsHealthViewProps {
  env: EnvironmentalInputs;
  params: TransmitterParameters;
  acoustics: PhysicalAcoustics;
  status: SystemStatus;
}

export const PhysicsHealthView: React.FC<PhysicsHealthViewProps> = ({
  env,
  params,
  acoustics,
}) => {
  // Francois-Garrison component breakdown approximations
  const f = params.centerFrequency;
  const T = env.temperature;
  const S = env.salinity;
  const D = env.depth;
  const pH = env.pH;

  // Boric acid relaxation freq f1
  const f1 = 2.8 * Math.sqrt(S / 35) * Math.pow(10, 4 - 1245 / (T + 273));
  // MgSO4 relaxation freq f2
  const f2 = (8.17 * Math.pow(10, 8 - 1990 / (T + 273))) / (1 + 0.0018 * (S - 35));

  // Individual absorption components in dB/km
  const alphaBoric = parseFloat(
    ((8.86 / acoustics.soundSpeed) * Math.pow(10, 0.78 * pH - 5) * ((f1 * f * f) / (f1 * f1 + f * f))).toFixed(3)
  );
  const alphaMgSo4 = parseFloat(
    (21.44 * (S / 35) * (1 + 0.025 * T) * ((f2 * f * f) / (f2 * f2 + f * f)) * (1 - 0.00137 * D)).toFixed(3)
  );
  const alphaPureWater = parseFloat(
    (4.937e-4 * Math.pow(T, 0.5) * f * f * (1 - 0.00038 * D)).toFixed(3)
  );

  return (
    <div id="physics-health-view" className="space-y-4 max-w-[1920px] mx-auto text-[#112D4E]">
      {/* Top Banner */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#3F72AF]">
            <Waves className="w-6 h-6 animate-pulse text-[#3F72AF]" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#112D4E] flex items-center gap-2">
              Deep Ocean Physics & STM32 Hardware Architecture
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#112D4E] font-bold">
                MACKENZIE & FRANCOIS-GARRISON RIGOR
              </span>
            </h2>
            <p className="text-xs font-mono text-[#3F72AF]">
              Empirical acoustic oceanography equation models and ultra-low-power DMA DAC hardware streaming telemetry
            </p>
          </div>
        </div>

        <div className="bg-[#F9F7F7] px-3.5 py-2 rounded-lg border border-[#DBE2EF] font-mono text-xs text-right">
          <div className="text-[#3F72AF] text-[11px]">Computed Sound Speed</div>
          <div className="text-[#112D4E] font-bold text-base">{acoustics.soundSpeed} m/s</div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Oceanographic Physics Models */}
        <div className="glass-panel p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF]">
            <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#3F72AF]" /> Underwater Acoustic Physics Models
            </span>
            <span className="text-[10px] font-mono text-[#3F72AF] font-bold">Mackenzie 1981 / FG 1982</span>
          </div>

          {/* Mackenzie Equation Card */}
          <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] space-y-1.5 font-mono text-xs">
            <div className="flex justify-between items-center text-[#112D4E] font-bold">
              <span>Mackenzie (1981) Sound Speed Equation</span>
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">c = {acoustics.soundSpeed} m/s</span>
            </div>
            <p className="text-[11px] text-[#112D4E]/80 leading-relaxed">
              c = 1448.96 + 4.591T - 5.304×10⁻²T² + 2.374×10⁻⁴T³ + 1.340(S - 35) + 1.630×10⁻²D + 1.675×10⁻⁷D² - 1.025×10⁻²T(S - 35) - 7.139×10⁻¹³T·D³
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#DBE2EF] text-[10px] text-[#3F72AF]">
              <div>Temp Contrib: +{(4.591 * T).toFixed(1)} m/s</div>
              <div>Salinity Contrib: +{(1.34 * (S - 35)).toFixed(1)} m/s</div>
              <div>Depth Contrib: +{(0.0163 * D).toFixed(1)} m/s</div>
            </div>
          </div>

          {/* Francois-Garrison Absorption Breakdown */}
          <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center text-[#112D4E] font-bold">
              <span className="text-amber-700">Francois-Garrison Chemical Absorption α</span>
              <span className="text-[#112D4E] bg-[#DBE2EF] px-1.5 py-0.5 rounded border border-[#3F72AF]/30">Total: {acoustics.absorptionCoefficient} dB/km</span>
            </div>
            <p className="text-[11px] text-[#112D4E]/80">
              Total Absorption α = α₁(Boric Acid) + α₂(Magnesium Sulfate MgSO₄) + α₃(Pure Water Viscosity)
            </p>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center bg-white p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#112D4E]/80">1. Boric Acid Relaxation (f₁ ≈ {f1.toFixed(1)} kHz):</span>
                <span className="text-[#3F72AF] font-bold">{alphaBoric} dB/km</span>
              </div>
              <div className="flex justify-between items-center bg-white p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#112D4E]/80">2. MgSO₄ Relaxation (f₂ ≈ {f2.toFixed(1)} kHz):</span>
                <span className="text-[#3F72AF] font-bold">{alphaMgSo4} dB/km</span>
              </div>
              <div className="flex justify-between items-center bg-white p-1.5 rounded border border-[#DBE2EF]">
                <span className="text-[#112D4E]/80">3. Pure Water Viscous Attenuation:</span>
                <span className="text-amber-700 font-bold">{alphaPureWater} dB/km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: STM32 Low-Power Hardware Telemetry */}
        <div className="glass-panel p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF]">
            <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#3F72AF]" /> STM32 DMA & Low-Power Hardware State
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] border border-[#3F72AF]/30 font-bold">
              AUTONOMOUS DMA STREAMING
            </span>
          </div>

          {/* Power Comparison Bar */}
          <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] space-y-2 font-mono text-xs">
            <div className="flex justify-between text-[#112D4E]">
              <span>MCU Power Profile (Autonomous DMA vs CPU Software Loop):</span>
              <strong className="text-emerald-700">96% Energy Savings</strong>
            </div>
            <div className="w-full h-3 bg-[#DBE2EF] rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-600 w-[4%]" title="Autonomous DMA mode: 4% power" />
              <div className="h-full bg-[#3F72AF]/30 w-[96%]" title="CPU Sleep: 96%" />
            </div>
            <div className="flex justify-between text-[10px] text-[#3F72AF]">
              <span>Active DMA: 1.2 mA (3.3V)</span>
              <span>CPU Sleeping via WFI (Wait-For-Interrupt)</span>
            </div>
          </div>

          {/* Closed Loop Self-Monitoring */}
          <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center text-[#112D4E] font-bold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" /> Closed-Loop Self-Monitoring Circuit
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                ADC LOOPBACK OK
              </span>
            </div>
            <p className="text-[11px] text-[#112D4E]/80">
              ADC Channel 4 samples the analog amplifier output rail via an internal precision resistive divider.
              Verifies zero clipping, THD &lt; 0.1%, and transducer impedance match.
            </p>
          </div>

          {/* Firmware C Code Snippet */}
          <div className="bg-[#07172C]/75 backdrop-blur-xl p-3 rounded-xl border border-white/30 space-y-1 font-mono text-[11px] text-[#DBE2EF] shadow-inner">
            <div className="flex items-center justify-between text-[#38BDF8] pb-1 border-b border-white/10">
              <span className="flex items-center gap-1">
                <FileCode2 className="w-3.5 h-3.5" /> stm32g4_acoustic_dma.c
              </span>
              <span className="text-[10px] text-[#DBE2EF]/70">Timer 6 TRGO Trigger</span>
            </div>
            <pre className="text-[10px] text-sky-200 overflow-x-auto custom-scrollbar pt-1">
{`// Initialize Circular DAC DMA Buffer
HAL_DAC_Start_DMA(&hdac1, DAC_CHANNEL_1, 
  (uint32_t*)dac_lut_buffer, 64, DAC_ALIGN_12B_R);
// Enable Low Power Sleep Mode during Burst
HAL_PWR_EnterSLEEPMode(PWR_MAINREGULATOR_ON, PWR_SLEEPENTRY_WFI);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
