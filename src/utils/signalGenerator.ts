import { TransmitterParameters, WaveformData, WindowType } from '../types';

/**
 * 1. Window Weight Calculation
 * Hann, Hamming, Blackman, Rectangular
 */
export function getWindowWeight(n: number, N: number, type: WindowType): number {
  if (N <= 1) return 1.0;
  const a = (2 * Math.PI * n) / (N - 1);
  switch (type) {
    case 'Hamming':
      return 0.54 - 0.46 * Math.cos(a);
    case 'Hann':
      return 0.5 * (1 - Math.cos(a));
    case 'Blackman':
      return 0.42 - 0.5 * Math.cos(a) + 0.08 * Math.cos(2 * a);
    case 'Rectangular':
    default:
      return 1.0;
  }
}

const BARKER_13 = [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1];
const PWM_ARR = 639; // STM32 TIM3 Auto-Reload Register for 100 kHz PWM carrier
const FS_HZ = 100000; // 100 kS/s sampling rate

export interface WaveformSampleResult {
  samples: number[]; // Normalized [-1.0, +1.0] windowed samples
  pwmDuty: number[]; // 0 to 639 PWM duty register values
  envelope: number[]; // Window envelope amplitude
  sampleCount: number;
  samplingRateHz: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Synthesizes discrete sampled waveform for Sonar Transmitter.
 *
 * Model:
 * - fs = 100 kS/s (100,000 Hz)
 * - N = round(T_sec * fs) = round(pulseDuration_ms * 100)
 * - Nmax = 512 => Tmax = 5.12 ms
 * - If N > 512: Returns error state.
 */
export function generateWaveformSamples(
  params: TransmitterParameters,
  phaseOffset: number = 0
): WaveformSampleResult {
  const { centerFrequency, bandwidth, modulationType, windowType, amplitude, pulseDuration } = params;

  // Calculate N from actual sampling model
  const durSec = pulseDuration / 1000;
  const N = Math.round(durSec * FS_HZ);

  if (N > 512) {
    return {
      samples: new Array(512).fill(0),
      pwmDuty: new Array(512).fill(Math.round(PWM_ARR / 2)),
      envelope: new Array(512).fill(0),
      sampleCount: 512,
      samplingRateHz: FS_HZ,
      isValid: false,
      errorMessage: `Configuration error: N = ${N} exceeds maximum hardware buffer Nmax = 512 (pulse duration must be <= 5.12 ms).`,
    };
  }

  const actualN = Math.max(16, N);
  const rawSignal: number[] = new Array(actualN);
  const samples: number[] = new Array(actualN);
  const pwmDuty: number[] = new Array(actualN);
  const envelope: number[] = new Array(actualN);

  const A = Math.max(0, Math.min(1.0, amplitude / 100));
  const fcHz = centerFrequency * 1000; // in Hz (1,000 - 10,000 Hz)
  const bHz = bandwidth * 1000; // in Hz
  const fL = Math.max(1000, fcHz - bHz / 2);
  const fH = Math.min(10000, fcHz + bHz / 2);
  const T = actualN / FS_HZ; // duration in seconds

  // Synthesize raw signal based on modulation scheme
  if (modulationType === 'CW') {
    // Continuous Wave (CW): x[n] = A * sin(2π * fc * n / fs)
    for (let n = 0; n < actualN; n++) {
      const phase = 2 * Math.PI * fcHz * (n / FS_HZ) + phaseOffset;
      rawSignal[n] = A * Math.sin(phase);
    }
  } else if (modulationType === 'LFM Chirp') {
    // Linear FM Chirp: f(t) = fL + (B / T) * t, φ(t) = 2π * (fL * t + (B / 2T) * t²)
    const B_actual = fH - fL;
    for (let n = 0; n < actualN; n++) {
      const t = n / FS_HZ;
      const phase = 2 * Math.PI * (fL * t + (B_actual / (2 * T)) * Math.pow(t, 2)) + phaseOffset;
      rawSignal[n] = A * Math.sin(phase);
    }
  } else if (modulationType === 'Geometric Sweep') {
    // Geometric / Logarithmic Sweep: f(t) = fL * (fH / fL)^(t / T)
    // φ[n] = φ[n-1] + 2π * f[n] / fs
    let currentPhase = phaseOffset;
    const ratio = Math.max(1.05, fH / fL);
    for (let n = 0; n < actualN; n++) {
      const t = n / (actualN - 1 || 1);
      const instFreq = fL * Math.pow(ratio, t);
      if (n > 0) {
        currentPhase += (2 * Math.PI * instFreq) / FS_HZ;
      }
      rawSignal[n] = A * Math.sin(currentPhase);
    }
  } else if (modulationType === 'Barker-13') {
    // Barker-13: x(t) = A * b_k * sin(2π * fc * t), k = floor(13 * t / T)
    for (let n = 0; n < actualN; n++) {
      const k = Math.min(12, Math.floor((13 * n) / actualN));
      const chipSign = BARKER_13[k];
      const phase = 2 * Math.PI * fcHz * (n / FS_HZ) + phaseOffset;
      rawSignal[n] = A * chipSign * Math.sin(phase);
    }
  } else if (modulationType === 'Hyperbolic FM') {
    // Hyperbolic FM: exact Doppler invariant
    const deltaF = Math.max(100, fH - fL);
    for (let n = 0; n < actualN; n++) {
      const t = n / FS_HZ;
      const tFrac = (deltaF / fH) * (t / T);
      const phase = -2 * Math.PI * ((fL * fH * T) / deltaF) * Math.log(Math.max(0.001, 1 - tFrac)) + phaseOffset;
      rawSignal[n] = A * (isNaN(phase) ? Math.sin(2 * Math.PI * fcHz * t) : Math.sin(phase));
    }
  } else {
    for (let n = 0; n < actualN; n++) {
      const phase = 2 * Math.PI * fcHz * (n / FS_HZ) + phaseOffset;
      rawSignal[n] = A * Math.sin(phase);
    }
  }

  // Apply windowing and compute PWM Duty mapping
  for (let n = 0; n < actualN; n++) {
    const w = getWindowWeight(n, actualN, windowType);
    envelope[n] = A * w;
    const windowed = rawSignal[n] * w;
    const clamped = Math.max(-1.0, Math.min(1.0, windowed));
    samples[n] = clamped;

    // PWM Duty Mapping: Duty[n] = (0.5 + 0.5 * x[n]) * ARR
    const duty = Math.round((0.5 + 0.5 * clamped) * PWM_ARR);
    pwmDuty[n] = Math.max(0, Math.min(PWM_ARR, duty));
  }

  return {
    samples,
    pwmDuty,
    envelope,
    sampleCount: actualN,
    samplingRateHz: FS_HZ,
    isValid: true,
  };
}

/**
 * 32-Bin Discrete Fourier Transform (FFT Magnitude) derived directly from generated waveform samples.
 *
 * Frequency span: 0.5 kHz to 12.0 kHz (covering 1–10 kHz acoustic operating band).
 * NO artificial Gaussian profiling, NO random noise injection, NO hardcoded peaks.
 */
export function computeFFT32(
  samples: number[],
  centerFreqKhz: number,
  fsHz: number = FS_HZ
): { bins: number[]; frequencies: number[]; peakFreq: number; peakMatchDelta: number } {
  const N = samples.length;
  const numBins = 32;
  const bins: number[] = new Array(numBins).fill(0);
  const frequencies: number[] = new Array(numBins).fill(0);

  // Dynamic Frequency Span for 1 - 10 kHz Sonar Band
  const minFreqKhz = 0.5;
  const maxFreqKhz = 12.0;
  const freqStepKhz = (maxFreqKhz - minFreqKhz) / (numBins - 1);

  let maxMag = 0;
  let peakBinIndex = 0;

  // Real Discrete Fourier Transform at each bin frequency
  for (let k = 0; k < numBins; k++) {
    const fKhz = minFreqKhz + k * freqStepKhz;
    frequencies[k] = Math.round(fKhz * 10) / 10;
    const fHz = fKhz * 1000;

    let real = 0;
    let imag = 0;

    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * fHz * n) / fsHz;
      real += samples[n] * Math.cos(angle);
      imag -= samples[n] * Math.sin(angle);
    }

    // Magnitude normalized by N/2
    const dftMag = Math.sqrt(real * real + imag * imag) / (N / 2 || 1);
    bins[k] = dftMag;

    if (dftMag > maxMag) {
      maxMag = dftMag;
      peakBinIndex = k;
    }
  }

  // Normalize relative to maximum bin for UI bar chart display
  if (maxMag > 0.001) {
    for (let k = 0; k < numBins; k++) {
      bins[k] = Math.max(0.02, Math.min(1.0, bins[k] / maxMag));
    }
  } else {
    bins.fill(0.02);
  }

  const peakFreq = frequencies[peakBinIndex];
  const peakMatchDelta = Math.round(Math.abs(peakFreq - centerFreqKhz) * 10) / 10;

  return {
    bins,
    frequencies,
    peakFreq,
    peakMatchDelta,
  };
}

/**
 * Computes Autocorrelation / Matched Filter Response directly from waveform samples
 */
export function computeMatchedFilter(
  samples: number[],
  modulationType: string,
  bandwidthKhz: number,
  pulseDurationMs: number
): { autocorrelation: number[]; mainlobeWidthMs: number; pslrDb: number } {
  const N = samples.length;
  const numLags = 64;
  const rxx: number[] = new Array(numLags).fill(0);

  // Direct normalized cross-correlation
  for (let lagIdx = 0; lagIdx < numLags; lagIdx++) {
    const lag = lagIdx - Math.floor(numLags / 2);
    let sum = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < N; i++) {
      const j = i + lag;
      if (j >= 0 && j < N) {
        sum += samples[i] * samples[j];
      }
      norm1 += samples[i] * samples[i];
      if (j >= 0 && j < N) {
        norm2 += samples[j] * samples[j];
      }
    }

    const denom = Math.sqrt(norm1 * (norm2 || 1)) || 1;
    rxx[lagIdx] = sum / denom;
  }

  // Find center peak
  const centerIdx = Math.floor(numLags / 2);
  const peakVal = Math.abs(rxx[centerIdx]) || 1;

  // Search for second peak / highest sidelobe outside the main lobe
  let maxSidelobe = 0.02;
  const mainlobeHalfWidthSamples =
    modulationType === 'CW' ? 14 : Math.max(2, Math.round(18 / Math.max(0.5, bandwidthKhz)));

  for (let i = 0; i < numLags; i++) {
    if (Math.abs(i - centerIdx) > mainlobeHalfWidthSamples) {
      if (Math.abs(rxx[i]) > maxSidelobe) {
        maxSidelobe = Math.abs(rxx[i]);
      }
    }
  }

  // Peak-to-Sidelobe Ratio (PSLR) in dB = 20 * log10(peak / maxSidelobe)
  const pslrDb = Math.round(20 * Math.log10(Math.max(1.001, peakVal / Math.max(0.01, maxSidelobe))) * 10) / 10;

  // Approximate compressed mainlobe width in ms
  const mainlobeWidthMs =
    modulationType === 'CW'
      ? pulseDurationMs * 0.9
      : Math.round((1.0 / Math.max(0.5, bandwidthKhz)) * 100) / 100;

  return {
    autocorrelation: rxx,
    mainlobeWidthMs,
    pslrDb: Math.min(36, Math.max(3, pslrDb)),
  };
}

/**
 * Builds complete real-time WaveformData frame
 */
export function buildWaveformData(
  params: TransmitterParameters,
  phaseOffset: number = 0
): WaveformData {
  const result = generateWaveformSamples(params, phaseOffset);
  const fft = computeFFT32(result.samples, params.centerFrequency, result.samplingRateHz);
  const mf = computeMatchedFilter(result.samples, params.modulationType, params.bandwidth, params.pulseDuration);

  const isPeakMatched = fft.peakMatchDelta <= 1.5;

  return {
    timeSamples: result.samples,
    pwmDutySamples: result.pwmDuty,
    envelope: result.envelope,
    fftBins: fft.bins,
    fftFrequencies: fft.frequencies,
    peakFrequencyKhz: fft.peakFreq,
    commandedFrequencyKhz: params.centerFrequency,
    peakMatchDeltaKhz: fft.peakMatchDelta,
    isPeakMatched,
    autocorrelation: mf.autocorrelation,
    mainlobeWidthMs: mf.mainlobeWidthMs,
    pslrDb: mf.pslrDb,
    spectrogramSlice: fft.bins,
  };
}
