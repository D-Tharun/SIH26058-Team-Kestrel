/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  EnvironmentalInputs,
  TransmitterParameters,
  PhysicalAcoustics,
  DecisionTrace,
  SystemStatus,
  WaveformData,
  TabType,
  SerialLogMessage,
} from './types';
import { calculateSoundSpeed, computePhysicalAcoustics } from './utils/acousticEngine';
import { evaluateAdaptiveDecision } from './utils/decisionEngine';
import { buildWaveformData, computeFFT32, computeMatchedFilter } from './utils/signalGenerator';
import { serialService } from './utils/serialConnection';

import GradientWaves from './components/GradientWaves';
import SphericalSpectrum from './components/SphericalSpectrum';
import { TopNavbar } from './components/TopNavbar';
import { HeroTransmitterBanner } from './components/HeroTransmitterBanner';
import { EnvironmentalCard } from './components/EnvironmentalCard';
import { VisualizationPanel } from './components/VisualizationPanel';
import { DecisionParametersCard } from './components/DecisionParametersCard';
import { BottomStatusBar } from './components/BottomStatusBar';
import { DecisionEngineView } from './components/DecisionEngineView';
import { SignalAnalysisView } from './components/SignalAnalysisView';
import { PhysicsHealthView } from './components/PhysicsHealthView';
import { SystemStoryView } from './components/SystemStoryView';
import { SerialModal } from './components/SerialModal';
import { Terminal } from 'lucide-react';

const DEFAULT_ENV: EnvironmentalInputs = {
  depth: 65,
  turbidity: 42,
  temperature: 21.0,
  salinity: 34.5,
  pH: 8.1,
  resPen: 0.5,
  ambientNoise: 65,
};

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Environmental inputs
  const [envInputs, setEnvInputs] = useState<EnvironmentalInputs>(DEFAULT_ENV);

  // System & Telemetry Status
  const [status, setStatus] = useState<SystemStatus>({
    isConnected: true, // Default connected in demo simulator mode
    isDmaStreaming: true,
    isCpuSleeping: false,
    updateRateHz: 50,
    selfMonitorStatus: 'connected',
    hardwareMode: false,
    baudRate: 115200,
    packetsReceived: 1042,
    droppedPackets: 0,
    loopbackVoltageMv: 3298,
    stm32CoreTemp: 42.1,
    dacBufferLoad: 256,
    lastPingTimestamp: Date.now(),
  });

  // Serial Console logs & Modal
  const [serialLogs, setSerialLogs] = useState<SerialLogMessage[]>([]);
  const [isSerialModalOpen, setIsSerialModalOpen] = useState<boolean>(false);
  const [isPaused] = useState<boolean>(false);

  // Live STM32 Firmware transmitter parameters (overrides calculated parameters in hardware mode)
  const [firmwareParams, setFirmwareParams] = useState<TransmitterParameters | null>(null);

  // Phase counter for live oscilloscope animation
  const phaseRef = useRef<number>(0);

  // Subscribe to serial service logs and hardware telemetry stream
  useEffect(() => {
    const unsubLog = serialService.onLog((log) => {
      setSerialLogs((prev) => [log, ...prev].slice(0, 100));
    });

    const unsubTelemetry = serialService.onTelemetry((json) => {
      if (!json || typeof json !== 'object') return;

      // 1. Update live environmental pot readings (supports snake_case and camelCase)
      const rawTurb = typeof json.turbidity === 'number' ? json.turbidity : undefined;
      const parsedTurbidity = rawTurb !== undefined ? (rawTurb <= 1.0 ? Math.min(100, Math.round(rawTurb * 100)) : Math.min(100, Math.round(rawTurb))) : undefined;

      setEnvInputs((prev) => ({
        depth: typeof json.depth === 'number' ? Number(json.depth.toFixed(1)) : prev.depth,
        turbidity: parsedTurbidity !== undefined ? parsedTurbidity : prev.turbidity,
        temperature: typeof (json.temperature ?? json.temp) === 'number' ? Number((json.temperature ?? json.temp).toFixed(1)) : prev.temperature,
        salinity: typeof (json.salinity ?? json.salt) === 'number' ? Number((json.salinity ?? json.salt).toFixed(1)) : prev.salinity,
        pH: typeof (json.ph ?? json.pH) === 'number' ? Number((json.ph ?? json.pH).toFixed(1)) : prev.pH,
        resPen: typeof (json.res_pen ?? json.resPen) === 'number' ? Number((json.res_pen ?? json.resPen).toFixed(2)) : prev.resPen,
        ambientNoise: prev.ambientNoise,
      }));

      // 2. Update real-time hardware status and self-monitor voltage
      const rawSamples = json.adc_samples || json.adcSamples || json.samples;
      setStatus((prev) => {
        let avgMv = prev.loopbackVoltageMv;
        if (Array.isArray(rawSamples) && rawSamples.length > 0) {
          const sum = rawSamples.reduce((a: number, b: number) => a + b, 0);
          const avgDac = sum / rawSamples.length;
          avgMv = Math.round((avgDac / 4095) * 3300);
        }

        return {
          ...prev,
          isConnected: true,
          hardwareMode: true,
          isDmaStreaming: true,
          selfMonitorStatus: 'connected',
          packetsReceived: prev.packetsReceived + 1,
          loopbackVoltageMv: avgMv,
        };
      });

      // 3. Extract and store actual STM32 firmware parameters
      const modTypes = ['CW', 'LFM Chirp', 'Geometric Sweep', 'Barker-13'] as const;
      const winTypes = ['Hamming', 'Hann', 'Blackman'] as const;

      const rawFc = json.center_freq ?? json.centerFreq ?? json.centerFrequency;
      const fcKhz = typeof rawFc === 'number' ? (rawFc > 500 ? Number((rawFc / 1000).toFixed(2)) : Number(rawFc.toFixed(2))) : 9.9;

      const rawBw = json.bandwidth ?? json.bw;
      const bwKhz = typeof rawBw === 'number' ? (rawBw > 500 ? Number((rawBw / 1000).toFixed(2)) : Number(rawBw.toFixed(2))) : 1.5;

      const rawMod = json.waveform_type ?? json.mod_type;
      const modType = typeof rawMod === 'number' && modTypes[rawMod] ? modTypes[rawMod] : 'LFM Chirp';

      const rawWin = json.window_type;
      const winType = typeof rawWin === 'number' && winTypes[rawWin] ? winTypes[rawWin] : 'Hamming';

      const durMs = typeof json.duration === 'number' ? Number(json.duration.toFixed(1)) : 10.0;
      const rawAmp = json.amplitude ?? json.amp;
      const ampPct = typeof rawAmp === 'number' ? (rawAmp <= 1.0 ? Math.round(rawAmp * 100) : Math.round(rawAmp)) : 75;

      setFirmwareParams({
        centerFrequency: fcKhz,
        modulationType: modType,
        windowType: winType,
        bandwidth: bwKhz,
        pulseDuration: durMs,
        amplitude: ampPct,
        chirpRate: modType === 'CW' ? 0 : Math.round((bwKhz / (durMs || 1)) * 100) / 100,
        timeBandwidthProduct: modType === 'CW' ? 1.0 : Math.round(bwKhz * durMs * 10) / 10,
        rangeResolution: 0.5,
        dacSampleRate: 500,
        sampleCount: 256,
        pulseRepetitionInterval: 100,
      });

      // 4. Process live self-monitor waveform from ADC2 on PC1 (e.g. 256 samples)
      if (Array.isArray(rawSamples) && rawSamples.length >= 16) {
        const minVal = Math.min(...rawSamples);
        const maxVal = Math.max(...rawSamples);
        const meanVal = rawSamples.reduce((a: number, b: number) => a + b, 0) / rawSamples.length;
        const maxDev = Math.max(12, Math.max(Math.abs(maxVal - meanVal), Math.abs(minVal - meanVal)));

        const normSamples = rawSamples.map((v: number) => {
          return Math.max(-1, Math.min(1, (v - meanVal) / maxDev));
        });

        // Compute symmetrical window envelope for the oscilloscope display
        const envelope = normSamples.map((_, i) => {
          const t = i / (normSamples.length - 1);
          return Math.sin(t * Math.PI) * 0.95;
        });

        // Compute FFT and Matched Filter dynamically using the ACTUAL firmware parameters
        const fft = computeFFT32(normSamples, fcKhz, bwKhz, modType);
        const mf = computeMatchedFilter(normSamples, modType, bwKhz, durMs);

        setWaveformData({
          timeSamples: normSamples,
          envelope,
          fftBins: fft.bins,
          fftFrequencies: fft.frequencies,
          peakFrequencyKhz: fft.peakFreq,
          commandedFrequencyKhz: fcKhz,
          peakMatchDeltaKhz: fft.peakMatchDelta,
          isPeakMatched: fft.peakMatchDelta <= 2.0,
          autocorrelation: mf.autocorrelation,
          mainlobeWidthMs: mf.mainlobeWidthMs,
          pslrDb: mf.pslrDb,
          spectrogramSlice: fft.bins,
        });
      }
    });

    return () => {
      unsubLog();
      unsubTelemetry();
    };
  }, []);

  // Compute adaptive decisions & physical acoustics
  const soundSpeed = calculateSoundSpeed(envInputs.temperature, envInputs.salinity, envInputs.depth);
  const { params: calculatedParams, trace: derivedTrace } = evaluateAdaptiveDecision(envInputs, soundSpeed);

  // Use actual live firmware parameters when in hardware mode, otherwise use calculated simulation params
  const derivedParams = (status.hardwareMode && firmwareParams) ? firmwareParams : calculatedParams;
  const derivedAcoustics = computePhysicalAcoustics(envInputs, derivedParams);

  // Maintain active waveform data
  const [waveformData, setWaveformData] = useState<WaveformData>(() =>
    buildWaveformData(derivedParams, 0)
  );

  // Real-time animation & DMA tick simulation loop (Demo Mode only)
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      // In hardware mode, real data comes from serial — never overwrite with simulation
      if (status.hardwareMode) {
        setStatus((prev) => ({
          ...prev,
          isCpuSleeping: Math.random() > 0.65,
        }));
        return;
      }

      // Advance phase for smooth dynamic waveform evolution
      phaseRef.current = (phaseRef.current + 0.25) % (2 * Math.PI);

      const newWaveform = buildWaveformData(derivedParams, phaseRef.current);
      setWaveformData(newWaveform);

      setStatus((prev) => ({
        ...prev,
        packetsReceived: prev.packetsReceived + 1,
        isCpuSleeping: Math.random() > 0.65, // DMA autonomous transfer allows MCU sleep
        loopbackVoltageMv: 3300 + Math.round((Math.random() * 4 - 2) * 10),
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [derivedParams, isPaused, status.hardwareMode]);

  // Handler to toggle hardware mode (demo simulator vs physical STM32)
  const handleToggleHardwareMode = () => {
    setStatus((prev) => {
      const nextHardware = !prev.hardwareMode;
      if (!nextHardware) {
        setFirmwareParams(null);
      }
      return {
        ...prev,
        hardwareMode: nextHardware,
        isConnected: nextHardware ? false : true,
      };
    });
  };

  // Handler to reset inputs to baseline
  const handleResetToDefaults = () => {
    setEnvInputs(DEFAULT_ENV);
  };

  // Manual burst transmit
  const handleManualPing = () => {
    setStatus((prev) => ({
      ...prev,
      lastPingTimestamp: Date.now(),
      isDmaStreaming: true,
    }));
  };

  // Connect to actual WebSerial STM32
  const handleConnectHardware = async (baud: number) => {
    const res = await serialService.connectHardware(baud);
    if (res.success) {
      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        hardwareMode: true,
        portName: res.portName,
        baudRate: baud,
      }));
    }
  };

  // Disconnect STM32
  const handleDisconnectHardware = async () => {
    await serialService.disconnectHardware();
    setStatus((prev) => ({
      ...prev,
      isConnected: false,
      hardwareMode: false,
    }));
  };

  return (
    <div className="min-h-screen text-[#112D4E] flex flex-col font-['DM_Sans',sans-serif] selection:bg-[#DBE2EF] selection:text-[#112D4E] relative spherical-spectrum-bg bg-fixed w-full max-w-full overflow-x-hidden">
      {/* 1. Full-Screen Spherical Spectrum Radial Gradient & Velvet Film Grain */}
      <SphericalSpectrum pulseActive={status.isDmaStreaming} />

      {/* 2. Full-Screen Interactive Gradient Waves Background from React Bits */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <GradientWaves
          horizonColor="#040A14"
          waveColor="#123660"
          crestColor="#4D80BA"
          speed={1.6}
          amplitude={2.4}
          waveScale={0.36}
          waveRatio={0.48}
          swell={32}
          turbulence={18}
          tilt={1.11}
          zoom={1.12}
          height={5.4}
          fogDepth={40}
          detail="high"
          brightness={0.86}
          opacity={0.92}
          mouseInteraction={true}
          parallaxStrength={0.45}
          grain={true}
          grainIntensity={0.03}
          className="w-full h-full"
        />
      </div>

      {/* 2. Top Navigation Bar */}
      <TopNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        params={derivedParams}
        onOpenSerialModal={() => setIsSerialModalOpen(true)}
        onToggleDemoMode={handleToggleHardwareMode}
        onManualPing={handleManualPing}
      />

      {/* 3. Main Tab Content Area with Smooth Framer-Motion Transitions */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-3 sm:p-4 lg:p-6 flex flex-col relative z-10 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="tab-overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 flex-1 flex flex-col"
            >
              {/* Hero Top Box */}
              <HeroTransmitterBanner
                env={envInputs}
                params={derivedParams}
                acoustics={derivedAcoustics}
                trace={derivedTrace}
                status={status}
                setActiveTab={setActiveTab}
                onManualPing={handleManualPing}
                onResetToDefaults={handleResetToDefaults}
              />

              {/* 3-Column Structured Dashboard Below Hero */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 items-stretch">
                {/* Left Column – Environmental Inputs (3 cols) */}
                <div className="xl:col-span-3 h-full">
                  <EnvironmentalCard
                    inputs={envInputs}
                    onChangeInputs={setEnvInputs}
                    status={status}
                    onToggleHardwareMode={handleToggleHardwareMode}
                    onResetToDefaults={handleResetToDefaults}
                  />
                </div>

                {/* Center Column – Real-Time 4-Quadrant Visualizers (6 cols) */}
                <div className="xl:col-span-6 h-full">
                  <VisualizationPanel
                    data={waveformData}
                    params={derivedParams}
                    isPaused={isPaused}
                    soundSpeed={derivedAcoustics.soundSpeed}
                  />
                </div>

                {/* Right Column – Commanded Carrier & Decision Synthesis (3 cols) */}
                <div className="xl:col-span-3 h-full">
                  <DecisionParametersCard
                    params={derivedParams}
                    trace={derivedTrace}
                    acoustics={derivedAcoustics}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'decision_engine' && (
            <motion.div
              key="tab-decision-engine"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex-1 overflow-y-auto custom-scrollbar"
            >
              <DecisionEngineView
                env={envInputs}
                params={derivedParams}
                trace={derivedTrace}
                acoustics={derivedAcoustics}
              />
            </motion.div>
          )}

          {activeTab === 'signal_analysis' && (
            <motion.div
              key="tab-signal-analysis"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex-1 overflow-y-auto custom-scrollbar"
            >
              <SignalAnalysisView
                data={waveformData}
                params={derivedParams}
                acoustics={derivedAcoustics}
                status={status}
              />
            </motion.div>
          )}

          {activeTab === 'physics_health' && (
            <motion.div
              key="tab-physics-health"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex-1 overflow-y-auto custom-scrollbar"
            >
              <PhysicsHealthView
                env={envInputs}
                params={derivedParams}
                acoustics={derivedAcoustics}
                status={status}
              />
            </motion.div>
          )}

          {activeTab === 'system_story' && (
            <motion.div
              key="tab-system-story"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex-1 overflow-y-auto custom-scrollbar"
            >
              <SystemStoryView
                env={envInputs}
                params={derivedParams}
                acoustics={derivedAcoustics}
                trace={derivedTrace}
              />
            </motion.div>
          )}

          {activeTab === 'packet_inspector' && (
            <motion.div
              key="tab-packet-inspector"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex-1 glass-panel p-6 shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)] flex flex-col border border-[#DBE2EF]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#DBE2EF] mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#DBE2EF]/60 border border-[#DBE2EF] text-[#3F72AF]">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#112D4E]">
                      Real-Time STM32 Serial Telemetry & Hex Packet Stream
                    </h2>
                    <p className="text-xs font-mono text-[#3F72AF]">
                      Live 115200 Baud CDC Virtual COM Port Frame Sniffer
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSerialLogs([])}
                  className="px-3.5 py-1.5 rounded-lg bg-[#DBE2EF]/50 hover:bg-[#DBE2EF] border border-[#DBE2EF] text-xs font-mono text-[#112D4E] transition-colors cursor-pointer"
                >
                  Clear Console Log
                </button>
              </div>

              <div className="flex-1 min-h-[480px] bg-[#112D4E] p-4 rounded-xl border border-[#3F72AF]/30 font-mono text-xs overflow-y-auto space-y-1.5 custom-scrollbar text-[#F9F7F7]">
                {serialLogs.length === 0 ? (
                  <div className="text-[#DBE2EF]/70 text-center py-20">
                    No packets logged yet. Telemetry frames from STM32 DMA will stream here in real-time.
                  </div>
                ) : (
                  serialLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2.5 hover:bg-white/5 p-2 rounded-lg transition-colors border border-transparent hover:border-white/10">
                      <span className="text-[#DBE2EF]/70 text-[11px] shrink-0">{log.timestamp}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                          log.direction === 'rx'
                            ? 'bg-[#3F72AF]/30 text-[#DBE2EF] border border-[#3F72AF]/50'
                            : log.direction === 'tx'
                            ? 'bg-amber-500/20 text-[#FBBF24] border border-amber-400/30'
                            : 'bg-white/10 text-[#DBE2EF] border border-white/10'
                        }`}
                      >
                        {log.direction}
                      </span>
                      <span className="text-white font-mono text-xs">{log.summary}</span>
                      {log.rawHex && (
                        <span className="text-[#DBE2EF]/60 text-[11px] ml-auto hidden md:inline truncate max-w-[320px]">
                          {log.rawHex}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 4. Bottom Full-Width Telemetry Status Bar */}
      <BottomStatusBar
        acoustics={derivedAcoustics}
        status={status}
        env={envInputs}
        params={derivedParams}
      />

      {/* Serial Connection Modal */}
      <SerialModal
        isOpen={isSerialModalOpen}
        onClose={() => setIsSerialModalOpen(false)}
        status={status}
        logs={serialLogs}
        onClearLogs={() => setSerialLogs([])}
        onConnectHardware={handleConnectHardware}
        onDisconnectHardware={handleDisconnectHardware}
      />
    </div>
  );
}
