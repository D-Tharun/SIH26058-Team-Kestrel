export type ModulationType = 'CW' | 'LFM Chirp' | 'Geometric Sweep' | 'Barker-13' | 'Hyperbolic FM';

export type WindowType = 'Hamming' | 'Hann' | 'Blackman' | 'Rectangular';

export type TabType =
  | 'overview'
  | 'decision_engine'
  | 'signal_analysis'
  | 'physics_health'
  | 'system_story'
  | 'packet_inspector';

export interface EnvironmentalInputs {
  depth: number; // meters (0 - 500)
  turbidity: number; // NTU (0 - 100)
  temperature: number; // °C (-2 - 45)
  salinity: number; // PSU / ppt (0 - 45)
  pH: number; // (6.5 - 8.5)
  resPen: number; // 0.0 (High Res) to 1.0 (High Penetration)
  ambientNoise: number; // dB re 1uPa (30 - 110)
  requestedResolutionM?: number; // Target range resolution in meters (e.g. 0.05m - 0.85m)
}

export interface TransmitterParameters {
  centerFrequency: number; // fc in kHz (1.0 - 10.0 kHz operating band)
  fL: number; // Lower band edge in kHz (fc - B/2)
  fH: number; // Upper band edge in kHz (fc + B/2)
  modulationType: ModulationType;
  windowType: WindowType;
  bandwidth: number; // B_used in kHz (B <= 9.0 kHz)
  pulseDuration: number; // tau in ms (T <= 5.12 ms)
  amplitude: number; // 0 - 100%
  chirpRate: number; // k in kHz/ms (B / tau)
  timeBandwidthProduct: number; // TB = B * tau
  rangeResolution: number; // Achievable delta R in meters
  pwmSampleRate: number; // kSPS (100 kSPS via TIM3 ARR=639)
  dacSampleRate?: number; // legacy alias for pwmSampleRate (100 kSPS)
  sampleCount: number; // N <= 512 (round(T * fs))
  pulseRepetitionInterval: number; // PRI in ms

  // Authoritative Firmware-Synchronized Bandwidth & Resolution Flow Fields
  requestedResolutionM: number; // User requested resolution (meters)
  bandwidthRequiredHz: number; // B_required = c / (2 * deltaR_req) (Hz)
  bandwidthUsedHz: number; // B_used = min(B_required, 9000) (Hz)
  achievableResolutionM: number; // c / (2 * B_used) (meters)
  bandwidthLimited: boolean; // true if B_required > 9000 Hz
  bandwidthStatus: string; // 'Within Hardware Limit' | 'Bandwidth Limited'
}

export interface AbsorptionBreakdown {
  boric: number; // dB/km (Boric acid relaxation)
  magnesium: number; // dB/km (MgSO4 relaxation)
  pureWater: number; // dB/km (Pure water viscosity)
  total: number; // dB/km (Total Francois-Garrison absorption)
  f1: number; // kHz (Boric relaxation freq)
  f2: number; // kHz (MgSO4 relaxation freq)
}

export interface PropagationLossBreakdown {
  spreadingLoss: number; // 40*log10(R) in dB
  absorptionLoss: number; // 2*alpha*R_km in dB
  totalTwoWayLoss: number; // TL_2way in dB
}

export interface PhysicalAcoustics {
  soundSpeed: number; // c in m/s (Mackenzie 1981)
  absorptionCoefficient: number; // alpha in dB/km (Francois-Garrison)
  absorptionBreakdown: AbsorptionBreakdown;
  transmissionLoss: number; // TL_2way in dB
  propagationLoss: PropagationLossBreakdown;
  scatteringPenalty: number; // L_scat in dB (K_tau = 0)
  predictedLinkMargin: number; // M(f,R) = SNR_ref - TL_2way - L_scat in dB
  snr: number; // alias for predictedLinkMargin in dB
  sourcePower: number; // Watts (e.g. 10W - 100W)
  sourceLevel: number; // SL in dB re 1uPa @ 1m
  estimatedMaxRange: number; // meters
  pulseCompressionGain: number; // Gp in dB
}

export interface FrequencyCandidate {
  fc: number; // kHz
  fL: number; // kHz
  fH: number; // kHz
  bandwidth: number; // kHz
  absorption: number; // dB/km
  twoWayLoss: number; // dB
  predictedLinkMargin: number; // dB
  valid: boolean;
}

export interface FrequencyOptimizationResult {
  candidates: FrequencyCandidate[];
  selectedFrequency: number;
  fL: number;
  fH: number;
  bandwidth: number;
  predictedLinkMargin: number;
  selectionReason: string;
}

export interface DecisionRule {
  id: string;
  condition: string;
  action: string;
  active: boolean;
  category: 'frequency' | 'modulation' | 'window' | 'power';
  impact: string;
}

export interface DecisionTrace {
  summaryText: string;
  activeReasoning: string[];
  rulesFired: DecisionRule[];
  confidence: number;
  modeDescription: string;
  optimization?: FrequencyOptimizationResult;
}

export interface SystemStatus {
  isConnected: boolean;
  isDmaStreaming: boolean;
  isCpuSleeping: boolean;
  updateRateHz: number;
  selfMonitorStatus: 'connected' | 'warning' | 'disconnected';
  hardwareMode: boolean; // false = Demo Mode, true = STM32 Live
  portName?: string;
  baudRate: number;
  packetsReceived: number;
  droppedPackets: number;
  loopbackVoltageMv: number;
  stm32CoreTemp: number;
  pwmBufferLoad: number;
  dacBufferLoad?: number; // legacy alias
  lastPingTimestamp: number;

  // Firmware Measured SNR & ADC2 Conditioning Telemetry
  snrTxDb?: number;
  snrTargetDb?: number;
  snrMarginDb?: number;
  snrTargetValid?: boolean;
  adc2ConditioningOk?: boolean;
  adc2MinMv?: number;
  adc2MaxMv?: number;
  adc2MeanMv?: number;
}

export interface WaveformData {
  timeSamples: number[]; // N points (-1 to +1 normalized waveform samples)
  pwmDutySamples?: number[]; // N points (0 to ARR=639 PWM duty values)
  envelope: number[]; // N points envelope amplitude
  fftBins: number[]; // 32 frequency magnitude bins (0 to 1)
  fftFrequencies: number[]; // kHz associated with each bin
  peakFrequencyKhz: number;
  commandedFrequencyKhz: number;
  peakMatchDeltaKhz: number;
  isPeakMatched: boolean;
  autocorrelation: number[]; // Matched filter autocorrelation
  mainlobeWidthMs: number;
  pslrDb: number; // Peak-to-Sidelobe Ratio in dB
  spectrogramSlice: number[]; // 32 points for waterfall
}

export interface PresetEnvironment {
  id: string;
  name: string;
  description: string;
  iconName: string;
  values: EnvironmentalInputs;
}

export interface SerialLogMessage {
  id: string;
  timestamp: string;
  direction: 'rx' | 'tx' | 'sys';
  type: 'telemetry' | 'command' | 'ack' | 'error' | 'sys';
  rawHex: string;
  summary: string;
}

