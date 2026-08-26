import React, { useRef, useEffect, useState } from 'react';
import { WaveformData, TransmitterParameters } from '../../types';
import { Waves, Palette, Play, Pause } from 'lucide-react';

interface WaterfallSpectrogramProps {
  data: WaveformData;
  params: TransmitterParameters;
}

// Color palette mapping functions for oceanic acoustic waterfall
function getPaletteColor(val: number): string {
  const v = Math.max(0, Math.min(1, val));
  if (v < 0.25) {
    const t = v / 0.25;
    return `rgb(${Math.round(8 + 10 * t)}, ${Math.round(18 + 30 * t)}, ${Math.round(38 + 60 * t)})`;
  } else if (v < 0.5) {
    const t = (v - 0.25) / 0.25;
    return `rgb(${Math.round(18 + 20 * t)}, ${Math.round(48 + 100 * t)}, ${Math.round(98 + 120 * t)})`;
  } else if (v < 0.75) {
    const t = (v - 0.5) / 0.25;
    return `rgb(${Math.round(38 + 18 * t)}, ${Math.round(148 + 41 * t)}, ${Math.round(218 + 30 * t)})`;
  } else {
    const t = (v - 0.75) / 0.25;
    return `rgb(${Math.round(56 + 199 * t)}, ${Math.round(189 + 66 * t)}, ${Math.round(248 + 7 * t)})`;
  }
}

function getTurboColor(val: number): string {
  const v = Math.max(0, Math.min(1, val));
  if (v < 0.25) {
    const t = v / 0.25;
    return `rgb(${Math.round(15 + 10 * t)}, ${Math.round(20 + 80 * t)}, ${Math.round(80 + 175 * t)})`;
  } else if (v < 0.5) {
    const t = (v - 0.25) / 0.25;
    return `rgb(${Math.round(25 + 20 * t)}, ${Math.round(100 + 130 * t)}, ${Math.round(255 - 120 * t)})`;
  } else if (v < 0.75) {
    const t = (v - 0.5) / 0.25;
    return `rgb(${Math.round(45 + 200 * t)}, ${Math.round(230 + 15 * t)}, ${Math.round(135 - 120 * t)})`;
  } else {
    const t = (v - 0.75) / 0.25;
    return `rgb(${Math.round(245 + 10 * t)}, ${Math.round(245 - 180 * t)}, ${Math.round(15 + 10 * t)})`;
  }
}

export const WaterfallSpectrogram: React.FC<WaterfallSpectrogramProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [palette, setPalette] = useState<'palette' | 'turbo'>('palette');
  const [isFrozen, setIsFrozen] = useState(false);

  const historyRef = useRef<number[][]>([]);

  useEffect(() => {
    if (isFrozen) return;
    const slice = [...data.spectrogramSlice];
    historyRef.current.push(slice);
    if (historyRef.current.length > 80) {
      historyRef.current.shift();
    }
  }, [data, isFrozen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = 'rgba(7, 23, 44, 0.82)';
    ctx.fillRect(0, 0, w, h);

    const history = historyRef.current;
    const numColumns = history.length;
    if (numColumns === 0) return;

    const colWidth = w / 80;
    const numBins = 32;
    const rowHeight = h / numBins;

    // Render columns from right (newest) to left (oldest)
    for (let c = 0; c < numColumns; c++) {
      const slice = history[c];
      const x = w - (numColumns - c) * colWidth;

      for (let b = 0; b < numBins; b++) {
        const binIndex = (numBins - 1) - b;
        const mag = slice[binIndex] || 0.02;
        const y = b * rowHeight;

        ctx.fillStyle = palette === 'palette' ? getPaletteColor(mag) : getTurboColor(mag);
        ctx.fillRect(x, y, colWidth + 0.5, rowHeight + 0.5);
      }
    }

    // Grid lines for frequency intervals
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, [data, palette, isFrozen]);

  return (
    <div
      id="waterfall-spectrogram-card"
      className="glass-panel p-3 flex flex-col h-full text-[#112D4E]"
    >
      {/* Header with Palette Selector and Freeze toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-[#3F72AF]" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#112D4E] font-['Plus_Jakarta_Sans',sans-serif]">
            Waterfall Spectrogram
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#112D4E] font-bold">
            TIME-FREQUENCY HISTORY
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Palette Toggle Button */}
          <button
            id="btn-spectrogram-palette"
            onClick={() => setPalette((prev) => (prev === 'palette' ? 'turbo' : 'palette'))}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F9F7F7] hover:bg-[#DBE2EF] border border-[#DBE2EF] text-[10px] font-mono text-[#112D4E] font-bold cursor-pointer transition-colors shadow-2xs"
          >
            <Palette className="w-3 h-3 text-[#3F72AF]" />
            <span>{palette === 'palette' ? 'Deep Ocean' : 'Turbo Thermal'}</span>
          </button>

          {/* Freeze / Live Button */}
          <button
            id="btn-spectrogram-freeze"
            onClick={() => setIsFrozen(!isFrozen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono cursor-pointer transition-colors shadow-2xs ${isFrozen
                ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold'
                : 'bg-[#F9F7F7] hover:bg-[#DBE2EF] border-[#DBE2EF] text-[#112D4E]'
              }`}
          >
            {isFrozen ? <Play className="w-3 h-3 text-amber-600" /> : <Pause className="w-3 h-3 text-[#3F72AF]" />}
            <span>{isFrozen ? 'Resume' : 'Freeze'}</span>
          </button>
        </div>
      </div>

      {/* Waterfall Canvas Display */}
      <div className="relative flex-1 min-h-[140px] w-full rounded-xl overflow-hidden border border-white/30 bg-[#07172C]/75 backdrop-blur-xl shadow-inner">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Axis Label Badges */}
        <div className="absolute top-1.5 left-2 font-mono text-[9px] text-[#DBE2EF] bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/15 pointer-events-none shadow-xs">
          140 kHz (High)
        </div>
        <div className="absolute bottom-1.5 left-2 font-mono text-[9px] text-[#DBE2EF] bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/15 pointer-events-none shadow-xs">
          10 kHz (Low)
        </div>
        <div className="absolute bottom-1.5 right-2 font-mono text-[9px] text-[#38BDF8] bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/15 pointer-events-none shadow-xs">
          Live (t = 0)
        </div>
      </div>
    </div>
  );
};
