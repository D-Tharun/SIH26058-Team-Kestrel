import React, { useRef, useEffect } from 'react';
import { WaveformData, TransmitterParameters } from '../../types';
import { Target, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface MatchedFilterCardProps {
  data: WaveformData;
  params: TransmitterParameters;
}

export const MatchedFilterCard: React.FC<MatchedFilterCardProps> = ({ data, params }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { autocorrelation, mainlobeWidthMs, pslrDb } = data;
  const compressionRatio = Math.max(1, params.bandwidth * params.pulseDuration);

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

    // Reticle Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    for (let i = 1; i < 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const midX = w / 2;
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Baseline axis
    const baseY = h - 16;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(w, baseY);
    ctx.stroke();

    const N = autocorrelation.length;
    if (N < 2) return;

    const stepX = w / (N - 1);
    const maxVal = Math.max(...autocorrelation, 0.001);

    // Fill under autocorrelation curve (cyan gradient)
    const grad = ctx.createLinearGradient(0, 0, 0, baseY);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    grad.addColorStop(1, 'rgba(14, 165, 233, 0.02)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let i = 0; i < N; i++) {
      const x = i * stepX;
      const normalized = Math.max(0, autocorrelation[i] / maxVal);
      const y = baseY - normalized * (baseY - 14);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, baseY);
    ctx.closePath();
    ctx.fill();

    // Autocorrelation Stroke (Cyan Glow)
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const x = i * stepX;
      const normalized = Math.max(0, autocorrelation[i] / maxVal);
      const y = baseY - normalized * (baseY - 14);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center Mainlobe Peak Crosshair & Marker
    const peakIdx = Math.floor(N / 2);
    const peakX = peakIdx * stepX;
    const peakY = baseY - (autocorrelation[peakIdx] / maxVal) * (baseY - 14);

    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(peakX, peakY);
    ctx.lineTo(peakX, baseY);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [autocorrelation, params]);

  return (
    <div
      id="matched-filter-card"
      className="glass-panel p-3 flex flex-col h-full text-[#112D4E]"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#DBE2EF] mb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#3F72AF]" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#112D4E] font-['Plus_Jakarta_Sans',sans-serif]">
            Matched Filter / Autocorrelation
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#112D4E] font-bold">
            PULSE COMPRESSION
          </span>
        </div>

        {/* Pulse Compression Gain Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DBE2EF] border border-[#3F72AF]/30 text-[10px] font-mono text-[#112D4E] font-bold">
          <Zap className="w-3 h-3 text-[#3F72AF]" />
          <span>PCR: {compressionRatio.toFixed(1)}x ({((compressionRatio * 1.5)).toFixed(1)} dB SNR)</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 min-h-[140px] w-full rounded-xl overflow-hidden border border-white/30 bg-[#07172C]/75 backdrop-blur-xl shadow-inner">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Tactical Overlay KPIs */}
        <div className="absolute top-1.5 left-2 flex items-center gap-2 font-mono text-[10px]">
          <div className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/15 text-[#DBE2EF] shadow-xs">
            <span className="text-[#DBE2EF]/70">Mainlobe τ: </span>
            <strong className="text-emerald-400">{mainlobeWidthMs.toFixed(3)} ms</strong>
          </div>
          <div className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/15 text-[#DBE2EF] shadow-xs">
            <span className="text-[#DBE2EF]/70">PSLR: </span>
            <strong className="text-amber-400">{pslrDb.toFixed(1)} dB</strong>
          </div>
        </div>

        <div className="absolute bottom-1.5 right-2 font-mono text-[9px] text-[#38BDF8] bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/15 pointer-events-none shadow-xs">
          Zero-Lag Target Detection Peak (τ = 0)
        </div>
      </div>
    </div>
  );
};
