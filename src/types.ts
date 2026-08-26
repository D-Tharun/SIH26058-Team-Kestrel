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
  temperature: number; // °C (-2 - 35)
  salinity: number; // ppt (0 - 45)
  pH: number; // (6.5 - 8.5)
  resPen: number; // 0.0 (High Res) to 1.0 (High Penetration)
  ambientNoise: number; // dB re 1uPa (30 - 110)
}

export interface TransmitterParameters {
  centerFrequency: number; // fc in kHz (e.g., 20 - 150)
  modulationType: ModulationType;
  windowType: WindowType;
  bandwidth: number; // B in kHz (e.g., 2 - 40)
  pulseDuration: number; // tau in ms (e.g., 1.0 - 50.0)
  amplitude: number; // 0 - 100% (or Vpp)
  chirpRate: number; // k in kHz/ms (B / tau)
  timeBandwidthProduct: number; // TB = B * tau
  rangeResolution: number; // delta R in cm or m
  dacSampleRate: number; // kSPS (e.g., 500)
  sampleCount: number; // typically 64
  pulseRepetitionInterval: number; // PRI in ms
}

export interface PhysicalAcoustics {
  soundSpeed: number; // c in m/s
  absorptionCoefficient: number; // alpha in dB/km
  transmissionLoss: number; // TL in dB at 100m
  snr: number; // dB
  sourcePower: number; // Watts (e.g. 50W)
  sourceLevel: number; // SL in dB re 1uPa @ 1m
  estimatedMaxRange: number; // meters
  pulseCompressionGain: number; // Gp in dB
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
  dacBufferLoad: number;
  lastPingTimestamp: number;
}

export interface WaveformData {
  timeSamples: number[]; // 64 points (-1 to +1 normalized DAC output)
  envelope: number[]; // 64 points envelope amplitude
  fftBins: number[]; // 32 frequency magnitude bins (0 to 1)
  fftFrequencies: number[]; // kHz associated with each bin
  peakFrequencyKhz: number;
  commandedFrequencyKhz: number;
  peakMatchDeltaKhz: number;
  isPeakMatched: boolean;
  autocorrelation: number[]; // 64 or 128 points (-1 to +1)
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
