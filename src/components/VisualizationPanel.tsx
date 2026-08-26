import React, { useState } from 'react';
import { WaveformData, TransmitterParameters } from '../types';
import { WaveformOscilloscope } from './visualizers/WaveformOscilloscope';
import { SpectrumFft } from './visualizers/SpectrumFft';
import { WaterfallSpectrogram } from './visualizers/WaterfallSpectrogram';
import { MatchedFilterCard } from './visualizers/MatchedFilterCard';
import { SonarPulseRadar } from './animations/SonarPulseRadar';
import { Activity, Sparkles, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VisualizationPanelProps {
  data: WaveformData;
  params: TransmitterParameters;
  isPaused: boolean;
  soundSpeed?: number;
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({
  data,
  params,
  isPaused,
  soundSpeed = 1522.4,
}) => {
  const [viewMode, setViewMode] = useState<'dsp_quad' | 'tactical_radar'>('dsp_quad');

  return (
    <section
      id="visualization-center-panel"
      aria-label="Real-Time Sonar Visualizers"
      className="flex flex-col h-full gap-3"
    >
      {/* Top Visualizer Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 backdrop-blur-md border border-white/60 text-[#112D4E] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#3F72AF] animate-pulse shadow-2xs" />
            <Activity className="w-4 h-4 text-[#3F72AF]" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#112D4E]">
              Live Acoustic Visualizer Suite
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-md p-1 rounded-xl border border-white/60 shadow-2xs text-xs font-mono">
          <button
            onClick={() => setViewMode('dsp_quad')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'dsp_quad'
                ? 'bg-[#3F72AF] text-white font-bold shadow-2xs'
                : 'text-[#112D4E]/80 hover:text-[#112D4E] hover:bg-white/60'
            }`}
          >
            <Grid className="w-3 h-3" /> Quad DSP Lab
          </button>
          <button
            onClick={() => setViewMode('tactical_radar')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'tactical_radar'
                ? 'bg-[#3F72AF] text-white font-bold shadow-2xs'
                : 'text-[#112D4E]/80 hover:text-[#112D4E] hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3 h-3" /> 360° Tactical Radar
          </button>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <AnimatePresence mode="wait">
        {viewMode === 'dsp_quad' && (
          <motion.div
            key="dsp-quad-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1"
          >
            {/* Section 1: Live Oscilloscope / Waveform */}
            <div className="min-h-[190px] h-full">
              <WaveformOscilloscope data={data} params={params} isPaused={isPaused} />
            </div>

            {/* Section 2: Spectrum / FFT */}
            <div className="min-h-[190px] h-full">
              <SpectrumFft data={data} params={params} />
            </div>

            {/* Section 3: Spectrogram (Waterfall Display) */}
            <div className="min-h-[190px] h-full">
              <WaterfallSpectrogram data={data} params={params} />
            </div>

            {/* Section 4: Matched Filter Output (Autocorrelation) */}
            <div className="min-h-[190px] h-full">
              <MatchedFilterCard data={data} params={params} />
            </div>
          </motion.div>
        )}

        {viewMode === 'tactical_radar' && (
          <motion.div
            key="tactical-radar-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1"
          >
            <div className="h-full min-h-[360px]">
              <SonarPulseRadar
                centerFrequency={params.centerFrequency}
                bandwidth={params.bandwidth}
                soundSpeed={soundSpeed}
                rangeResolution={params.rangeResolution}
              />
            </div>
            <div className="flex flex-col gap-3 h-full">
              <div className="min-h-[175px] flex-1">
                <WaveformOscilloscope data={data} params={params} isPaused={isPaused} />
              </div>
              <div className="min-h-[175px] flex-1">
                <MatchedFilterCard data={data} params={params} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
