import { ModulationType } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Synthesizes an audible acoustic sonar ping using Web Audio API
 * Carrier frequencies in ultrasonic sonar (e.g. 50kHz) are scaled down to audible range (e.g. 600Hz - 2200Hz)
 * so human operators can acoustically verify the waveform signature!
 */
export function playSonarPing(
  modulationType: ModulationType,
  fcKhz: number,
  bandwidthKhz: number,
  durationMs: number = 250,
  volume: number = 0.25
) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const durSec = Math.max(0.12, durationMs / 1000);

    // Map ultrasonic frequency (20-120 kHz) to audible human ear pitch (400 - 1800 Hz)
    const audibleFc = 400 + ((fcKhz - 20) / 100) * 1200;
    const audibleBw = Math.max(100, (bandwidthKhz / 30) * 800);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    // Smooth envelope attack and decay to emulate underwater acoustic transducer
    masterGain.gain.linearRampToValueAtTime(volume, now + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

    // Filter to simulate underwater acoustics (slight reverberant lowpass)
    const biquad = ctx.createBiquadFilter();
    biquad.type = 'lowpass';
    biquad.frequency.setValueAtTime(3200, now);

    biquad.connect(masterGain);
    masterGain.connect(ctx.destination);

    if (modulationType === 'CW') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(audibleFc, now);
      osc.connect(biquad);
      osc.start(now);
      osc.stop(now + durSec);
    } else if (modulationType === 'LFM Chirp') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const fStart = Math.max(250, audibleFc - audibleBw / 2);
      const fEnd = audibleFc + audibleBw / 2;
      osc.frequency.setValueAtTime(fStart, now);
      osc.frequency.exponentialRampToValueAtTime(fEnd, now + durSec * 0.85);
      osc.connect(biquad);
      osc.start(now);
      osc.stop(now + durSec);
    } else if (modulationType === 'Geometric Sweep') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const fStart = Math.max(250, audibleFc - audibleBw / 2);
      const fEnd = audibleFc + audibleBw / 2;
      osc.frequency.setValueAtTime(fStart, now);
      osc.frequency.exponentialRampToValueAtTime(fEnd, now + durSec * 0.9);
      osc.connect(biquad);
      osc.start(now);
      osc.stop(now + durSec);
    } else if (modulationType === 'Barker-13') {
      // 13 biphase segments
      const chipDur = (durSec * 0.85) / 13;
      const barkerPattern = [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1];
      
      barkerPattern.forEach((sign, idx) => {
        const chipStart = now + idx * chipDur;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(audibleFc * (sign === 1 ? 1.0 : 1.05), chipStart);
        const chipGain = ctx.createGain();
        chipGain.gain.setValueAtTime(volume * 0.9, chipStart);
        chipGain.gain.setValueAtTime(volume * 0.9, chipStart + chipDur * 0.9);
        chipGain.gain.linearRampToValueAtTime(0.001, chipStart + chipDur);

        osc.connect(chipGain);
        chipGain.connect(biquad);
        osc.start(chipStart);
        osc.stop(chipStart + chipDur);
      });
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(audibleFc, now);
      osc.connect(biquad);
      osc.start(now);
      osc.stop(now + durSec);
    }
  } catch (err) {
    console.warn('Web Audio playback error:', err);
  }
}
