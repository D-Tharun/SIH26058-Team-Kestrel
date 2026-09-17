import {
  EnvironmentalInputs,
  TransmitterParameters,
  DecisionTrace,
  DecisionRule,
  ModulationType,
  WindowType,
} from '../types';
import {
  calculateRangeResolution,
  computeBandwidthResolutionFlow,
  optimizeCarrierFrequency,
} from './acousticEngine';

/**
 * Adaptive Decision Engine for Software-Defined Sonar Transmitter (1–10 kHz Acoustic Operating Band).
 *
 * Sequence:
 * 1. Requested Range Resolution (ΔR_req)
 * 2. Required Bandwidth: B_required = c / (2 * ΔR_req)
 * 3. Hardware Limit: B_max = 9000 Hz
 * 4. Used Bandwidth: B_used = min(B_required, 9000 Hz)
 * 5. Achievable Resolution: ΔR_achievable = c / (2 * B_used) if limited, else ΔR_req
 * 6. Feasible Centre Frequency Constraint: 1 kHz + B_used/2 <= fc <= 10 kHz - B_used/2
 * 7. Frequency Optimization: Evaluate candidate frequencies in feasible interval, select fc = argmax M(fc)
 * 8. Modulation Type & Pulse Structure Selection (T <= 5.12 ms for N <= 512 at fs = 100 kS/s)
 * 9. Window Function Selection (Hamming / Hann / Blackman)
 * 10. Synthesize Unified Transmitter Parameters
 */
export function evaluateAdaptiveDecision(
  env: EnvironmentalInputs,
  soundSpeed: number
): { params: TransmitterParameters; trace: DecisionTrace } {
  const { depth, turbidity, ambientNoise, resPen, temperature, salinity } = env;

  const rules: DecisionRule[] = [];
  const reasoningSteps: string[] = [];

  // ==========================================
  // 1. BANDWIDTH & RESOLUTION FLOW (STM32 SYNCHRONIZED)
  // ==========================================
  // Target requested resolution in meters (explicitly provided or derived from resPen slider 0.12m - 0.85m)
  const requestedResolutionM = env.requestedResolutionM ?? (Math.round((0.12 + resPen * 0.73) * 1000) / 1000);
  
  // Authoritative Bandwidth & Resolution Flow
  const bwFlow = computeBandwidthResolutionFlow(soundSpeed, requestedResolutionM);
  const {
    bandwidthRequiredHz,
    bandwidthUsedHz,
    bandwidthKhz,
    achievableResolutionM,
    bandwidthLimited,
    bandwidthStatus,
  } = bwFlow;

  if (bandwidthLimited) {
    reasoningSteps.push(
      `Requested resolution ΔR_req = ${requestedResolutionM.toFixed(3)}m requires B_req = ${(bandwidthRequiredHz / 1000).toFixed(2)} kHz (> 9.0 kHz hardware limit). Bandwidth capped to B_used = ${(bandwidthUsedHz / 1000).toFixed(2)} kHz -> Achievable resolution ΔR_ach = ${achievableResolutionM.toFixed(3)}m (${bandwidthStatus}).`
    );
  } else {
    reasoningSteps.push(
      `Requested resolution ΔR_req = ${requestedResolutionM.toFixed(3)}m -> Required B_req = ${(bandwidthRequiredHz / 1000).toFixed(2)} kHz -> B_used = ${(bandwidthUsedHz / 1000).toFixed(2)} kHz -> Achievable resolution ΔR_ach = ${achievableResolutionM.toFixed(3)}m (${bandwidthStatus}).`
    );
  }

  // ==========================================
  // 2. FREQUENCY OPTIMIZATION IN FEASIBLE INTERVAL [1 kHz, 10 kHz]
  // ==========================================
  const optimization = optimizeCarrierFrequency(env, soundSpeed, bandwidthKhz);
  const fc = optimization.selectedFrequency;
  const fL = optimization.fL;
  const fH = optimization.fH;

  rules.push({
    id: 'FREQ_OPT_LINK_MARGIN',
    condition: `Acoustic band [1.0 kHz, 10.0 kHz], B_used = ${bandwidthKhz.toFixed(2)} kHz, T: ${temperature}°C, S: ${salinity} PSU`,
    action: `Allocated carrier fc = ${fc.toFixed(1)} kHz (fL = ${fL.toFixed(1)} kHz, fH = ${fH.toFixed(1)} kHz)`,
    active: true,
    category: 'frequency',
    impact: `Optimizes Predicted Link Margin M = ${optimization.predictedLinkMargin.toFixed(1)} dB within feasible interval [${(1.0 + bandwidthKhz / 2).toFixed(1)}, ${(10.0 - bandwidthKhz / 2).toFixed(1)}] kHz`,
  });

  reasoningSteps.push(
    `Frequency optimization: Evaluated ${optimization.candidates.length} candidates inside feasible interval [${(1.0 + bandwidthKhz / 2).toFixed(1)}, ${(10.0 - bandwidthKhz / 2).toFixed(1)}] kHz -> selected fc = ${fc.toFixed(1)} kHz (${optimization.selectionReason}).`
  );

  // ==========================================
  // 3. MODULATION TYPE SELECTION
  // ==========================================
  let modulation: ModulationType = 'LFM Chirp';
  let pulseDuration = 3.0; // ms (tau <= 5.12 ms for N <= 512 at fs = 100 kS/s)

  if (ambientNoise > 85 || depth > 80) {
    // High ambient noise & clutter -> Barker-13 phase coding
    modulation = 'Barker-13';
    pulseDuration = 3.9; // 13 chips * 0.3 ms = 3.9 ms (N = 390 samples at 100 kS/s)
    rules.push({
      id: 'MOD_BARKER_HIGH_NOISE',
      condition: `Elevated Ambient Noise (${ambientNoise} dB) OR Depth > 80m`,
      action: 'Engaged Barker-13 Binary Phase Coding (BPSK)',
      active: true,
      category: 'modulation',
      impact: 'Provides 11.1 dB pulse compression gain with sharp thumbtack ambiguity for clutter rejection',
    });
    reasoningSteps.push(`Ambient noise or depth threshold exceeded -> Barker-13 BPSK selected for high SNR gain.`);
  } else if (resPen > 0.7) {
    // High penetration priority -> Geometric / Logarithmic frequency sweep
    modulation = 'Geometric Sweep';
    pulseDuration = 3.84; // 3.84 ms (N = 384 samples at 100 kS/s)
    rules.push({
      id: 'MOD_GEOM_SWEEP',
      condition: `High Penetration Priority (ResPen = ${resPen.toFixed(2)})`,
      action: 'Engaged Geometric Logarithmic Frequency Sweep',
      active: true,
      category: 'modulation',
      impact: 'Doppler-tolerant wideband energy concentration for deep sediment penetration',
    });
    reasoningSteps.push(`High penetration requested -> Geometric Sweep configured with wide fractional bandwidth.`);
  } else if (turbidity > 35 || resPen > 0.4) {
    // Standard Pulse Compression need: LFM Chirp
    modulation = 'LFM Chirp';
    pulseDuration = 2.56; // 2.56 ms
    rules.push({
      id: 'MOD_LFM_CHIRP_HIGH_ATTEN',
      condition: `Turbidity (${turbidity} NTU) > 35 OR ResPen > 0.40`,
      action: `Selected LFM Chirp (${bandwidthKhz.toFixed(1)} kHz BW)`,
      active: true,
      category: 'modulation',
      impact: 'Pulse compression allows high transmitted energy without peaking amplifier voltage limit',
    });
    reasoningSteps.push(`High Turbidity or moderate penetration -> LFM Chirp selected for pulse compression.`);
  } else if (depth < 25 && turbidity < 15 && ambientNoise < 60) {
    // Pristine shallow water -> Continuous Wave (CW) tonal for Doppler measurement
    modulation = 'CW';
    pulseDuration = 2.56; // 2.56 ms
    rules.push({
      id: 'MOD_CW_SHALLOW',
      condition: `Clean Shallow Profile (Depth ${depth}m, Turbidity ${turbidity} NTU, Noise ${ambientNoise} dB)`,
      action: 'Selected Continuous Wave (CW) Tonals',
      active: true,
      category: 'modulation',
      impact: 'Narrowband velocity Doppler estimation without range dispersion',
    });
    reasoningSteps.push(`Low-noise shallow profile -> Continuous Wave (CW) selected for Doppler measurement.`);
  } else {
    // Standard ocean survey profile -> Linear Frequency Modulated (LFM) Chirp
    modulation = 'LFM Chirp';
    pulseDuration = 2.56; // 2.56 ms
    rules.push({
      id: 'MOD_LFM_CHIRP',
      condition: 'Standard survey acoustic profile',
      action: `Selected LFM Chirp (${bandwidthKhz.toFixed(1)} kHz BW, ${pulseDuration.toFixed(1)} ms tau)`,
      active: true,
      category: 'modulation',
      impact: 'Linear FM pulse compression provides high energy with sub-meter range resolution',
    });
    reasoningSteps.push(`LFM Chirp configured with ${bandwidthKhz.toFixed(1)} kHz bandwidth across ${fL.toFixed(1)} - ${fH.toFixed(1)} kHz.`);
  }

  // Enforce T <= 5.12 ms limit strictly
  pulseDuration = Math.min(5.12, Math.max(0.5, pulseDuration));

  // ==========================================
  // 4. WINDOW FUNCTION SELECTION
  // ==========================================
  let windowType: WindowType = 'Hamming';

  if (ambientNoise > 80 || turbidity > 50) {
    windowType = 'Blackman';
    rules.push({
      id: 'WIN_BLACKMAN',
      condition: `High Reverb / Noise (${ambientNoise} dB, ${turbidity} NTU)`,
      action: 'Applied Blackman Window Tapering',
      active: true,
      category: 'window',
      impact: 'Suppresses range sidelobes down to -58 dB to prevent echo masking',
    });
    reasoningSteps.push(`High acoustic noise/clutter -> Blackman window applied for -58 dB sidelobe rejection.`);
  } else if (modulation === 'CW') {
    windowType = 'Hann';
    rules.push({
      id: 'WIN_HANN',
      condition: 'Continuous Wave active',
      action: 'Applied Hann Raised-Cosine Window',
      active: true,
      category: 'window',
      impact: 'Smooth pulse envelope turn-on/turn-off prevents transducer ringing',
    });
  } else if (resPen < 0.15 && depth < 30) {
    windowType = 'Rectangular';
    rules.push({
      id: 'WIN_RECT',
      condition: 'Maximum Spatial Resolution Priority',
      action: 'Applied Rectangular (Unwindowed) Burst',
      active: true,
      category: 'window',
      impact: 'Narrowest mainlobe width for finest target separation',
    });
  } else {
    windowType = 'Hamming';
    rules.push({
      id: 'WIN_HAMMING',
      condition: 'Nominal survey transmission profile',
      action: 'Applied Hamming Window Tapering',
      active: true,
      category: 'window',
      impact: 'Optimal tradeoff between -43 dB sidelobe rejection and mainlobe sharpness',
    });
  }

  // ==========================================
  // 5. POWER & AMPLITUDE SETTING
  // ==========================================
  let amplitude = 75; // % of PWM duty excursion
  if (depth > 150 || turbidity > 60 || ambientNoise > 85) {
    amplitude = 95;
    rules.push({
      id: 'PWR_BOOST',
      condition: `High propagation requirement (Depth ${depth}m / Turbidity ${turbidity} NTU)`,
      action: 'Power amplifier output set to 95% (High Power TX)',
      active: true,
      category: 'power',
      impact: 'Maximizes acoustic source level (SL ~ 186 dB re 1uPa @ 1m)',
    });
  } else if (depth < 25 && turbidity < 20) {
    amplitude = 45;
    rules.push({
      id: 'PWR_CONSERVE',
      condition: `Shallow basin (${depth}m) - reverberation mitigation`,
      action: 'Power amplifier output set to 45% (Eco / Low Ringing)',
      active: true,
      category: 'power',
      impact: 'Prevents near-field receiver saturation and transducer thermal dissipation',
    });
  }

  // Derived fields
  const chirpRate = modulation === 'CW' ? 0 : Math.round((bandwidthKhz / pulseDuration) * 100) / 100;
  const timeBandwidthProduct =
    modulation === 'CW' ? 1.0 : Math.round(bandwidthKhz * pulseDuration * 10) / 10;
  const isChirpOrBarker = modulation !== 'CW';
  const rangeResolution = isChirpOrBarker ? achievableResolutionM : calculateRangeResolution(soundSpeed, bandwidthKhz, pulseDuration, false);

  // fs = 100 kS/s => sample count N = round(pulseDuration_ms * 100) <= 512
  const sampleCount = Math.min(512, Math.round(pulseDuration * 100));

  const params: TransmitterParameters = {
    centerFrequency: Math.round(fc * 10) / 10,
    fL: Math.round(fL * 10) / 10,
    fH: Math.round(fH * 10) / 10,
    modulationType: modulation,
    windowType,
    bandwidth: Math.round(bandwidthKhz * 100) / 100,
    pulseDuration: Math.round(pulseDuration * 100) / 100,
    amplitude,
    chirpRate,
    timeBandwidthProduct,
    rangeResolution: Math.round(rangeResolution * 1000) / 1000,
    pwmSampleRate: 100, // 100 kSPS via TIM3 ARR=639
    dacSampleRate: 100, // backward compatibility
    sampleCount,
    pulseRepetitionInterval: 100, // 100 ms (10 Hz ping rate)

    // Authoritative Firmware-Synchronized Bandwidth & Resolution Flow
    requestedResolutionM: Math.round(requestedResolutionM * 1000) / 1000,
    bandwidthRequiredHz: Math.round(bandwidthRequiredHz),
    bandwidthUsedHz: Math.round(bandwidthUsedHz),
    achievableResolutionM: Math.round(achievableResolutionM * 1000) / 1000,
    bandwidthLimited,
    bandwidthStatus,
  };

  // High-level summary string
  let summaryText = '';
  if (ambientNoise > 85) {
    summaryText = `Elevated Ambient Noise (${ambientNoise} dB) → ${modulation} (${fc.toFixed(1)} kHz) engaged with ${windowType} tapering for maximum clutter rejection.`;
  } else if (resPen > 0.7) {
    summaryText = `High Penetration Priority (ResPen ${resPen.toFixed(2)}) → ${modulation} at ${fc.toFixed(1)} kHz (${fL.toFixed(1)}–${fH.toFixed(1)} kHz) with long pulse duration (τ=${pulseDuration}ms).`;
  } else if (resPen < 0.2 && depth < 30) {
    summaryText = `High Resolution Priority in Shallow Basin (${depth}m) → ${modulation} at ${fc.toFixed(1)} kHz with wide ${bandwidthKhz.toFixed(1)} kHz bandwidth (ΔR=${rangeResolution}m).`;
  } else {
    summaryText = `Nominal Oceanic Channel (c=${soundSpeed}m/s) → ${modulation} at ${fc.toFixed(1)} kHz (${fL.toFixed(1)}–${fH.toFixed(1)} kHz, BW=${bandwidthKhz.toFixed(1)} kHz) with ${windowType} windowing.`;
  }

  return {
    params,
    trace: {
      summaryText,
      activeReasoning: reasoningSteps,
      rulesFired: rules,
      confidence: 0.98,
      modeDescription: `${modulation} • fc=${fc.toFixed(1)}kHz [${fL.toFixed(1)}–${fH.toFixed(1)}kHz] • BW=${bandwidthKhz.toFixed(1)}kHz • Window=${windowType}`,
      optimization,
    },
  };
}

/**
 * Visual styling theme per modulation scheme
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
    description: 'Continuous Wave (Narrowband Monotone Doppler Pulse)',
  },
  'LFM Chirp': {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    primaryHex: '#10b981',
    description: 'Linear Frequency Modulated Chirp (1–10 kHz Pulse Compression)',
  },
  'Geometric Sweep': {
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    primaryHex: '#f59e0b',
    description: 'Geometric/Logarithmic Sweep (Doppler-Tolerant Penetration)',
  },
  'Barker-13': {
    bg: 'bg-purple-950/40',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    primaryHex: '#a855f7',
    description: '13-Bit Binary Phase-Coded Pulse (+1,+1,+1,+1,+1,-1,-1,+1,+1,-1,+1,-1,+1)',
  },
  'Hyperbolic FM': {
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/50',
    text: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
    primaryHex: '#f43f5e',
    description: 'Hyperbolic Frequency Modulation (Exact Doppler Invariant)',
  },
};
