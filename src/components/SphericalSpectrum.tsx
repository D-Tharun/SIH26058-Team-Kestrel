import React, { useEffect, useRef } from 'react';

interface SphericalSpectrumProps {
  className?: string;
  intensity?: number;
  pulseActive?: boolean;
}

export const SphericalSpectrum: React.FC<SphericalSpectrumProps> = ({
  className = '',
  intensity = 1.0,
  pulseActive = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Create a fine film-grain noise texture
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 256;
    grainCanvas.height = 256;
    const grainCtx = grainCanvas.getContext('2d');
    if (grainCtx) {
      const imgData = grainCtx.createImageData(256, 256);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const val = Math.random() * 255;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 16; // soft grain opacity
      }
      grainCtx.putImageData(imgData, 0, 0);
    }

    let time = 0;

    const render = () => {
      time += 0.015;

      // 1. Base dark background (Deep obsidian ocean)
      ctx.fillStyle = '#03070E';
      ctx.fillRect(0, 0, width, height);

      // 2. Primary Wide Spherical Glow from the bottom center - softened and deepened
      const cx = width * 0.5;
      const cy = height * 0.98;
      const maxRadius = Math.max(width, height) * 0.95;

      const radialGrad = ctx.createRadialGradient(
        cx,
        cy,
        maxRadius * 0.02,
        cx,
        cy,
        maxRadius
      );

      // Color stops for deep dark depth with subdued bottom luminance
      radialGrad.addColorStop(0.0, 'rgba(60, 100, 150, 0.60)');   // Subdued inner sphere core
      radialGrad.addColorStop(0.15, 'rgba(45, 80, 128, 0.52)');  // Soft mid luminance blue
      radialGrad.addColorStop(0.30, 'rgba(30, 60, 102, 0.42)');  // Subdued navy tone
      radialGrad.addColorStop(0.50, 'rgba(18, 40, 72, 0.32)');   // Deep oceanic shadow
      radialGrad.addColorStop(0.70, 'rgba(10, 24, 46, 0.22)');   // Midnight transition
      radialGrad.addColorStop(0.88, 'rgba(5, 12, 22, 0.12)');    // Deep dark edge
      radialGrad.addColorStop(1.0, 'rgba(3, 7, 14, 0.0)');       // Outer edge darkness

      ctx.save();
      ctx.fillStyle = radialGrad;
      // Scale vertically to make an authentic wide elliptical dome / sphere
      ctx.translate(0, height * 0.2);
      ctx.scale(1, 0.85);
      ctx.fillRect(0, -height * 0.4, width, height * 1.6);
      ctx.restore();

      // 3. Secondary upper vignette & deep top ambient
      const topVignette = ctx.createLinearGradient(0, 0, 0, height * 0.7);
      topVignette.addColorStop(0.0, 'rgba(2, 5, 10, 0.98)');
      topVignette.addColorStop(0.4, 'rgba(4, 9, 16, 0.85)');
      topVignette.addColorStop(1.0, 'rgba(4, 9, 16, 0.0)');

      ctx.fillStyle = topVignette;
      ctx.fillRect(0, 0, width, height * 0.7);

      // 4. Subtle corner edge vignettes for extra depth
      const cornerVignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.25,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      cornerVignette.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
      cornerVignette.addColorStop(0.65, 'rgba(3, 7, 14, 0.35)');
      cornerVignette.addColorStop(1.0, 'rgba(2, 4, 8, 0.92)');

      ctx.fillStyle = cornerVignette;
      ctx.fillRect(0, 0, width, height);

      // 5. Apply repeating fine-grain dither to prevent banding and create the photographic texture
      if (grainCtx) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat') || 'transparent';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity, pulseActive]);

  return (
    <div
      id="spherical-spectrum-container"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* 1. Dynamic Smooth 2D Canvas Layer with procedural radial diffusion & grain */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block absolute inset-0"
      />

      {/* 2. Fallback / Enhancing CSS Spherical Radial Mesh Gradient with soft opacity */}
      <div className="absolute inset-0 bg-spherical-spectrum opacity-40 pointer-events-none mix-blend-screen" />
    </div>
  );
};

export default SphericalSpectrum;
