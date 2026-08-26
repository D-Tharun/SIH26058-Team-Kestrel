import {
  EnvironmentalInputs,
  TransmitterParameters,
  DecisionTrace,
  DecisionRule,
  ModulationType,
  WindowType,
} from '../types';
import { calculateRangeResolution } from './acousticEngine';

/**
 * Adaptive Decision Engine for Software-Defined Sonar Transmitter.
 * Synthesizes optimal acoustic transmission parameters from real-time environmental telemetry:
 * - Depth (m)
 * - Turbidity (NTU)
 * - Temperature (°C)
 * - Salinity (ppt)
 * - pH
 * - ResPen balance (0.0 High Res vs 1.0 High Penetration)
 * - Ambient Noise (dB)
 */
export function evaluateAdaptiveDecision(
  env: EnvironmentalInputs,
  soundSpeed: number
): { params: TransmitterParameters; trace: DecisionTrace } {
  const { depth, turbidity, temperature, salinity, pH, resPen, ambientNoise } = env;

  const rules: DecisionRule[] = [];
  const reasoningSteps: string[] = [];

  // ==========================================
  // 1. FREQUENCY SELECTION LOGIC (fc)
  // ==========================================
  // Base rule: High penetration (high depth / high turbidity / high resPen) demands LOWER frequency (<50 kHz)
  // because acoustic absorption alpha increases proportionally to f^2.
  // High resolution demands HIGHER frequency (>80 kHz) to support wider fractional bandwidth.
  
  let fc = 65.0; // default nominal mid-frequency in kHz

  const penetrationNeed = (depth / 350) * 0.4 + (turbidity / 80) * 0.35 + resPen * 0.45;

  if (penetrationNeed > 0.75) {
    fc = 28.0;
    rules.push({
      id: 'FREQ_DEEP_ATTEN',
      condition: `Severe Attenuation Risk (Depth: ${depth}m, Turbidity: ${turbidity} NTU, ResPen: ${resPen.toFixed(2)})`,
      action: 'Set Center Frequency fc = 28.0 kHz',
      active: true,
      category: 'frequency',
      impact: 'Minimizes quadratic frequency absorption (alpha < 6 dB/km)'
    });
    reasoningSteps.push(`Deep water / high turbidity causes severe alpha attenuation -> shifted fc down to 28.0 kHz for max range.`);
  } else if (penetrationNeed > 0.45) {
    fc = 48.0;
    rules.push({
      id: 'FREQ_MODERATE_ATTEN',
      condition: `Moderate Depth & Particulate (${depth}m, ${turbidity} NTU)`,
      action: 'Set Center Frequency fc = 48.0 kHz',
      active: true,
      category: 'frequency',
      impact: 'Balanced acoustic penetration with acceptable Doppler tolerance'
    });
    reasoningSteps.push(`Moderate water column absorption -> selected 48.0 kHz carrier for balanced acoustic budget.`);
  } else if (resPen < 0.25 && depth < 40 && turbidity < 20) {
    fc = 110.0;
    rules.push({
      id: 'FREQ_ULTRA_RES',
      condition: `Shallow Clear Water + High Res Priority (${depth}m, ResPen: ${resPen.toFixed(2)})`,
      action: 'Set Center Frequency fc = 110.0 kHz (HF Acoustic)',
      active: true,
      category: 'frequency',
      impact: 'Enables centimeter-level range discrimination in shallow water'
    });
    reasoningSteps.push(`Shallow clean medium enables HF band (110 kHz) for target feature classification.`);
  } else {
    fc = 75.0;
    rules.push({
      id: 'FREQ_STANDARD',
      condition: `Nominal Environmental Profile (T: ${temperature}°C, S: ${salinity}ppt)`,
      action: 'Set Center Frequency fc = 75.0 kHz',
      active: true,
      category: 'frequency',
      impact: 'Standard survey acoustic profile'
    });
    reasoningSteps.push(`Standard operating acoustic corridor -> 75.0 kHz carrier active.`);
  }

  // ==========================================
  // 2. MODULATION TYPE SELECTION
  // ==========================================
  let modulation: ModulationType = 'LFM Chirp';
  let bandwidth = 15.0; // kHz
  let pulseDuration = 10.0; // ms

  // Rule 2.1: Ambient Noise / Turbid Clutter / Long Range -> LFM Chirp or Barker-13
  if (ambientNoise > 85 && depth > 50) {
    // High reverberation & noise environment -> Barker-13 phase coding gives zero range sidelobes in Doppler-stationary channel
    modulation = 'Barker-13';
    bandwidth = 20.0;
    pulseDuration = 13.0; // 13-bit code, 1ms per sub-chip
    rules.push({
      id: 'MOD_BARKER_HIGH_NOISE',
      condition: `High Ambient Noise (${ambientNoise} dB) + Multipath Clutter`,
      action: 'Engaged Barker-13 Biphase Shift Keying',
      active: true,
      category: 'modulation',
      impact: 'Provides 11.1 dB compression gain with optimal -22.3 dB peak sidelobe ratio'
    });
    reasoningSteps.push(`High ambient acoustic noise (${ambientNoise} dB) -> engaged Barker-13 phase code to overcome clutter.`);
  } else if (turbidity > 35 || depth > 80 || resPen > 0.4) {
    // Standard Pulse Compression need: LFM Chirp
    modulation = 'LFM Chirp';
    bandwidth = Math.min(fc * 0.4, 25.0);
    pulseDuration = Math.min(35.0, 10.0 + (depth / 300) * 20.0);
    rules.push({
      id: 'MOD_LFM_CHIRP',
      condition: `Turbidity (${turbidity} NTU) > 35 OR Depth (${depth}m) > 80m`,
      action: 'Selected Linear Frequency Modulated (LFM) Chirp',
      active: true,
      category: 'modulation',
      impact: 'Pulse compression allows high transmitted energy without peaking amplifier voltage limit'
    });
    reasoningSteps.push(`High Turbidity + Depth > 80m -> LFM Chirp selected for pulse compression.`);
  } else if (resPen > 0.7) {
    // Geometric / Hyperbolic Sweep for wideband Doppler-invariant penetration
    modulation = 'Geometric Sweep';
    bandwidth = 18.0;
    pulseDuration = 25.0;
    rules.push({
      id: 'MOD_GEOM_SWEEP',
      condition: `High Penetration Priority (ResPen = ${resPen.toFixed(2)})`,
      action: 'Selected Geometric Logarithmic Sweep',
      active: true,
      category: 'modulation',
      impact: 'Doppler-tolerant wideband energy concentration for deep sediment penetration'
    });
    reasoningSteps.push(`High penetration requested -> Geometric Sweep configured.`);
  } else if (depth < 25 && turbidity < 15 && ambientNoise < 60) {
    // Pristine shallow water with low noise -> Continuous Wave (CW) for precise Doppler measurement
    modulation = 'CW';
    bandwidth = 2.0; // narrow CW pulse
    pulseDuration = 5.0;
    rules.push({
      id: 'MOD_CW_SHALLOW',
      condition: `Clean Shallow Profile (Depth < 25m, Turbidity < 15 NTU, Noise < 60 dB)`,
      action: 'Selected Continuous Wave (CW) Tonals',
      active: true,
      category: 'modulation',
      impact: 'Narrowband velocity & Doppler velocity log (DVL) measurement'
    });
    reasoningSteps.push(`Low-noise shallow basin -> continuous wave (CW) pulse selected for pure Doppler estimation.`);
  } else {
    // General LFM Chirp
    modulation = 'LFM Chirp';
    bandwidth = 16.0;
    pulseDuration = 12.0;
    rules.push({
      id: 'MOD_LFM_GENERAL',
      condition: 'Nominal acoustic transmission requirements',
      action: 'Selected LFM Chirp (16 kHz BW, 12 ms tau)',
      active: true,
      category: 'modulation',
      impact: 'Standard pulse compression profile'
    });
    reasoningSteps.push(`LFM Chirp selected with 16 kHz bandwidth for standard range resolution.`);
  }

  // ==========================================
  // 3. WINDOW FUNCTION SELECTION
  // ==========================================
  let windowType: WindowType = 'Hamming';

  if (ambientNoise > 80 || turbidity > 50) {
    // Blackman window gives -58dB sidelobe suppression to prevent weak acoustic echoes from being masked by sidelobes
    windowType = 'Blackman';
    rules.push({
      id: 'WIN_BLACKMAN',
      condition: `Severe Clutter / High Noise (${ambientNoise} dB)`,
      action: 'Applied Blackman Window Tapering',
      active: true,
      category: 'window',
      impact: 'Suppresses spectral spectral leakage & range sidelobes down to -58 dB'
    });
    reasoningSteps.push(`High acoustic noise/clutter -> Blackman window applied for -58dB sidelobe rejection.`);
  } else if (modulation === 'CW') {
    windowType = 'Hann';
    rules.push({
      id: 'WIN_HANN',
      condition: 'CW Tonals active',
      action: 'Applied Hann Cosine Window',
      active: true,
      category: 'window',
      impact: 'Smooth turn-on/turn-off prevents transducer transient ringing'
    });
  } else if (resPen < 0.2 && depth < 30) {
    // Ultra high resolution mode in clean water
    windowType = 'Rectangular';
    rules.push({
      id: 'WIN_RECT',
      condition: 'High Resolution Priority with low clutter',
      action: 'Applied Rectangular (Unwindowed) Burst',
      active: true,
      category: 'window',
      impact: 'Narrowest mainlobe width for maximum spatial resolution'
    });
  } else {
    windowType = 'Hamming';
    rules.push({
      id: 'WIN_HAMMING',
      condition: 'General sonar survey profile',
      action: 'Applied Hamming Window Tapering',
      active: true,
      category: 'window',
      impact: 'Optimal tradeoff between -43 dB sidelobe rejection and mainlobe sharpness'
    });
  }

  // ==========================================
  // 4. POWER & AMPLITUDE SETTING
  // ==========================================
  let amplitude = 75; // % of DAC output
  if (depth > 200 || turbidity > 60 || ambientNoise > 85) {
    amplitude = 95;
    rules.push({
      id: 'PWR_BOOST',
      condition: `High acoustic budget requirement (Depth ${depth}m / Turbidity ${turbidity} NTU)`,
      action: 'Amplifier output set to 95% (High Power TX)',
      active: true,
      category: 'power',
      impact: 'Maximizes acoustic source level (SL ~ 186 dB re 1uPa @ 1m)'
    });
  } else if (depth < 30 && turbidity < 20) {
    amplitude = 45;
    rules.push({
      id: 'PWR_CONSERVE',
      condition: `Shallow basin (Depth ${depth}m) - reverberation prevention`,
      action: 'Amplifier output set to 45% (Eco / Low Ringing)',
      active: true,
      category: 'power',
      impact: 'Prevents receiver saturation and transducer thermal stress'
    });
  }

  // Calculated derived fields
  const chirpRate = modulation === 'CW' ? 0 : Math.round((bandwidth / pulseDuration) * 100) / 100;
  const timeBandwidthProduct = modulation === 'CW' ? 1.0 : Math.round(bandwidth * pulseDuration * 10) / 10;
  const isChirpOrBarker = modulation !== 'CW';
  const rangeResolution = calculateRangeResolution(soundSpeed, bandwidth, pulseDuration, isChirpOrBarker);

  const params: TransmitterParameters = {
    centerFrequency: Math.round(fc * 10) / 10,
    modulationType: modulation,
    windowType,
    bandwidth: Math.round(bandwidth * 10) / 10,
    pulseDuration: Math.round(pulseDuration * 10) / 10,
    amplitude,
    chirpRate,
    timeBandwidthProduct,
    rangeResolution,
    dacSampleRate: 500, // 500 kSPS
    sampleCount: 64,
    pulseRepetitionInterval: 100, // 100 ms (10 Hz ping rate)
  };

  // Compose the high-level summary string
  let summaryText = '';
  if (turbidity > 35 && depth > 80) {
    summaryText = `High Turbidity (${turbidity} NTU) + Depth > 80m → ${modulation} (${bandwidth}kHz BW) selected for pulse compression with ${windowType} windowing.`;
  } else if (ambientNoise > 85) {
    summaryText = `Elevated Ambient Noise (${ambientNoise} dB) → ${modulation} engaged with ${windowType} tapering for maximum clutter rejection.`;
  } else if (resPen > 0.7 || depth > 250) {
    summaryText = `Deep Column Penetration Required (${depth}m) → Downshifted fc to ${fc} kHz, ${modulation} with long pulse duration (tau=${pulseDuration}ms).`;
  } else if (resPen < 0.25 && depth < 40) {
    summaryText = `High Resolution Priority in Shallow Basin (${depth}m) → High Frequency fc=${fc} kHz with wide ${bandwidth}kHz bandwidth (ΔR=${rangeResolution}m).`;
  } else {
    summaryText = `Nominal Oceanic Channel (c=${soundSpeed}m/s) → ${modulation} at ${fc} kHz with ${windowType} windowing for optimal SNR and spatial resolution.`;
  }

  return {
    params,
    trace: {
      summaryText,
      activeReasoning: reasoningSteps,
      rulesFired: rules,
      confidence: 0.96,
      modeDescription: `${modulation} • fc=${fc}kHz • BW=${bandwidth}kHz • Window=${windowType}`,
    },
  };
}

/**
 * Color map for each modulation type
 */
export const MODULATION_COLORS: Record<
  ModulationType,
  {
    bg: string;
    border: string;
    text: string;
    badge: string;
    glow: string;
    primaryHex: string;
    description: string;
  }
> = {
  CW: {
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-500/50',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]',
    primaryHex: '#06b6d4',
    description: 'Continuous Wave (Narrowband Monotone)'
  },
  'LFM Chirp': {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    primaryHex: '#10b981',
    description: 'Linear Frequency Modulated Chirp (Pulse Compression)'
  },
  'Geometric Sweep': {
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    primaryHex: '#f59e0b',
    description: 'Geometric/Logarithmic Frequency Sweep'
  },
  'Barker-13': {
    bg: 'bg-purple-950/40',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    primaryHex: '#a855f7',
    description: '13-Bit Binary Phase-Coded Pulse (+1,+1,+1,+1,+1,-1,-1,+1,+1,-1,+1,-1,+1)'
  },
  'Hyperbolic FM': {
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/50',
    text: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
    primaryHex: '#f43f5e',
    description: 'Hyperbolic Frequency Modulation (Exact Doppler Invariant)'
  }
};
