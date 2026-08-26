import React, { useEffect, useRef } from 'react';
import { TransmitterParameters, PhysicalAcoustics } from '../types';

interface HeroWaveformVisualizerProps {
  params: TransmitterParameters;
  acoustics: PhysicalAcoustics;
  onPing: () => void;
}

export const HeroWaveformVisualizer: React.FC<HeroWaveformVisualizerProps> = ({
  params,
  onPing,
}) => {
  const glowPathRef = useRef<SVGPathElement | null>(null);
  const mainPathRef = useRef<SVGPathElement | null>(null);
  const corePathRef = useRef<SVGPathElement | null>(null);
  const arc1Ref = useRef<SVGCircleElement | null>(null);
  const arc2Ref = useRef<SVGCircleElement | null>(null);
  const particleGroupRef = useRef<SVGGElement | null>(null);

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    let animationFrameId: number;
    let startTime = performance.now();

    const particles = Array.from({ length: 36 }, (_, i) => ({
      baseX: (i / 36) * 500,
      y: 20 + Math.random() * 220,
      r: 1 + Math.random() * 2,
      speed: 15 + Math.random() * 25,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.25 + Math.random() * 0.55,
    }));

    const render = (now: number) => {
      const time = (now - startTime) / 1000;
      const currentParams = paramsRef.current;
      const mod = currentParams.modulationType;
      const w = 500;
      const h = 260;
      const midY = h / 2;

      // 1. Generate traveling waveform path string
      let pathD = '';
      const step = 2.5;
      for (let x = 0; x <= w; x += step) {
        const normX = x / w;
        const envShape = Math.sin(normX * Math.PI);
        let waveVal = 0;

        if (mod === 'LFM Chirp') {
          // Quadratic spatial phase + steady temporal phase velocity (flows left-to-right)
          const k0 = 2.6;
          const beta = 4.0;
          const spatialPhase = 2 * Math.PI * (k0 * normX + 0.5 * beta * normX * normX);
          const temporalPhase = time * 5.2;
          waveVal = Math.sin(spatialPhase - temporalPhase);
        } else if (mod === 'Barker-13') {
          const chipIndex = Math.min(12, Math.floor(normX * 13));
          const barker = [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1][chipIndex] || 1;
          const spatialPhase = 2 * Math.PI * 4.2 * normX;
          const temporalPhase = time * 5.2;
          waveVal = barker * Math.sin(spatialPhase - temporalPhase);
        } else {
          // CW Pulse / Pure Tonal
          const spatialPhase = 2 * Math.PI * 4.2 * normX;
          const temporalPhase = time * 5.2;
          waveVal = Math.sin(spatialPhase - temporalPhase);
        }

        const y = midY - waveVal * envShape * 88;
        pathD += `${x === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      }

      if (glowPathRef.current) glowPathRef.current.setAttribute('d', pathD);
      if (mainPathRef.current) mainPathRef.current.setAttribute('d', pathD);
      if (corePathRef.current) corePathRef.current.setAttribute('d', pathD);

      // 2. Animate expanding wavefront pulse rings
      const maxR = 420;
      const r1 = (time * 80) % maxR;
      const r2 = (time * 80 + maxR * 0.5) % maxR;
      const alpha1 = Math.sin((r1 / maxR) * Math.PI) * 0.45;
      const alpha2 = Math.sin((r2 / maxR) * Math.PI) * 0.45;

      if (arc1Ref.current) {
        arc1Ref.current.setAttribute('r', r1.toFixed(1));
        arc1Ref.current.setAttribute('stroke-opacity', alpha1.toFixed(3));
      }
      if (arc2Ref.current) {
        arc2Ref.current.setAttribute('r', r2.toFixed(1));
        arc2Ref.current.setAttribute('stroke-opacity', alpha2.toFixed(3));
      }

      // 3. Animate particles
      if (particleGroupRef.current) {
        const circles = particleGroupRef.current.children;
        for (let i = 0; i < circles.length; i++) {
          const p = particles[i];
          if (!p) continue;
          const curX = (p.baseX + time * p.speed) % w;
          const waveOffsetY = Math.sin(curX * 0.025 + time * 3 + p.phase) * 12;
          const curY = p.y + waveOffsetY * 0.35;
          const edgeFade = Math.sin((curX / w) * Math.PI);
          const circle = circles[i] as SVGCircleElement;
          circle.setAttribute('cx', curX.toFixed(1));
          circle.setAttribute('cy', curY.toFixed(1));
          circle.setAttribute('fill-opacity', (p.opacity * edgeFade * 0.8).toFixed(3));
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <svg
      viewBox="0 0 500 260"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full cursor-pointer select-none rounded-2xl"
      onClick={onPing}
    >
      <defs>
        {/* Glow Filter for Cyber Neon Cyan */}
        <filter id="hero-cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Solid Rich Dark Technical Navy Slate Background */}
      <rect width="500" height="260" fill="#0B192C" />

      {/* Background Reticle Grid */}
      <g stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1">
        {[24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336, 360, 384, 408, 432, 456, 480].map((x) => (
          <line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={260} />
        ))}
        {[24, 48, 72, 96, 120, 130, 144, 168, 192, 216, 240].map((y) => (
          <line key={`gy-${y}`} x1={0} y1={y} x2={500} y2={y} />
        ))}
      </g>

      {/* Transmitter Source Reticle on Left */}
      <circle cx="16" cy="130" r="4" fill="#38BDF8" />
      <circle cx="16" cy="130" r="1.5" fill="#FFFFFF" />

      {/* Expanding Wavefront Rings */}
      <circle ref={arc1Ref} cx="16" cy="130" r="10" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="4,4" />
      <circle ref={arc2Ref} cx="16" cy="130" r="10" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="4,4" />

      {/* Floating Acoustic Medium Particles */}
      <g ref={particleGroupRef}>
        {Array.from({ length: 36 }).map((_, i) => (
          <circle key={`p-${i}`} cx="0" cy="0" r={1.5} fill="#38BDF8" />
        ))}
      </g>

      {/* Layer 1: Wide Deep Ocean Ambient Glow */}
      <path ref={glowPathRef} fill="none" stroke="rgba(2, 132, 199, 0.45)" strokeWidth="8" strokeLinecap="round" />

      {/* Layer 2: Main Radiant Neon Cyan Wave */}
      <path ref={mainPathRef} fill="none" stroke="#38BDF8" strokeWidth="2.8" strokeLinecap="round" filter="url(#hero-cyan-glow)" />

      {/* Layer 3: Inner White-Hot Electric Core Line */}
      <path ref={corePathRef} fill="none" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
};
