import {
  EnvironmentalInputs,
  PhysicalAcoustics,
  TransmitterParameters,
  AbsorptionBreakdown,
  PropagationLossBreakdown,
  FrequencyOptimizationResult,
  FrequencyCandidate,
} from '../types';

/**
 * 1. Mackenzie (1981) Empirical Sound Speed in Seawater
 * c(T,S,D) = 1448.96 + 4.591T - 0.05304T² + 2.374×10⁻⁴T³ + 1.340(S−35)
 *            + 1.630×10⁻²D + 1.675×10⁻⁷D² - 1.025×10⁻²T(S−35) - 7.139×10⁻¹³TD³
 *
 * T: Temperature in °C (-2 to 35)
 * S: Salinity in PSU / ppt (0 to 45)
 * D: Depth in meters (0 to 8000)
 */
export function calculateSoundSpeed(T: number, S: number, D: number): number {
  const c =
    1448.96 +
    4.591 * T -
    0.05304 * Math.pow(T, 2) +
    2.374e-4 * Math.pow(T, 3) +
    1.340 * (S - 35) +
    1.630e-2 * D +
    1.675e-7 * Math.pow(D, 2) -
    1.025e-2 * T * (S - 35) -
    7.139e-13 * T * Math.pow(D, 3);

  return Math.round(c * 10) / 10;
}

/**
 * 2. Authoritative Francois–Garrison (1982) Chemical Absorption Model
 *
 * Exposes full structured breakdown:
 * - Boric acid relaxation: alpha1 (dependent on pH, T, S, sound speed)
 * - Magnesium sulfate relaxation: alpha2 (dependent on T, S, D, sound speed)
 * - Pure water viscosity: alpha3 (dependent on T, D)
 * - Total absorption: alpha = alpha1 + alpha2 + alpha3 (dB/km)
 * - Relaxation frequencies: f1, f2 (kHz)
 *
 * f: Frequency in kHz (1 - 10 kHz acoustic operating band)
 * T: Temperature in °C
 * S: Salinity in PSU
 * pH: Seawater pH (typically 7.6 - 8.4)
 * D: Depth in meters
 * soundSpeed: sound speed c in m/s
 */
export function calculateFrancoisGarrisonAbsorption(
  f: number,
  T: number,
  S: number,
  pH: number,
  D: number,
  soundSpeed?: number
): AbsorptionBreakdown {
  const c = soundSpeed ?? calculateSoundSpeed(T, S, D);
  const T_k = T + 273.15; // Absolute temperature (K)

  // 1. Boric acid relaxation frequency f1 (kHz)
  // f1 = 2.8 * sqrt(S/35) * 10^(4 - 1245 / T_k)
  const f1 = 2.8 * Math.sqrt(Math.max(0.1, S) / 35) * Math.pow(10, 4 - 1245 / T_k);

  // 2. Magnesium sulfate relaxation frequency f2 (kHz)
  // f2 = (8.17 * 10^(8 - 1990 / T_k)) / (1 + 0.0018 * (S - 35))
  const f2 = (8.17 * Math.pow(10, 8 - 1990 / T_k)) / Math.max(0.5, 1 + 0.0018 * (S - 35));

  // Pressure depth correction factors P1, P2, P3
  const P1 = 1.0;
  const P2 = 1.0 - 1.37e-4 * D + 6.2e-9 * Math.pow(D, 2);
  const P3 = 1.0 - 3.83e-5 * D + 4.9e-10 * Math.pow(D, 2);

  // Boric acid contribution alpha1 (dB/km)
  // A1 = (8.86 / c) * 10^(0.78 * pH - 5)
  const A1 = (8.86 / c) * Math.pow(10, 0.78 * pH - 5);
  const alphaBoric = (A1 * P1 * f1 * Math.pow(f, 2)) / (Math.pow(f1, 2) + Math.pow(f, 2));

  // Magnesium sulfate contribution alpha2 (dB/km)
  // A2 = 21.44 * (S / 35) * (1 + 0.025 * T) / c
  const A2 = (21.44 * (Math.max(0.1, S) / 35) * (1 + 0.025 * T)) / c;
  const alphaMgSo4 = (A2 * P2 * f2 * Math.pow(f, 2)) / (Math.pow(f2, 2) + Math.pow(f, 2));

  // Pure water viscosity contribution alpha3 (dB/km)
  const A3 =
    T <= 20
      ? 4.937e-4 - 2.59e-5 * T + 9.11e-7 * Math.pow(T, 2) - 1.5e-8 * Math.pow(T, 3)
      : 3.964e-4 - 1.146e-5 * T + 1.45e-7 * Math.pow(T, 2) - 3.64e-10 * Math.pow(T, 3);
  const alphaPureWater = A3 * P3 * Math.pow(f, 2);

  const total = alphaBoric + alphaMgSo4 + alphaPureWater;

  return {
    boric: Math.round(alphaBoric * 1000) / 1000,
    magnesium: Math.round(alphaMgSo4 * 1000) / 1000,
    pureWater: Math.round(alphaPureWater * 1000) / 1000,
    total: Math.max(0.001, Math.round(total * 1000) / 1000),
    f1: Math.round(f1 * 100) / 100,
    f2: Math.round(f2 * 100) / 100,
  };
}

/**
 * Calculates total absorption coefficient alpha in dB/km
 */
export function calculateAbsorptionCoefficient(
  f: number,
  T: number,
  S: number,
  pH: number,
  D: number,
  soundSpeed?: number
): number {
  return calculateFrancoisGarrisonAbsorption(f, T, S, pH, D, soundSpeed).total;
}

/**
 * 3. Two-Way Active-Sonar Propagation Loss Model
 *
 * R_km = R / 1000
 * TL_2way = 40 log10(R) + 2 α(f) R_km
 *
 * Spreading loss: 40 log10(R)
 * Absorption loss: 2 α(f) R_km
 */
export function calculateTwoWayPropagationLoss(
  rangeMeters: number,
  alphaDbPerKm: number
): PropagationLossBreakdown {
  const R = Math.max(1, rangeMeters);
  const R_km = R / 1000;
  const spreadingLoss = 40 * Math.log10(R);
  const absorptionLoss = 2 * alphaDbPerKm * R_km;
  const totalTwoWayLoss = spreadingLoss + absorptionLoss;

  return {
    spreadingLoss: Math.round(spreadingLoss * 10) / 10,
    absorptionLoss: Math.round(absorptionLoss * 10) / 10,
    totalTwoWayLoss: Math.round(totalTwoWayLoss * 10) / 10,
  };
}

/**
 * Legacy compatibility helper for one-way / two-way transmission loss
 */
export function calculateTransmissionLoss(rangeMeters: number, alphaDbPerKm: number): number {
  return calculateTwoWayPropagationLoss(rangeMeters, alphaDbPerKm).totalTwoWayLoss;
}

/**
 * 4. Turbidity / Scattering Penalty Model
 *
 * L_scat = K_tau * tau * R_km
 * For current implementation: K_tau = 0.
 * Turbidity is an environmental input and decision variable, but no invented quantitative scattering penalty.
 */
export function calculateScatteringPenalty(
  turbidityNtu: number,
  rangeMeters: number,
  kTau: number = 0
): number {
  const R_km = Math.max(0, rangeMeters) / 1000;
  const lScat = kTau * turbidityNtu * R_km;
  return Math.round(lScat * 100) / 100;
}

/**
 * 5. Predicted Link Margin Model
 *
 * M(f, R) = SNR_ref - TL_2way - L_scat
 *
 * SNR_ref is a calibrated reference parameter (e.g. 140 dB), not a measured real-time receiver SNR.
 */
export function calculatePredictedLinkMargin(
  snrRef: number,
  twoWayLoss: number,
  scatteringPenalty: number = 0
): number {
  const margin = snrRef - twoWayLoss - scatteringPenalty;
  return Math.round(margin * 10) / 10;
}

/**
 * 6. Authoritative STM32-Synchronized Bandwidth & Resolution Flow
 *
 * Requested Range Resolution: deltaR_requested (meters)
 * B_required = c / (2 * deltaR_requested) [Hz]
 * Hardware limit B_max = 9000 Hz (1–10 kHz transducer operating band)
 *
 * If B_required <= 9000:
 *   B_used = B_required
 *   bandwidth_limited = false
 *   achievable_resolution = requested_resolution
 *   bandwidth_status = "Within Hardware Limit"
 *
 * If B_required > 9000:
 *   B_used = 9000
 *   bandwidth_limited = true
 *   achievable_resolution = c / (2 * B_used)
 *   bandwidth_status = "Bandwidth Limited"
 */
export interface BandwidthResolutionFlow {
  requestedResolutionM: number;
  bandwidthRequiredHz: number;
  bandwidthUsedHz: number;
  bandwidthKhz: number; // B_used in kHz
  achievableResolutionM: number;
  bandwidthLimited: boolean;
  bandwidthStatus: string;
}

export function computeBandwidthResolutionFlow(
  soundSpeed: number,
  requestedResolutionMeters: number
): BandwidthResolutionFlow {
  const deltaR_req = Math.max(0.001, requestedResolutionMeters);
  const c = Math.max(1000, soundSpeed);

  // B_required = c / (2 * deltaR_req) in Hz
  const bRequiredHz = Math.round((c / (2 * deltaR_req)) * 100) / 100;
  const bMaxHz = 9000; // 9 kHz hardware maximum contiguous bandwidth

  let bUsedHz: number;
  let bandwidthLimited: boolean;
  let achievableResolutionM: number;
  let bandwidthStatus: string;

  if (bRequiredHz <= bMaxHz) {
    bUsedHz = Math.max(100, bRequiredHz);
    bandwidthLimited = false;
    achievableResolutionM = deltaR_req;
    bandwidthStatus = 'Within Hardware Limit';
  } else {
    bUsedHz = bMaxHz;
    bandwidthLimited = true;
    achievableResolutionM = Math.round((c / (2 * bUsedHz)) * 10000) / 10000;
    bandwidthStatus = 'Bandwidth Limited';
  }

  const bandwidthKhz = Math.round((bUsedHz / 1000) * 100) / 100;

  return {
    requestedResolutionM: deltaR_req,
    bandwidthRequiredHz: bRequiredHz,
    bandwidthUsedHz: bUsedHz,
    bandwidthKhz,
    achievableResolutionM,
    bandwidthLimited,
    bandwidthStatus,
  };
}

export function calculateRangeResolution(
  soundSpeed: number,
  bandwidthKhz: number,
  pulseDurationMs: number,
  isChirpOrBarker: boolean
): number {
  if (isChirpOrBarker && bandwidthKhz > 0.05) {
    const bHz = Math.min(9000, bandwidthKhz * 1000);
    const deltaR = soundSpeed / (2 * bHz);
    return Math.max(0.01, Math.round(deltaR * 1000) / 1000);
  } else {
    const tauSec = pulseDurationMs / 1000;
    const deltaR = (soundSpeed * tauSec) / 2;
    return Math.max(0.05, Math.round(deltaR * 100) / 100);
  }
}

/**
 * Legacy compatibility wrapper for calculateRequiredBandwidth
 */
export function calculateRequiredBandwidth(
  soundSpeed: number,
  desiredResolutionMeters: number
): number {
  return computeBandwidthResolutionFlow(soundSpeed, desiredResolutionMeters).bandwidthKhz;
}

/**
 * 7. Authoritative Frequency Optimization within Feasible Band [1 kHz, 10 kHz]
 *
 * Feasible centre frequency interval:
 * 1 kHz + B/2 <= fc <= 10 kHz - B/2
 *
 * fL = fc - B/2
 * fH = fc + B/2
 *
 * Select fc = argmax M(fc) subject to valid frequency constraints.
 */
export function optimizeCarrierFrequency(
  env: EnvironmentalInputs,
  soundSpeed: number,
  bandwidthKhz: number,
  referenceRangeMeters: number = 150,
  snrRef: number = 140
): FrequencyOptimizationResult {
  const B = Math.min(9.0, Math.max(0.1, bandwidthKhz));
  const fMinHardware = 1.0; // kHz
  const fMaxHardware = 10.0; // kHz

  const fcMin = Math.min(5.5, Math.round((fMinHardware + B / 2) * 100) / 100);
  const fcMax = Math.max(fcMin, Math.round((fMaxHardware - B / 2) * 100) / 100);

  // Grid of candidate centre frequencies across [1.0 + B/2, 10.0 - B/2]
  const step = 0.5; // kHz
  const candidates: FrequencyCandidate[] = [];

  let bestFc = fcMin;
  let maxMargin = -Infinity;

  // Candidate sweep
  for (let f = 1.0; f <= 10.0; f += step) {
    const roundedFc = Math.round(f * 10) / 10;
    const fL = Math.round((roundedFc - B / 2) * 10) / 10;
    const fH = Math.round((roundedFc + B / 2) * 10) / 10;

    const isValid = fL >= fMinHardware - 0.001 && fH <= fMaxHardware + 0.001 && B <= 9.0;

    const absBreakdown = calculateFrancoisGarrisonAbsorption(
      roundedFc,
      env.temperature,
      env.salinity,
      env.pH,
      env.depth,
      soundSpeed
    );

    const propLoss = calculateTwoWayPropagationLoss(referenceRangeMeters, absBreakdown.total);
    const scatLoss = calculateScatteringPenalty(env.turbidity, referenceRangeMeters, 0);
    const margin = calculatePredictedLinkMargin(snrRef, propLoss.totalTwoWayLoss, scatLoss);

    candidates.push({
      fc: roundedFc,
      fL,
      fH,
      bandwidth: B,
      absorption: absBreakdown.total,
      twoWayLoss: propLoss.totalTwoWayLoss,
      predictedLinkMargin: margin,
      valid: isValid,
    });

    if (isValid && margin > maxMargin) {
      maxMargin = margin;
      bestFc = roundedFc;
    }
  }

  // If no candidates were strictly valid (e.g. B > 9 kHz), clamp to mid-band
  if (bestFc < fcMin || bestFc > fcMax) {
    bestFc = Math.max(fcMin, Math.min(fcMax, (fcMin + fcMax) / 2));
    bestFc = Math.round(bestFc * 10) / 10;
  }

  const selectedFL = Math.round((bestFc - B / 2) * 10) / 10;
  const selectedFH = Math.round((bestFc + B / 2) * 10) / 10;

  const selectedAbs = calculateFrancoisGarrisonAbsorption(
    bestFc,
    env.temperature,
    env.salinity,
    env.pH,
    env.depth,
    soundSpeed
  );
  const selectedProp = calculateTwoWayPropagationLoss(referenceRangeMeters, selectedAbs.total);
  const selectedMargin = calculatePredictedLinkMargin(snrRef, selectedProp.totalTwoWayLoss, 0);

  return {
    candidates,
    selectedFrequency: bestFc,
    fL: selectedFL,
    fH: selectedFH,
    bandwidth: B,
    predictedLinkMargin: selectedMargin,
    selectionReason: 'Maximum valid Predicted Link Margin',
  };
}

/**
 * 8. Authoritative Physical Acoustics Package
 *
 * Computes complete structured physical acoustics results with single source of truth.
 */
export function computePhysicalAcoustics(
  env: EnvironmentalInputs,
  params: TransmitterParameters
): PhysicalAcoustics {
  const c = calculateSoundSpeed(env.temperature, env.salinity, env.depth);

  // Authoritative Francois-Garrison chemical absorption breakdown
  const absorptionBreakdown = calculateFrancoisGarrisonAbsorption(
    params.centerFrequency,
    env.temperature,
    env.salinity,
    env.pH,
    env.depth,
    c
  );
  const alpha = absorptionBreakdown.total;

  // Pulse compression gain
  const tb = Math.max(1, params.timeBandwidthProduct);
  const isCompressed = params.modulationType !== 'CW';
  const pulseCompressionGain = isCompressed ? Math.round(10 * Math.log10(tb) * 10) / 10 : 0;

  // Source Power & Source Level
  const amplitudeFraction = params.amplitude / 100;
  const sourcePower = Math.round(Math.pow(amplitudeFraction, 2) * 80 * 10) / 10 + 5; // 5W - 85W
  const transducerEfficiency = 0.65;
  const sourceLevel =
    Math.round(
      (170.8 + 10 * Math.log10(Math.max(1, sourcePower * transducerEfficiency))) * 10
    ) / 10;

  // Reference 2-way propagation loss at nominal 150m (or depth-scaled)
  const referenceRange = Math.min(300, Math.max(50, env.depth * 2));
  const propagationLoss = calculateTwoWayPropagationLoss(referenceRange, alpha);
  const transmissionLoss = propagationLoss.totalTwoWayLoss;

  // Scattering penalty (K_tau = 0)
  const scatteringPenalty = calculateScatteringPenalty(env.turbidity, referenceRange, 0);

  // Reference SNR constant for link margin
  const snrRef = Math.round((sourceLevel + pulseCompressionGain - (env.ambientNoise - 14) - 15) * 10) / 10;
  const predictedLinkMargin = calculatePredictedLinkMargin(
    snrRef,
    propagationLoss.totalTwoWayLoss,
    scatteringPenalty
  );

  // Estimated max detection range where Predicted Link Margin >= Detection Threshold (10 dB)
  const detectionThreshold = 10; // dB
  let estRange = 50;
  for (let r = 20; r <= 3000; r += 10) {
    const testProp = calculateTwoWayPropagationLoss(r, alpha);
    const testMargin = calculatePredictedLinkMargin(snrRef, testProp.totalTwoWayLoss, 0);
    if (testMargin >= detectionThreshold) {
      estRange = r;
    } else {
      break;
    }
  }

  return {
    soundSpeed: c,
    absorptionCoefficient: alpha,
    absorptionBreakdown,
    transmissionLoss,
    propagationLoss,
    scatteringPenalty,
    predictedLinkMargin,
    snr: predictedLinkMargin, // for backward compatibility with UI
    sourcePower,
    sourceLevel,
    estimatedMaxRange: estRange,
    pulseCompressionGain,
  };
}
