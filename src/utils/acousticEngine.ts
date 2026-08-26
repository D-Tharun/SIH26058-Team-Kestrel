import { EnvironmentalInputs, PhysicalAcoustics, TransmitterParameters } from '../types';

/**
 * Calculates sound speed in seawater using Mackenzie (1981) empirical formula.
 * T: Temperature in °C (-2 to 35)
 * S: Salinity in ppt (0 to 45)
 * D: Depth in meters (0 to 8000)
 */
export function calculateSoundSpeed(T: number, S: number, D: number): number {
  // Mackenzie (1981) formula:
  // c = 1448.96 + 4.591*T - 5.304e-2*T^2 + 2.374e-4*T^3 + 1.340*(S - 35) + 1.630e-2*D + 1.675e-7*D^2 - 1.025e-2*T*(S - 35) - 7.139e-13*T*D^3
  const c =
    1448.96 +
    4.591 * T -
    5.304e-2 * Math.pow(T, 2) +
    2.374e-4 * Math.pow(T, 3) +
    1.34 * (S - 35) +
    1.63e-2 * D +
    1.675e-7 * Math.pow(D, 2) -
    1.025e-2 * T * (S - 35) -
    7.139e-13 * T * Math.pow(D, 3);

  return Math.round(c * 10) / 10;
}

/**
 * Calculates acoustic absorption coefficient alpha (dB/km) in seawater
 * using Ainslie & McColm (1998) simplified standard oceanographic model.
 * f: Center Frequency in kHz
 * T: Temperature in °C
 * S: Salinity in ppt
 * pH: Sea water pH (typically 7.8 - 8.2)
 * D: Depth in meters
 */
export function calculateAbsorptionCoefficient(
  f: number, // in kHz
  T: number, // in °C
  S: number, // in ppt
  pH: number,
  D: number // in meters
): number {
  const depthKm = D / 1000;
  
  // Boric acid relaxation frequency f1 (kHz)
  const f1 = 0.78 * Math.sqrt(S / 35) * Math.exp(T / 26);
  
  // Magnesium sulfate relaxation frequency f2 (kHz)
  const f2 = 42 * Math.exp(T / 17);
  
  // Boric acid absorption term (dependent on pH)
  const a1 = 0.106 * Math.exp((pH - 8) / 0.56);
  const termBoric = (a1 * f1 * Math.pow(f, 2)) / (Math.pow(f1, 2) + Math.pow(f, 2));
  
  // Magnesium sulfate absorption term
  const a2 = 0.52 * (1 + T / 43) * (S / 35);
  const termMg = (a2 * f2 * Math.pow(f, 2)) / (Math.pow(f2, 2) + Math.pow(f, 2)) * Math.exp(-depthKm / 6);
  
  // Pure water viscosity term
  const a3 = 0.00049 * Math.exp(-(T / 27) - (depthKm / 17));
  const termWater = a3 * Math.pow(f, 2);
  
  const alpha = termBoric + termMg + termWater;
  return Math.max(0.01, Math.round(alpha * 100) / 100);
}

/**
 * Calculates Transmission Loss (TL) in dB for one-way propagation at range R (meters).
 * Spherical spreading + absorption.
 */
export function calculateTransmissionLoss(rangeMeters: number, alphaDbPerKm: number): number {
  if (rangeMeters <= 1) return 0;
  const spreadingLoss = 20 * Math.log10(rangeMeters);
  const absorptionLoss = (alphaDbPerKm * rangeMeters) / 1000;
  return Math.round((spreadingLoss + absorptionLoss) * 10) / 10;
}

/**
 * Calculates Range Resolution (Delta R in meters)
 * Delta R = c / (2 * B) for chirp/pulse compression
 * Delta R = (c * tau) / 2 for unmodulated CW
 */
export function calculateRangeResolution(
  soundSpeed: number,
  bandwidthKhz: number,
  pulseDurationMs: number,
  isChirpOrBarker: boolean
): number {
  if (isChirpOrBarker && bandwidthKhz > 0.1) {
    // Delta R = c / (2 * B) where B is in Hz
    const bHz = bandwidthKhz * 1000;
    const deltaR = soundSpeed / (2 * bHz);
    return Math.max(0.01, Math.round(deltaR * 100) / 100);
  } else {
    // Delta R = c * tau / 2 where tau is in seconds
    const tauSec = pulseDurationMs / 1000;
    const deltaR = (soundSpeed * tauSec) / 2;
    return Math.max(0.05, Math.round(deltaR * 100) / 100);
  }
}

/**
 * Computes full physical acoustics package
 */
export function computePhysicalAcoustics(
  env: EnvironmentalInputs,
  params: TransmitterParameters
): PhysicalAcoustics {
  const c = calculateSoundSpeed(env.temperature, env.salinity, env.depth);
  const alpha = calculateAbsorptionCoefficient(
    params.centerFrequency,
    env.temperature,
    env.salinity,
    env.pH,
    env.depth
  );

  // Time-bandwidth product
  const tb = Math.max(1, params.timeBandwidthProduct);
  const isCompressed = params.modulationType !== 'CW';
  const pulseCompressionGain = isCompressed ? Math.round(10 * Math.log10(tb) * 10) / 10 : 0;

  // Source Power based on amplitude setting (scaled to nominal 10W - 100W transmitter power)
  const amplitudeFraction = params.amplitude / 100;
  const sourcePower = Math.round(Math.pow(amplitudeFraction, 2) * 80 * 10) / 10 + 5; // 5W - 85W
  // Source Level (SL) in dB re 1uPa @ 1m (approx 170.8 + 10*log10(P_acoustic * efficiency))
  const transducerEfficiency = 0.65;
  const sourceLevel = Math.round((170.8 + 10 * Math.log10(Math.max(1, sourcePower * transducerEfficiency))) * 10) / 10;

  // Reference 2-way transmission loss at reference 150m
  const referenceRange = Math.min(300, Math.max(50, env.depth * 2));
  const tlOneWay = calculateTransmissionLoss(referenceRange, alpha);
  const transmissionLoss = Math.round(tlOneWay * 10) / 10;

  // Active Sonar Equation for SNR:
  // SNR = SL - 2*TL + TS - (NL - DI) + Gp
  const targetStrength = -15; // dB (nominal medium underwater target)
  const directivityIndex = 14; // dB (nominal 4-element transducer array)
  const ambientNoise = env.ambientNoise;
  
  const snr = Math.round((sourceLevel - 2 * tlOneWay + targetStrength - (ambientNoise - directivityIndex) + pulseCompressionGain) * 10) / 10;

  // Estimated max detection range where SNR >= detection threshold (12 dB)
  // Approximate inverse solver
  const detectionThreshold = 10; // dB
  let estRange = 50;
  for (let r = 20; r <= 2500; r += 10) {
    const tl = 20 * Math.log10(r) + (alpha * r) / 1000;
    const testSnr = sourceLevel - 2 * tl + targetStrength - (ambientNoise - directivityIndex) + pulseCompressionGain;
    if (testSnr >= detectionThreshold) {
      estRange = r;
    } else {
      break;
    }
  }

  return {
    soundSpeed: c,
    absorptionCoefficient: alpha,
    transmissionLoss,
    snr,
    sourcePower,
    sourceLevel,
    estimatedMaxRange: estRange,
    pulseCompressionGain
  };
}
