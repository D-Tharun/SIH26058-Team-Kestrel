import React, { useRef, useEffect } from 'react';
import { WaveformData, TransmitterParameters } from '../../types';
import { Activity } from 'lucide-react';

interface WaveformOscilloscopeProps {
  data: WaveformData;
  params: TransmitterParameters;
  isPaused?: boolean;
}

export const WaveformOscilloscope: React.FC<WaveformOscilloscopeProps> = ({
  data,
  params,
  isPaused = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const midY = h / 2;

    // Background: Dark slate/navy technical translucent canvas
    ctx.fillStyle = 'rgba(7, 23, 44, 0.82)';
    ctx.fillRect(0, 0, w, h);

    // Subtle Grid lines (Oscilloscope reticle)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    // Horizontal grid
    const numHGrids = 6;
    for (let i = 1; i < numHGrids; i++) {
      const y = (h / numHGrids) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Vertical grid
    const numVGrids = 8;
    for (let i = 1; i < numVGrids; i++) {
      const x = (w / numVGrids) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Zero-voltage Center reference line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    const samples = data.timeSamples;
    const envelope = data.envelope;
    const N = samples.length;
    if (N < 2) return;

    const stepX = w / (N - 1);
    const ampScale = (h / 2) * 0.85;

    // Draw Window Envelope (Amber Accent)
    if (envelope && envelope.length === N) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);

      // Upper envelope
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = i * stepX;
        const y = midY - envelope[i] * ampScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Lower envelope
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = i * stepX;
        const y = midY + envelope[i] * ampScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Main Waveform Glow using Vibrant Cyan
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.85)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.4;
    ctx.beginPath();

    for (let i = 0; i < N; i++) {
      const x = i * stepX;
      const y = midY - samples[i] * ampScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Discrete DAC Sample dots
    ctx.fillStyle = '#0284C7';
    for (let i = 0; i < N; i += 2) {
      const x = i * stepX;
      const y = midY - samples[i] * ampScale;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw Trigger marker arrow at left
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(2, midY - 6);
    ctx.lineTo(8, midY);
    ctx.lineTo(2, midY + 6);
    ctx.fill();
  }, [data, params, isPaused]);

  return (
    <div
      id="waveform-oscilloscope-card"
      className="glass-panel p-3 flex flex-col h-full relative group text-[#112D4E]"
    >
      {/* Title Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3F72AF] animate-pulse" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#112D4E] flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
            <Activity className="w-3.5 h-3.5 text-[#3F72AF]" /> Live Oscilloscope / Waveform
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#112D4E] font-bold">
            {data.timeSamples.length} SAMPLES TIM3 PWM DMA
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-[#3F72AF]">
          <span className="text-[#112D4E] font-bold">Fs: {params.dacSampleRate || 100} kSPS</span>
          <span className="text-[#DBE2EF]">|</span>
          <span>τ: {params.pulseDuration} ms</span>
        </div>
      </div>

      {/* Canvas Display */}
      <div className="relative flex-1 min-h-[140px] w-full rounded-xl overflow-hidden border border-white/30 bg-[#07172C]/75 backdrop-blur-xl shadow-inner">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Reticle Overlay Badges */}
        <div className="absolute top-1.5 left-2 font-mono text-[10px] text-[#38BDF8] bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/15 pointer-events-none shadow-xs">
          CH1: ±{(params.amplitude * 0.033).toFixed(2)}V (PA6 PWM Out)
        </div>
        <div className="absolute bottom-1.5 right-2 font-mono text-[10px] text-amber-400 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/15 pointer-events-none shadow-xs">
          Window: {params.windowType}
        </div>
      </div>
    </div>
  );
};
