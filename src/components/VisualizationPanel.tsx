import React from 'react';
import { WaveformData, TransmitterParameters } from '../types';
import { WaveformOscilloscope } from './visualizers/WaveformOscilloscope';
import { SpectrumFft } from './visualizers/SpectrumFft';
import { WaterfallSpectrogram } from './visualizers/WaterfallSpectrogram';
import { MatchedFilterCard } from './visualizers/MatchedFilterCard';
import { Activity } from 'lucide-react';

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
}) => {
  return (
    <section
      id="visualization-center-panel"
      aria-label="Real-Time Sonar Visualizers"
      className="flex flex-col h-full gap-3"
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 backdrop-blur-md border border-white/60 text-[#112D4E] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#3F72AF] animate-pulse shadow-2xs" />
            <Activity className="w-4 h-4 text-[#3F72AF]" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#112D4E]">
              Live Acoustic Visualizer Suite
            </span>
          </div>
        </div>
      </div>

      {/* 4-Quadrant DSP Visualizer Suite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
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
      </div>
    </section>
  );
};
