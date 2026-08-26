import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';
import { Radio, Crosshair, Sparkles } from 'lucide-react';

interface SonarPulseRadarProps {
  centerFrequency: number;
  bandwidth: number;
  soundSpeed: number;
  rangeResolution: number;
}

export const SonarPulseRadar: React.FC<SonarPulseRadarProps> = ({
  centerFrequency,
  bandwidth,
  soundSpeed,
  rangeResolution,
}) => {
  const radarSweepRef = useRef<SVGGElement>(null);
  const ring1Ref = useRef<SVGCircleElement>(null);
  const ring2Ref = useRef<SVGCircleElement>(null);
  const ring3Ref = useRef<SVGCircleElement>(null);
  const target1Ref = useRef<SVGGElement>(null);
  const target2Ref = useRef<SVGGElement>(null);

  useEffect(() => {
    // 1. Continuous 360-degree radar beam sweep
    if (radarSweepRef.current) {
      animate(radarSweepRef.current, {
        rotate: [0, 360],
        duration: 3500,
        loop: true,
        ease: 'linear',
      });
    }

    // 2. Concentric expanding acoustic pulse rings
    const rings = [ring1Ref.current, ring2Ref.current, ring3Ref.current].filter(Boolean);
    if (rings.length) {
      rings.forEach((ring, i) => {
        if (!ring) return;
        animate(ring, {
          r: [5, 110],
          opacity: [0.9, 0],
          strokeWidth: [3, 0.5],
          duration: 2200,
          delay: i * 700,
          loop: true,
          ease: 'outQuad',
        });
      });
    }

    // 3. Periodic target echo pulses with elastic bounce
    const targets = [target1Ref.current, target2Ref.current].filter(Boolean);
    if (targets.length) {
      targets.forEach((target, i) => {
        if (!target) return;
        animate(target, {
          scale: [
            { to: 1.4, duration: 300, ease: 'outBack' },
            { to: 1.0, duration: 400, ease: 'inOutSine' },
          ],
          opacity: [
            { to: 1, duration: 200 },
            { to: 0.4, duration: 600 },
          ],
          delay: 1200 + i * 1400,
          loop: true,
          ease: 'inOutQuad',
        });
      });
    }
  }, [centerFrequency, bandwidth, soundSpeed]);

  return (
    <div
      className="glass-panel p-4 flex flex-col items-center justify-between font-mono text-[#112D4E] border border-[#DBE2EF] shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]"
    >
      <div className="w-full flex items-center justify-between pb-2 border-b border-[#DBE2EF] text-xs">
        <span className="font-bold uppercase tracking-wider text-[#112D4E] flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
          <Crosshair className="w-4 h-4 text-[#3F72AF]" /> 360° Acoustic Propagation Radar
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] border border-[#3F72AF]/30 font-bold">
          LIVE BEAM
        </span>
      </div>

      <div className="relative my-3 flex items-center justify-center">
        <svg
          viewBox="-130 -130 260 260"
          className="w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-[#112D4E] border border-[#3F72AF]/30 shadow-inner"
        >
          {/* Static Range Rings */}
          <circle cx="0" cy="0" r="35" fill="none" stroke="rgba(219, 226, 239, 0.2)" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx="0" cy="0" r="70" fill="none" stroke="rgba(219, 226, 239, 0.2)" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx="0" cy="0" r="105" fill="none" stroke="rgba(219, 226, 239, 0.3)" strokeWidth="1" />

          {/* Compass Crosshairs */}
          <line x1="-120" y1="0" x2="120" y2="0" stroke="rgba(219, 226, 239, 0.2)" strokeWidth="1" />
          <line x1="0" y1="-120" x2="0" y2="120" stroke="rgba(219, 226, 239, 0.2)" strokeWidth="1" />

          {/* Anime.js Concentric Acoustic Wavefront Rings */}
          <circle ref={ring1Ref} cx="0" cy="0" r="10" fill="none" stroke="#38BDF8" strokeWidth="2" />
          <circle ref={ring2Ref} cx="0" cy="0" r="10" fill="none" stroke="#38BDF8" strokeWidth="2" />
          <circle ref={ring3Ref} cx="0" cy="0" r="10" fill="none" stroke="#38BDF8" strokeWidth="2" />

          {/* Rotating Sweep Beam */}
          <g ref={radarSweepRef} style={{ transformOrigin: '0px 0px' }}>
            <path
              d="M 0 0 L 0 -115 A 115 115 0 0 1 70 -90 Z"
              fill="url(#sweep-grad)"
              opacity="0.6"
            />
            <line x1="0" y1="0" x2="0" y2="-115" stroke="#38BDF8" strokeWidth="2" />
          </g>

          {/* Gradient for sweep beam */}
          <defs>
            <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Detected Echo Targets */}
          <g ref={target1Ref} transform="translate(45, -55)">
            <circle cx="0" cy="0" r="4.5" fill="#F59E0B" />
            <circle cx="0" cy="0" r="8" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
            <text x="9" y="3" fill="#F59E0B" fontSize="8" fontWeight="bold" fontFamily="monospace">
              T1: 1.4km
            </text>
          </g>

          <g ref={target2Ref} transform="translate(-60, 40)">
            <circle cx="0" cy="0" r="4" fill="#38BDF8" />
            <circle cx="0" cy="0" r="7" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
            <text x="8" y="3" fill="#38BDF8" fontSize="8" fontWeight="bold" fontFamily="monospace">
              T2: 2.1km
            </text>
          </g>

          {/* Center Projector Hydrophone */}
          <circle cx="0" cy="0" r="5" fill="#38BDF8" />
          <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
        </svg>
      </div>

      <div className="w-full flex items-center justify-between text-[11px] text-[#3F72AF] pt-1">
        <span>Range: <strong className="text-[#112D4E]">3.5 km</strong></span>
        <span>Resolution ΔR: <strong className="text-[#112D4E]">{rangeResolution} m</strong></span>
        <span>c: <strong className="text-amber-600 font-bold">{soundSpeed} m/s</strong></span>
      </div>
    </div>
  );
};
