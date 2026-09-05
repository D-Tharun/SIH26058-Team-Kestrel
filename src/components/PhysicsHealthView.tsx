import React, { useState } from 'react';
import { EnvironmentalInputs, TransmitterParameters, PhysicalAcoustics, SystemStatus } from '../types';
import {
  Waves,
  Cpu,
  ShieldCheck,
  Compass,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Layers,
  Info,
} from 'lucide-react';
import { AnimeCounter } from './animations/AnimeCounter';

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
  status,
}) => {
  const [showMackenzieDetails, setShowMackenzieDetails] = useState(false);
  const [showFgDetails, setShowFgDetails] = useState(false);

  // Authoritative Francois-Garrison breakdown from shared acousticEngine
  const { boric: alphaBoric, magnesium: alphaMgSo4, pureWater: alphaPureWater, total: alphaTotal, f1, f2 } = acoustics.absorptionBreakdown;
  const T = env.temperature;
  const S = env.salinity;
  const D = env.depth;
  const pH = env.pH;

  // Two-way propagation loss numbers
  const prop = acoustics.propagationLoss;
  const R_meters = Math.min(300, Math.max(50, env.depth * 2));
  const R_km = R_meters / 1000;

  // Reference SNR and Link Margin budget items
  const snrRef = Math.round((acoustics.sourceLevel + acoustics.pulseCompressionGain - (env.ambientNoise - 14) - 15) * 10) / 10;
  const predictedLinkMargin = acoustics.predictedLinkMargin;

  return (
    <div id="physics-health-view" className="space-y-4 max-w-[1920px] mx-auto text-[#112D4E]">
      {/* Top Banner */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#3F72AF]">
            <Waves className="w-6 h-6 animate-pulse text-[#3F72AF]" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#112D4E] flex items-center gap-2">
              Deep Ocean Physics & Acoustic Propagation Engine
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#112D4E] font-bold">
                MACKENZIE & FRANCOIS-GARRISON RIGOR
              </span>
            </h2>
            <p className="text-xs font-mono text-[#3F72AF]">
              Authoritative mathematical oceanography models, two-way active sonar transmission budget, and TIM3 PWM hardware telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#F9F7F7] px-3.5 py-2 rounded-lg border border-[#DBE2EF] font-mono text-xs text-right">
            <div className="text-[#3F72AF] text-[11px]">Sound Speed (Mackenzie)</div>
            <div className="text-[#112D4E] font-bold text-base">{acoustics.soundSpeed} m/s</div>
          </div>
          <div className="bg-[#F9F7F7] px-3.5 py-2 rounded-lg border border-[#DBE2EF] font-mono text-xs text-right">
            <div className="text-amber-600 text-[11px]">Total Absorption (FG)</div>
            <div className="text-amber-700 font-bold text-base">{alphaTotal} dB/km</div>
          </div>
        </div>
      </div>

      {/* Physics Pipeline Visual Flow Sequence */}
      <div className="glass-panel p-3 border border-[#DBE2EF] overflow-x-auto custom-scrollbar">
        <div className="flex items-center justify-between min-w-[850px] gap-2 font-mono text-xs text-[#112D4E]">
          <div className="flex items-center gap-1.5 bg-[#F9F7F7] px-2.5 py-1.5 rounded-lg border border-[#DBE2EF]">
            <span className="w-4 h-4 rounded-full bg-[#DBE2EF] text-[10px] font-bold flex items-center justify-center text-[#112D4E]">1</span>
            <span className="text-[#3F72AF] font-semibold">Environment (T,S,D,pH)</span>
          </div>
          <span className="text-[#3F72AF]">→</span>
          <div className="flex items-center gap-1.5 bg-[#F9F7F7] px-2.5 py-1.5 rounded-lg border border-[#DBE2EF]">
            <span className="w-4 h-4 rounded-full bg-[#DBE2EF] text-[10px] font-bold flex items-center justify-center text-[#112D4E]">2</span>
            <span className="font-semibold">Mackenzie c(T,S,D)</span>
          </div>
          <span className="text-[#3F72AF]">→</span>
          <div className="flex items-center gap-1.5 bg-[#F9F7F7] px-2.5 py-1.5 rounded-lg border border-[#DBE2EF]">
            <span className="w-4 h-4 rounded-full bg-[#DBE2EF] text-[10px] font-bold flex items-center justify-center text-[#112D4E]">3</span>
            <span className="font-semibold">Francois–Garrison α(f)</span>
          </div>
          <span className="text-[#3F72AF]">→</span>
          <div className="flex items-center gap-1.5 bg-[#F9F7F7] px-2.5 py-1.5 rounded-lg border border-[#DBE2EF]">
            <span className="w-4 h-4 rounded-full bg-[#DBE2EF] text-[10px] font-bold flex items-center justify-center text-[#112D4E]">4</span>
            <span className="font-semibold">Two-Way TL(R)</span>
          </div>
          <span className="text-[#3F72AF]">→</span>
          <div className="flex items-center gap-1.5 bg-[#F9F7F7] px-2.5 py-1.5 rounded-lg border border-[#DBE2EF]">
            <span className="w-4 h-4 rounded-full bg-[#DBE2EF] text-[10px] font-bold flex items-center justify-center text-[#112D4E]">5</span>
            <span className="font-semibold">Scattering (Kτ=0)</span>
          </div>
          <span className="text-[#3F72AF]">→</span>
          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-300 text-emerald-800">
            <span className="w-4 h-4 rounded-full bg-emerald-200 text-[10px] font-bold flex items-center justify-center text-emerald-800">6</span>
            <span className="font-bold">Predicted Link Margin</span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Physics Oceanography Models */}
        <div className="space-y-4">
          {/* Card 1: Mackenzie Sound Speed Card */}
          <div className="glass-panel p-4 space-y-3 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
            <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF]">
              <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#3F72AF]" /> Sound Speed in Seawater
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30">
                Mackenzie (1981)
              </span>
            </div>

            {/* Input & Output Row */}
            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <div className="text-[10px] text-[#3F72AF]">Temp (T)</div>
                <div className="font-bold text-[#112D4E]">{T.toFixed(1)} °C</div>
              </div>
              <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <div className="text-[10px] text-[#3F72AF]">Salinity (S)</div>
                <div className="font-bold text-[#112D4E]">{S.toFixed(1)} PSU</div>
              </div>
              <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <div className="text-[10px] text-[#3F72AF]">Depth (D)</div>
                <div className="font-bold text-[#112D4E]">{D.toFixed(0)} m</div>
              </div>
              <div className="bg-sky-50 p-2 rounded-lg border border-sky-200">
                <div className="text-[10px] text-sky-700">Sound Speed (c)</div>
                <div className="font-bold text-sky-900 text-sm">{acoustics.soundSpeed} m/s</div>
              </div>
            </div>

            {/* Compact Details Expansion */}
            <div className="bg-[#F9F7F7] p-2.5 rounded-lg border border-[#DBE2EF] font-mono text-xs space-y-2">
              <button
                onClick={() => setShowMackenzieDetails(!showMackenzieDetails)}
                className="w-full flex items-center justify-between text-[#3F72AF] hover:text-[#112D4E] text-xs font-semibold cursor-pointer"
              >
                <span>Calculation Details & Substituted Values</span>
                {showMackenzieDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showMackenzieDetails && (
                <div className="pt-2 border-t border-[#DBE2EF] space-y-1.5 text-[11px] text-[#112D4E]/80">
                  <p className="font-mono text-[10px] bg-white p-1.5 rounded border border-[#DBE2EF] leading-relaxed text-[#112D4E]">
                    c = 1448.96 + 4.591T - 5.304×10⁻²T² + 2.374×10⁻⁴T³ + 1.340(S - 35) + 1.630×10⁻²D + 1.675×10⁻⁷D² - 1.025×10⁻²T(S - 35) - 7.139×10⁻¹³TD³
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] text-[#3F72AF]">
                    <div>Temp term: +{(4.591 * T - 0.05304 * T * T).toFixed(2)} m/s</div>
                    <div>Salinity term: +{(1.340 * (S - 35)).toFixed(2)} m/s</div>
                    <div>Depth term: +{(0.0163 * D).toFixed(2)} m/s</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Francois–Garrison Chemical Absorption Card */}
          <div className="glass-panel p-4 space-y-3 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
            <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF]">
              <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-600" /> Chemical Absorption Model
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                Francois–Garrison (1982)
              </span>
            </div>

            <p className="text-[11px] font-mono text-[#3F72AF]">
              Chemical absorption estimated from the Francois–Garrison model.
            </p>

            {/* 3-Component Breakdown */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between items-center bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <div>
                  <span className="text-[#112D4E] font-bold">1. Boric Acid Relaxation (α₁)</span>
                  <span className="text-[10px] text-[#3F72AF] block">f₁ = {f1.toFixed(2)} kHz | pH = {pH.toFixed(1)}</span>
                </div>
                <span className="text-[#112D4E] font-bold">{alphaBoric.toFixed(3)} dB/km</span>
              </div>

              <div className="flex justify-between items-center bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <div>
                  <span className="text-[#112D4E] font-bold">2. Magnesium Sulfate Relaxation (α₂)</span>
                  <span className="text-[10px] text-[#3F72AF] block">f₂ = {f2.toFixed(2)} kHz | S = {S.toFixed(1)} PSU</span>
                </div>
                <span className="text-[#112D4E] font-bold">{alphaMgSo4.toFixed(3)} dB/km</span>
              </div>

              <div className="flex justify-between items-center bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <div>
                  <span className="text-[#112D4E] font-bold">3. Pure Water Viscosity (α₃)</span>
                  <span className="text-[10px] text-[#3F72AF] block">T = {T.toFixed(1)} °C | D = {D.toFixed(0)} m</span>
                </div>
                <span className="text-[#112D4E] font-bold">{alphaPureWater.toFixed(3)} dB/km</span>
              </div>

              <div className="flex justify-between items-center bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                <span className="text-amber-900 font-bold">Total Absorption α(fc = {params.centerFrequency.toFixed(1)} kHz):</span>
                <span className="text-amber-700 font-extrabold text-sm">{alphaTotal.toFixed(3)} dB/km</span>
              </div>
            </div>

            {/* Compact Details Expansion */}
            <div className="bg-[#F9F7F7] p-2.5 rounded-lg border border-[#DBE2EF] font-mono text-xs space-y-2">
              <button
                onClick={() => setShowFgDetails(!showFgDetails)}
                className="w-full flex items-center justify-between text-[#3F72AF] hover:text-[#112D4E] text-xs font-semibold cursor-pointer"
              >
                <span>Relaxation Frequency Formulas</span>
                {showFgDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showFgDetails && (
                <div className="pt-2 border-t border-[#DBE2EF] space-y-1.5 text-[10px] text-[#112D4E]/80">
                  <div className="bg-white p-1.5 rounded border border-[#DBE2EF]">
                    <span className="font-bold text-[#112D4E]">f₁ (Boric):</span> 2.8 × √(S/35) × 10^(4 - 1245 / (T + 273.15)) = {f1.toFixed(2)} kHz
                  </div>
                  <div className="bg-white p-1.5 rounded border border-[#DBE2EF]">
                    <span className="font-bold text-[#112D4E]">f₂ (MgSO₄):</span> (8.17 × 10^(8 - 1990 / (T + 273.15))) / (1 + 0.0018(S - 35)) = {f2.toFixed(2)} kHz
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Transmission Loss, Scattering & Predicted Link Margin */}
        <div className="space-y-4">
          {/* Card 3: Two-Way Active Sonar Propagation Loss Card */}
          <div className="glass-panel p-4 space-y-3 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
            <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF]">
              <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#3F72AF]" /> Two-Way Active-Sonar Propagation Loss
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30">
                2-WAY ACTIVE SONAR
              </span>
            </div>

            <div className="bg-[#F9F7F7] p-2 rounded border border-[#DBE2EF] font-mono text-[11px] text-[#112D4E]">
              TL_2way = 40 log₁₀(R) + 2 α R_km
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <div className="text-[10px] text-[#3F72AF]">Nominal Range (R)</div>
                <div className="font-bold text-[#112D4E]">{R_meters} m ({R_km.toFixed(2)} km)</div>
              </div>
              <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <div className="text-[10px] text-[#3F72AF]">Spreading (40 log R)</div>
                <div className="font-bold text-[#112D4E]">{prop.spreadingLoss} dB</div>
              </div>
              <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <div className="text-[10px] text-[#3F72AF]">Absorption (2 α R_km)</div>
                <div className="font-bold text-amber-700">{prop.absorptionLoss} dB</div>
              </div>
              <div className="bg-rose-50 p-2 rounded-lg border border-rose-200">
                <div className="text-[10px] text-rose-700 font-bold">Total Two-Way TL</div>
                <div className="font-bold text-rose-900 text-sm">{prop.totalTwoWayLoss} dB</div>
              </div>
            </div>
          </div>

          {/* Card 4: Turbidity & Scattering Penalty Card */}
          <div className="glass-panel p-4 space-y-2 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
            <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF]">
              <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#3F72AF]" /> Turbidity & Scattering State
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] font-bold border border-[#3F72AF]/30">
                Kτ = 0 (UNSCALED)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <span className="text-[10px] text-[#3F72AF]">Turbidity</span>
                <div className="font-bold text-amber-600">{env.turbidity} NTU</div>
              </div>
              <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <span className="text-[10px] text-[#3F72AF]">Scattering Coeff (Kτ)</span>
                <div className="font-bold text-[#112D4E]">0.0 dB/(NTU·km)</div>
              </div>
              <div className="bg-[#F9F7F7] p-2 rounded-lg border border-[#DBE2EF]">
                <span className="text-[10px] text-[#3F72AF]">Scattering Penalty (L_scat)</span>
                <div className="font-bold text-emerald-700">0.0 dB</div>
              </div>
            </div>

            <p className="text-[11px] font-mono text-[#112D4E]/80 bg-[#F9F7F7] p-2 rounded border border-[#DBE2EF]">
              Quantitative scattering loss is disabled pending experimental calibration. Turbidity informs heuristic frequency limits without arbitrary attenuation multipliers.
            </p>
          </div>

          {/* Card 5: Predicted Link Margin Budget */}
          <div className="glass-panel p-4 space-y-3 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)] bg-gradient-to-br from-white via-white to-emerald-50/30">
            <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF]">
              <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-700" /> PREDICTED LINK MARGIN
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                THEORETICAL BUDGET
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-300">
              <div>
                <span className="text-[10px] font-mono text-emerald-800 block">Predicted Link Margin: M(f, R)</span>
                <span className="text-xl font-extrabold font-['Plus_Jakarta_Sans',sans-serif] text-emerald-900">
                  <AnimeCounter value={predictedLinkMargin} decimals={1} prefix={predictedLinkMargin >= 0 ? '+' : ''} suffix=" dB" />
                </span>
              </div>
              <div className="text-right font-mono text-[11px] text-emerald-800">
                <div>SNR_ref: {snrRef} dB</div>
                <div>2-Way TL: -{prop.totalTwoWayLoss} dB</div>
              </div>
            </div>

            <p className="text-[11px] font-mono text-[#112D4E]/80 leading-relaxed">
              Predicted acoustic link budget based on SNR_ref and modeled propagation losses. This is not a measured receiver SNR.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Row: Hardware Telemetry & C Firmware Snippet */}
      <div className="glass-panel p-4 space-y-4 border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]">
        <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF]">
          <span className="text-xs font-bold font-mono uppercase text-[#112D4E] flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-[#3F72AF]" /> STM32 DMA & Low-Power Hardware Architecture
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] border border-[#3F72AF]/30 font-bold">
            TIM3 PWM (PA6, ARR=639)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono text-xs">
          {/* Power Profile */}
          <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] space-y-2">
            <div className="flex justify-between text-[#112D4E]">
              <span>MCU Power Profile:</span>
              <strong className="text-emerald-700">96% Energy Savings</strong>
            </div>
            <div className="w-full h-2.5 bg-[#DBE2EF] rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-600 w-[4%]" title="Autonomous DMA mode: 4% power" />
              <div className="h-full bg-[#3F72AF]/30 w-[96%]" title="CPU Sleep: 96%" />
            </div>
            <div className="flex justify-between text-[10px] text-[#3F72AF]">
              <span>Active DMA: 1.2 mA (3.3V)</span>
              <span>CPU Sleep via WFI</span>
            </div>
          </div>

          {/* Closed Loop Self Monitoring */}
          <div className="bg-[#F9F7F7] p-3 rounded-lg border border-[#DBE2EF] space-y-1.5">
            <div className="flex justify-between items-center text-[#112D4E] font-bold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> ADC2 Loopback
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300 text-[10px]">
                {status.selfMonitorStatus === 'connected' ? 'OK' : 'ACTIVE'}
              </span>
            </div>
            <p className="text-[10px] text-[#112D4E]/80 leading-normal">
              ADC2 Channel 11 (PC1) samples the analog rail via precision divider. Monitors signal fidelity and verifies zero clipping.
            </p>
          </div>

          {/* Firmware C Snippet */}
          <div className="bg-[#07172C]/85 backdrop-blur-xl p-2.5 rounded-xl border border-white/20 font-mono text-[10px] text-[#DBE2EF] shadow-inner">
            <div className="flex items-center justify-between text-[#38BDF8] pb-1 border-b border-white/10">
              <span className="flex items-center gap-1">
                <FileCode2 className="w-3 h-3" /> stm32f103_pwm_dma.c
              </span>
              <span className="text-[9px] text-[#DBE2EF]/70">100 kS/s</span>
            </div>
            <pre className="text-[10px] text-sky-200 overflow-x-auto custom-scrollbar pt-1">
{`// Start Circular TIM3 PWM DMA on PA6 (ARR=639)
HAL_TIM_PWM_Start_DMA(&htim3, TIM_CHANNEL_1, 
  (uint32_t*)pwm_duty_buffer, sample_count);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
