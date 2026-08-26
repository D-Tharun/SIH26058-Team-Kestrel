import { animate, stagger } from 'animejs';

/**
 * Utility functions leveraging Anime.js v4 for rich acoustic and telemetry micro-animations
 */

// Animate numerical counters smoothly
export const animateCounter = (
  target: HTMLElement | null,
  fromVal: number,
  toVal: number,
  duration = 600,
  decimals = 1,
  suffix = ''
) => {
  if (!target) return;
  const obj = { val: fromVal };
  animate(obj, {
    val: toVal,
    duration,
    ease: 'outExpo',
    onUpdate: () => {
      if (target) {
        target.textContent = `${obj.val.toFixed(decimals)}${suffix}`;
      }
    },
  });
};

// Shockwave / sonar burst pulse animation on an element
export const triggerSonarShockwave = (element: HTMLElement | null, color = '#8CC0EB') => {
  if (!element) return;
  animate(element, {
    scale: [1, 1.08, 0.98, 1],
    boxShadow: [
      `0 0 0 0 rgba(140, 192, 235, 0)`,
      `0 0 25px 8px ${color}`,
      `0 0 0 0 rgba(140, 192, 235, 0)`
    ],
    duration: 650,
    ease: 'outElastic(1, .5)',
  });
};

// Stagger ripple across an array of DOM elements or grid nodes
export const triggerStaggerRipple = (elements: Element[] | NodeListOf<Element> | string) => {
  animate(elements, {
    scale: [
      { to: 0.75, ease: 'outSine', duration: 150 },
      { to: 1.3, ease: 'inOutQuad', duration: 250 },
      { to: 1, ease: 'outQuad', duration: 300 }
    ],
    opacity: [
      { to: 0.35, duration: 150 },
      { to: 1, duration: 250 },
      { to: 0.8, duration: 300 }
    ],
    delay: stagger(35, { from: 'center' }),
    ease: 'inOutQuad'
  });
};

// Subtle continuous floating / ocean wave oscillation
export const animateOceanFloating = (elements: string | HTMLElement[] | null) => {
  if (!elements) return null;
  return animate(elements, {
    translateY: [-3, 3],
    alternate: true,
    loop: true,
    duration: 2400,
    ease: 'inOutSine',
  });
};
