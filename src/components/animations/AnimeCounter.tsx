import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface AnimeCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

export const AnimeCounter: React.FC<AnimeCounterProps> = ({
  value,
  decimals = 1,
  prefix = '',
  suffix = '',
  className = '',
  duration = 450,
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const safeVal = typeof value === 'number' && !isNaN(value) ? value : 0;
  const prevValueRef = useRef<number>(safeVal);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const fromVal = prevValueRef.current;
    const toVal = safeVal;
    prevValueRef.current = safeVal;

    if (Math.abs(fromVal - toVal) < 0.0001) {
      el.textContent = `${prefix}${safeVal.toFixed(decimals)}${suffix}`;
      return;
    }

    const counterObj = { val: fromVal };

    try {
      const anim = animate(counterObj, {
        val: toVal,
        duration,
        ease: 'outExpo',
        onUpdate: () => {
          if (el) {
            el.textContent = `${prefix}${counterObj.val.toFixed(decimals)}${suffix}`;
          }
        },
      });

      return () => {
        try {
          if (anim && typeof anim.revert === 'function') {
            anim.revert();
          }
        } catch (_) {}
      };
    } catch (_) {
      el.textContent = `${prefix}${safeVal.toFixed(decimals)}${suffix}`;
    }
  }, [safeVal, decimals, prefix, suffix, duration]);

  return (
    <span ref={spanRef} className={`tabular-nums ${className}`}>
      {prefix}
      {safeVal.toFixed(decimals)}
      {suffix}
    </span>
  );
};
